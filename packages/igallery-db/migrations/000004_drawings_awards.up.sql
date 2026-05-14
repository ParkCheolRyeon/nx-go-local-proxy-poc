-- ============================================================================
-- 000004_drawings_awards.up.sql
--
-- DRAWINGS — 자녀 단위 그림. 4종(coloring/stepwise/freeform/together).
-- AWARDS   — 수상 기록. 자녀별 누적.
-- 출품 흐름은 R13 에서 별도 처리. 여기선 마이갤러리 R9 데이터 모델만.
-- ============================================================================

CREATE TABLE drawings (
    id                TEXT PRIMARY KEY,
    child_profile_id  TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    mode              TEXT NOT NULL CHECK (mode IN ('coloring','stepwise','freeform','together')),
    title             TEXT NOT NULL DEFAULT '제목 없음' CHECK (char_length(title) <= 80),
    thumbnail_url     TEXT,
    image_url         TEXT,
    timelapse_url     TEXT,
    is_public         BOOLEAN NOT NULL DEFAULT FALSE,
    status            TEXT NOT NULL DEFAULT 'in_progress'
                          CHECK (status IN ('in_progress','completed')),
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE INDEX drawings_child_status_idx
    ON drawings (child_profile_id, status, completed_at DESC NULLS LAST)
    WHERE deleted_at IS NULL;

CREATE INDEX drawings_child_public_idx
    ON drawings (child_profile_id, completed_at DESC)
    WHERE deleted_at IS NULL AND is_public = TRUE AND status = 'completed';

CREATE INDEX drawings_child_created_idx
    ON drawings (child_profile_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER drawings_set_updated_at
    BEFORE UPDATE ON drawings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE awards (
    id                TEXT PRIMARY KEY,
    drawing_id        TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    child_profile_id  TEXT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    event_id          TEXT REFERENCES events(id) ON DELETE SET NULL,
    rank              TEXT NOT NULL CHECK (rank IN ('grand','gold','silver','bronze','encourage')),
    awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX awards_child_recent_idx ON awards (child_profile_id, awarded_at DESC);
CREATE INDEX awards_drawing_idx      ON awards (drawing_id);
