package main

import (
	"bufio"
	"log"
	"net/http"
	"os"

	"nearestword/server/handlers"
)

func loadWords(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var words []string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		if w := sc.Text(); w != "" {
			words = append(words, w)
		}
	}
	return words, sc.Err()
}

func main() {
	words, err := loadWords("data/words.txt")
	if err != nil {
		log.Fatalf("load words: %v", err)
	}
	log.Printf("loaded %d words", len(words))

	h := &handlers.Handler{Words: words}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handlers.Health)
	mux.HandleFunc("POST /api/search/go", h.SearchGo)
	mux.HandleFunc("POST /api/search/cpp", h.SearchCpp)
	mux.HandleFunc("POST /api/search/py", h.SearchPy)
	mux.HandleFunc("POST /api/search/all", h.SearchAll)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
