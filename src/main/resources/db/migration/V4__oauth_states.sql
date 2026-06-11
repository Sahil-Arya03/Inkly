-- =============================================================
-- V4: server-side OAuth state for the Google consent flow.
-- Each row is a single-use, short-lived CSRF token mapping the
-- random state value to the user who started the flow.
-- =============================================================

CREATE TABLE IF NOT EXISTS oauth_states (
    state      TEXT        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_created
    ON oauth_states(created_at);
