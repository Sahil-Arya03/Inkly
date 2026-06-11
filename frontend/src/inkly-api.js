/* Inkly API client — centralised fetch + cookie-based auth */

// Derive the API host from the page's own hostname so the `inkly_token` cookie
// (SameSite=Lax) is treated as same-site — "localhost" and "127.0.0.1" are
// different sites to the browser, so a mismatch silently drops the cookie on
// every authenticated call (login still "succeeds" via the response body, but
// /api/me and /api/boards come back 401 and the board renders empty).
const configuredBase = import.meta.env.VITE_API_BASE || "http://localhost:8081";
const BASE = (() => {
  try {
    const configured = new URL(configuredBase);
    if (configured.hostname === "localhost" || configured.hostname === "127.0.0.1") {
      configured.hostname = window.location.hostname;
      return configured.origin;
    }
    return configuredBase;
  } catch {
    return configuredBase;
  }
})();

const PROFILE_KEY = "inkly_user";

function getUser() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; }
  catch { return null; }
}
function setUser(u)  { localStorage.setItem(PROFILE_KEY, JSON.stringify(u)); }
function clearUser() { localStorage.removeItem(PROFILE_KEY); }

// Authenticated fetch — credentials:include sends HttpOnly cookie automatically
async function request(path, options) {
  const opts = options || {};
  const res = await fetch(BASE + path, Object.assign({}, opts, {
    credentials: 'include',
    headers: Object.assign(
      { "Content-Type": "application/json" },
      opts.headers || {}
    ),
  }));

  if (res.status === 401 && !opts.silent) {
    clearUser();
    window.dispatchEvent(new CustomEvent("inkly:session-expired"));
  }

  return res;
}

async function login(email, password, rememberMe) {
  var rm = (rememberMe === undefined) ? false : rememberMe;
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe: rm }),
  });

  var data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw new Error(data.message || "Invalid email or password.");
  }

  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  return data;
}

async function signup(name, email, password, workspace) {
  const res = await fetch(BASE + "/api/auth/register", {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, workspace }),
  });

  var data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw new Error(data.message || "Could not create account.");
  }

  setUser({ email: data.email, name: data.name, workspace: data.workspace });
  return data;
}

async function logout() {
  try {
    await fetch(BASE + "/api/auth/logout", {
      method: "POST",
      credentials: 'include',
    });
  } catch { /* ignore network errors on logout */ }
  clearUser();
}

async function getMe() {
  const res = await fetch(BASE + "/api/me", {
    credentials: 'include',
  });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

const kanban = {
  /** GET /api/boards — returns full board with columns + cards for the current user. */
  async fetchBoard() {
    const res = await request("/api/boards", { silent: true });
    if (!res.ok) throw new Error("Failed to load board");
    return res.json();
  },

  /** GET /api/assignees — returns users in the caller's workspace + department. */
  async fetchAssignees() {
    const res = await request("/api/assignees", { silent: true });
    if (!res.ok) return [];
    return res.json();
  },

  /** POST /api/cards — creates a new card. Accepts optional assigneeId in data. */
  async createCard(data) {
    const res = await request("/api/cards", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to create card");
    }
    return res.json();
  },

  /**
   * PATCH /api/cards/:id/move — moves a card to a new column/position.
   */
  async moveCard(cardId, columnId, afterCardId, beforeCardId) {
    const res = await request(`/api/cards/${cardId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ cardId, columnId, afterCardId, beforeCardId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to move card");
    }
    return res.json();
  },

  /**
   * DELETE /api/cards/:id — permanently deletes a card.
   */
  async deleteCard(cardId) {
    const res = await request(`/api/cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to delete card");
    }
  },
};

const calendar = {
  /** GET /api/calendar/events?from=&to= — events + card deadlines for the user. */
  async fetchEvents(from, to) {
    const res = await request(`/api/calendar/events?from=${from}&to=${to}`, { silent: true });
    if (!res.ok) throw new Error("Failed to load events");
    return res.json();
  },

  /** POST /api/calendar/events — create a native event. */
  async createEvent(data) {
    const res = await request("/api/calendar/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to create event");
    }
    return res.json();
  },

  /** PATCH /api/calendar/events/:id — update a native event. */
  async updateEvent(id, data) {
    const res = await request(`/api/calendar/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to update event");
    }
    return res.json();
  },

  /** DELETE /api/calendar/events/:id — soft-delete a native event. */
  async deleteEvent(id) {
    const res = await request(`/api/calendar/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to delete event");
    }
  },

  /** POST /api/calendar/sync — pull latest changes from Google now. */
  async syncNow() {
    const res = await request("/api/calendar/sync", { method: "POST" });
    if (!res.ok) throw new Error("Sync failed");
    return res.json();
  },

  /** GET /api/calendar/connection — Google connection status for the user. */
  async getConnection() {
    const res = await request("/api/calendar/connection", { silent: true });
    if (!res.ok) return { connected: false };
    return res.json();
  },

  /** GET /api/calendar/oauth/start — returns the Google consent URL. */
  async startOAuth() {
    const res = await request("/api/calendar/oauth/start", { silent: true });
    if (!res.ok) throw new Error("Could not start Google connection");
    return res.json();
  },
};

export const INKLY_API = {
  request,
  login,
  signup,
  logout,
  getMe,
  getUser,
  kanban,
  calendar,
};
