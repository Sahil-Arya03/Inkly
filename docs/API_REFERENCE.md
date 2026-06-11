# API_REFERENCE.md — Complete Endpoint Documentation

> Base URL: `http://localhost:8081`  
> Auth mechanism: `inkly_token` HttpOnly cookie (set by login/register)  
> All responses: `Content-Type: application/json`  
> Error envelope: `{ "error": "ERROR_CODE", "message": "Human-readable reason" }`

---

## Auth Endpoints

### POST /api/auth/register

**Purpose:** Create a new user account and bootstrap a full kanban workspace.

**Auth required:** No

**Request body:**
```json
{
  "name":      "Avery Walsh",
  "email":     "avery@example.com",
  "password":  "secret123",
  "workspace": "Northwind Studio"
}
```

| Field | Type | Validation |
|---|---|---|
| name | String | `@NotBlank` |
| email | String | `@NotBlank @Email` |
| password | String | `@NotBlank @Size(min=6)` |
| workspace | String | `@NotBlank` |

**Response: 201 Created**
```json
{
  "email":      "avery@example.com",
  "name":       "Avery Walsh",
  "workspace":  "Northwind Studio",
  "expiresIn":  86400000
}
```

**Side effect:** `Set-Cookie: inkly_token=<JWT>; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`

**Also creates:**
- Row in `APP_USERS`
- `users`, `workspaces`, `workspace_counters`, `memberships`, `departments`, `boards`, `board_columns` (5 default columns)

**Errors:**
- `409 CONFLICT` — email already registered
- `400 VALIDATION_ERROR` — field validation failed

**Dependencies:** UserRepository, BCrypt, JwtUtil, WorkspaceSetupService

---

### POST /api/auth/login

**Purpose:** Authenticate and receive a session cookie.

**Auth required:** No

**Request body:**
```json
{
  "email":      "avery@example.com",
  "password":   "secret123",
  "rememberMe": true
}
```

| Field | Type | Default | Validation |
|---|---|---|---|
| email | String | — | `@NotBlank @Email` |
| password | String | — | `@NotBlank @Size(min=6)` |
| rememberMe | boolean | `false` | — |

**Response: 200 OK**
```json
{
  "email":      "avery@example.com",
  "name":       "Avery Walsh",
  "workspace":  "Northwind Studio",
  "expiresIn":  2592000000
}
```
`expiresIn` = `86400000` (24h) when `rememberMe=false`, `2592000000` (30d) when `true`.

**Side effect:** `Set-Cookie: inkly_token=<JWT>; Path=/; HttpOnly; Max-Age=<86400|2592000>; SameSite=Lax`

**Errors:**
- `401 UNAUTHORIZED` — invalid email or password
- `400 VALIDATION_ERROR` — field validation

---

### POST /api/auth/logout

**Purpose:** Expire the session cookie.

**Auth required:** No (Spring Security permits all to `/api/auth/**`)

**Request:** No body required.

**Response: 204 No Content**

**Side effect:** `Set-Cookie: inkly_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`

**Notes:** Network errors on logout are swallowed by the client — logout always succeeds locally.

---

## Session Endpoint

### GET /api/me

**Purpose:** Validate the current session and return user profile. Used on page load for session restoration.

**Auth required:** Yes (cookie)

**Request:** No body.

**Response: 200 OK**
```json
{
  "email":     "avery@example.com",
  "name":      "Avery Walsh",
  "workspace": "Northwind Studio",
  "role":      "USER"
}
```

**Errors:**
- `401 UNAUTHORIZED` — no valid cookie
- `401 UNAUTHORIZED` — cookie valid but user deleted from `APP_USERS`

**Dependencies:** UserRepository (reads `APP_USERS`)

---

## Kanban Endpoints

### GET /api/boards

**Purpose:** Load the full kanban board for the authenticated user's workspace: columns in rank order, each with their cards sorted by rank.

**Auth required:** Yes (cookie) — uses `silent:true` on client, so a 401 does NOT fire `inkly:session-expired`.

**Request:** No body.

**Response: 200 OK**
```json
{
  "workspaceId": "uuid",
  "boardId":     "uuid",
  "boardName":   "Project Board",
  "columns": [
    {
      "id":       "uuid",
      "name":     "Backlog",
      "rank":     "e",
      "wipLimit": null,
      "cards": [
        {
          "id":              "uuid",
          "workspaceId":     "uuid",
          "boardId":         "uuid",
          "columnId":        "uuid",
          "seq":             1,
          "humanId":         "INK-1",
          "title":           "My task title",
          "description":     "Task description",
          "priority":        "HIGH",
          "dueDate":         "2026-06-15",
          "rank":            "n",
          "commentCount":    0,
          "attachmentCount": 0,
          "createdById":     "uuid",
          "createdAt":       "2026-06-10T08:00:00Z",
          "updatedAt":       "2026-06-10T08:00:00Z"
        }
      ]
    }
  ]
}
```

**Fallback:** If workspace slug doesn't match (e.g., seed profile), returns the first board in the system.

**Errors:**
- `404 NOT_FOUND` — no boards exist at all
- `401 UNAUTHORIZED` — invalid/missing cookie

**Dependencies:** BoardService → WorkspaceRepository, BoardRepository, BoardColumnRepository, CardRepository

---

### POST /api/cards

**Purpose:** Create a new card in a specific column.

**Auth required:** Yes (cookie)

**Request body:**
```json
{
  "workspaceId":  "uuid",
  "boardId":      "uuid",
  "columnId":     "uuid",
  "title":        "Fix login redirect",
  "description":  "Users are being sent to /home instead of /dashboard after login.",
  "priority":     "HIGH",
  "dueDate":      "2026-06-20",
  "afterCardId":  null,
  "beforeCardId": null,
  "assigneeId":   "uuid-or-null"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| workspaceId | UUID | Yes | `@NotNull` |
| boardId | UUID | Yes | `@NotNull` |
| columnId | UUID | Yes | `@NotNull` |
| title | String | Yes | `@NotBlank @Size(max=255)` |
| description | String | Yes | `@NotBlank @Size(max=10000)` |
| priority | Enum | No | LOW/MEDIUM/HIGH/URGENT (default: MEDIUM) |
| dueDate | LocalDate | No | ISO-8601 date string |
| afterCardId | UUID | No | Card whose rank is immediately below the new card |
| beforeCardId | UUID | No | Card whose rank is immediately above the new card |
| assigneeId | UUID | No | Must be in caller's workspace/department |

**Response: 201 Created**  
Returns a `CardResponse` object (same shape as cards in GET /api/boards).

**Errors:**
- `400 BAD_REQUEST` — validation failure or invalid IDs
- `401 UNAUTHORIZED` — not authenticated
- `400 ILLEGAL_ARG` — assignee not in caller's workspace/department

**Notes:**
- Seq number assigned under pessimistic DB lock (no duplicates possible).
- `humanId` = workspace slug (uppercased) + "-" + seq number.
- Assignee validation checks department membership.

---

### PATCH /api/cards/{id}/move

**Purpose:** Move a card to a new column and/or position. Rank is computed server-side.

**Auth required:** Yes (cookie)

**Path parameter:** `id` — UUID of the card to move.

**Request body:**
```json
{
  "cardId":      "uuid",
  "columnId":    "uuid",
  "afterCardId": "uuid-or-null",
  "beforeCardId":"uuid-or-null"
}
```

> Note: `cardId` in the body is redundant with the path parameter. The path `{id}` is the authoritative value; `req.cardId()` is overwritten by the controller: `new MoveCardRequest(id, req.columnId(), ...)`.

**Response: 200 OK**
```json
{
  "cardId":    "uuid",
  "columnId":  "uuid",
  "rank":      "nn",
  "overLimit": false
}
```

`overLimit: true` means the destination column's WIP limit was exceeded (warning mode only when `inkly.kanban.wip.strict=false`).

**Errors:**
- `400 BAD_REQUEST` — card or column not found
- `409 CONFLICT` — WIP limit exceeded (only when `inkly.kanban.wip.strict=true`)
- `401 UNAUTHORIZED`

---

### DELETE /api/cards/{id}

**Purpose:** Permanently delete a card. Caller must be a member of the card's workspace.

**Auth required:** Yes (cookie)

**Path parameter:** `id` — UUID of the card to delete.

**Request:** No body.

**Response: 204 No Content**

**Side effect:** DB CASCADE removes `card_assignees`, `card_labels`, `comments`, `attachments`.

**Errors:**
- `400 BAD_REQUEST` — card not found, or caller has no workspace membership
- `401 UNAUTHORIZED`

---

### GET /api/assignees

**Purpose:** List users that the caller can assign cards to (workspace + department scoped).

**Auth required:** Yes (cookie)

**Request:** No body.

**Response: 200 OK**
```json
[
  { "id": "uuid", "name": "Devon Park", "email": "devon@example.com" },
  { "id": "uuid", "name": "Maren Olsson", "email": "maren@example.com" }
]
```

Results are sorted alphabetically by name.

**Notes:**
- Returns users in the caller's workspace AND same department.
- Falls back to all workspace members if caller has no department set.
- Returns `[]` if caller has no membership.

**Errors:**
- `400 BAD_REQUEST` — kanban user not found for this email
- `401 UNAUTHORIZED`

---

## Error Response Format

All errors use this envelope:
```json
{
  "error":   "ERROR_CODE",
  "message": "Human-readable description"
}
```

| HTTP Status | Error Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bean Validation `@NotBlank`, `@Email`, etc. fails |
| 400 | `BAD_REQUEST` | `HttpMessageNotReadableException` (bad JSON) |
| 400 | `BAD_REQUEST` | `IllegalArgumentException` from services |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired JWT cookie |
| 403 | `FORBIDDEN` | Valid auth but insufficient role |
| 404 | `NOT_FOUND` | `NoResourceFoundException` |
| 409 | `CONFLICT` | Email already registered; WIP limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled exception (logged via Slf4j) |

---

## Endpoints NOT Yet Implemented (Planned)

| Method | Route | Purpose |
|---|---|---|
| GET | /api/cards/{id} | Get single card detail |
| PUT/PATCH | /api/cards/{id} | Edit card (title, description, priority, dueDate) |
| POST | /api/cards/{id}/comments | Add a comment |
| GET | /api/cards/{id}/comments | List comments |
| POST | /api/cards/{id}/attachments | Upload an attachment |
| GET | /api/sprints | List sprints |
| POST | /api/sprints | Create sprint |
| GET | /api/labels | List workspace labels |
| POST | /api/labels | Create label |
| POST | /api/cards/{id}/labels/{labelId} | Attach label |
| GET | /api/users | List workspace members (Teams page) |
| GET | /api/tasks | List tasks (My Tasks page) |
| GET | /api/notifications | Inbox notifications |
