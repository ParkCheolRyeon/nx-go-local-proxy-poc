-- name: CreateUserPreferences :one
INSERT INTO user_preferences (user_id)
VALUES ($1)
RETURNING *;

-- name: GetUserPreferences :one
SELECT * FROM user_preferences
WHERE user_id = $1;

-- name: UpdateUserPreferences :one
UPDATE user_preferences
SET
    notif_drawing   = $2,
    notif_event     = $3,
    notif_system    = $4,
    notif_marketing = $5,
    dnd_enabled     = $6,
    dnd_start       = $7,
    dnd_end         = $8,
    safe_mode       = $9,
    payment_lock    = $10,
    together_chat   = $11
  WHERE user_id = $1
  RETURNING *;

-- name: PatchUserPreferences :one
UPDATE user_preferences
SET
    notif_drawing   = COALESCE(sqlc.narg('notif_drawing'),   notif_drawing),
    notif_event     = COALESCE(sqlc.narg('notif_event'),     notif_event),
    notif_system    = COALESCE(sqlc.narg('notif_system'),    notif_system),
    notif_marketing = COALESCE(sqlc.narg('notif_marketing'), notif_marketing),
    dnd_enabled     = COALESCE(sqlc.narg('dnd_enabled'),     dnd_enabled),
    dnd_start       = COALESCE(sqlc.narg('dnd_start'),       dnd_start),
    dnd_end         = COALESCE(sqlc.narg('dnd_end'),         dnd_end),
    safe_mode       = COALESCE(sqlc.narg('safe_mode'),       safe_mode),
    payment_lock    = COALESCE(sqlc.narg('payment_lock'),    payment_lock),
    together_chat   = COALESCE(sqlc.narg('together_chat'),   together_chat)
  WHERE user_id = $1
  RETURNING *;
