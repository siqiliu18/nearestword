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
}

export default function CodeBoard({ onRun, loading, hasParams }) {
  const [lang, setLang] = useState('python')
  const [code, setCode] = useState(TEMPLATES.python)

  function distanceHasReturn(src, language) {
    const sigPy  = 'def distance('
    const endPy  = 'def main('
    const sigJs  = 'function distance('
    const endJs  = 'const start'
    const [sig, end] = language === 'python' ? [sigPy, endPy] : [sigJs, endJs]
    const from = src.indexOf(sig)
    if (from === -1) return true
    const to = src.indexOf(end, from)
    const body = to === -1 ? src.slice(from) : src.slice(from, to)
    return /\breturn\s+\S/.test(body)
  }

  const notImplemented = !distanceHasReturn(code, lang)

  function handleLangChange(newLang) {
    setLang(newLang)
    setCode(TEMPLATES[newLang])
  }

  return (
    <div className="code-board">
      <div className="code-board-header">
        <div className="lang-tabs">
          <button
            className={`lang-tab${lang === 'python' ? ' active' : ''}`}
            onClick={() => handleLangChange('python')}
          >Python</button>
          <button
            className={`lang-tab${lang === 'node' ? ' active' : ''}`}
            onClick={() => handleLangChange('node')}
          >Node.js</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!hasParams && (
            <span className="hint" style={{ fontStyle: 'normal', fontSize: '0.8rem' }}>
              run a search first
            </span>
          )}
          <button
            className="run-btn"
            onClick={() => onRun(code, lang)}
            disabled={loading || !hasParams || notImplemented}
          >
            {loading ? 'Racing…' : '▶ Run'}
          </button>
        </div>
      </div>
      {notImplemented && (
        <div className="board-warning">
          ⚠ <code>distance(a, b)</code> is not implemented yet — results will be empty
        </div>
      )}
      <Editor
        height="300px"
        language={lang === 'node' ? 'javascript' : 'python'}
        value={code}
        onChange={val => setCode(val ?? '')}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          tabSize: 2,
        }}
      />
      <p className="hint" style={{ padding: '6px 0 0', fontSize: '0.75rem' }}>
        Implement <code>distance(a, b)</code> — Run re-races all engines under your last search
      </p>
    </div>
  )
}
