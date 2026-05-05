DB_URL := postgres://nearestword:nearestword@localhost:5434/nearestword?sslmode=disable

.PHONY: db seed server stop up down build dev

db:
	docker compose up -d db

seed:
	DATABASE_URL="$(DB_URL)" go run ./cmd/seed/main.go

server:
	@lsof -ti :8080 | xargs kill 2>/dev/null || true
	DATABASE_URL="$(DB_URL)" go run ./server/main.go

stop:
	@lsof -ti :8080 | xargs kill 2>/dev/null || true
	@echo "server stopped"

build:
	cd frontend && npm run build

dev:
	cd frontend && npm run dev

up:
	docker compose up --build -d

down:
	docker compose down
