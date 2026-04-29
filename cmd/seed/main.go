package main

import (
	"bufio"
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://nearestword:nearestword@localhost:5432/nearestword"
	}

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	f, err := os.Open("data/words.txt")
	if err != nil {
		log.Fatalf("open words: %v", err)
	}
	defer f.Close()

	seen := make(map[string]struct{})
	var rows [][]any
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		w := sc.Text()
		if w == "" {
			continue
		}
		if _, dup := seen[w]; dup {
			continue
		}
		seen[w] = struct{}{}
		rows = append(rows, []any{w})
	}
	if err := sc.Err(); err != nil {
		log.Fatalf("read words: %v", err)
	}
	log.Printf("read %d unique words", len(rows))

	conn, err := pool.Acquire(ctx)
	if err != nil {
		log.Fatalf("acquire conn: %v", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "TRUNCATE words RESTART IDENTITY"); err != nil {
		log.Fatalf("truncate: %v", err)
	}

	count, err := conn.Conn().CopyFrom(ctx,
		pgx.Identifier{"words"},
		[]string{"word"},
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		log.Fatalf("copy: %v", err)
	}
	log.Printf("seeded %d words", count)
}
