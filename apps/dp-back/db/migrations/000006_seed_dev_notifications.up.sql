-- ============================================================================
-- 000006_seed_dev_notifications.up.sql
-- DEV SEED — 활성 사용자 모두에게 샘플 알림 4종(contest/coin/social/system) INSERT.
-- 마이그레이션은 한 번만 실행되므로 중복 걱정 없음.
-- 운영 배포 직전엔 down 으로 롤백하거나 별도 dev DB 에서만 사용 권장.
-- ID 는 user.id 기반 결정론적 hex 라 down 마이그레이션이 정확히 같은 row 만 삭제.
-- ============================================================================

INSERT INTO notifications (id, user_id, category, title, description, icon)
SELECT
  substr(md5(u.id || ':n1'), 1, 16),
  u.id,
  'contest',
  '봄 그림 대회 마감 임박',
  '5월 15일까지 출품 가능해요. 우리 아이의 작품을 자랑해보세요.',
  '🏆'
FROM users u WHERE u.deleted_at IS NULL;

INSERT INTO notifications (id, user_id, category, title, description, icon)
SELECT
  substr(md5(u.id || ':n2'), 1, 16),
  u.id,
  'coin',
  '코인 3개가 충전됐어요',
  '가입 축하 코인 3개가 지갑에 들어왔어요!',
  '🪙'
FROM users u WHERE u.deleted_at IS NULL;

INSERT INTO notifications (id, user_id, category, title, description, icon)
SELECT
  substr(md5(u.id || ':n3'), 1, 16),
  u.id,
  'social',
  '오늘의 인기 작품',
  '엄마 코끼리 작품이 50명에게 사랑받았어요!',
  '💬'
FROM users u WHERE u.deleted_at IS NULL;

INSERT INTO notifications (id, user_id, category, title, description, icon)
SELECT
  substr(md5(u.id || ':n4'), 1, 16),
  u.id,
  'system',
  '약관 개정 안내',
  '5월 1일부터 새 이용약관이 적용됩니다.',
  '🔔'
FROM users u WHERE u.deleted_at IS NULL;
