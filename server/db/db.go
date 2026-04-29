package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, connStr string) (*DB, error) {
	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &DB{pool: pool}, nil
}

func (d *DB) Close() {
	d.pool.Close()
}

// TrigramCandidates returns words whose trigram similarity to query exceeds threshold.
// Used as a pre-filter before exact Levenshtein computation.
func (d *DB) TrigramCandidates(ctx context.Context, query string, threshold float64) ([]string, error) {
	rows, err := d.pool.Query(ctx,
		`SELECT word FROM words WHERE similarity(word, $1) > $2`,
		query, threshold,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var words []string
	for rows.Next() {
		var w string
		if err := rows.Scan(&w); err != nil {
			return nil, err
		}
		words = append(words, w)
	}
	return words, rows.Err()
}
