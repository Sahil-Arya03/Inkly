/* Inkly API client — centralised fetch + token management */

const INKLY_API = (() => {
  const BASE = (window.__INKLY_DEFAULTS && window.__INKLY_DEFAULTS.apiBase) || "http://localhost:8081";
  const TOKEN_KEY = "inkly_token";

  function getToken()   { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  function isTokenExpired() {
    const token = getToken();
    if (!token) return true;
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64));
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  }

  // Authenticated fetch — injects Bearer token, fires session-expired on 401
  async function request(path, options) {
    const opts = options || {};
    const token = getToken();
    const res = await fetch(BASE + path, Object.assign({}, opts, {
      headers: Object.assign(
        { "Content-Type": "application/json" },
        token ? { "Authorization": "Bearer " + token } : {},
        opts.headers || {}
      ),
    }));

    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent("inkly:session-expired"));
    }

    return res;
  }

  // Login — stores token on success, throws with server message on failure
  async function login(email, password) {
    const res = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    });

    var data;
    try { data = await res.json(); } catch (e) { data = {}; }

    if (!res.ok) {
      throw new Error(data.message || "Invalid email or password.");
    }

    setToken(data.token);
    return data;
  }

  function logout() {
    clearToken();
  }

  return {
    getToken: getToken,
    clearToken: clearToken,
    isTokenExpired: isTokenExpired,
    request: request,
    login: login,
    logout: logout,
  };
})();

window.INKLY_API = INKLY_API;