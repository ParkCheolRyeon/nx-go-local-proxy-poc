-- ============================================================================
-- 000003_token_issuance_log.up.sql
--
-- 토큰 발행 감사 로그 (영구 보존, append-only)
-- access/refresh 발급/회전/폐기 기록. 보안 사고 추적용.
-- 실시간 토큰 검증은 Redis가 담당. 이 테이블은 사후 감사 전용.
-- ============================================================================

CREATE TABLE token_issuance_log (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event        TEXT NOT NULL CHECK (event IN ('signin','refresh','logout','revoke_all')),
    access_jti   TEXT,
    refresh_id   TEXT,
    user_agent   TEXT,
    ip_address   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX token_issuance_log_user_recent_idx
    ON token_issuance_log (user_id, created_at DESC);

CREATE INDEX token_issuance_log_event_idx
    ON token_issuance_log (event, created_at DESC);
