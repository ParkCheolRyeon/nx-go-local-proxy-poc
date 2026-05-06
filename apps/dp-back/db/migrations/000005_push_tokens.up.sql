-- ============================================================================
-- 000005_push_tokens.up.sql
-- 디바이스 푸시 토큰 (FCM / APNs / WebPush) 보관.
-- 동일 (user, token) 중복 방지. last_seen_at 으로 stale 토큰 정리 가능.
-- ============================================================================

CREATE TABLE push_tokens (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform     TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
    token        TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);

CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);
