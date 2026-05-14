-- name: InsertTokenIssuanceLog :exec
INSERT INTO token_issuance_log (id, user_id, event, access_jti, refresh_id, user_agent, ip_address)
VALUES ($1, $2, $3, $4, $5, $6, $7);
