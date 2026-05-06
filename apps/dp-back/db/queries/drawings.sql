-- name: ListDrawingsByChild :many
-- 마이갤러리 보관함/공개작품 통합 쿼리.
-- status / visibility / month 필터는 nullable 인자로 단일 쿼리 처리.
-- month 는 'YYYY-MM' 형식. NULL 이면 전체 기간.
SELECT d.*
FROM drawings d
JOIN child_profiles c ON c.id = d.child_profile_id
WHERE d.child_profile_id = sqlc.arg('child_profile_id')
    AND c.user_id = sqlc.arg('user_id')
    AND d.deleted_at IS NULL
    AND c.deleted_at IS NULL
    AND (sqlc.narg('status')::text IS NULL OR d.status = sqlc.narg('status')::text)
    AND (sqlc.narg('only_public')::boolean IS NULL
         OR sqlc.narg('only_public')::boolean = FALSE
         OR (d.is_public = TRUE AND d.status = 'completed'))
    AND (sqlc.narg('month_start')::timestamptz IS NULL
         OR d.created_at >= sqlc.narg('month_start')::timestamptz)
    AND (sqlc.narg('month_end')::timestamptz IS NULL
         OR d.created_at <  sqlc.narg('month_end')::timestamptz)
ORDER BY d.created_at DESC
LIMIT  sqlc.arg('lim')::int
OFFSET sqlc.arg('off')::int;

-- name: GetDrawing :one
-- 단건 조회 + 소유권(자녀의 부모 == 요청 유저) 검증.
SELECT d.*
FROM drawings d
JOIN child_profiles c ON c.id = d.child_profile_id
WHERE d.id = $1
    AND c.user_id = $2
    AND d.deleted_at IS NULL
    AND c.deleted_at IS NULL;

-- name: CreateDrawing :one
INSERT INTO drawings (
    id, child_profile_id, mode, title,
    thumbnail_url, image_url, timelapse_url,
    is_public, status, completed_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: UpdateDrawing :one
-- 부분 갱신 (title / is_public / status / completed_at). 각 필드는 NULL 이면 미변경.
-- status='completed' 로 전이될 때 completed_at 도 같이 채워야 CHECK 통과.
UPDATE drawings d
SET
    title         = COALESCE(sqlc.narg('title'),         d.title),
    is_public     = COALESCE(sqlc.narg('is_public'),     d.is_public),
    status        = COALESCE(sqlc.narg('status'),        d.status),
    completed_at  = COALESCE(sqlc.narg('completed_at'),  d.completed_at)
WHERE d.id = sqlc.arg('id')
    AND d.child_profile_id IN (
        SELECT c.id FROM child_profiles c
        WHERE c.user_id = sqlc.arg('user_id') AND c.deleted_at IS NULL
    )
    AND d.deleted_at IS NULL
RETURNING d.*;

-- name: SoftDeleteDrawing :exec
UPDATE drawings d
SET deleted_at = NOW()
WHERE d.id = $1
    AND d.child_profile_id IN (
        SELECT c.id FROM child_profiles c
        WHERE c.user_id = $2 AND c.deleted_at IS NULL
    )
    AND d.deleted_at IS NULL;
