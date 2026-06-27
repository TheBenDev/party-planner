package pg

import (
	"context"
	"database/sql"
)

// Querier is satisfied by *sql.DB and *sql.Tx, allowing domain DB types to
// work with both plain connections and in-progress transactions.
type Querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}
