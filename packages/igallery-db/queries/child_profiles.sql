-- name: ListChildProfilesByUser :many
SELECT *
FROM child_profiles
WHERE user_id = $1
    AND deleted_at IS NULL
ORDER BY created_at ASC;

-- name: CountActiveChildProfilesByUser :one
SELECT COUNT(*)::int AS count
FROM child_profiles
WHERE user_id = $1
    AND deleted_at IS NULL;

-- name: GetChildProfile :one
SELECT *
FROM child_profiles
WHERE id = $1
    AND user_id = $2
    AND deleted_at IS NULL;

-- name: CreateChildProfile :one
INSERT INTO child_profiles (id, user_id, name, birth_date, profile_emoji, drawing_level)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateChildProfile :one
UPDATE child_profiles
SET
    name          = COALESCE(sqlc.narg('name'),          name),
    birth_date    = COALESCE(sqlc.narg('birth_date'),    birth_date),
    profile_emoji = COALESCE(sqlc.narg('profile_emoji'), profile_emoji),
    drawing_level = COALESCE(sqlc.narg('drawing_level'), drawing_level)
WHERE id = sqlc.arg('id')
    AND user_id = sqlc.arg('user_id')
    AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteChildProfile :exec
UPDATE child_profiles
SET deleted_at = NOW()
WHERE id = $1
    AND user_id = $2
    AND deleted_at IS NULL;