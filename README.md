# EditRace

**[nearestword.dev](https://nearestword.dev)** — Type a word and an edit distance threshold; watch Go, C++, Python, and Node.js race to find every match in a 466k-word English dictionary in real time.

![EditRace screenshot](docs/screenshot.png)

## What it does

Enter a word (e.g. `amazing`), set how many letters off you'll allow (delta), and hit Search. Four engines run the same [Levenshtein edit-distance](https://en.wikipedia.org/wiki/Levenshtein_distance) algorithm simultaneously on the server. A live timer counts up for each engine and freezes when its result arrives — so you can literally watch them finish.

Results are de-duplicated (all engines agree) and displayed as a word list below the timers.

## Architecture

```
Browser → nginx (TLS) → Go HTTP server
                              ├── Go engine       (in-process)
                              ├── C++ engine      (subprocess)
                              ├── Python engine   (subprocess)
                              └── Node.js engine  (subprocess)
                         PostgreSQL (optional trigram pre-filter)
```

- **Frontend** — React + Vite, served by the Go server from the Docker image
- **Go server** — routes requests, loads the word list into memory, fans out to all four engines concurrently
- **Engines** — each implements the same algorithm independently; C++, Python, and Node.js communicate via stdin/stdout JSON
- **Trigram filter** — optional PostgreSQL `pg_trgm` pre-filter narrows ~466k words to ~60 candidates before Levenshtein runs (faster, but may miss edge cases)
- **Deployment** — Docker Compose on DigitalOcean, nginx handles TLS termination with Let's Encrypt

## Engines

| Engine | Language | How it runs |
|--------|----------|-------------|
| Go | Go 1.25 | In-process library call |
| C++ | C++17 | Compiled binary, subprocess |
| Python | Python 3 | Script, subprocess |
| Node.js | Node 20 | Script, subprocess |

All engines receive candidates via stdin (one word per line) and return `{"duration_ms": N, "results": [...]}` on stdout. Timing is measured purely on the server — no network round-trip included in the algo time.

## Local development

**Prerequisites:** Go 1.25+, Node 20+, Python 3, a C++17 compiler, Docker (optional, for the database)

```bash
# 1. Start the database (needed only for trigram filter)
make db

# 2. Build the C++ engine
cd engines/cpp && make && cd ../..

# 3. Start the Go server
make server

# 4. In another terminal, start the frontend dev server
make dev
```

Open [http://localhost:5173](http://localhost:5173) — the Vite dev server proxies API calls to the Go server on `:8080`.

## Production deployment

```bash
# Build images and start all containers
make up

# Tear down
make down
```

The `Makefile` wraps `docker compose up --build -d`. The multi-stage Dockerfile builds the React frontend, compiles the C++ engine, and builds the Go binary — no pre-built artifacts needed on the host.

## Project structure

```
engines/
  go/         Go Levenshtein implementation
  cpp/        C++ Levenshtein implementation
  python/     Python Levenshtein implementation
  node/       Node.js Levenshtein implementation
server/
  main.go     HTTP server entrypoint
  handlers/   Route handlers, subprocess orchestration
  db/         PostgreSQL / trigram integration
frontend/
  src/        React components
data/
  words.txt   466k-word English dictionary
```
