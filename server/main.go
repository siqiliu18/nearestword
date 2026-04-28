package main

import (
	"log"
	"net/http"

	"nearestword/server/handlers"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handlers.Health)
	mux.HandleFunc("POST /api/search/go", handlers.SearchGo)
	mux.HandleFunc("POST /api/search/cpp", handlers.SearchCpp)
	mux.HandleFunc("POST /api/search/py", handlers.SearchPy)
	mux.HandleFunc("POST /api/search/all", handlers.SearchAll)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
