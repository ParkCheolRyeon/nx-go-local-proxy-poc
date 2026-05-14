-- name: UpsertPushToken :one
-- 같은 user+token 이 들어오면 last_seen_at 만 갱신 (재로그인/앱 재실행 시 호출).
INSERT INTO push_tokens (id, user_id, platform, token)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, token)
DO UPDATE SET last_seen_at = NOW()
RETURNING *;

-- name: DeletePushToken :exec
DELETE FROM push_tokens
WHERE user_id = $1 AND token = $2;
