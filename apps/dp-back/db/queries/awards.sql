-- name: ListAwardsByChild :many
-- 수상작 탭. award + drawing 필드 조인.
SELECT
    a.id              AS award_id,
    a.rank            AS rank,
    a.event_id        AS event_id,
    a.awarded_at      AS awarded_at,
    d.id              AS drawing_id,
    d.mode            AS mode,
    d.title           AS title,
    d.thumbnail_url   AS thumbnail_url,
    d.image_url       AS image_url,
    d.timelapse_url   AS timelapse_url,
    d.is_public       AS is_public,
    d.completed_at    AS completed_at
FROM awards a
JOIN drawings d        ON d.id = a.drawing_id
JOIN child_profiles c  ON c.id = a.child_profile_id
WHERE a.child_profile_id = sqlc.arg('child_profile_id')
    AND c.user_id = sqlc.arg('user_id')
    AND d.deleted_at IS NULL
    AND c.deleted_at IS NULL
ORDER BY a.awarded_at DESC
LIMIT  sqlc.arg('lim')::int
OFFSET sqlc.arg('off')::int;

-- name: CreateAward :one
-- 향후 R13 모더레이션 승인 후 호출. R9 단계엔 dev seed 용으로도 쓰임.
INSERT INTO awards (id, drawing_id, child_profile_id, event_id, rank)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
