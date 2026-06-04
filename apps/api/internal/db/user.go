package db

import (
	model "github.com/BBruington/party-planner/api/internal/models"
)

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

func (db *DB) CreateUser(user *model.CreateUserRequest) (*model.User, error) {
	row := db.conn.QueryRow(`
		INSERT INTO users (external_id, email, avatar, first_name, last_name)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+userColumns,
		user.ExternalId, user.Email, user.Avatar, user.FirstName, user.LastName,
	)
	return scanUser(row)
}

func (db *DB) DeleteUser(clerkId string) (*model.User, error) {
	row := db.conn.QueryRow(`
		UPDATE users SET deleted_at = NOW(), updated_at = NOW()
		WHERE external_id = $1 AND deleted_at IS NULL
		RETURNING `+userColumns, clerkId)
	return scanUser(row)
}

func (db *DB) GetUserByClerkId(clerkId string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE external_id = $1 AND deleted_at IS NULL LIMIT 1`, clerkId)
	return scanUser(row)
}

func (db *DB) GetUserByEmail(email string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`, email)
	return scanUser(row)
}

func (db *DB) GetUserById(userId string) (*model.User, error) {
	row := db.conn.QueryRow(`SELECT `+userColumns+` FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, userId)
	return scanUser(row)
}

func (db *DB) UpdateUserByClerkId(user *model.UpdateUserRequest) (*model.User, error) {
	row := db.conn.QueryRow(`
		UPDATE users SET avatar = $1, first_name = $2, last_name = $3, updated_at = NOW()
		WHERE external_id = $4 AND deleted_at IS NULL
		RETURNING `+userColumns,
		user.Avatar, user.FirstName, user.LastName, user.ExternalId,
	)
	return scanUser(row)
}
