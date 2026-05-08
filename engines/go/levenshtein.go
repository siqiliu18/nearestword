package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

func distance(a, b string) int {
	a = strings.ToLower(a)
	b = strings.ToLower(b)
	m, n := len(a), len(b)

	prev := make([]int, n+1)
	curr := make([]int, n+1)
	for j := range prev {
		prev[j] = j
	}
	for i := 1; i <= m; i++ {
		curr[0] = i
		for j := 1; j <= n; j++ {
			if a[i-1] == b[j-1] {
				curr[j] = prev[j-1]
			} else {
				curr[j] = 1 + min(prev[j], curr[j-1], prev[j-1])
			}
		}
		prev, curr = curr, prev
	}
	return prev[n]
}

type Result struct {
	Words      []string
	DurationMs int
}

func Search(query string, delta, limit int, candidates []string) Result {
	start := time.Now()
	words := []string{}
	qlen := len(query)
	for _, w := range candidates {
		if limit > 0 && len(words) == limit {
			break
		}
		if abs(len(w)-qlen) <= delta && distance(query, w) == delta {
			words = append(words, w)
		}
	}
	return Result{
		Words:      words,
		DurationMs: int(time.Since(start).Milliseconds()),
	}
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func main() {
	word := os.Args[1]
	delta, _ := strconv.Atoi(os.Args[2])
	limit, _ := strconv.Atoi(os.Args[3])

	candidates := make([]string, 0, 500000)
	sc := bufio.NewScanner(os.Stdin)
	buf := make([]byte, 1024*1024)
	sc.Buffer(buf, len(buf))
	for sc.Scan() {
		if line := sc.Text(); line != "" {
			candidates = append(candidates, line)
		}
	}
	runtime.GC()

	res := Search(word, delta, limit, candidates)
	out, _ := json.Marshal(map[string]interface{}{
		"duration_ms": res.DurationMs,
		"results":     res.Words,
	})
	fmt.Println(string(out))
}
