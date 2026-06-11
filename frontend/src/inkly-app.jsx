/* Inkly app — React Router v6 + theme + tweaks + toasts */
import { useState, useEffect, useCallback } from 'react';
import {
  HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation,
} from 'react-router-dom';

import { INKLY_API } from './inkly-api.js';
import { InklyContext, useInkly } from './inkly-context.js';
import { ErrorBoundary } from './inkly-error-boundary.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect, TweakButton,
} from './tweaks-panel.jsx';
import { Sidebar, Topbar } from './inkly-chrome.jsx';
import { Login } from './inkly-login.jsx';
import { Signup } from './inkly-signup.jsx';
import { Dashboard } from './inkly-dashboard.jsx';
import { MyTasksPage } from './inkly-tasks.jsx';
import { Kanban } from './inkly-kanban.jsx';
import { CalendarPage } from './inkly-calendar.jsx';
import { TeamBoardsPage } from './inkly-teams.jsx';
import { InboxPage } from './inkly-inbox.jsx';
import { SettingsPage } from './inkly-settings.jsx';

/* ---- Tweakable defaults (formerly window.__INKLY_DEFAULTS) ---- */
const INKLY_DEFAULTS = {
  accent: "ink-blue",
  density: "comfy",
  theme: "dark",
};

/* ---- Accent presets ---- */
const ACCENT_PRESETS = {
  "ink-blue":   { name: "Ink Blue",  base: "oklch(0.55 0.13 250)", soft: "oklch(0.93 0.04 250)", tint: "oklch(0.97 0.02 250)", ink: "oklch(0.32 0.10 250)", swatch: "#3D6BCC" },
  "moss":       { name: "Moss",      base: "oklch(0.52 0.10 150)", soft: "oklch(0.93 0.04 150)", tint: "oklch(0.97 0.02 150)", ink: "oklch(0.30 0.08 150)", swatch: "#3F8862" },
  "clay":       { name: "Clay",      base: "oklch(0.58 0.12 38)",  soft: "oklch(0.94 0.04 38)",  tint: "oklch(0.97 0.02 38)",  ink: "oklch(0.34 0.09 38)",  swatch: "#C16A3A" },
  "graphite":   { name: "Graphite",  base: "oklch(0.30 0.02 270)", soft: "oklch(0.93 0.005 270)",tint: "oklch(0.97 0.003 270)",ink: "oklch(0.18 0.01 270)", swatch: "#3A3A3F" },
};

function applyAccent(key) {
  const a = ACCENT_PRESETS[key] || ACCENT_PRESETS["ink-blue"];
  const r = document.documentElement.style;
  r.setProperty("--accent", a.base);
  if (document.documentElement.dataset.theme !== "dark") {
    r.setProperty("--accent-soft", a.soft);
    r.setProperty("--accent-tint", a.tint);
    r.setProperty("--accent-ink",  a.ink);
  } else {
    r.setProperty("--accent-ink", `oklch(0.85 0.10 ${getHue(a.base)})`);
  }
}
function getHue(oklch) {
  const m = oklch.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/);
  return m ? m[1] : "250";
}

/* ---- Toast bar ---- */
function Toasts({ items }) {
  return (
    <div className="toasts">
      {items.map(t => (
        <div key={t.id} className="toast">
          <span className="toast__dot" />
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---- Route guards ---- */
function ProtectedRoute() {
  const { user } = useInkly();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function RedirectIfAuth() {
  const { user } = useInkly();
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/* ---- Tweaks panel (uses router hooks) ---- */
function InklyTweaksPanel() {
  const ctx = useInkly();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname.replace(/^\//, "") || "login";

  const hexFromAccent = (key) => (ACCENT_PRESETS[key] || ACCENT_PRESETS["ink-blue"]).swatch;
  const accentFromHex = (hex) => Object.keys(ACCENT_PRESETS).find(k => ACCENT_PRESETS[k].swatch === hex) || "ink-blue";

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme & accent">
        <TweakRadio
          label="Theme"
          value={ctx.t.theme}
          onChange={(v) => ctx.setTweak("theme", v)}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
        />
        <TweakColor
          label="Accent"
          value={hexFromAccent(ctx.t.accent)}
          onChange={(hex) => ctx.setTweak("accent", accentFromHex(hex))}
          options={Object.keys(ACCENT_PRESETS).map(k => ACCENT_PRESETS[k].swatch)}
        />
        <TweakRadio
          label="Density"
          value={ctx.t.density}
          onChange={(v) => ctx.setTweak("density", v)}
          options={[
            { value: "cozy",  label: "Cozy"  },
            { value: "comfy", label: "Comfy" },
            { value: "roomy", label: "Roomy" },
          ]}
        />
      </TweakSection>
      <TweakSection label="Navigate">
        <TweakSelect
          label="Page"
          value={currentPage}
          onChange={(v) => navigate("/" + v)}
          options={[
            { value: "login",     label: "Login"     },
            { value: "signup",    label: "Sign up"   },
            { value: "dashboard", label: "Home"      },
            { value: "tasks",     label: "My Tasks"  },
            { value: "kanban",    label: "Kanban"    },
            { value: "calendar",  label: "Calendar"  },
            { value: "teams",     label: "Teams"     },
            { value: "inbox",     label: "Inbox"     },
            { value: "settings",  label: "Settings"  },
          ]}
        />
        <TweakButton label="Demo toast" onClick={() => ctx.pushToast("This is a toast notification")} />
      </TweakSection>
    </TweaksPanel>
  );
}

/* ---- Main layout (authenticated pages) ---- */
function MainLayout() {
  const ctx = useInkly();
  const navigate = useNavigate();

  function handleLogout() {
    INKLY_API.logout();
    ctx.setUser(null);
    navigate("/login");
  }

  return (
    <div className="app">
      <Sidebar onLogout={handleLogout} />
      <div className="main">
        <Topbar
          theme={ctx.t.theme}
          onTheme={() => ctx.toggleTheme()}
          onCreate={() => ctx.pushToast("Quick-create opened")}
        />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <Toasts items={ctx.toasts} />
      <InklyTweaksPanel />
    </div>
  );
}

/* ---- Routes ---- */
function AppRoutes() {
  const ctx = useInkly();
  const navigate = useNavigate();

  // Session expired → login
  useEffect(() => {
    function onSessionExpired() {
      ctx.setUser(null);
      navigate("/login");
      ctx.pushToast("Session expired — please sign in again.");
    }
    window.addEventListener("inkly:session-expired", onSessionExpired);
    return () => window.removeEventListener("inkly:session-expired", onSessionExpired);
  }, []);

  function handleSignIn(data) {
    ctx.setUser({ email: data.email, name: data.name, workspace: data.workspace });
    navigate("/dashboard");
    const firstName = (data && data.name) ? data.name.split(" ")[0] : (data && data.email ? data.email.split("@")[0] : "there");
    ctx.pushToast("Welcome back, " + firstName + "!");
  }

  function handleSignedUp(data) {
    ctx.setUser({ email: data.email, name: data.name, workspace: data.workspace });
    navigate("/dashboard");
    const firstName = (data && data.name) ? data.name.split(" ")[0] : "there";
    ctx.pushToast("Workspace “" + (data && data.workspace ? data.workspace : "inkly") + "” created — welcome, " + firstName + "!");
  }

  function handleLogout() {
    INKLY_API.logout();
    ctx.setUser(null);
    navigate("/login");
  }

  return (
    <Routes>
      {/* Public routes — redirect to dashboard if already authenticated */}
      <Route element={<RedirectIfAuth />}>
        <Route path="/login" element={
          <div className="app app--login">
            <Login
              theme={ctx.t.theme}
              onTheme={(v) => ctx.setTweak("theme", v)}
              onSignIn={handleSignIn}
              onPushToast={ctx.pushToast}
            />
            <Toasts items={ctx.toasts} />
            <InklyTweaksPanel />
          </div>
        } />
        <Route path="/signup" element={
          <div className="app app--login">
            <Signup
              theme={ctx.t.theme}
              onTheme={(v) => ctx.setTweak("theme", v)}
              onSignedUp={handleSignedUp}
              onPushToast={ctx.pushToast}
            />
            <Toasts items={ctx.toasts} />
            <InklyTweaksPanel />
          </div>
        } />
      </Route>

      {/* Protected routes — redirect to login if not authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard onPushToast={ctx.pushToast} />} />
          <Route path="/tasks"     element={<MyTasksPage onPushToast={ctx.pushToast} />} />
          <Route path="/kanban"    element={<Kanban onPushToast={ctx.pushToast} />} />
          <Route path="/calendar"  element={<CalendarPage onPushToast={ctx.pushToast} />} />
          <Route path="/teams"     element={<TeamBoardsPage onPushToast={ctx.pushToast} />} />
          <Route path="/inbox"     element={<InboxPage onPushToast={ctx.pushToast} />} />
          <Route path="/settings"  element={<SettingsPage onLogout={handleLogout} onPushToast={ctx.pushToast} />} />
          <Route path="/analytics" element={<Placeholder name="Analytics" />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/* ---- App root ---- */
function App() {
  const [t, setTweak] = useTweaks(INKLY_DEFAULTS);
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const pushToast = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, text }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2400);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    applyAccent(t.accent);
  }, [t.theme, t.accent]);

  useEffect(() => {
    document.documentElement.dataset.density = t.density;
  }, [t.density]);

  // Session restoration — call /api/me on startup; cookie sent automatically
  useEffect(() => {
    INKLY_API.getMe()
      .then(function(profile) { if (profile) setUser(profile); })
      .catch(function() {})
      .finally(function() { setAuthChecked(true); });
  }, []);

  function toggleTheme(explicit) {
    const next = explicit || (t.theme === "light" ? "dark" : "light");
    setTweak("theme", next);
  }

  const ctx = { t, setTweak, toasts, pushToast, toggleTheme, user, setUser, authChecked };

  if (!authChecked) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"var(--paper)"}}>
        <span className="spinner" style={{width:24,height:24}}/>
      </div>
    );
  }

  return (
    <HashRouter>
      <InklyContext.Provider value={ctx}>
        <AppRoutes />
      </InklyContext.Provider>
    </HashRouter>
  );
}

/* ---- Placeholder for unimplemented pages ---- */
function Placeholder({ name }) {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">{name}</h1>
          <div className="page__sub">This area is part of the prototype shell. Open the Tweaks panel to navigate to Login, Dashboard, or Kanban.</div>
        </div>
      </div>
      <div className="card" style={{padding: 60, textAlign: "center", color: "var(--ink-3)"}}>
        <div className="skel" style={{height: 14, width: 220, margin: "0 auto 12px"}}/>
        <div className="skel" style={{height: 14, width: 280, margin: "0 auto 12px"}}/>
        <div className="skel" style={{height: 14, width: 180, margin: "0 auto"}}/>
      </div>
    </div>
  );
}

export default App;
