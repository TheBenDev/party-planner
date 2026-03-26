package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"

	model "github.com/BBruington/party-planner/api/internal/models"
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

const userColumns = `id, external_id, email, avatar, first_name, last_name, deleted_at, created_at, updated_at`

func scanUser(row interface{ Scan(...any) error }) (*model.User, error) {
	var u model.User
	err := row.Scan(
		&u.ID, &u.ExternalId, &u.Email, &u.Avatar, &u.FirstName, &u.LastName,
		&u.DeletedAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) GetUserByClerkId(userId string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE external_id = $1 LIMIT 1`, userId)

	return scanUser(row)
}
