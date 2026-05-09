/* Login screen */
const { useState: useStateLogin } = React;

function Login({ onSignIn, theme, onTheme }) {
  const [email, setEmail] = useStateLogin("avery@inkly.team");
  const [pw, setPw] = useStateLogin("");
  const [showPw, setShowPw] = useStateLogin(false);
  const [remember, setRemember] = useStateLogin(true);
  const [errs, setErrs] = useStateLogin({});
  const [loading, setLoading] = useStateLogin(false);

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid work email.";
    if (pw.length < 6) next.pw = "Password must be at least 6 characters.";
    setErrs(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(); }, 950);
  }

  return (
    <div className="login">
      <div className="login__left">
        <div className="login__brand">
          <div className="side__brand-mark" style={{width: 32, height: 32}}><Icons.Logo s={18}/></div>
          <div>
            <div className="login__brand-name">Inkly</div>
            <div style={{fontSize: 11, color: "var(--ink-3)", marginTop: 1}}>Workspace · for teams that write things down</div>
          </div>
        </div>

        <div className="login__art">
          <svg className="login__art-glyph" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M0 0H28M0 0V28" stroke="var(--line)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="600" fill="url(#grid)"/>
          </svg>

          <div className="login__art-card">
            <div style={{display: "flex", gap: 6, marginBottom: 10}}>
              <span className="chip chip--accent">Sprint 24</span>
              <span className="chip chip--ghost">In progress</span>
            </div>
            <div style={{fontSize: 14, fontWeight: 500, marginBottom: 4}}>Drag-to-reorder for nested pages</div>
            <div style={{fontSize: 12, color: "var(--ink-3)", marginBottom: 12}}>Reorder + reparent in one gesture, single audit event.</div>
            <div style={{height: 4, background: "var(--paper-2)", borderRadius: 4, overflow: "hidden"}}>
              <div style={{height: "100%", width: "60%", background: "var(--accent)"}}/>
            </div>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>
              <span>INK-198</span>
              <span className="avstack">
                <Avatar p={INKLY_DATA.PEOPLE[2]}/>
                <Avatar p={INKLY_DATA.PEOPLE[1]}/>
              </span>
            </div>
          </div>

          <div className="login__art-card">
            <div style={{fontSize: 13, fontWeight: 500, marginBottom: 4}}>Q2 OKR draft v2</div>
            <div style={{fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>noor · review by friday</div>
          </div>
          <div className="login__art-card">
            <div style={{fontSize: 13, fontWeight: 500, marginBottom: 4}}>Comment notifications batching</div>
            <div style={{fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)"}}>devon · in progress</div>
          </div>
        </div>

        <div className="login__quote">
          <span>"Productivity is never an accident.</span> It's the residue of small, deliberate decisions you write down."
          <div className="login__quote-by">
            <span className="dot dot--accent"/> The Inkly Field Notes · Vol. III
          </div>
        </div>
      </div>

      <div className="login__right">
        <div className="login__right-toolbar">
          <div className="theme-pill">
            <button aria-pressed={theme==="light"} onClick={() => onTheme("light")}><Icons.Sun s={13}/> Light</button>
            <button aria-pressed={theme==="dark"} onClick={() => onTheme("dark")}><Icons.Moon s={13}/> Dark</button>
          </div>
        </div>

        <form className="auth" onSubmit={submit} noValidate>
          <h1>Welcome back</h1>
          <div className="auth__sub">Sign in to continue to your workspace.</div>

          <div className="auth__oauth">
            <button type="button" className="oauth-btn"><Icons.G/> Continue with Google</button>
            <button type="button" className="oauth-btn"><Icons.Microsoft/> Continue with Microsoft</button>
          </div>

          <div className="auth__sep">or sign in with email</div>

          <label className="field">
            <span className="field__label">Work email</span>
            <span className={`input-wrap ${errs.email ? "input-wrap--error" : ""}`}>
              <span className="input-wrap__icon"><Icons.Mail/></span>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errs.email) setErrs({...errs, email: undefined}); }}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </span>
            {errs.email && <div className="field__err"><Icons.X s={11}/> {errs.email}</div>}
          </label>

          <label className="field">
            <span className="field__label">
              Password
              <a href="#">Forgot password?</a>
            </span>
            <span className={`input-wrap ${errs.pw ? "input-wrap--error" : ""}`}>
              <span className="input-wrap__icon"><Icons.Lock/></span>
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => { setPw(e.target.value); if (errs.pw) setErrs({...errs, pw: undefined}); }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="input-wrap__btn" onClick={() => setShowPw(s => !s)} aria-label="Toggle password">
                {showPw ? <Icons.EyeOff/> : <Icons.Eye/>}
              </button>
            </span>
            {errs.pw && <div className="field__err"><Icons.X s={11}/> {errs.pw}</div>}
          </label>

          <div className="auth__row">
            <label className="checkbox">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span className="checkbox__box"><Icons.Check s={11}/></span>
              Remember me for 30 days
            </label>
          </div>

          <button className="auth__submit" disabled={loading}>
            {loading ? (<><span className="spinner"/> Signing in…</>) : (<>Sign in <Icons.Chevron s={14}/></>)}
          </button>

          <div className="auth__footer">
            New to Inkly? <a href="#">Request access</a>
          </div>
        </form>
      </div>
    </div>
  );
}

window.Login = Login;
