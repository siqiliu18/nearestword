# Manual Test Cases

Start the server from the project root before running any test:
```
go run ./server/main.go
```

---

## Health check

```bash
curl http://localhost:8080/health
```
Expected:
```json
{"status": "ok"}
```

---

## POST /api/search/go

### 1. Basic substitution (delta=1)
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"cat","delta":1,"limit":10,"trgm":false}'
```
Expected: results include common 3-letter words one edit away, e.g. `bat`, `hat`, `sat`, `car`.  
`duration_ms` should be < 50.

### 2. Larger delta (delta=2)
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"amazing","delta":2,"limit":5,"trgm":false}'
```
Expected: 5 results, all exactly 2 edits from "amazing".  
`duration_ms` typically 1–10ms on a 466k word list.

### 3. Limit is respected
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"cat","delta":1,"limit":3,"trgm":false}'
```
Expected: exactly 3 results.

### 4. No results
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"zzzzqqqq","delta":1,"limit":10,"trgm":false}'
```
Expected:
```json
{"duration_ms": <n>, "results": []}
```

### 5. Case-insensitive input
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"CAT","delta":1,"limit":10,"trgm":false}'
```
Expected: same results as test 1 — input case doesn't affect matching.

### 6. delta=0 (exact match only)
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d '{"word":"cat","delta":0,"limit":10,"trgm":false}'
```
Expected: results contain only `cat` (or `Cat` / `CAT` variants present in the dictionary).

---

## POST /api/search/all

### 7. All engines, Go result populated
```bash
curl -s -X POST http://localhost:8080/api/search/all \
  -H "Content-Type: application/json" \
  -d '{"word":"cat","delta":1,"limit":5,"trgm":false}'
```
Expected:
- `benchmarks.go.results` — 5 words, `duration_ms` > 0
- `benchmarks.cpp.results` — `[]` (not yet implemented)
- `benchmarks.python.results` — `[]` (not yet implemented)
- `candidates_scanned` — 466551

### 8. Bad request body
```bash
curl -s -X POST http://localhost:8080/api/search/go \
  -H "Content-Type: application/json" \
  -d 'not json'
```
Expected: HTTP 400.

---

## Notes

- `cpp` and `python` results are empty stubs until those engines are wired up.
- `trgm` flag is accepted but has no effect yet (PostgreSQL not connected).
- Once the DB layer is added, re-run tests 1–7 with `"trgm":true` and verify results match `"trgm":false` (same words, fewer `candidates_scanned`, lower `duration_ms`).
