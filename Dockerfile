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

RUN apt-get update && apt-get install -y python3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder   /app/nearestword-server       ./nearestword-server
COPY --from=builder   /app/engines/cpp/levenshtein  ./engines/cpp/levenshtein
COPY --from=frontend-builder /app/frontend/dist      ./frontend/dist
COPY engines/python/  engines/python/
COPY data/words.txt   data/words.txt

EXPOSE 8080
CMD ["./nearestword-server"]
