-- name: CreateSupportInquiry :one
INSERT INTO support_inquiries (id, user_id, subject, message)
VALUES ($1, $2, $3, $4)
RETURNING *;
