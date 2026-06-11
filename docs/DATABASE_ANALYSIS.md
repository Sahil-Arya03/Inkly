# DATABASE_ANALYSIS.md — Schema, Relationships, Risks

> Date: 2026-06-10  
> DB: PostgreSQL (Neon cloud, `ep-steep-brook-aoaf38ce-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb`)  
> Migrations: Flyway 9.22.3, `classpath:db/migration/`  
> DDL control: `spring.jpa.hibernate.ddl-auto=none` — Flyway owns the schema.

---

## 1. Migration History

| Version | File | Changes |
|---|---|---|
| V1 | `V1__kanban_schema.sql` | Full initial schema — APP_USERS, workspaces, users, memberships, workspace_counters, boards, sprints, board_columns, labels, cards, card_labels, card_assignees, comments, attachments |
| V2 | `V2__departments_and_assignee.sql` | `departments` table; `department_id` FK on `memberships`; seeds 'General' dept for existing workspaces |

---

## 2. Entity Relationship Diagram

```
APP_USERS (auth domain — BIGSERIAL PK)
│ email ──────────────────────────────────────┐ (shared key, not FK)
│ password_hash                               │
│ name                                        │
│ workspace (text — name, not slug)           │
│ role (USER)                                 │
                                              │
┌─────────────────────────────────────────────┘
│
▼
users (kanban domain — UUID PK)
│ email UNIQUE
│ name
│ avatar_url (nullable)
│ created_at
│
├──── memberships (N:1 users, N:1 workspaces, N:1 departments)
│         │ role CHECK('OWNER','ADMIN','MEMBER')
│         │ UNIQUE(workspace_id, user_id)
│         │
│         ├──── workspaces (UUID PK)
│         │         │ name
│         │         │ slug UNIQUE
│         │         │ plan CHECK('STARTER','TEAM')
│         │         │ created_at
│         │         │
│         │         ├──── workspace_counters (PK = workspace_id)
│         │         │         next_card_seq INT
│         │         │
│         │         ├──── boards (UUID PK)
│         │         │         name, description, created_at
│         │         │         │
│         │         │         ├──── board_columns (UUID PK)
│         │         │         │         name, rank TEXT, wip_limit INT?, created_at
│         │         │         │
│         │         │         └──── sprints (UUID PK)
│         │         │                   name, start_date, end_date
│         │         │                   status CHECK('PLANNED','ACTIVE','COMPLETED')
│         │         │
│         │         └──── labels (UUID PK)
│         │                   workspace_id, name, color
│         │
│         └──── departments (UUID PK)
│                   workspace_id, name
│                   UNIQUE(workspace_id, name)
│
└──── cards (UUID PK)
          workspace_id  → workspaces (denormalized tenant key)
          board_id      → boards
          column_id     → board_columns
          sprint_id?    → sprints (nullable)
          seq INT       UNIQUE(workspace_id, seq)
          title, description, priority, due_date, rank TEXT
          comment_count INT DEFAULT 0   (denormalized)
          attachment_count INT DEFAULT 0 (denormalized)
          created_by    → users
          created_at, updated_at
          │
          ├──── card_labels (PK = card_id + label_id)
          │         card_id → cards
          │         label_id → labels
          │
          ├──── card_assignees (PK = card_id + user_id)
          │         card_id, user_id, assigned_at
          │
          ├──── comments (UUID PK)
          │         card_id, author_id → users, body, created_at
          │
          └──── attachments (UUID PK)
                    card_id, uploaded_by → users
                    file_name, file_url, size_bytes, created_at
```

---

## 3. Table Details

### APP_USERS
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | Auto-increment integer |
| email | TEXT UNIQUE NOT NULL | Auth identity key |
| password_hash | TEXT NOT NULL | BCrypt hash |
| name | TEXT NOT NULL | Display name |
| workspace | TEXT NOT NULL | User-entered workspace name (NOT a FK) |
| role | TEXT DEFAULT 'USER' | Application role |

> **Risk:** `workspace` stores the user-entered workspace name as plain text, not a FK to `workspaces`. `WorkspaceSetupService` uses `slugify(workspace)` to find the matching workspace row. If the workspace name changes after registration, the lookup breaks.

---

### workspaces
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT NOT NULL | Human display name |
| slug | TEXT UNIQUE NOT NULL | URL-safe derived name |
| plan | TEXT CHECK('STARTER','TEAM') | Billing tier |
| created_at | TIMESTAMPTZ | Immutable |

---

### workspace_counters
| Column | Type | Notes |
|---|---|---|
| workspace_id | UUID PK → workspaces | One row per workspace |
| next_card_seq | INT DEFAULT 1 | Monotonic counter |

> **Key design note:** `SELECT … FOR UPDATE` (`PESSIMISTIC_WRITE` lock) on this row serializes concurrent card creates within the same workspace. This prevents seq number collisions at the cost of contention under high concurrency.

---

### cards
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID NOT NULL → workspaces | Denormalized for tenant isolation |
| board_id | UUID NOT NULL → boards | `ON DELETE CASCADE` |
| column_id | UUID NOT NULL → board_columns | NOT cascaded — deleting a column orphans cards (no constraint) |
| sprint_id | UUID → sprints | `ON DELETE SET NULL` |
| seq | INT NOT NULL | Per-workspace sequence; `UNIQUE(workspace_id, seq)` |
| title | TEXT NOT NULL | |
| description | TEXT | Nullable in DB, but `@NotBlank` in API |
| priority | TEXT CHECK('LOW','MEDIUM','HIGH','URGENT') | |
| due_date | DATE | |
| rank | TEXT NOT NULL | Lexicographic ordering key |
| comment_count | INT DEFAULT 0 | Denormalized — must be kept in sync manually |
| attachment_count | INT DEFAULT 0 | Denormalized — must be kept in sync manually |
| created_by | UUID NOT NULL → users | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## 4. Indexes

| Table | Index | Columns |
|---|---|---|
| memberships | `idx_memberships_user` | user_id |
| memberships | `idx_memberships_workspace_dept` | workspace_id, department_id |
| boards | `idx_boards_workspace` | workspace_id |
| board_columns | `idx_board_columns_board_rank` | board_id, rank |
| labels | `idx_labels_workspace` | workspace_id |
| cards | `idx_cards_board_col_rank` | board_id, column_id, rank |
| cards | `idx_cards_board_sprint` | board_id, sprint_id |
| card_assignees | `idx_card_assignees_user` | user_id |
| comments | `idx_comments_card` | card_id |
| attachments | `idx_attachments_card` | card_id |

**Missing index — potential performance risk:** `cards.column_id` has no standalone index. `countByColumnId()` (called during WIP check on every `moveCard`) does a full-table scan unless the composite `idx_cards_board_col_rank` is used. That index starts with `board_id`, so a query filtering only on `column_id` will NOT use it efficiently.

---

## 5. ORM Notes

- All entities use Lombok `@Builder`, `@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`.
- UUID generation: `@GeneratedValue(strategy = GenerationType.UUID)` — JPA 3 feature.
- Timestamps: `@CreationTimestamp` and `@UpdateTimestamp` from Hibernate (not JPA standard).
- Lazy loading everywhere (`FetchType.LAZY`) — correct for performance.
- `open-in-view=false` — sessions are closed at service boundaries; safe.
- `Card.labels` is a `@ManyToMany` with `Set<Label>` — correct to avoid duplicate join results.
- **No `@Version` column** on `Card` — optimistic locking is NOT used; concurrent card edits could silently overwrite each other.

---

## 6. Key Risks

| Risk | Severity | Details |
|---|---|---|
| `column_id` no standalone index | Medium | `countByColumnId()` for WIP check cannot use the composite index efficiently |
| No `ON DELETE` on `cards.column_id` | High | Deleting a `board_column` row will fail with FK violation. There is no cascade or set-null behavior defined. |
| `APP_USERS.workspace` is not a FK | Medium | Workspace name stored as text. Slug-matching is case-dependent. If names diverge, `loadBoardForUser()` silently falls back to the "any board" fallback. |
| Denormalized counters (`comment_count`, `attachment_count`) | Medium | No Comments/Attachments API exists yet. When implemented, every create/delete must remember to update these counters. Easy to forget; no DB trigger enforces it. |
| `RankGenerator.rebalanceColumn()` is not implemented | High | After ~30 successive inserts at the same position, ranks become too close and `between()` throws `IllegalStateException`. Users get a 500 error and cannot move cards until manually fixed. |
| No Row-Level Security | Medium | TODO comment in V1 migration: "enable row-level security on tenant tables once auth integration is in place." Multi-tenant isolation is handled only at the application layer. |
| Credentials in `application.properties` | Critical | DB password and JWT secret committed to source control. See SECURITY_AUDIT.md. |
