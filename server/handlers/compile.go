package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

type compiledBinary struct {
	path      string
	dir       string
	createdAt time.Time
}

var (
	binaryStore   = map[string]compiledBinary{}
	binaryStoreMu sync.Mutex
)

func init() {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			cleanupBinaries()
		}
	}()
}

func cleanupBinaries() {
	binaryStoreMu.Lock()
	defer binaryStoreMu.Unlock()
	cutoff := time.Now().Add(-10 * time.Minute)
	for id, b := range binaryStore {
		if b.createdAt.Before(cutoff) {
			os.Remove(b.path)
			if b.dir != "" {
				os.RemoveAll(b.dir)
			}
			delete(binaryStore, id)
		}
	}
}

func newBinaryID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

const goMainWrapper = `package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"time"
	EXTRA_IMPORTS
)

USER_FUNC

func main() {
	word := os.Args[1]
	delta, _ := strconv.Atoi(os.Args[2])
	limit, _ := strconv.Atoi(os.Args[3])
	wordLen := len(word)

	candidates := make([]string, 0, 500000)
	sc := bufio.NewScanner(os.Stdin)
	for sc.Scan() {
		if line := sc.Text(); line != "" {
			candidates = append(candidates, line)
		}
	}
	runtime.GC()

	start := time.Now()
	var results []string
	for _, candidate := range candidates {
		if limit > 0 && len(results) >= limit {
			break
		}
		diff := len(candidate) - wordLen
		if diff < 0 {
			diff = -diff
		}
		if diff <= delta && distance(word, candidate) == delta {
			results = append(results, candidate)
		}
	}
	if results == nil {
		results = []string{}
	}
	out, _ := json.Marshal(map[string]interface{}{
		"duration_ms": int(time.Since(start).Milliseconds()),
		"results":     results,
	})
	fmt.Println(string(out))
}
`

const cppMainWrapper = `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cctype>
#include <sstream>
USER_INCLUDES

USER_FUNC

int main(int argc, char* argv[]) {
    std::string word = argv[1];
    int delta = std::stoi(argv[2]);
    int limit = std::stoi(argv[3]);
    int wordLen = static_cast<int>(word.size());

    auto start = std::chrono::high_resolution_clock::now();

    std::vector<std::string> results;
    std::string line;
    while ((limit <= 0 || static_cast<int>(results.size()) < limit) && std::getline(std::cin, line)) {
        if (line.empty()) continue;
        int len = static_cast<int>(line.size());
        int diff = len - wordLen;
        if (diff < 0) diff = -diff;
        if (diff <= delta && distance(word, line) == delta)
            results.push_back(line);
    }

    auto end = std::chrono::high_resolution_clock::now();
    long long ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "{\"duration_ms\":" << ms << ",\"results\":[";
    for (std::size_t i = 0; i < results.size(); i++) {
        if (i > 0) std::cout << ",";
        std::cout << "\"" << results[i] << "\"";
    }
    std::cout << "]}" << std::endl;
    return 0;
}
`

var (
	singleImportRe = regexp.MustCompile(`(?m)^[ \t]*import\s+"([^"]+)"`)
	blockImportRe  = regexp.MustCompile(`(?s)import\s*\(([^)]*)\)`)
)

func extractGoImports(code string) (imports []string, clean string) {
	for _, m := range singleImportRe.FindAllStringSubmatch(code, -1) {
		imports = append(imports, `"`+m[1]+`"`)
	}
	code = singleImportRe.ReplaceAllLiteralString(code, "")
	for _, m := range blockImportRe.FindAllStringSubmatch(code, -1) {
		for _, line := range strings.Split(m[1], "\n") {
			line = strings.TrimSpace(line)
			if line != "" {
				imports = append(imports, line)
			}
		}
	}
	code = blockImportRe.ReplaceAllLiteralString(code, "")
	return imports, strings.TrimSpace(code)
}

func extractCppDirectives(code string) (directives []string, clean string) {
	var kept []string
	for _, line := range strings.Split(code, "\n") {
		t := strings.TrimSpace(line)
		if strings.HasPrefix(t, "#include") || strings.HasPrefix(t, "using ") {
			directives = append(directives, t)
		} else {
			kept = append(kept, line)
		}
	}
	return directives, strings.TrimSpace(strings.Join(kept, "\n"))
}

type CompileRequest struct {
	Code     string `json:"code"`
	Language string `json:"language"`
}

type CompileResponse struct {
	OK       bool   `json:"ok"`
	BinaryID string `json:"binary_id,omitempty"`
	Error    string `json:"error,omitempty"`
}

func (h *Handler) Compile(w http.ResponseWriter, r *http.Request) {
	var req CompileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	switch req.Language {
	case "go":
		h.compileGo(w, req.Code)
	case "cpp":
		h.compileCpp(w, req.Code)
	default:
		http.Error(w, "unsupported language", http.StatusBadRequest)
	}
}

func (h *Handler) compileGo(w http.ResponseWriter, userCode string) {
	extraImports, clean := extractGoImports(userCode)
	src := strings.ReplaceAll(goMainWrapper, "EXTRA_IMPORTS", strings.Join(extraImports, "\n\t"))
	src = strings.ReplaceAll(src, "USER_FUNC", clean)

	tmpDir, err := os.MkdirTemp("", "editrace-go-*")
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "go.mod"), []byte("module editrace\n\ngo 1.21\n"), 0644); err != nil {
		os.RemoveAll(tmpDir)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(filepath.Join(tmpDir, "main.go"), []byte(src), 0644); err != nil {
		os.RemoveAll(tmpDir)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	binPath := filepath.Join(tmpDir, "editrace-bin")
	cmd := exec.Command("go", "build", "-o", binPath, ".")
	cmd.Dir = tmpDir
	cmd.Env = append(os.Environ(),
		"GOPATH=/tmp/gopath",
		"GOCACHE=/tmp/gocache",
		"GONOSUMDB=*",
		"GOTOOLCHAIN=local",
		"CGO_ENABLED=0",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		os.RemoveAll(tmpDir)
		writeJSON(w, http.StatusOK, CompileResponse{OK: false, Error: string(out)})
		return
	}

	id := newBinaryID()
	binaryStoreMu.Lock()
	binaryStore[id] = compiledBinary{path: binPath, dir: tmpDir, createdAt: time.Now()}
	binaryStoreMu.Unlock()
	writeJSON(w, http.StatusOK, CompileResponse{OK: true, BinaryID: id})
}

func (h *Handler) compileCpp(w http.ResponseWriter, userCode string) {
	directives, clean := extractCppDirectives(userCode)
	src := strings.ReplaceAll(cppMainWrapper, "USER_INCLUDES", strings.Join(directives, "\n"))
	src = strings.ReplaceAll(src, "USER_FUNC", clean)

	tmpSrc, err := os.CreateTemp("", "editrace-*.cpp")
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	tmpSrc.WriteString(src)
	tmpSrc.Close()
	defer os.Remove(tmpSrc.Name())

	binPath := tmpSrc.Name() + ".bin"
	gppArgs := []string{"-O2", "-std=c++17", "-o", binPath, tmpSrc.Name()}
	if runtime.GOOS == "darwin" {
		if sdk, err := exec.Command("xcrun", "--sdk", "macosx", "--show-sdk-path").Output(); err == nil {
			cxxInc := strings.TrimSpace(string(sdk)) + "/usr/include/c++/v1"
			gppArgs = append([]string{"-I", cxxInc}, gppArgs...)
		}
	}
	cmd := exec.Command("g++", gppArgs...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		writeJSON(w, http.StatusOK, CompileResponse{OK: false, Error: string(out)})
		return
	}

	id := newBinaryID()
	binaryStoreMu.Lock()
	binaryStore[id] = compiledBinary{path: binPath, createdAt: time.Now()}
	binaryStoreMu.Unlock()
	writeJSON(w, http.StatusOK, CompileResponse{OK: true, BinaryID: id})
}

type CompiledSearchRequest struct {
	SearchRequest
	BinaryID string `json:"binary_id"`
}

func (h *Handler) SearchCompiled(w http.ResponseWriter, r *http.Request) {
	var req CompiledSearchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	binaryStoreMu.Lock()
	b, ok := binaryStore[req.BinaryID]
	binaryStoreMu.Unlock()
	if !ok {
		http.Error(w, "binary expired — please recompile", http.StatusGone)
		return
	}

	candidates, _ := h.candidates(r.Context(), req.Word, req.Trgm)
	result := runSubprocess(b.path,
		[]string{req.Word, strconv.Itoa(req.Delta), strconv.Itoa(req.Limit)},
		candidates)
	writeJSON(w, http.StatusOK, result)
}
