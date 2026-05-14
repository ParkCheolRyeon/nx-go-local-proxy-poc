CREATE TABLE users(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);