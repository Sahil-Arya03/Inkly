-- =============================================================
-- V5: JWT denylist. On logout the token's jti is inserted here;
-- the auth filter rejects any token whose jti is present. Rows
-- are prunable once expires_at has passed (the token would have
-- expired on its own anyway).
-- =============================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        TEXT        PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires
    ON revoked_tokens(expires_at);
