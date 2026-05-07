# Code Playground — Design Doc

## Overview

Add an interactive coding board where users implement their own Levenshtein `distance` function in Python or Node.js, then race it live against the four built-in engines under identical conditions.

---

## User Flow

1. User performs a normal search (word, delta, limit) — page works exactly as today.
2. Below the engine timer cards, a collapsed toggle bar reads `</> Code your own ▾`.
3. User clicks to expand the coding board.
4. Board shows a language tab switcher (Python | Node.js) and a Monaco editor pre-filled with a starter template.
5. User implements the `distance` function in the starter template.
6. User clicks **Run** — all five engines race simultaneously under the last search parameters.
7. A fifth timer card **"You"** appears in the timer row, counting up alongside the four built-ins.
8. When results arrive, each card freezes at its algo time as usual.

**Hover hint:** hovering over any of the four built-in engine cards shows a popover with that engine's full source code — so users can compare their implementation or use it as a reference.

---

## UI Layout

```
┌─────────────────────────────────────────────┐
│  Search form card                           │
└─────────────────────────────────────────────┘

┌──────┐ ┌──────┐ ┌────────┐ ┌─────────┐ ┌─────┐
│  Go  │ │ C++  │ │ Python │ │ Node.js │ │ You │  ← 5th card appears when board is open
└──────┘ └──────┘ └────────┘ └─────────┘ └─────┘

[ </> Code your own  ▾ ]   ← toggle bar, full width

┌─────────────────────────────────────────────┐  ← expands on toggle
│  [Python]  [Node.js]              [Run ▶]   │
│  ┌───────────────────────────────────────┐  │
│  │  Monaco editor (300px tall)           │  │
│  │  pre-filled with starter template     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Results panel                              │
└─────────────────────────────────────────────┘
```

---

## Starter Templates

Both templates provide complete boilerplate (stdin reading, arg parsing, JSON output). The user only needs to implement the `distance` function body.

### Python
```python
import sys, json, time

def distance(a, b):
    a, b = a.lower(), b.lower()
    m, n = len(a), len(b)
    # TODO: implement and return the Levenshtein edit distance

def main():
    word  = sys.argv[1]
    delta = int(sys.argv[2])
    limit = int(sys.argv[3])
    word_len = len(word)
    start = time.time()
    results = []
    for line in sys.stdin:
        if limit > 0 and len(results) >= limit:
            break
        candidate = line.rstrip('\n')
        if not candidate:
            continue
        if abs(len(candidate) - word_len) <= delta and distance(word, candidate) == delta:
            results.append(candidate)
    print(json.dumps({'duration_ms': int((time.time() - start) * 1000), 'results': results}))

if __name__ == '__main__':
    main()
```

### Node.js
```javascript
const readline = require('readline')
const word  = process.argv[2]
const delta = parseInt(process.argv[3])
const limit = parseInt(process.argv[4])
const wordLen = word.length

function distance(a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  // TODO: implement and return the Levenshtein edit distance
}

const start = Date.now()
const results = []
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
rl.on('line', line => {
  if (limit > 0 && results.length >= limit) return
  const candidate = line.trim()
  if (!candidate) return
  if (Math.abs(candidate.length - wordLen) <= delta && distance(word, candidate) === delta)
    results.push(candidate)
})
rl.on('close', () => {
  process.stdout.write(JSON.stringify({ duration_ms: Date.now() - start, results }) + '\n')
})
```

---

## API

### `POST /api/search/custom`

Executes user-submitted code as a subprocess against the same word list.

**Request:**
```json
{
  "word": "amazing",
  "delta": 2,
  "limit": 10,
  "trgm": false,
  "code": "...",
  "language": "python"   // "python" | "node"
}
```

**Response:** same shape as all other engines
```json
{ "duration_ms": 142, "results": ["amazing", ...] }
```

**Server behaviour:**
1. Decode request, validate `language` is `"python"` or `"node"`.
2. Write `code` to a temp file (`os.CreateTemp`) with the correct extension (`.py` / `.js`).
3. Execute via `runSubprocess` — same function already used for Python and Node engines.
4. Delete temp file (`defer os.Remove`).
5. Return `EngineResult` JSON.

**Error handling:** if the subprocess exits non-zero (syntax error, runtime crash, timeout), return `{"duration_ms": 0, "results": []}` — the "You" card shows `error` state, same as the other engines.

### `GET /api/source/{engine}`

Returns the raw source of a built-in engine for the hover hint.

**Engines:** `go` | `cpp` | `py` | `node`

**Response:** `Content-Type: text/plain`, raw source file content.

**File map:**
| engine | file |
|--------|------|
| `go`   | `engines/go/levenshtein.go` |
| `cpp`  | `engines/cpp/levenshtein.cpp` |
| `py`   | `engines/python/levenshtein.py` |
| `node` | `engines/node/levenshtein.js` |

---

## Frontend Components

### `CodeBoard.jsx`
Props: `onRun(code, language)`, `loading`, `hasParams`

- Language tab state (Python default)
- Monaco editor, switches language mode on tab change
- Switching language resets editor to the corresponding starter template
- **Run** button disabled when `loading` or `!hasParams` (no search has been performed yet)
- Shows a hint under the editor: `"Run will re-race all engines under your last search"`

### `EngineCard.jsx` (refactor from inline Speedometer)
Currently the `Speedometer` component renders both the timer and the label. Extract engine-card hover behaviour here:

- On mouse-enter: fetch `GET /api/source/{engine}`, cache result in a ref (don't re-fetch).
- Show source in a fixed-height scrollable popover (dark theme, monospace font).
- Popover appears above the card; `z-index` high enough to clear other content.
- "You" card has no hover source (no engine key to fetch).

### `App.jsx` changes
- Add `showBoard` state (default `false`).
- Add `lastParams` state (default `null`) — set on every `handleSearch`.
- Add `userEngine` state — same shape as other engine states.
- Extract core fetch loop into `runAll(params, customCode, customLang)`.
  - `handleSearch(form)` → stores `lastParams`, calls `runAll(form, null, null)`.
  - `handleRun(code, lang)` → calls `runAll(lastParams, code, lang)`.
- When `showBoard` is true: render 5-column grid including "You" card.
- Results panel still shows Go engine results.

---

## CSS changes

- `.gauges-grid` gains a modifier `.five` for 5 columns when board is open.
- `.board-toggle` — full-width clickable bar with subtle border, chevron rotates on open.
- `.code-board` — card styling matching existing `.card`, contains header row + Monaco.
- `.lang-tab` — tab button, active state matches existing button style.
- `.source-popover` — dark scrollable code box, max-height 400px.

---

## Implementation order

1. `feature/code-playground` branch
2. Backend: `SearchCustom` handler + `SourceHandler` + routes in `main.go`
3. Frontend: `CodeBoard.jsx` + Monaco install
4. Frontend: toggle + "You" card in `App.jsx`
5. Frontend: hover source popover in engine cards
6. Test locally, then `make up` on DigitalOcean

---

## Out of scope (for now)

- Go and C++ user submissions (require compilation step)
- Execution timeout / resource limits
- Saving or sharing user code
- Multiple simultaneous users submitting code (no queue — acceptable for a portfolio project)
