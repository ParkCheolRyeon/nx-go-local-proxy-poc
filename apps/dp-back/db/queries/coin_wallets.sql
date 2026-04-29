-- name: CreateCoinWallet :one
INSERT INTO coin_wallets (user_id)
VALUES ($1)
RETURNING *;

-- name: GetCoinWallet :one
SELECT * FROM coin_wallets
WHERE user_id = $1;