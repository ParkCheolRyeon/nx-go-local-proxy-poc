-- name: CreateAgreementRecord :one
INSERT INTO agreement_records (id, user_id, terms_version, privacy_accepted, marketing_accepted)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;