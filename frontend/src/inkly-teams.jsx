/* Team Boards — directory of department boards */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './inkly-icons.jsx';
import { Avatar } from './inkly-chrome.jsx';
import { INKLY_DATA, peopleById } from './inkly-data.js';

const TEAM_BOARDS = [
  {
    id: "eng",  name: "Engineering",  sub: "Platform · API · Infra",
    glyph: "ENG", tone: "accent",
    leadId: "u2", memberIds: ["u2","u4","u6","u1"],
    sprint: "Sprint 24", sprintDay: 9, sprintLen: 14,
    open: 18, inProgress: 7, doneWeek: 12,
    capacity: 0.82, healthy: true,
    activity: [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 0.85],
    desc: "Core infra, billing, and the public API. Owns reliability + incidents.",
  },
  {
    id: "design", name: "Design",      sub: "Product · Brand · Research",
    glyph: "DSN", tone: "violet",
    leadId: "u3", memberIds: ["u3","u1","u5"],
    sprint: "Cycle 9",  sprintDay: 4, sprintLen: 10,
    open: 11, inProgress: 4, doneWeek: 8,
    capacity: 0.68, healthy: true,
    activity: [0.2, 0.4, 0.5, 0.45, 0.6, 0.7, 0.62],
    desc: "Inkly product surfaces, marketing site, design systems. Crit on Fridays.",
  },
  {
    id: "growth", name: "Growth",      sub: "Lifecycle · Activation · SEO",
    glyph: "GRW", tone: "green",
    leadId: "u5", memberIds: ["u5","u4","u1"],
    sprint: "Sprint 24", sprintDay: 9, sprintLen: 14,
    open: 14, inProgress: 5, doneWeek: 6,
    capacity: 0.74, healthy: true,
    activity: [0.5, 0.45, 0.6, 0.55, 0.65, 0.7, 0.72],
    desc: "Onboarding funnel, lifecycle email, public benchmark dashboards.",
  },
  {
    id: "ops",   name: "People & Ops", sub: "Hiring · Finance · Legal",
    glyph: "OPS", tone: "amber",
    leadId: "u6", memberIds: ["u6","u1"],
    sprint: "Quarterly", sprintDay: 31, sprintLen: 90,
    open: 9,  inProgress: 3, doneWeek: 4,
    capacity: 0.91, healthy: false,
    activity: [0.7, 0.8, 0.85, 0.9, 0.88, 0.94, 0.96],
    desc: "Operating cadence, vendor reviews, comp cycles, and the offsite.",
  },
  {
    id: "qa",    name: "Quality",      sub: "QA · Release · Tooling",
    glyph: "QA",  tone: "cyan",
    leadId: "u6", memberIds: ["u6","u2","u4"],
    sprint: "Release 4.7", sprintDay: 3, sprintLen: 7,
    open: 7,  inProgress: 2, doneWeek: 9,
    capacity: 0.58, healthy: true,
    activity: [0.6, 0.5, 0.55, 0.6, 0.5, 0.55, 0.58],
    desc: "Regression suites, release sign-offs, and the QA toolchain.",
  },
  {
    id: "ai",    name: "Applied AI",   sub: "Embeddings · Summaries · Eval",
    glyph: "AI",  tone: "rose",
    leadId: "u4", memberIds: ["u4","u2","u3"],
    sprint: "Sprint 24", sprintDay: 9, sprintLen: 14,
    open: 13, inProgress: 6, doneWeek: 5,
    capacity: 0.76, healthy: true,
    activity: [0.3, 0.4, 0.55, 0.5, 0.7, 0.75, 0.78],
    desc: "Inline citations, smart summaries, and the eval harness.",
  },
];

function Sparkline({ data, tone }) {
  const w = 100, h = 28, pad = 2;
  const max = Math.max(...data, 0.001);
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const dLine = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");
  const dArea = dLine + ` L${(w-pad).toFixed(2)} ${h-pad} L${pad} ${h-pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`spark spark--${tone}`} preserveAspectRatio="none">
      <path d={dArea} className="spark__area"/>
      <path d={dLine} className="spark__line"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" className="spark__dot"/>
    </svg>
  );
}

function BoardCard({ b, onOpen, onPushToast }) {
  const lead = peopleById(b.leadId);
  const members = b.memberIds.map(peopleById).filter(Boolean);
  const sprintPct = b.sprintDay / b.sprintLen;
  return (
    <div className="board-card" onClick={() => onOpen(b)}>
      <div className="board-card__head">
        <div className={`board-card__glyph board-card__glyph--${b.tone}`}>{b.glyph}</div>
        <div className="board-card__head-meta">
          <div className="board-card__name">{b.name}</div>
          <div className="board-card__sub">{b.sub}</div>
        </div>
        <button className="board-card__more" onClick={(e) => { e.stopPropagation(); onPushToast?.("Board options"); }} aria-label="Board options">
          <Icons.More/>
        </button>
      </div>

      <p className="board-card__desc">{b.desc}</p>

      <div className="board-card__sprint">
        <div className="board-card__sprint-h">
          <span className={`chip chip--${b.tone === "accent" ? "accent" : b.tone}`}>{b.sprint}</span>
          <span className="mono" style={{fontSize: 11, color: "var(--ink-3)"}}>
            DAY {b.sprintDay}/{b.sprintLen}
          </span>
        </div>
        <div className="board-card__bar">
          <div className={`board-card__bar-fill board-card__bar-fill--${b.tone}`} style={{width: `${sprintPct * 100}%`}}/>
        </div>
      </div>

      <div className="board-card__stats">
        <div>
          <div className="board-card__stat-num mono">{b.open}</div>
          <div className="board-card__stat-lbl">Open</div>
        </div>
        <div>
          <div className="board-card__stat-num mono">{b.inProgress}</div>
          <div className="board-card__stat-lbl">In progress</div>
        </div>
        <div>
          <div className="board-card__stat-num mono">+{b.doneWeek}</div>
          <div className="board-card__stat-lbl">Done · wk</div>
        </div>
        <div className="board-card__spark">
          <Sparkline data={b.activity} tone={b.tone}/>
          <div className="board-card__stat-lbl">7-day</div>
        </div>
      </div>

      <div className="board-card__foot">
        <div className="board-card__lead">
          <Avatar p={lead}/>
          <div>
            <div className="board-card__lead-name">{lead?.name?.split(" ")[0]} {lead?.name?.split(" ")[1]?.[0]}.</div>
            <div className="board-card__lead-role">Lead</div>
          </div>
        </div>
        <span className="avstack">
          {members.slice(0, 4).map(m => <Avatar key={m.id} p={m}/>)}
          {members.length > 4 && (
            <span className="av" style={{background: "var(--paper-3)", color: "var(--ink-3)", fontWeight: 500}}>+{members.length - 4}</span>
          )}
        </span>
      </div>
    </div>
  );
}

function WorkloadBar({ b }) {
  const lead = peopleById(b.leadId);
  const cap = Math.round(b.capacity * 100);
  const overloaded = !b.healthy;
  return (
    <div className="wl-row">
      <div className="wl-row__name">
        <span className={`wl-row__glyph wl-row__glyph--${b.tone}`}>{b.glyph}</span>
        <div>
          <div className="wl-row__title">{b.name}</div>
          <div className="wl-row__sub">Lead: {lead?.name}</div>
        </div>
      </div>
      <div className="wl-row__bar">
        <div className={`wl-row__bar-fill ${overloaded ? "wl-row__bar-fill--over" : ""}`}
             style={{width: `${Math.min(100, cap)}%`}}/>
        <div className="wl-row__bar-target" style={{left: "85%"}} title="Healthy capacity ≤ 85%"/>
      </div>
      <div className="wl-row__pct mono">{cap}%</div>
      <span className={`chip chip--${overloaded ? "rose" : "green"}`}>
        {overloaded ? "Overloaded" : "Healthy"}
      </span>
    </div>
  );
}

export function TeamBoardsPage({ onPushToast }) {
  const navigate = useNavigate();
  const I = Icons;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | mine | healthy | risk

  const filtered = useMemo(() => {
    return TEAM_BOARDS.filter(b => {
      if (query) {
        const q = query.toLowerCase();
        if (!b.name.toLowerCase().includes(q) && !b.sub.toLowerCase().includes(q)) return false;
      }
      if (filter === "mine") return b.memberIds.includes("u3"); // pretend "I" am u3
      if (filter === "healthy") return b.healthy;
      if (filter === "risk") return !b.healthy;
      return true;
    });
  }, [query, filter]);

  const totalMembers = new Set(TEAM_BOARDS.flatMap(b => b.memberIds)).size;
  const totalOpen = TEAM_BOARDS.reduce((n, b) => n + b.open, 0);
  const totalDoneWeek = TEAM_BOARDS.reduce((n, b) => n + b.doneWeek, 0);

  function openBoard(b) {
    onPushToast?.(`Opening ${b.name} board`);
    setTimeout(() => navigate("/kanban"), 250);
  }

  return (
    <div className="page page--teams">

      <div className="page__head">
        <div>
          <h1 className="page__title">Team Boards</h1>
          <div className="page__sub">
            {TEAM_BOARDS.length} active boards across the workspace · {totalMembers} members
          </div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button className="btn" onClick={() => onPushToast?.("Advanced filters coming soon")}><I.Filter/> Filters</button>
          <button className="btn btn--accent" onClick={() => onPushToast?.("New board composer opened")}>
            <I.Plus s={13}/> New board
          </button>
        </div>
      </div>

      <div className="teams-kpis">
        <div className="teams-kpi">
          <div className="teams-kpi__lbl">Active boards</div>
          <div className="teams-kpi__num">{TEAM_BOARDS.length}</div>
          <div className="teams-kpi__sub mono">3 SPRINTS RUNNING</div>
        </div>
        <div className="teams-kpi">
          <div className="teams-kpi__lbl">Members</div>
          <div className="teams-kpi__num">{totalMembers}</div>
          <div className="teams-kpi__sub mono">2 OUT THIS WEEK</div>
        </div>
        <div className="teams-kpi">
          <div className="teams-kpi__lbl">Open tasks</div>
          <div className="teams-kpi__num">{totalOpen}</div>
          <div className="teams-kpi__sub mono" style={{color: "var(--hue-rose)"}}>4 OVERDUE</div>
        </div>
        <div className="teams-kpi">
          <div className="teams-kpi__lbl">Shipped · this week</div>
          <div className="teams-kpi__num">+{totalDoneWeek}</div>
          <div className="teams-kpi__sub mono" style={{color: "var(--hue-green)"}}>+14% WOW</div>
        </div>
      </div>

      <div className="teams-toolbar">
        <label className="top__search" style={{flex: "0 1 320px", margin: 0}}>
          <I.Search/>
          <input placeholder="Search boards…" value={query} onChange={e => setQuery(e.target.value)}/>
        </label>
        {[
          { id: "all",     label: "All",        count: TEAM_BOARDS.length },
          { id: "mine",    label: "I'm in",     count: TEAM_BOARDS.filter(b => b.memberIds.includes("u3")).length },
          { id: "healthy", label: "Healthy",    count: TEAM_BOARDS.filter(b => b.healthy).length },
          { id: "risk",    label: "At risk",    count: TEAM_BOARDS.filter(b => !b.healthy).length },
        ].map(f => (
          <button key={f.id}
            className={`btn ${filter === f.id ? "btn--primary" : ""}`}
            onClick={() => setFilter(f.id)}>
            {f.label} <span className="mono" style={{opacity: 0.6, marginLeft: 4}}>{f.count}</span>
          </button>
        ))}
        <span style={{flex: 1}}/>
        <button className="btn btn--ghost" onClick={() => onPushToast?.("Sort options coming soon")}><I.Sort/> Sort</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{padding: 60, textAlign: "center"}}>
          <I.Layers s={28}/>
          <div style={{marginTop: 10, fontWeight: 500}}>No boards match</div>
          <div style={{color: "var(--ink-3)", fontSize: 13, marginTop: 4}}>Try a different filter or clear the search.</div>
        </div>
      ) : (
        <div className="board-grid">
          {filtered.map(b => <BoardCard key={b.id} b={b} onOpen={openBoard} onPushToast={onPushToast}/>)}
        </div>
      )}

      <div className="card teams-workload">
        <div className="card__head">
          <div>
            <h3 className="card__title">Workload across teams</h3>
            <div style={{fontSize: 11, color: "var(--ink-4)", marginTop: 2, fontFamily: "var(--font-mono)"}}>SPRINT 24 · % OF CAPACITY ASSIGNED</div>
          </div>
          <div style={{display: "flex", gap: 6, fontSize: 11.5, color: "var(--ink-3)"}}>
            <span style={{display: "inline-flex", alignItems: "center", gap: 4}}>
              <span style={{width: 8, height: 8, background: "var(--ink-2)", borderRadius: 2}}/> Healthy
            </span>
            <span style={{display: "inline-flex", alignItems: "center", gap: 4}}>
              <span style={{width: 8, height: 8, background: "var(--hue-rose)", borderRadius: 2}}/> Overloaded
            </span>
            <span style={{display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8}}>
              <span style={{width: 2, height: 10, background: "var(--ink-4)"}}/> Target 85%
            </span>
          </div>
        </div>
        <div className="wl-list">
          {TEAM_BOARDS.map(b => <WorkloadBar key={b.id} b={b}/>)}
        </div>
      </div>

      <div className="teams-split">
        <div className="card">
          <div className="card__head">
            <h3 className="card__title">Team activity</h3>
            <button className="btn btn--ghost btn--sm"><I.Filter/> Filter</button>
          </div>
          <div className="feed">
            {INKLY_DATA.ACTIVITY.map((a, i) => {
              const p = peopleById(a.who);
              return (
                <div key={i} className="feed__item">
                  <Avatar p={p}/>
                  <div>
                    <div className="feed__body" style={{fontSize: 13}}>
                      <strong>{p?.name}</strong> {a.what}
                      <div style={{color: "var(--ink-3)"}}>{a.obj}</div>
                    </div>
                    <div className="feed__time">{a.time}</div>
                    {a.quote && <div className="feed__quote">"{a.quote}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <h3 className="card__title">Upcoming deadlines</h3>
            <span className="chip chip--ghost mono">{INKLY_DATA.DEADLINES.length} ACTIVE</span>
          </div>
          <div className="deadlines">
            {INKLY_DATA.DEADLINES.map((d, i) => (
              <div key={i} className="deadline">
                <div>
                  <div className="deadline__title">{d.title}</div>
                  <div className="deadline__sub">{d.sub.toUpperCase()}</div>
                </div>
                <div className="deadline__bar" style={{width: 110}}>
                  <div className={`deadline__bar-fill ${d.late ? "deadline__bar-fill--late" : d.warn ? "deadline__bar-fill--warn" : ""}`}
                       style={{width: `${d.pct * 100}%`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
