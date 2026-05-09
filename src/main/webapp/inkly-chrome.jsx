/* Sidebar + Topbar shared chrome */
const { useState: useStateChrome } = React;

function Avatar({ p, size = "" }) {
  if (!p) return null;
  const cls = `av ${size ? "av--" + size : ""} ${p.color || ""}`;
  return <span className={cls} title={p.name}>{p.initials}</span>;
}

function Sidebar({ active, onNav, onLogout, collapsed, onCollapse }) {
  const items = [
    { id: "dashboard", label: "Dashboard",      icon: <Icons.Home /> , badge: null },
    { id: "tasks",     label: "My Tasks",       icon: <Icons.Check s={15}/>, badge: 7 },
    { id: "kanban",    label: "Kanban Workflow",icon: <Icons.Layers />, badge: null },
    { id: "teams",     label: "Team Boards",    icon: <Icons.Users  />, badge: null },
    { id: "calendar",  label: "Calendar",       icon: <Icons.Cal    />, badge: null },
    { id: "analytics", label: "Analytics",      icon: <Icons.Chart  />, badge: null },
    { id: "inbox",     label: "Notifications",  icon: <Icons.Inbox  />, badge: 12 },
    { id: "settings",  label: "Settings",       icon: <Icons.Cog    />, badge: null },
  ];
  const favorites = [
    { id: "f1", label: "Sprint 24",            dot: "accent" },
    { id: "f2", label: "Onboarding · v2",      dot: "violet" },
    { id: "f3", label: "Q2 OKRs",              dot: "amber"  },
  ];
  return (
    <aside className="side">
      <div className="side__brand">
        <div className="side__brand-mark"><Icons.Logo s={16}/></div>
        <div>
          <div className="side__brand-name">Inkly</div>
          <div className="side__brand-sub">Workspace · Studio</div>
        </div>
        <button
          className="side__toggle"
          onClick={onCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          type="button"
        >
          <Icons.Chevron s={13} style={{transform: collapsed ? "none" : "rotate(180deg)"}} />
        </button>
      </div>

      <button className="side__ws" type="button">
        <span className="side__ws-glyph">N</span>
        <span className="side__ws-name">Northwind Studio</span>
        <Icons.ChevDn />
      </button>

      <div className="side__nav">
        {items.map(it => (
          <div
            key={it.id}
            className={`side__item ${active === it.id ? "side__item--active" : ""}`}
            onClick={() => onNav(it.id)}
            title={it.label}
          >
            {it.icon}
            <span className="side__item-label">{it.label}</span>
            {it.badge != null && <span className="side__item-badge">{it.badge}</span>}
          </div>
        ))}

        <div className="side__group-label">Favorites</div>
        {favorites.map(f => (
          <div key={f.id} className="side__item" title={f.label}>
            <span className={`dot dot--${f.dot}`} style={{marginLeft: 4}} />
            <span className="side__item-label">{f.label}</span>
          </div>
        ))}
      </div>

      <div className="side__divider" />
      <div className="side__user">
        <div className="side__user-av">{INKLY_DATA.ME.initials}</div>
        <div style={{minWidth: 0}}>
          <div className="side__user-name">{INKLY_DATA.ME.name}</div>
          <div className="side__user-role">Online · {INKLY_DATA.ME.role}</div>
        </div>
        <button className="side__user-logout" onClick={onLogout} title="Sign out">
          <Icons.Out />
        </button>
      </div>
    </aside>
  );
}

function Crumbs({ path }) {
  return (
    <div className="top__crumbs">
      {path.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icons.Chevron />}
          {i === path.length - 1 ? <strong>{seg}</strong> : <span>{seg}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function Topbar({ crumbs, theme, onTheme, onCreate }) {
  return (
    <div className="top">
      <Crumbs path={crumbs} />
      <label className="top__search">
        <Icons.Search />
        <input placeholder="Search pages, tasks, people…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top__spacer" />
      <div className="top__btns">
        <span className="avstack" style={{marginRight: 8}}>
          {INKLY_DATA.PEOPLE.slice(0, 4).map(p => <Avatar key={p.id} p={p} />)}
          <span className="av" style={{background: "var(--paper-3)", color: "var(--ink-3)", fontWeight: 500}}>+8</span>
        </span>
        <button className="icon-btn icon-btn--has-dot" title="Notifications"><Icons.Bell /></button>
        <button className="icon-btn" title="Theme" onClick={onTheme}>
          {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
        </button>
        <button className="btn btn--primary" onClick={onCreate}>
          <Icons.Plus /> New
        </button>
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.Avatar = Avatar;
