-- ============================================================================
-- 000002_init_schema.up.sql
--
-- 1) 기존 users 테이블 확장
-- 2) 신규 테이블 13개
-- 3) updated_at 자동 갱신 트리거
-- 4) 운영에 필요한 인덱스
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. updated_at 자동 갱신 트리거 함수
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS — 가족 계정(부모)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN email            TEXT,
    ADD COLUMN password_hash    TEXT,
    ADD COLUMN description      TEXT,
    ADD COLUMN avatar           TEXT,
    ADD COLUMN locale           TEXT NOT NULL DEFAULT 'ko',
    ADD COLUMN country          TEXT NOT NULL DEFAULT 'KR',
    ADD COLUMN marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN deleted_at       TIMESTAMPTZ;

-- email/password_hash 는 OAuth 단독 가입을 허용하기 위해 nullable.
-- 이메일 가입 사용자에 대해서는 service 단에서 not-null 강제.

CREATE UNIQUE INDEX users_email_key
    ON users (lower(email))
    WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. OAUTH_ACCOUNTS — 소셜 로그인 연결
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE oauth_accounts (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT NOT NULL CHECK (provider IN ('google','kakao','apple','naver')),
    provider_user_id TEXT NOT NULL,
    email            TEXT,
    linked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX oauth_accounts_user_idx ON oauth_accounts (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHILD_PROFILES — 자녀 프로필 (1 user : N children, max 5)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE child_profiles (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    birth_date     DATE NOT NULL,
    profile_emoji  TEXT NOT NULL CHECK (profile_emoji IN
                        ('lion','bear','rabbit','panda','fox','dog','cat','unikorn')),
    drawing_level  TEXT NOT NULL CHECK (drawing_level IN
                        ('beginner','intermediate','expert')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE INDEX child_profiles_user_idx ON child_profiles (user_id) WHERE deleted_at IS NULL;
-- "max 5/user" 는 service 단에서 enforce (테이블 제약으로 표현 어려움)

CREATE TRIGGER child_profiles_set_updated_at
    BEFORE UPDATE ON child_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SUBSCRIPTIONS — 구독 이력 (1 user : N rows)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan          TEXT NOT NULL CHECK (plan IN ('monthly','yearly','pro')),
    status        TEXT NOT NULL CHECK (status IN ('active','canceled','expired','refunded')),
    started_at    TIMESTAMPTZ NOT NULL,
    ends_at       TIMESTAMPTZ NOT NULL,
    canceled_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subscriptions_user_active_idx
    ON subscriptions (user_id)
    WHERE status = 'active';
CREATE INDEX subscriptions_user_history_idx
    ON subscriptions (user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COIN_WALLETS — 지갑 (1 user : 1 row)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE coin_wallets (
    user_id                    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    holding_coins              INT NOT NULL DEFAULT 3 CHECK (holding_coins >= 0),
    monthly_coin_allowance     INT NOT NULL DEFAULT 0,
    daily_topup_remaining_days SMALLINT NOT NULL DEFAULT 7
        CHECK (daily_topup_remaining_days BETWEEN 0 AND 7),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER coin_wallets_set_updated_at
    BEFORE UPDATE ON coin_wallets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();



-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COIN_LEDGERS — 코인 변동 이력 (감사/디버깅 용)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE coin_ledgers (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta           INT  NOT NULL,
    reason          TEXT NOT NULL CHECK (reason IN
                        ('signup_grant','daily_topup','purchase','drawing_use',
                        'admin_adjust','refund','expire')),
    balance_after   INT  NOT NULL CHECK (balance_after >= 0),
    ref_id          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX coin_ledgers_user_history_idx
    ON coin_ledgers (user_id, created_at DESC);



-- ─────────────────────────────────────────────────────────────────────────────
-- 7. EVENTS — 이벤트 마스터
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE events (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    subtitle          TEXT,
    image_url         TEXT,
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    status            TEXT NOT NULL CHECK (status IN ('not_open','open','end')),
    participant_count INT  NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at)
);

CREATE INDEX events_status_start_idx ON events (status, start_at DESC);

CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. EVENT_PARTICIPATIONS — 출품 (현재 UI 미렌더, 후속 phase)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE event_participations (
    id               TEXT PRIMARY KEY,
    event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    child_profile_id TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, child_profile_id)
);

CREATE INDEX event_participations_event_idx ON event_participations (event_id);
CREATE INDEX event_participations_child_idx ON event_participations (child_profile_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. NOTIFICATIONS — 사용자별 알림 인박스
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category      TEXT NOT NULL CHECK (category IN ('contest','social','coin','system')),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL,
    icon          TEXT,
    cta           TEXT,
    read_status   TEXT NOT NULL DEFAULT 'unRead'
                CHECK (read_status IN ('read','unRead')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_recent_idx
    ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
    ON notifications (user_id)
    WHERE read_status = 'unRead';


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. USER_PREFERENCES — 알림/방해금지/자녀보호 토글
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_preferences (
    user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notif_drawing    BOOLEAN NOT NULL DEFAULT TRUE,
    notif_event      BOOLEAN NOT NULL DEFAULT TRUE,
    notif_system     BOOLEAN NOT NULL DEFAULT TRUE,
    notif_marketing  BOOLEAN NOT NULL DEFAULT FALSE,
    dnd_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    dnd_start        TEXT    NOT NULL DEFAULT '22:00'
                    CHECK (dnd_start ~ '^[0-2][0-9]:[0-5][0-9]$'),
    dnd_end          TEXT    NOT NULL DEFAULT '08:00'
                    CHECK (dnd_end   ~ '^[0-2][0-9]:[0-5][0-9]$'),
    safe_mode        BOOLEAN NOT NULL DEFAULT TRUE,
    payment_lock     BOOLEAN NOT NULL DEFAULT TRUE,
    together_chat    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_preferences_set_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SUPPORT_INQUIRIES — 1:1 문의
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE support_inquiries (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    subject     TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
    message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
    status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','answered','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX support_inquiries_user_idx ON support_inquiries (user_id, created_at DESC);
CREATE INDEX support_inquiries_open_idx ON support_inquiries (created_at)
    WHERE status IN ('open','in_progress');


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. AGREEMENT_RECORDS — 약관 동의 이력 (개정 시 재동의 추적)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE agreement_records (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version       TEXT NOT NULL,
    privacy_accepted    BOOLEAN NOT NULL,
    marketing_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX agreement_records_user_recent_idx
    ON agreement_records (user_id, accepted_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. IDENTITY_VERIFICATIONS — 본인확인 (1년 캐시)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE identity_verifications (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider     TEXT NOT NULL CHECK (provider IN ('pass','didit')),
    status       TEXT NOT NULL CHECK (status IN ('pending','verified','failed','expired')),
    ci_hash      TEXT,                            -- CI(연계정보) 해시값
    verified_at  TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX identity_verifications_user_active_idx
    ON identity_verifications (user_id, expires_at DESC)
    WHERE status = 'verified';


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. WITHDRAWAL_REQUESTS — 탈퇴 요청 (즉시/30일 유예)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE withdrawal_requests (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode          TEXT NOT NULL CHECK (mode IN ('immediate','grace30')),
    requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at  TIMESTAMPTZ,
    canceled_at   TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ
);

-- 사용자당 활성 요청은 최대 1건만 허용
CREATE UNIQUE INDEX withdrawal_requests_active_user_idx
    ON withdrawal_requests (user_id)
    WHERE canceled_at IS NULL AND completed_at IS NULL;