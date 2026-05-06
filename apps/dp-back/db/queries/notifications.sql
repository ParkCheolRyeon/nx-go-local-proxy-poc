-- name: ListNotificationsByUser :many
-- category 가 NULL 이면 전체. 최근순.
SELECT *
FROM notifications
WHERE user_id = sqlc.arg('user_id')
    AND (sqlc.narg('category')::text IS NULL OR category = sqlc.narg('category')::text)
ORDER BY created_at DESC
LIMIT  sqlc.arg('lim')::int
OFFSET sqlc.arg('off')::int;

-- name: GetUnreadNotificationCount :one
SELECT COUNT(*)::int AS count
FROM notifications
WHERE user_id = $1 AND read_status = 'unRead';

-- name: MarkNotificationRead :exec
UPDATE notifications
SET read_status = 'read'
WHERE id = $1 AND user_id = $2 AND read_status = 'unRead';

-- name: MarkAllNotificationsRead :exec
UPDATE notifications
SET read_status = 'read'
WHERE user_id = $1 AND read_status = 'unRead';

-- name: CreateNotification :one
-- dev seed / 시스템 트리거 (R12 결제, R13 수상 등에서 호출 예정).
INSERT INTO notifications (id, user_id, category, title, description, icon, cta)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
