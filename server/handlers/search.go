package handlers

import (
	"encoding/json"
	"net/http"

	goengine "nearestword/engines/go"
)

type Handler struct {
	Words []string
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

func Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) SearchGo(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	res := goengine.Search(req.Word, req.Delta, req.Limit, h.Words)
	writeJSON(w, http.StatusOK, EngineResult{DurationMs: res.DurationMs, Results: res.Words})
}

func (h *Handler) SearchCpp(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_ = req
	writeJSON(w, http.StatusOK, EngineResult{DurationMs: 0, Results: []string{}})
}

func (h *Handler) SearchPy(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	_ = req
	writeJSON(w, http.StatusOK, EngineResult{DurationMs: 0, Results: []string{}})
}

func (h *Handler) SearchAll(w http.ResponseWriter, r *http.Request) {
	req, err := decodeRequest(r)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	goRes := goengine.Search(req.Word, req.Delta, req.Limit, h.Words)
	writeJSON(w, http.StatusOK, SearchAllResponse{
		TrgmEnabled:       req.Trgm,
		CandidatesScanned: len(h.Words),
		Benchmarks: map[string]EngineResult{
			"go":     {DurationMs: goRes.DurationMs, Results: goRes.Words},
			"cpp":    {DurationMs: 0, Results: []string{}},
			"python": {DurationMs: 0, Results: []string{}},
		},
	})
}
