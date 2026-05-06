-- name: CreateUser :one
INSERT INTO users (id, email, password_hash, name)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE lower(email) = lower($1) AND deleted_at IS NULL;

-- name: PatchUserLocaleCountry :one
UPDATE users
SET
    locale  = COALESCE(sqlc.narg('locale'),  locale),
    country = COALESCE(sqlc.narg('country'), country)
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: UpdatePasswordHash :exec
UPDATE users
SET password_hash = $2
WHERE id = $1 AND deleted_at IS NULL;