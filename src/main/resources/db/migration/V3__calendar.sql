-- =============================================================
-- V3: native calendar events + Google Calendar sync
-- Bridges the auth APP_USERS table to the kanban users table and
-- adds calendar_events, event_attendees, google_calendar_links and
-- google_event_map. Never edit V1 or V2.
-- =============================================================

-- ---- Bridge APP_USERS -> kanban users ----
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS app_user_id
    BIGINT REFERENCES "APP_USERS"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_app_user_id
    ON users(app_user_id);

UPDATE users u
SET app_user_id = a.id
FROM "APP_USERS" a
WHERE lower(u.email) = lower(a.email)
  AND u.app_user_id IS NULL;

-- ---- Native calendar events ----
CREATE TABLE IF NOT EXISTS calendar_events (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES workspaces(id)
                             ON DELETE CASCADE,
    created_by   UUID        NOT NULL REFERENCES users(id),
    title        TEXT        NOT NULL,
    description  TEXT,
    location     TEXT,
    category     TEXT        NOT NULL DEFAULT 'GENERAL',
    starts_at    TIMESTAMPTZ NOT NULL,
    ends_at      TIMESTAMPTZ NOT NULL,
    all_day      BOOLEAN     NOT NULL DEFAULT FALSE,
    source       TEXT        NOT NULL DEFAULT 'INKLY'
                             CHECK (source IN ('INKLY','GOOGLE')),
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_time
    ON calendar_events(starts_at) WHERE deleted_at IS NULL;

-- ---- Attendees ----
CREATE TABLE IF NOT EXISTS event_attendees (
    event_id UUID NOT NULL
             REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL
             REFERENCES users(id) ON DELETE CASCADE,
    response TEXT NOT NULL DEFAULT 'NEEDS_ACTION'
             CHECK (response IN
               ('NEEDS_ACTION','ACCEPTED','DECLINED','TENTATIVE')),
    PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_attendees_user
    ON event_attendees(user_id);

-- ---- Google OAuth tokens per user ----
CREATE TABLE IF NOT EXISTS google_calendar_links (
    user_id             UUID PRIMARY KEY
                        REFERENCES users(id) ON DELETE CASCADE,
    google_email        TEXT        NOT NULL,
    refresh_token_enc   TEXT        NOT NULL,
    access_token        TEXT,
    access_expires_at   TIMESTAMPTZ,
    calendar_id         TEXT        NOT NULL DEFAULT 'primary',
    sync_token          TEXT,
    channel_id          TEXT,
    channel_resource_id TEXT,
    channel_expires_at  TIMESTAMPTZ,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Maps Inkly objects to their Google Calendar copies, per user ----
CREATE TABLE IF NOT EXISTS google_event_map (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL
                    REFERENCES users(id) ON DELETE CASCADE,
    event_id        UUID
                    REFERENCES calendar_events(id) ON DELETE CASCADE,
    card_id         UUID
                    REFERENCES cards(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    etag            TEXT,
    last_synced_at  TIMESTAMPTZ,
    UNIQUE (user_id, google_event_id),
    CHECK ((event_id IS NULL) <> (card_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_gmap_user_card
    ON google_event_map(user_id, card_id);

CREATE INDEX IF NOT EXISTS idx_cards_due
    ON cards(due_date) WHERE due_date IS NOT NULL;