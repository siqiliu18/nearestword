DB_URL := postgres://nearestword:nearestword@localhost:5434/nearestword?sslmode=disable

.PHONY: db seed server stop

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
