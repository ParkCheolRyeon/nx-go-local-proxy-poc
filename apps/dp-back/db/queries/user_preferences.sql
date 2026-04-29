-- name: CreateUserPreferences :one
INSERT INTO user_preferences (user_id)
VALUES ($1)
RETURNING *;

-- name: GetUserPreferences :one
SELECT * FROM user_preferences
WHERE user_id = $1;