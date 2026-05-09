/* Inkly app — router + theme + tweaks + toasts */
const { useState: useStateApp, useEffect: useEffectApp, useCallback: useCallbackApp } = React;

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
  // only override soft/tint/ink in light mode; dark theme overrides them
  if (document.documentElement.dataset.theme !== "dark") {
    r.setProperty("--accent-soft", a.soft);
    r.setProperty("--accent-tint", a.tint);
    r.setProperty("--accent-ink",  a.ink);
  } else {
    // dark — derive a brighter ink for legibility
    r.setProperty("--accent-ink", `oklch(0.85 0.10 ${getHue(a.base)})`);
  }
}
function getHue(oklch) {
  // crude parse — pulls the third number out of "oklch(L C H)"
  const m = oklch.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/);
  return m ? m[1] : "250";
}

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

function App() {
  const defaults = window.__INKLY_DEFAULTS;
  const [t, setTweak] = useTweaks(defaults);
  const [route, setRoute] = useStateApp(defaults.startScreen || "login");
  const [toasts, setToasts] = useStateApp([]);

  const pushToast = useCallbackApp((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, text }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 2400);
  }, []);

  // theme
  useEffectApp(() => {
    document.documentElement.dataset.theme = t.theme;
    applyAccent(t.accent);
  }, [t.theme, t.accent]);

  // density
  useEffectApp(() => {
    document.documentElement.dataset.density = t.density;
  }, [t.density]);

  function handleSignIn() {
    setRoute("dashboard");
    pushToast("Welcome back, Avery");
  }
  function handleLogout() {
    setRoute("login");
  }

  function toggleTheme(explicit) {
    const next = explicit || (t.theme === "light" ? "dark" : "light");
    setTweak("theme", next);
  }

  // map accent <-> hex (TweakColor stores hex; we resolve back to preset key)
  const hexFromAccent = (key) => (ACCENT_PRESETS[key] || ACCENT_PRESETS["ink-blue"]).swatch;
  const accentFromHex = (hex) => Object.keys(ACCENT_PRESETS).find(k => ACCENT_PRESETS[k].swatch === hex) || "ink-blue";

  // ----- Tweaks panel -----
  const tweaksPanel = (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme & accent">
        <TweakRadio
          label="Theme"
          value={t.theme}
          onChange={(v) => setTweak("theme", v)}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
        />
        <TweakColor
          label="Accent"
          value={hexFromAccent(t.accent)}
          onChange={(hex) => setTweak("accent", accentFromHex(hex))}
          options={Object.keys(ACCENT_PRESETS).map(k => ACCENT_PRESETS[k].swatch)}
        />
        <TweakRadio
          label="Density"
          value={t.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "cozy",  label: "Cozy"  },
            { value: "comfy", label: "Comfy" },
            { value: "roomy", label: "Roomy" },
          ]}
        />
      </TweakSection>
      <TweakSection label="Navigate">
        <TweakRadio
          label="Page"
          value={route}
          onChange={(v) => setRoute(v)}
          options={[
            { value: "login",     label: "Login" },
            { value: "dashboard", label: "Home"  },
            { value: "kanban",    label: "Kanban" },
          ]}
        />
        <TweakButton label="Demo toast" onClick={() => pushToast("This is a toast notification")} />
      </TweakSection>
    </TweaksPanel>
  );

  // ----- Routing -----
  if (route === "login") {
    return (
      <div className="app app--login">
        <Login
          theme={t.theme}
          onTheme={(v) => setTweak("theme", v)}
          onSignIn={handleSignIn}
        />
        <Toasts items={toasts} />
        {tweaksPanel}
      </div>
    );
  }

  const crumbsByRoute = {
    dashboard: ["Northwind Studio", "Home", "Dashboard"],
    kanban:    ["Northwind Studio", "Project Inkly", "Kanban Workflow"],
    tasks:     ["Northwind Studio", "My Tasks"],
    teams:     ["Northwind Studio", "Team Boards"],
    calendar:  ["Northwind Studio", "Calendar"],
    analytics: ["Northwind Studio", "Analytics"],
    inbox:     ["Northwind Studio", "Notifications"],
    settings:  ["Northwind Studio", "Settings"],
  };

  let content = null;
  if (route === "dashboard") content = <Dashboard onPushToast={pushToast} />;
  else if (route === "kanban") content = <Kanban onPushToast={pushToast} />;
  else content = <Placeholder name={(crumbsByRoute[route] || [])[1] || "Coming soon"} />;

  return (
    <div className="app">
      <Sidebar active={route} onNav={setRoute} onLogout={handleLogout} />
      <div className="main">
        <Topbar
          crumbs={crumbsByRoute[route] || ["Inkly"]}
          theme={t.theme}
          onTheme={() => toggleTheme()}
          onCreate={() => pushToast("Quick-create opened")}
        />
        {content}
      </div>
      <Toasts items={toasts} />
      {tweaksPanel}
    </div>
  );
}

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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
