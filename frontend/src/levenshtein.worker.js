import { search } from './levenshtein.js'

self.onmessage = ({ data: { query, delta, limit, words } }) => {
  const start = performance.now()
  const results = search(query, delta, limit, words)
  const duration_ms = Math.round(performance.now() - start)
  self.postMessage({ results, duration_ms })
}
