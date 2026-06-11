/* Signup screen */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './inkly-icons.jsx';
import { INKLY_API } from './inkly-api.js';

function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw))   s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_KEY   = ["", "weak", "fair", "good", "strong"];

export function Signup({ onSignedUp, theme, onTheme, onPushToast }) {
  const navigate = useNavigate();
  const [name, setName]     = useState("Avery Chen");
  const [email, setEmail]   = useState("");
  const [pw, setPw]         = useState("");
  const [showPw, setShowPw] = useState(false);
  const [workspace, setWorkspace] = useState("northwind");
  const [plan, setPlan]     = useState("team");
  const [agree, setAgree]   = useState(false);
  const [updates, setUpdates] = useState(true);
  const [errs, setErrs]     = useState({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => scorePassword(pw), [pw]);

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (name.trim().length < 2) next.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid work email.";
    if (pw.length < 8) next.pw = "Use 8+ characters with a mix of letters and numbers.";
    if (!/^[a-z0-9-]{3,}$/.test(workspace)) next.workspace = "Lowercase letters, numbers, and dashes. 3+ chars.";
    if (!agree) next.agree = "Please accept the terms to continue.";
    setErrs(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    INKLY_API.signup(name.trim(), email, pw, workspace)
      .then(data => {
        setLoading(false);
        onSignedUp(data);
      })
      .catch(err => {
        setLoading(false);
        setErrs({ email: err.message });
      });
  }

  return (
    <div className="login login--signup">
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
              <pattern id="grid-su" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M0 0H28M0 0V28" stroke="var(--line)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="600" fill="url(#grid-su)"/>
          </svg>

          <ul className="signup__benefits">
            <li className="signup__benefit">
              <span className="signup__benefit-check"><Icons.Check s={12}/></span>
              <div>
                <div className="signup__benefit-title">Bring your team's writing into one calm place</div>
                <div className="signup__benefit-sub">docs · tasks · decisions · meetings</div>
              </div>
            </li>
            <li className="signup__benefit">
              <span className="signup__benefit-check"><Icons.Check s={12}/></span>
              <div>
                <div className="signup__benefit-title">Free forever for up to 10 teammates</div>
                <div className="signup__benefit-sub">no credit card · cancel anytime</div>
              </div>
            </li>
            <li className="signup__benefit">
              <span className="signup__benefit-check"><Icons.Check s={12}/></span>
              <div>
                <div className="signup__benefit-title">Imports from Notion, Linear, and Markdown</div>
                <div className="signup__benefit-sub">average migration · 14 minutes</div>
              </div>
            </li>
          </ul>
        </div>

        <div className="login__quote">
          <span>"The best workspaces feel quiet.</span> Inkly makes room for the small, deliberate decisions teams actually ship."
          <div className="login__quote-by">
            <span className="dot dot--accent"/> Field Notes · onboarding handbook
          </div>
          <div className="signup__stat">
            <span><span className="signup__stat-num">8,200+</span> teams</span>
            <span className="signup__stat-divider"/>
            <span><span className="signup__stat-num">99.99%</span> uptime</span>
            <span className="signup__stat-divider"/>
            <span><span className="signup__stat-num">SOC 2</span> Type II</span>
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
          <h1>Create your workspace</h1>
          <div className="auth__sub">Two minutes. No credit card required.</div>

          <div className="auth__oauth">
            <button type="button" className="oauth-btn" onClick={() => onPushToast?.("Google SSO coming soon")}><Icons.G/> Sign up with Google</button>
            <button type="button" className="oauth-btn" onClick={() => onPushToast?.("Microsoft SSO coming soon")}><Icons.Microsoft/> Sign up with Microsoft</button>
          </div>

          <div className="auth__sep">or sign up with email</div>

          <label className="field">
            <span className="field__label">Your name</span>
            <span className={`input-wrap ${errs.name ? "input-wrap--error" : ""}`}>
              <span className="input-wrap__icon"><Icons.Users s={15}/></span>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); if (errs.name) setErrs({...errs, name: undefined}); }}
                placeholder="Avery Chen"
                autoComplete="name"
              />
            </span>
            {errs.name && <div className="field__err"><Icons.X s={11}/> {errs.name}</div>}
          </label>

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
            <span className="field__label">Password</span>
            <span className={`input-wrap ${errs.pw ? "input-wrap--error" : ""}`}>
              <span className="input-wrap__icon"><Icons.Lock/></span>
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => { setPw(e.target.value); if (errs.pw) setErrs({...errs, pw: undefined}); }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button type="button" className="input-wrap__btn" onClick={() => setShowPw(s => !s)} aria-label="Toggle password">
                {showPw ? <Icons.EyeOff/> : <Icons.Eye/>}
              </button>
            </span>
            <div className="signup__strength" aria-hidden="true">
              {[1,2,3,4].map(i => (
                <div
                  key={i}
                  className={`signup__strength-seg ${i <= strength ? "is-on--" + STRENGTH_KEY[strength] : ""}`}
                />
              ))}
            </div>
            <div className="signup__strength-label">
              <span>{pw.length === 0 ? "Use 8+ chars · mix letters, numbers, symbols" : `Strength: `}<strong>{pw.length === 0 ? "" : STRENGTH_LABEL[strength] || "Weak"}</strong></span>
              <span>{pw.length}/64</span>
            </div>
            {errs.pw && <div className="field__err"><Icons.X s={11}/> {errs.pw}</div>}
          </label>

          <label className="field">
            <span className="field__label">Workspace URL</span>
            <span className={`input-wrap ${errs.workspace ? "input-wrap--error" : ""}`}>
              <span className="input-wrap__icon"><Icons.Layers s={15}/></span>
              <input
                type="text"
                value={workspace}
                onChange={e => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setWorkspace(v);
                  if (errs.workspace) setErrs({...errs, workspace: undefined});
                }}
                placeholder="your-team"
                autoComplete="off"
                spellCheck="false"
              />
              <span className="signup__suffix">.inkly.app</span>
            </span>
            {errs.workspace && <div className="field__err"><Icons.X s={11}/> {errs.workspace}</div>}
          </label>

          <div className="field">
            <span className="field__label" style={{marginBottom: 8}}>Choose a plan</span>
            <div className="signup__plan">
              <label className={`signup__plan-opt ${plan === "starter" ? "is-on" : ""}`}>
                <input type="radio" name="plan" value="starter" checked={plan === "starter"} onChange={() => setPlan("starter")} />
                <div className="signup__plan-name">
                  Starter
                  <span className="signup__plan-pill">Free</span>
                </div>
                <div className="signup__plan-price"><b>$0</b> · up to 10 people</div>
              </label>
              <label className={`signup__plan-opt ${plan === "team" ? "is-on" : ""}`}>
                <input type="radio" name="plan" value="team" checked={plan === "team"} onChange={() => setPlan("team")} />
                <div className="signup__plan-name">
                  Team
                  <span className="signup__plan-pill">14-day trial</span>
                </div>
                <div className="signup__plan-price"><b>$8</b>/seat · unlimited docs</div>
              </label>
            </div>
          </div>

          <div className="auth__row" style={{flexDirection: "column", alignItems: "flex-start", gap: 8, marginTop: 16}}>
            <label className="checkbox">
              <input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); if (errs.agree) setErrs({...errs, agree: undefined}); }} />
              <span className="checkbox__box"><Icons.Check s={11}/></span>
              I agree to the <a href="#" onClick={e => { e.preventDefault(); onPushToast?.("Terms of Service"); }} style={{marginLeft: 4}}>Terms</a><span style={{margin: "0 4px", color: "var(--ink-4)"}}>·</span><a href="#" onClick={e => { e.preventDefault(); onPushToast?.("Privacy Policy"); }}>Privacy</a>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={updates} onChange={e => setUpdates(e.target.checked)} />
              <span className="checkbox__box"><Icons.Check s={11}/></span>
              Send me product updates (1–2 emails a month)
            </label>
            {errs.agree && <div className="field__err" style={{marginTop: 0}}><Icons.X s={11}/> {errs.agree}</div>}
          </div>

          <button className="auth__submit" disabled={loading} style={{marginTop: 16}}>
            {loading ? (<><span className="spinner"/> Creating your workspace…</>) : (<>Create workspace <Icons.Chevron s={14}/></>)}
          </button>

          <div className="auth__footer">
            Already have an account?{" "}
            <a href="#" onClick={e => { e.preventDefault(); navigate("/login"); }}>Sign in</a>
          </div>
        </form>
      </div>
    </div>
  );
}
