-- =============================================================
-- V2: departments table + department_id on memberships
-- =============================================================

CREATE TABLE departments (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

ALTER TABLE memberships
    ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX idx_memberships_workspace_dept
    ON memberships (workspace_id, department_id);

-- Seed a default 'General' department for every existing workspace
-- so every existing membership has a department from day one.
INSERT INTO departments (workspace_id, name)
SELECT id, 'General' FROM workspaces;

UPDATE memberships m
SET department_id = d.id
FROM departments d
WHERE d.workspace_id = m.workspace_id
  AND d.name = 'General'
  AND m.department_id IS NULL;
