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

export function search(query, delta, limit, words) {
  const qlen = query.length
  const results = []
  for (const word of words) {
    if (results.length >= limit) break
    if (Math.abs(word.length - qlen) <= delta && distance(query, word) === delta)
      results.push(word)
  }
  return results
}
