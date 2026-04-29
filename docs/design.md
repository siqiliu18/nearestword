# Nearest Word Generator — Design Doc

## Overview

A web application that finds dictionary words at a given [Levenshtein (edit) distance](https://en.wikipedia.org/wiki/Levenshtein_distance) from an input word. The primary goal is to benchmark the same algorithm across **Go**, **C++**, and **Python**, and surface the results through a clean UI.

Live at: `nearestword.dev` (registered, DNS pending deployment)

---

## Goals

- Demonstrate multi-language backend performance comparison (Go, C++, Python)
- Store the dictionary in PostgreSQL and benchmark with vs without `pg_trgm` trigram pre-filtering
- Serve over HTTPS with a real domain
- Keep the frontend minimal — purely a window for user interaction and result display

---

## Architecture

```
[ Browser ]
    |
    | HTTPS
    v
[ nginx ]  ← TLS termination (Let's Encrypt)
    |
    v
[ Go HTTP Server ]  ← main backend, port 8080
    |
    |── /api/search/go    ← Go implementation
    |── /api/search/cpp   ← spawns C++ binary
    |── /api/search/py    ← spawns Python script
    |── /api/search/all   ← runs all three, returns benchmark comparison
    |
    v
[ PostgreSQL ]
    └── words table  ← dictionary, with pg_trgm index
```

---

## API Design

### `POST /api/search/all` (primary endpoint)
Request:
```json
{
  "word": "amazing",
  "delta": 2,
  "limit": 10,
  "trgm": true
}
```

- `trgm: true` — PostgreSQL uses the trigram index to prune candidates before exact edit distance computation
- `trgm: false` — full scan of all 370k words, exact edit distance on every word

Response:
```json
{
  "trgm_enabled": true,
  "candidates_scanned": 512,
  "benchmarks": {
    "go":     { "duration_ms": 8,   "results": ["blazing", "gazing", ...] },
    "cpp":    { "duration_ms": 3,   "results": ["blazing", "gazing", ...] },
    "python": { "duration_ms": 54,  "results": ["blazing", "gazing", ...] }
  }
}
```

With `trgm: false`, `candidates_scanned` would be 370,000 and durations ~40x higher.

Each language implementation runs independently and returns its own result set + timing, so the UI can display them side by side.

### UI benchmark matrix (per query)

|        | trgm off | trgm on |
|--------|----------|---------|
| Go     | ✓        | ✓       |
| C++    | ✓        | ✓       |
| Python | ✓        | ✓       |

The UI has a **"Enable trigram pre-filter"** toggle. Flipping it re-runs the query and updates all 6 cells live.

---

## Database

### Schema
```sql
CREATE TABLE words (
    id     SERIAL PRIMARY KEY,
    word   TEXT NOT NULL UNIQUE
);

CREATE INDEX words_trgm_idx ON words USING GIN (word gin_trgm_ops);
```

### Why PostgreSQL + pg_trgm?
Unlike a standard B-tree index (which speeds up exact lookups and prefix matches to O(log n) but can't reason about similarity), `pg_trgm` is a purpose-built similarity index. It breaks words into every 3-consecutive-character slice (e.g. `"amazing"` → `{ama, maz, azi, zin, ing}`), indexes those slices, and uses overlap count as a similarity proxy — making it possible to quickly discard words that share no trigrams with the query, without computing exact edit distance on every word.

**How it fits into the pipeline:**
1. `trgm=true`: PostgreSQL filters ~370k words down to ~500 trigram-similar candidates
2. Go passes those ~500 candidates to each language engine
3. Each engine runs exact Levenshtein distance only on the ~500 candidates
4. Result: ~40x fewer comparisons, dramatically faster response

**`trgm=false` (full scan):**
- Go passes all 370k words to each engine
- Each engine runs exact Levenshtein on every word
- Slow, but correct — and makes the benchmark contrast visible

**This toggle is the core benchmark story:**
> "I reduced the candidate set from 370k to ~500 using trigram pre-filtering, cutting edit distance computation by ~40x. The UI lets you toggle it on/off to see the difference live."

### Dictionary source
[dwyl/english-words](https://github.com/dwyl/english-words) — ~370k English words

---

## Language Implementations

| Language | Approach | Expected perf |
|----------|----------|---------------|
| Go       | Native, called directly by the server | Fast |
| C++      | Pre-compiled binary, spawned as subprocess | Fastest |
| Python   | Script, spawned as subprocess | Slowest |

All three read from PostgreSQL (or accept a pre-loaded word list) and implement the same bottom-up DP Levenshtein algorithm.

---

## Infrastructure

| Component | Choice | Notes |
|-----------|--------|-------|
| Server    | DigitalOcean Droplet | Already familiar |
| Reverse proxy | nginx | TLS termination, static file serving |
| TLS | Let's Encrypt (Certbot) | Auto-renewing |
| Containerization | Docker Compose | Go server + PostgreSQL + nginx |
| Domain | `nearestword.dev` | Registered on Namecheap |

---

## File Structure (planned)

```
nearest-word/
├── docs/
│   └── design.md
├── server/               ← Go HTTP server
│   ├── main.go
│   ├── handlers/
│   └── db/
├── engines/
│   ├── go/               ← Go edit distance implementation
│   ├── cpp/              ← C++ implementation + Makefile
│   └── python/           ← Python implementation
├── frontend/             ← minimal HTML/JS UI
├── migrations/           ← SQL migration files
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## Open Questions

- [x] Domain name — `nearestword.dev` registered on Namecheap
- [ ] Should C++ and Python read from PostgreSQL directly, or receive a candidate word list from Go? (lean: Go handles DB, passes list to engines)
- [ ] Trigram pre-filter threshold — needs tuning (too aggressive = missed results, too loose = no speedup)
- [ ] Deploy target: single Droplet with Docker Compose (managed DB is overkill for this project)
- [ ] Decide trgm similarity threshold (e.g. `similarity > 0.3`) — tune after seeding DB

---

## Domain Registration Notes

Pick something short and relevant. Current candidate: `nearestword.dev`

**TLD recommendation: `.dev`**
- `.dev` is the standard TLD for developer projects — sends the right signal to interviewers
- `.blog` / `.store` are mismatched for a technical tool and look unintentional
- $12.98/yr on Namecheap is negligible compared to the time invested building it

**Registrar: Namecheap** (recommended)
- Straightforward registration, no aggressive upsells
- Transparent renewal pricing
- Avoid GoDaddy — known for upsells and renewal prices jumping after year one
- Cloudflare Registrar is also good (sells at cost, no markup) but requires an existing Cloudflare account setup first

**Steps:**
1. Confirm `nearestword.dev` availability and register on Namecheap
2. Leave DNS pointing nowhere while developing locally
3. Point to DigitalOcean Droplet IP when ready to deploy
