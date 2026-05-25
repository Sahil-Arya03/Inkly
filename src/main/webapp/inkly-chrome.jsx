/* Sidebar + Topbar shared chrome */
const { useState: useStateChrome } = React;

function Avatar({ p, size = "" }) {
  if (!p) return null;
  const cls = `av ${size ? "av--" + size : ""} ${p.color || ""}`;
  return <span className={cls} title={p.name}>{p.initials}</span>;
}

function Sidebar({ active, onNav, onLogout }) {
  const primary = [
  { id: "dashboard", label: "Dashboard", icon: <Icons.Home s={18} />, badge: null },
  { id: "tasks", label: "My Tasks", icon: <Icons.Check s={17} />, badge: 7 },
  { id: "kanban", label: "Kanban Workflow", icon: <Icons.Layers s={18} />, badge: null },
  { id: "teams", label: "Team Boards", icon: <Icons.Users s={18} />, badge: null },
  { id: "calendar", label: "Calendar", icon: <Icons.Cal s={18} />, badge: null },
  { id: "analytics", label: "Analytics", icon: <Icons.Chart s={18} />, badge: null },
  { id: "inbox", label: "Notifications", icon: <Icons.Inbox s={18} />, badge: 12 }];

  const secondary = [
  { id: "settings", label: "Settings", icon: <Icons.Cog s={18} /> }];


  const RailItem = ({ it }) =>
  <button
    type="button"
    className={`rail__item ${active === it.id ? "rail__item--active" : ""}`}
    onClick={() => onNav(it.id)}
    aria-label={it.label}
    aria-current={active === it.id ? "page" : undefined}>

      {it.icon}
      {it.badge != null && <span className="rail__badge">{it.badge}</span>}
      <span className="rail__tip">{it.label}</span>
    </button>;


  return (
    <aside className="rail" aria-label="Primary navigation">
      <button type="button" className="rail__brand" aria-label="Inkly · Northwind Studio">
        <span className="rail__brand-mark"><Icons.Logo s={16} /></span>
        <span className="rail__tip">Inkly · Northwind Studio</span>
      </button>

      <div className="rail__divider" />

      <nav className="rail__nav">
        {primary.map((it) => <RailItem key={it.id} it={it} />)}
      </nav>

      <div className="rail__spacer" />

      <nav className="rail__nav rail__nav--bottom">
        {secondary.map((it) => <RailItem key={it.id} it={it} />)}
      </nav>

      <button type="button" className="rail__user" onClick={onLogout} aria-label={`${INKLY_DATA.ME.name} · sign out`}>
        <span className="rail__user-av">{INKLY_DATA.ME.initials}</span>
        <span className="rail__tip">
          <strong>{INKLY_DATA.ME.name}</strong>
          <em>Online · {INKLY_DATA.ME.role}</em>
          <span className="rail__tip-cta">Click to sign out</span>
        </span>
      </button>
    </aside>);

}

function Crumbs({ path }) {
  return (
    <div className="top__crumbs">
      {path.map((seg, i) =>
      <React.Fragment key={i}>
          {i > 0 && <Icons.Chevron />}
          {i === path.length - 1 ? <strong>{seg}</strong> : <span>{seg}</span>}
        </React.Fragment>
      )}
    </div>);

}

function Topbar({ theme, onTheme, onCreate }) {
  return (
    <div className="top">
      <label className="top__search">
        <Icons.Search />
        <input placeholder="Search pages, tasks, people…" />
        <kbd>⌘K</kbd>
      </label>
      <div className="top__spacer" />
      <div className="top__btns">
        <span className="avstack" style={{ marginRight: 8 }}>
          {INKLY_DATA.PEOPLE.slice(0, 4).map((p) => <Avatar key={p.id} p={p} />)}
          <span className="av" style={{ background: "var(--paper-3)", color: "var(--ink-3)", fontWeight: 500 }}>+8</span>
        </span>
        <button className="icon-btn icon-btn--has-dot" title="Notifications"><Icons.Bell /></button>
        <button className="icon-btn" title="Theme" onClick={onTheme}>
          {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
        </button>
        <button className="btn btn--primary" onClick={onCreate}>
          <Icons.Plus /> New
        </button>
      </div>
    </div>);

}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.Avatar = Avatar;