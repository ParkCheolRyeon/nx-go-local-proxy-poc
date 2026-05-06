-- name: InsertCoinLedger :exec
INSERT INTO coin_ledgers (id, user_id, delta, reason, balance_after, ref_id)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: ListCoinLedgersByUser :many
SELECT * FROM coin_ledgers
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
