-- name: CreateCoinWallet :one
INSERT INTO coin_wallets (user_id)
VALUES ($1)
RETURNING *;

-- name: GetCoinWallet :one
SELECT * FROM coin_wallets
WHERE user_id = $1;

-- name: ApplyDailyTopupToZeroBalance :many
-- 잔액 0인 지갑 중 7일 내 충전 권리가 남은 사용자에게 1개 충전 + remaining_days 1 차감.
-- 반환: 충전된 사용자의 user_id 목록 (원장 기록용).
UPDATE coin_wallets
SET holding_coins = 1,
    daily_topup_remaining_days = daily_topup_remaining_days - 1
WHERE daily_topup_remaining_days > 0 AND holding_coins = 0
RETURNING user_id;

-- name: DecrementTopupRemainingDays :exec
-- 잔액이 있는 지갑은 충전 X, 7일 카운터만 차감 (8일째 자동 종료 보장).
UPDATE coin_wallets
SET daily_topup_remaining_days = daily_topup_remaining_days - 1
WHERE daily_topup_remaining_days > 0 AND holding_coins > 0;

-- name: SpendCoin :one
-- 도안 진입 시 1개 차감. 잔액 부족 시 row 0개 (UPDATE WHERE 실패).
UPDATE coin_wallets
SET holding_coins = holding_coins - 1
WHERE user_id = $1 AND holding_coins > 0
RETURNING *;
