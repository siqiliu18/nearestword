import sys
import json
import time


def distance(a, b):
    a, b = a.lower(), b.lower()
    m, n = len(a), len(b)
    prev = list(range(n + 1))
    curr = [0] * (n + 1)
    for i in range(1, m + 1):
        curr[0] = i
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]
            else:
                curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1])
        prev, curr = curr, prev
    return prev[n]


def main():
    word = sys.argv[1]
    delta = int(sys.argv[2])
    limit = int(sys.argv[3])
    word_len = len(word)

    start = time.time()
    results = []
    for line in sys.stdin:
        if limit > 0 and len(results) == limit:
            break
        candidate = line.rstrip("\n")
        if not candidate:
            continue
        if abs(len(candidate) - word_len) <= delta and distance(word, candidate) == delta:
            results.append(candidate)

    duration_ms = int((time.time() - start) * 1000)
    print(json.dumps({"duration_ms": duration_ms, "results": results}))


if __name__ == "__main__":
    main()
