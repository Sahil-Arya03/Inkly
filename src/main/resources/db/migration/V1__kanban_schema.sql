-- =============================================================
-- Inkly full schema – V1
-- Flyway owns the full schema (ddl-auto=none).
-- UUID generation: gen_random_uuid() is built-in since PG 13.
-- Enums stored as uppercase TEXT to match @Enumerated(STRING).
-- TODO: enable row-level security on tenant tables once auth
--       integration is in place.
-- =============================================================

-- ---- Auth users (previously managed by Hibernate ddl-auto=update) ----
CREATE TABLE IF NOT EXISTS "APP_USERS" (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    workspace     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'USER'
);

-- ---- workspaces ----
CREATE TABLE IF NOT EXISTS workspaces (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    plan        TEXT        NOT NULL DEFAULT 'STARTER'
                            CHECK (plan IN ('STARTER','TEAM')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- users (kanban domain users; separate from APP_USERS auth table) ----
CREATE TABLE IF NOT EXISTS users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL UNIQUE,
    name        TEXT        NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- memberships ----
CREATE TABLE IF NOT EXISTS memberships (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    role         TEXT        NOT NULL DEFAULT 'MEMBER'
                             CHECK (role IN ('OWNER','ADMIN','MEMBER')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);

-- ---- workspace_counters ----
CREATE TABLE IF NOT EXISTS workspace_counters (
    workspace_id  UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    next_card_seq INT  NOT NULL DEFAULT 1
);

-- ---- boards ----
CREATE TABLE IF NOT EXISTS boards (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);

-- ---- sprints ----
CREATE TABLE IF NOT EXISTS sprints (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    start_date DATE,
    end_date   DATE,
    status     TEXT NOT NULL DEFAULT 'ACTIVE'
               CHECK (status IN ('PLANNED','ACTIVE','COMPLETED'))
);

-- ---- board_columns (avoids reserved word 'columns') ----
CREATE TABLE IF NOT EXISTS board_columns (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    rank       TEXT        NOT NULL,
    wip_limit  INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_board_columns_board_rank ON board_columns(board_id, rank);

-- ---- labels ----
CREATE TABLE IF NOT EXISTS labels (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    color        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_labels_workspace ON labels(workspace_id);

-- ---- cards ----
CREATE TABLE IF NOT EXISTS cards (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID        NOT NULL REFERENCES workspaces(id),   -- denormalized tenant key
    board_id         UUID        NOT NULL REFERENCES boards(id)        ON DELETE CASCADE,
    column_id        UUID        NOT NULL REFERENCES board_columns(id),
    sprint_id        UUID                 REFERENCES sprints(id)       ON DELETE SET NULL,
    seq              INT         NOT NULL,
    title            TEXT        NOT NULL,
    description      TEXT,
    priority         TEXT        NOT NULL DEFAULT 'MEDIUM'
                                 CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
    due_date         DATE,
    rank             TEXT        NOT NULL,
    comment_count    INT         NOT NULL DEFAULT 0,
    attachment_count INT         NOT NULL DEFAULT 0,
    created_by       UUID        NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_cards_board_col_rank ON cards(board_id, column_id, rank);
CREATE INDEX IF NOT EXISTS idx_cards_board_sprint    ON cards(board_id, sprint_id);

-- ---- card_labels (M:N join; no extra columns) ----
CREATE TABLE IF NOT EXISTS card_labels (
    card_id  UUID NOT NULL REFERENCES cards(id)  ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (card_id, label_id)
);

-- ---- card_assignees (M:N with assigned_at) ----
CREATE TABLE IF NOT EXISTS card_assignees (
    card_id     UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (card_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_card_assignees_user ON card_assignees(user_id);

-- ---- comments ----
CREATE TABLE IF NOT EXISTS comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id    UUID        NOT NULL REFERENCES cards(id)  ON DELETE CASCADE,
    author_id  UUID        NOT NULL REFERENCES users(id),
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);

-- ---- attachments ----
CREATE TABLE IF NOT EXISTS attachments (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id       UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    uploaded_by   UUID        NOT NULL REFERENCES users(id),
    file_name     TEXT        NOT NULL,
    file_url      TEXT        NOT NULL,
    size_bytes    INT         NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);
