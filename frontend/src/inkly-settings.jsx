/* Settings — profile, account, privacy, account switching, sessions, danger zone */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './inkly-icons.jsx';
import { INKLY_DATA } from './inkly-data.js';

/* ---- small local controls ---- */
function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`set-toggle ${on ? "set-toggle--on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="set-toggle__knob" />
    </button>
  );
}

function SetField({ label, hint, children }) {
  return (
    <label className="set-field">
      <span className="set-field__label">{label}</span>
      {children}
      {hint && <span className="set-field__hint">{hint}</span>}
    </label>
  );
}

function SetRow({ icon, title, sub, children, danger }) {
  const I = Icons;
  const Ico = icon ? I[icon] : null;
  return (
    <div className={`set-row ${danger ? "set-row--danger" : ""}`}>
      {Ico && <span className="set-row__ico"><Ico s={16} /></span>}
      <div className="set-row__txt">
        <div className="set-row__title">{title}</div>
        {sub && <div className="set-row__sub">{sub}</div>}
      </div>
      <div className="set-row__action">{children}</div>
    </div>
  );
}

/* ---- confirm modal (used for delete account) ---- */
function ConfirmDelete({ onCancel, onConfirm }) {
  const I = Icons;
  const [val, setVal] = useState("");
  const ok = val.trim().toUpperCase() === "DELETE";
  return (
    <div className="set-modal__scrim" onClick={onCancel}>
      <div className="set-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="set-modal__icon"><I.Trash s={20} /></div>
        <h3 className="set-modal__title">Delete your account?</h3>
        <p className="set-modal__body">
          This permanently removes <strong>Avery Walsh</strong>, your tasks, comments and
          board memberships across Northwind Studio. This can't be undone.
        </p>
        <label className="set-field" style={{ marginTop: 4 }}>
          <span className="set-field__label">Type <span className="mono">DELETE</span> to confirm</span>
          <div className="input-wrap">
            <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="DELETE" autoFocus />
          </div>
        </label>
        <div className="set-modal__actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn set-btn--danger" disabled={!ok} onClick={onConfirm}>
            <I.Trash s={13} /> Delete account
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============== sections ============== */

function ProfileSection({ me, onPushToast }) {
  const I = Icons;
  const [name, setName] = useState(me.name);
  const [role, setRole] = useState(me.role);
  const [email, setEmail] = useState(me.email);
  const [bio, setBio] = useState("Designing calmer tools for focused teams. Coffee, type, and tidy backlogs.");
  const dirty = name !== me.name || role !== me.role || email !== me.email;

  return (
    <div className="set-panel">
      <div className="set-panel__head">
        <div>
          <h2 className="set-panel__title">Edit profile</h2>
          <p className="set-panel__sub">This is how teammates see you across Inkly.</p>
        </div>
      </div>

      <div className="set-card">
        <div className="set-avatar-row">
          <span className="av av--xl av-ink">{me.initials}</span>
          <div className="set-avatar-row__btns">
            <button className="btn btn--sm" onClick={() => onPushToast("Photo picker opened")}><I.Camera s={13} /> Change photo</button>
            <button className="btn btn--sm btn--ghost" onClick={() => onPushToast("Photo removed")}>Remove</button>
            <div className="set-avatar-row__hint mono">PNG or JPG · up to 4MB</div>
          </div>
        </div>

        <div className="set-grid2">
          <SetField label="Full name">
            <div className="input-wrap"><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          </SetField>
          <SetField label="Role / title">
            <div className="input-wrap"><input value={role} onChange={(e) => setRole(e.target.value)} /></div>
          </SetField>
        </div>

        <SetField label="Email" hint="Used for sign-in and notifications.">
          <div className="input-wrap">
            <span className="input-wrap__icon"><I.Mail s={15} /></span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
        </SetField>

        <SetField label="Bio">
          <textarea className="set-textarea" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </SetField>

        <div className="set-card__foot">
          <span className="set-card__foot-note">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
          <div className="set-card__foot-btns">
            <button className="btn" disabled={!dirty} onClick={() => { setName(me.name); setRole(me.role); setEmail(me.email); }}>Reset</button>
            <button className="btn btn--primary" disabled={!dirty} onClick={() => onPushToast("Profile updated")}>
              <I.Check s={13} /> Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountSection({ me, onLogout, onPushToast }) {
  const I = Icons;
  const sessions = [
    { id: "s1", device: "MacBook Pro · Chrome", where: "San Francisco, US", when: "Active now", current: true },
    { id: "s2", device: "iPhone 15 · Inkly iOS", where: "San Francisco, US", when: "2 hours ago" },
    { id: "s3", device: "iPad · Safari", where: "Oakland, US", when: "Yesterday" },
  ];
  const [live, setLive] = useState(sessions);

  return (
    <div className="set-panel">
      <div className="set-panel__head">
        <div>
          <h2 className="set-panel__title">Manage account</h2>
          <p className="set-panel__sub">Sign-in, security, and where you're logged in.</p>
        </div>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Sign-in &amp; security</div>
        <SetRow icon="Mail" title="Email address" sub={me.email}>
          <button className="btn btn--sm" onClick={() => onPushToast("Verification email sent")}>Change</button>
        </SetRow>
        <SetRow icon="Key" title="Password" sub="Last changed 3 months ago">
          <button className="btn btn--sm" onClick={() => onPushToast("Password reset link sent")}>Update</button>
        </SetRow>
        <SetRow icon="Shield" title="Two-factor authentication" sub="Authenticator app · enabled">
          <span className="chip chip--green"><I.Check s={11} /> On</span>
        </SetRow>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">
          Active sessions
          <span className="set-card__hd-note">{live.length} signed in</span>
        </div>
        {live.map((s) => (
          <SetRow key={s.id} icon="Device" title={s.device} sub={`${s.where} · ${s.when}`}>
            {s.current ? (
              <span className="chip chip--accent">This device</span>
            ) : (
              <button
                className="btn btn--sm"
                onClick={() => { setLive((ls) => ls.filter((x) => x.id !== s.id)); onPushToast("Signed out of " + s.device); }}
              >
                <I.Out s={13} /> Log out
              </button>
            )}
          </SetRow>
        ))}
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Session</div>
        <SetRow icon="Out" title="Log out" sub="Sign out of Inkly on this device">
          <button className="btn btn--sm" onClick={onLogout}><I.Out s={13} /> Log out</button>
        </SetRow>
        <SetRow icon="Globe" title="Log out everywhere" sub="End every active session immediately">
          <button className="btn btn--sm" onClick={() => { onPushToast("Signed out of all sessions"); onLogout(); }}>Log out all</button>
        </SetRow>
      </div>
    </div>
  );
}

function PrivacySection({ onPushToast }) {
  const [p, setP] = useState({
    profile: true,
    activity: true,
    receipts: false,
    mentions: true,
    discover: false,
    analytics: true,
    digest: true,
  });
  const set = (k) => (v) => { setP((s) => ({ ...s, [k]: v })); onPushToast("Privacy preference saved"); };

  return (
    <div className="set-panel">
      <div className="set-panel__head">
        <div>
          <h2 className="set-panel__title">Privacy</h2>
          <p className="set-panel__sub">Control what you share and who can see your activity.</p>
        </div>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Visibility</div>
        <SetRow icon="Eye" title="Public profile" sub="Teammates can view your profile and bio">
          <Toggle on={p.profile} onChange={set("profile")} label="Public profile" />
        </SetRow>
        <SetRow icon="Sparkle" title="Show activity status" sub="Display when you're online and active">
          <Toggle on={p.activity} onChange={set("activity")} label="Activity status" />
        </SetRow>
        <SetRow icon="Check" title="Read receipts" sub="Let others see when you've read their comments">
          <Toggle on={p.receipts} onChange={set("receipts")} label="Read receipts" />
        </SetRow>
        <SetRow icon="Users" title="Discoverable by email" sub="People with your email can find your profile">
          <Toggle on={p.discover} onChange={set("discover")} label="Discoverable" />
        </SetRow>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Data &amp; communication</div>
        <SetRow icon="Chart" title="Usage analytics" sub="Share anonymous usage data to improve Inkly">
          <Toggle on={p.analytics} onChange={set("analytics")} label="Usage analytics" />
        </SetRow>
        <SetRow icon="Mail" title="Weekly digest" sub="A Monday summary of your boards and mentions">
          <Toggle on={p.digest} onChange={set("digest")} label="Weekly digest" />
        </SetRow>
        <SetRow icon="Msg" title="Mention notifications" sub="Email me when someone @mentions me">
          <Toggle on={p.mentions} onChange={set("mentions")} label="Mention notifications" />
        </SetRow>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Your data</div>
        <SetRow icon="Clip" title="Export my data" sub="Download a copy of your tasks, comments and activity">
          <button className="btn btn--sm" onClick={() => onPushToast("Export started — we'll email a link")}>Request export</button>
        </SetRow>
      </div>
    </div>
  );
}

function AccountsSection({ me, onPushToast }) {
  const navigate = useNavigate();
  const I = Icons;
  const accounts = [
    { id: "a1", name: me.name, sub: "avery@inkly.team · Northwind Studio", initials: me.initials, color: "av-ink", current: true },
    { id: "a2", name: "Avery (Personal)", sub: "avery.walsh@gmail.com · Personal", initials: "AW", color: "av-violet" },
    { id: "a3", name: "Helios Labs", sub: "avery@helios.io · Workspace", initials: "HL", color: "av-amber" },
  ];
  const [active, setActive] = useState("a1");

  return (
    <div className="set-panel">
      <div className="set-panel__head">
        <div>
          <h2 className="set-panel__title">Accounts</h2>
          <p className="set-panel__sub">Switch between accounts or add another to your session.</p>
        </div>
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Signed-in accounts</div>
        {accounts.map((a) => (
          <div key={a.id} className={`set-acct ${active === a.id ? "set-acct--active" : ""}`}>
            <span className={`av av--lg ${a.color}`}>{a.initials}</span>
            <div className="set-acct__txt">
              <div className="set-acct__name">{a.name} {active === a.id && <span className="chip chip--accent">Current</span>}</div>
              <div className="set-acct__sub mono">{a.sub}</div>
            </div>
            {active === a.id ? (
              <span className="set-acct__check"><I.Check s={16} /></span>
            ) : (
              <button className="btn btn--sm" onClick={() => { setActive(a.id); onPushToast("Switched to " + a.name); }}>
                <I.Swap s={13} /> Switch
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="set-card set-card--rows">
        <div className="set-card__hd">Add an account</div>
        <SetRow icon="Plus" title="Add an existing account" sub="Log in to another Inkly account and switch instantly">
          <button className="btn btn--sm btn--primary" onClick={() => navigate("/login")}><I.Out s={13} /> Log in</button>
        </SetRow>
        <SetRow icon="Sparkle" title="Create a new workspace" sub="Start fresh with a new team workspace">
          <button className="btn btn--sm" onClick={() => navigate("/signup")}>Create</button>
        </SetRow>
      </div>
    </div>
  );
}

function DangerSection({ onLogout, onPushToast }) {
  const I = Icons;
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="set-panel">
      <div className="set-panel__head">
        <div>
          <h2 className="set-panel__title">Log out</h2>
          <p className="set-panel__sub">Sign out, deactivate, or permanently delete your account.</p>
        </div>
      </div>

      <div className="set-card set-card--rows set-card--danger">
        <SetRow danger icon="Out" title="Log out" sub="Sign out of Inkly on this device">
          <button className="btn btn--sm" onClick={onLogout}><I.Out s={13} /> Log out</button>
        </SetRow>
        <SetRow danger icon="Lock" title="Deactivate account" sub="Temporarily disable — reactivate any time by logging in">
          <button className="btn btn--sm" onClick={() => { onPushToast("Account deactivated"); onLogout(); }}>Deactivate</button>
        </SetRow>
        <SetRow danger icon="Trash" title="Delete account" sub="Permanently delete your account and all associated data">
          <button className="btn btn--sm set-btn--danger" onClick={() => setConfirming(true)}><I.Trash s={13} /> Delete</button>
        </SetRow>
      </div>

      {confirming && (
        <ConfirmDelete
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); onPushToast("Account deleted"); onLogout(); }}
        />
      )}
    </div>
  );
}

/* ============== shell ============== */

const SET_NAV = [
  { id: "profile",  label: "Edit profile", icon: "Pencil" },
  { id: "account",  label: "Account",      icon: "Cog"    },
  { id: "privacy",  label: "Privacy",      icon: "Shield" },
  { id: "accounts", label: "Accounts",     icon: "Users"  },
  { id: "danger",   label: "Log out",      icon: "Out"    },
];

export function SettingsPage({ onLogout, onPushToast }) {
  const I = Icons;
  const me = INKLY_DATA.ME;
  const [tab, setTab] = useState("profile");

  return (
    <div className="page set-page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Settings</h1>
          <div className="page__sub">Manage your profile, account, privacy and connected accounts.</div>
        </div>
      </div>

      <div className="set-layout">
        <nav className="set-nav" aria-label="Settings sections">
          {SET_NAV.map((n) => {
            const Ico = I[n.icon];
            return (
              <button
                key={n.id}
                className={`set-nav__item ${tab === n.id ? "set-nav__item--active" : ""} ${n.id === "danger" ? "set-nav__item--danger" : ""}`}
                onClick={() => setTab(n.id)}
              >
                <Ico s={15} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="set-content">
          {tab === "profile"  && <ProfileSection  me={me} onPushToast={onPushToast} />}
          {tab === "account"  && <AccountSection  me={me} onLogout={onLogout} onPushToast={onPushToast} />}
          {tab === "privacy"  && <PrivacySection  onPushToast={onPushToast} />}
          {tab === "accounts" && <AccountsSection me={me} onPushToast={onPushToast} />}
          {tab === "danger"   && <DangerSection   onLogout={onLogout} onPushToast={onPushToast} />}
        </div>
      </div>
    </div>
  );
}
