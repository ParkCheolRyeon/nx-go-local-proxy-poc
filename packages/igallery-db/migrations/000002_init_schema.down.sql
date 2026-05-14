DROP TABLE IF EXISTS withdrawal_requests;
DROP TABLE IF EXISTS identity_verifications;
DROP TABLE IF EXISTS agreement_records;
DROP TABLE IF EXISTS support_inquiries;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS event_participations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS coin_ledgers;
DROP TABLE IF EXISTS coin_wallets;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS child_profiles;
DROP TABLE IF EXISTS oauth_accounts;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP INDEX  IF EXISTS users_email_key;

ALTER TABLE users
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS marketing_opt_in,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS locale,
    DROP COLUMN IF EXISTS avatar,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS password_hash,
    DROP COLUMN IF EXISTS email;

DROP FUNCTION IF EXISTS set_updated_at();