package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type sqlQuerier interface {
	Exec(query string, args ...any) (sql.Result, error)
	QueryRow(query string, args ...any) *sql.Row
	Query(query string, args ...any) (*sql.Rows, error)
}

type DB struct {
	conn sqlQuerier
	raw  *sql.DB
	log  *slog.Logger
}

func New(connString string, log *slog.Logger) (*DB, error) {
	sep := "?"
	if strings.Contains(connString, "?") {
		sep = "&"
	}
	connString += sep + "default_query_exec_mode=cache_describe"

	raw, err := sql.Open("pgx", connString)
	if err != nil {
		return nil, fmt.Errorf("open pgx: %w", err)
	}
	return &DB{conn: raw, raw: raw, log: log}, nil
}

func (db *DB) Close() error {
	return db.raw.Close()
}

func (db *DB) Raw() *sql.DB { return db.raw }

func (db *DB) QueryRow(query string, args ...any) *sql.Row {
	return db.conn.QueryRow(query, args...)
}

func (db *DB) Exec(query string, args ...any) (sql.Result, error) {
	return db.conn.Exec(query, args...)
}

func (db *DB) RunInTx(fn func(*DB) error) error {
	tx, err := db.raw.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	txDB := &DB{conn: tx, raw: db.raw, log: db.log}
	if err := fn(txDB); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func escapeLikePattern(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}
