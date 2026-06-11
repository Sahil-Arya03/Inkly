/* Sidebar + Topbar shared chrome — React Router v6 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icons } from './inkly-icons.jsx';
import { INKLY_DATA } from './inkly-data.js';

export function Avatar({ p, size = "" }) {
  if (!p) return null;
  const cls = `av ${size ? "av--" + size : ""} ${p.color || ""}`;
  return <span className={cls} title={p.name}>{p.initials}</span>;
}

export function Sidebar({ onLogout }) {
  const navigate = useNavigate();

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

  return (
    <aside className="rail" aria-label="Primary navigation">
      <button type="button" className="rail__brand" aria-label="Inkly · Northwind Studio" onClick={() => navigate("/dashboard")}>
        <span className="rail__brand-mark"><Icons.Logo s={16} /></span>
        <span className="rail__tip">Inkly · Northwind Studio</span>
      </button>

      <div className="rail__divider" />

      <nav className="rail__nav">
        {primary.map((it) =>
          <NavLink
            key={it.id}
            to={"/" + it.id}
            className={({isActive}) => `rail__item ${isActive ? "rail__item--active" : ""}`}
            aria-label={it.label}>
            {it.icon}
            {it.badge != null && <span className="rail__badge">{it.badge}</span>}
            <span className="rail__tip">{it.label}</span>
          </NavLink>
        )}
      </nav>

      <div className="rail__spacer" />

      <nav className="rail__nav rail__nav--bottom">
        {secondary.map((it) =>
          <NavLink
            key={it.id}
            to={"/" + it.id}
            className={({isActive}) => `rail__item ${isActive ? "rail__item--active" : ""}`}
            aria-label={it.label}>
            {it.icon}
            <span className="rail__tip">{it.label}</span>
          </NavLink>
        )}
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

export function Crumbs({ path }) {
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

export function Topbar({ theme, onTheme, onCreate }) {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState("");

  function handleSearchKey(e) {
    if (e.key === "Enter" && searchVal.trim()) {
      const q = searchVal.trim().toLowerCase();
      const routeMap = {
        home: "/dashboard", dashboard: "/dashboard", tasks: "/tasks", "my tasks": "/tasks",
        kanban: "/kanban", board: "/kanban", calendar: "/calendar", teams: "/teams",
        inbox: "/inbox", notifications: "/inbox", settings: "/settings",
      };
      const match = routeMap[q];
      if (match) {
        navigate(match);
        setSearchVal("");
      }
    }
  }

  return (
    <div className="top">
      <label className="top__search">
        <Icons.Search />
        <input
          placeholder="Search pages, tasks, people…"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearchKey}
        />
        <kbd>⌘K</kbd>
      </label>
      <div className="top__spacer" />
      <div className="top__btns">
        <span className="avstack" style={{ marginRight: 8 }}>
          {INKLY_DATA.PEOPLE.slice(0, 4).map((p) => <Avatar key={p.id} p={p} />)}
          <span className="av" style={{ background: "var(--paper-3)", color: "var(--ink-3)", fontWeight: 500 }}>+8</span>
        </span>
        <button className="icon-btn icon-btn--has-dot" title="Notifications" onClick={() => navigate("/inbox")}><Icons.Bell /></button>
        <button className="icon-btn" title="Theme" onClick={onTheme}>
          {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
        </button>
        <button className="btn btn--primary" onClick={onCreate}>
          <Icons.Plus /> New
        </button>
      </div>
    </div>);

}
