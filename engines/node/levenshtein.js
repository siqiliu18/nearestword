const readline = require('readline')

const word  = process.argv[2]
const delta = parseInt(process.argv[3])
const limit = parseInt(process.argv[4])
const wordLen = word.length

function distance(a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
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
