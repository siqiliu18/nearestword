import { useState } from 'react'
import Editor from '@monaco-editor/react'

const TEMPLATES = {
  python: `import sys, json, time

def distance(a, b):
    a, b = a.lower(), b.lower()
    m, n = len(a), len(b)
    # TODO: implement Levenshtein edit distance

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
        candidate = line.rstrip('\\n')
        if not candidate:
            continue
        if abs(len(candidate) - word_len) <= delta and distance(word, candidate) == delta:
            results.append(candidate)
    print(json.dumps({'duration_ms': int((time.time() - start) * 1000), 'results': results}))

if __name__ == '__main__':
    main()
`,
  node: `const readline = require('readline')
const word  = process.argv[2]
const delta = parseInt(process.argv[3])
const limit = parseInt(process.argv[4])
const wordLen = word.length

function distance(a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  // TODO: implement Levenshtein edit distance
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
  process.stdout.write(JSON.stringify({ duration_ms: Date.now() - start, results }) + '\\n')
})
`,
  go: `// Add imports if needed, e.g.:
// import "strings"

func distance(a, b string) int {
	// TODO: implement Levenshtein edit distance
}
`,
  cpp: `// Add includes or using directives if needed, e.g.:
// #include <algorithm>
// using namespace std;

int distance(const std::string& a, const std::string& b) {
	// TODO: implement Levenshtein edit distance
}
`,
}

const MONACO_LANG = { python: 'python', node: 'javascript', go: 'go', cpp: 'cpp' }
const COMPILED_LANGS = new Set(['go', 'cpp'])

export default function CodeBoard({ onRun, onCompile, onLangChange, loading, hasParams }) {
  const [lang, setLang]               = useState('python')
  const [code, setCode]               = useState(TEMPLATES.python)
  const [compileState, setCompileState] = useState('idle') // idle | compiling | compiled | error
  const [compileError, setCompileError] = useState('')

  const isCompiled = COMPILED_LANGS.has(lang)

  function distanceHasReturn(src, language) {
    const patterns = {
      python: { sig: 'def distance(',      end: 'def main(' },
      node:   { sig: 'function distance(', end: 'const start' },
      go:     { sig: 'func distance(',     end: null },
      cpp:    { sig: 'distance(',          end: null },
    }
    const p = patterns[language]
    if (!p) return true
    const from = src.indexOf(p.sig)
    if (from === -1) return true
    const to = p.end ? src.indexOf(p.end, from) : -1
    const body = to === -1 ? src.slice(from) : src.slice(from, to)
    return /\breturn\s+\S/.test(body)
  }

  const notImplemented = !distanceHasReturn(code, lang)

  function handleLangChange(newLang) {
    setLang(newLang)
    setCode(TEMPLATES[newLang])
    setCompileState('idle')
    setCompileError('')
    onLangChange?.()
  }

  function handleCodeChange(val) {
    setCode(val ?? '')
    if (compileState === 'compiled') setCompileState('idle')
  }

  function handleCompileClick() {
    setCompileState('compiling')
    setCompileError('')
    onCompile(code, lang, (ok, errText) => {
      setCompileState(ok ? 'compiled' : 'error')
      if (!ok) setCompileError(errText || 'compilation failed')
    })
  }

  return (
    <div className="code-board">
      <div className="code-board-header">
        <div className="lang-tabs">
          {['python', 'node', 'go', 'cpp'].map(l => (
            <button
              key={l}
              className={`lang-tab${lang === l ? ' active' : ''}`}
              onClick={() => handleLangChange(l)}
            >
              {{ python: 'Python', node: 'Node.js', go: 'Go', cpp: 'C++' }[l]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCompiled ? (
            <>
              {compileState === 'compiled' ? (
                <>
                  <span style={{ fontSize: '0.75rem', color: '#1a7a3a', fontWeight: 600 }}>✓ compiled</span>
                  {!hasParams && (
                    <span className="hint" style={{ fontStyle: 'normal', fontSize: '0.8rem' }}>run a search first</span>
                  )}
                  <button
                    className="run-btn"
                    onClick={() => onRun(code, lang)}
                    disabled={loading || !hasParams}
                  >
                    {loading ? 'Racing…' : '▶ Run'}
                  </button>
                </>
              ) : (
                <button
                  className="compile-btn"
                  onClick={handleCompileClick}
                  disabled={loading || notImplemented || compileState === 'compiling'}
                >
                  {compileState === 'compiling' ? 'Compiling…' : 'Compile'}
                </button>
              )}
            </>
          ) : (
            <>
              {!hasParams && (
                <span className="hint" style={{ fontStyle: 'normal', fontSize: '0.8rem' }}>run a search first</span>
              )}
              <button
                className="run-btn"
                onClick={() => onRun(code, lang)}
                disabled={loading || !hasParams || notImplemented}
              >
                {loading ? 'Racing…' : '▶ Run'}
              </button>
            </>
          )}
        </div>
      </div>

      {notImplemented && (
        <div className="board-warning">
          ⚠ <code>distance</code> is not implemented yet
          {isCompiled ? ' — implement it to enable compilation' : ' — results will be empty'}
        </div>
      )}
      {compileState === 'error' && (
        <div className="compile-error">
          <div className="compile-error-title">Compile error:</div>
          <pre className="compile-error-body">{compileError}</pre>
        </div>
      )}

      <Editor
        height="300px"
        language={MONACO_LANG[lang]}
        value={code}
        onChange={handleCodeChange}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          tabSize: isCompiled ? 4 : 2,
        }}
      />
      <p className="hint" style={{ padding: '6px 0 0', fontSize: '0.75rem' }}>
        {isCompiled
          ? <>Implement <code>distance</code> — Compile once, then Run to race</>
          : <>Implement <code>distance(a, b)</code> — Run re-races all engines under your last search</>
        }
      </p>
    </div>
  )
}
