# Stage 1 — build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2 — build Go server and C++ engine
FROM golang:1.25-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y g++ && rm -rf /var/lib/apt/lists/*

COPY engines/cpp/ engines/cpp/
RUN g++ -O2 -std=c++17 -o engines/cpp/levenshtein engines/cpp/levenshtein.cpp

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o nearestword-server ./server/

# Stage 3 — runtime
FROM debian:bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y python3 nodejs ca-certificates g++ && rm -rf /var/lib/apt/lists/*

# Copy Go toolchain from builder for user code compilation
COPY --from=builder /usr/local/go /usr/local/go
ENV PATH="$PATH:/usr/local/go/bin"
ENV GOPATH=/tmp/gopath
ENV GOCACHE=/tmp/gocache
ENV GOTOOLCHAIN=local

COPY --from=builder          /app/nearestword-server       ./nearestword-server
COPY --from=builder          /app/engines/cpp/levenshtein  ./engines/cpp/levenshtein
COPY --from=frontend-builder /app/frontend/dist            ./frontend/dist
COPY engines/python/  engines/python/
COPY engines/node/    engines/node/
COPY data/words.txt   data/words.txt

EXPOSE 8080
CMD ["./nearestword-server"]
