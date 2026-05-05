package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"

	goengine "nearestword/engines/go"
	"nearestword/server/db"
)

const trgmThreshold = 0.3

type Handler struct {
	Words []string
	DB    *db.DB
}

type SearchRequest struct {
	Word  string `json:"word"`
	Delta int    `json:"delta"`
	Limit int    `json:"limit"`
	Trgm  bool   `json:"trgm"`
}

type EngineResult struct {
	DurationMs int      `json:"duration_ms"`
	Results    []string `json:"results"`
}

type SearchAllResponse struct {
	TrgmEnabled       bool                    `json:"trgm_enabled"`
	CandidatesScanned int                     `json:"candidates_scanned"`
	Benchmarks        map[string]EngineResult `json:"benchmarks"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func decodeRequest(r *http.Request) (SearchRequest, error) {
	var req SearchRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func runSubprocess(bin string, args []string, candidates []string) EngineResult {
	cmd := exec.Command(bin, args...)
	cmd.Stdin = strings.NewReader(strings.Join(candidates, "\n"))

	out, err := cmd.Output()
	if err != nil {
		log.Printf("%s engine error: %v", bin, err)
		return EngineResult{DurationMs: 0, Results: []string{}}
	}

	var res EngineResult
	if err := json.Unmarshal(out, &res); err != nil {
		log.Printf("%s engine parse error: %v", bin, err)
		return EngineResult{DurationMs: 0, Results: []string{}}
	}
	return res
}

func runCpp(word string, delta, limit int, candidates []string) EngineResult {
	return runSubprocess("engines/cpp/levenshtein",
		[]string{word, strconv.Itoa(delta), strconv.Itoa(limit)},
		candidates)
}

func runPython(word string, delta, limit int, candidates []string) EngineResult {
	return runSubprocess("python3",
		[]string{"engines/python/levenshtein.py", word, strconv.Itoa(delta), strconv.Itoa(limit)},
		candidates)
}

// candidates returns the word list to search against.
// If trgm=true and DB is connected, uses trigram pre-filtering.
// Falls back to the full in-memory list otherwise.
func (h *Handler) candidates(ctx context.Context, word string, trgm bool) ([]string, bool) {
	if trgm && h.DB != nil {
		words, err := h.DB.TrigramCandidates(ctx, word, trgmThreshold)
		if err != nil {
			log.Printf("trgm query failed, falling back to full scan: %v", err)
			return h.Words, false
		}
		return words, true
	}
	return h.Words, false
}

func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) GetWords(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=3600")
	writeJSON(w, http.StatusOK, h.Words)
}

func (h *Handler) SearchGo(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	candidates, _ := h.candidates(r.Context(), req.Word, req.Trgm)
	res := goengine.Search(req.Word, req.Delta, req.Limit, candidates)
	writeJSON(w, http.StatusOK, EngineResult{DurationMs: res.DurationMs, Results: res.Words})
}

func (h *Handler) SearchCpp(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	candidates, _ := h.candidates(r.Context(), req.Word, req.Trgm)
	writeJSON(w, http.StatusOK, runCpp(req.Word, req.Delta, req.Limit, candidates))
}

func (h *Handler) SearchPy(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	candidates, _ := h.candidates(r.Context(), req.Word, req.Trgm)
	writeJSON(w, http.StatusOK, runPython(req.Word, req.Delta, req.Limit, candidates))
}

func (h *Handler) SearchAll(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	candidates, trgmUsed := h.candidates(r.Context(), req.Word, req.Trgm)
	goRes := goengine.Search(req.Word, req.Delta, req.Limit, candidates)
	cppRes := runCpp(req.Word, req.Delta, req.Limit, candidates)
	pyRes := runPython(req.Word, req.Delta, req.Limit, candidates)
	writeJSON(w, http.StatusOK, SearchAllResponse{
		TrgmEnabled:       trgmUsed,
		CandidatesScanned: len(candidates),
		Benchmarks: map[string]EngineResult{
			"go":     {DurationMs: goRes.DurationMs, Results: goRes.Words},
			"cpp":    {DurationMs: cppRes.DurationMs, Results: cppRes.Results},
			"python": {DurationMs: pyRes.DurationMs, Results: pyRes.Results},
		},
	})
}
