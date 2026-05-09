/* Employee Dashboard — KPIs, productivity chart, today's tasks, calendar mini, deadlines, activity */
const { useState: useStateDash, useMemo: useMemoDash } = React;

function KPI({ tone, icon, label, num, delta, deltaDir }) {
  const I = window.Icons;
  return (
    <div className={`kpi kpi--${tone}`}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon">{icon}</span>
      </div>
      <div className="kpi__num">{num}</div>
      {delta && (
        <div className={`kpi__delta kpi__delta--${deltaDir}`}>
          {deltaDir === "up" ? <I.ArrowU/> : <I.ArrowD/>}
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

function ProductivityChart() {
  const days = INKLY_DATA.PROD_DAYS;
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Productivity · this week</span>
        <button className="btn btn--ghost btn--sm">Last 7d <window.Icons.ChevDn/></button>
      </div>
      <div className="chart">
        {days.map(d => (
          <div className="chart__bar" key={d.d}>
            <div className="chart__bar-track">
              <div className="chart__bar-fill--prev" style={{ height: `${d.p * 100}%` }}/>
              <div className="chart__bar-fill" style={{ height: `${d.v * 100}%` }}/>
            </div>
            <div className="chart__bar-label">{d.d}</div>
          </div>
        ))}
      </div>
      <div className="chart__legend">
        <span className="chart__legend-key"><span className="swatch" style={{ background: "var(--accent)" }}/> This week</span>
        <span className="chart__legend-key"><span className="swatch" style={{ background: "var(--paper-3)" }}/> Last week</span>
      </div>
    </div>
  );
}

function TodayTasks({ onPushToast }) {
  const [tasks, setTasks] = useStateDash(INKLY_DATA.TODAY_TASKS);
  const I = window.Icons;
  const toggle = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
    onPushToast?.("Task updated");
  };
  const done = tasks.filter(t => t.done).length;
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Today's tasks · <span style={{ color: "var(--ink-3)" }}>{done}/{tasks.length}</span></span>
        <button className="btn btn--ghost btn--sm"><I.Plus/> Add</button>
      </div>
      <div className="tasks-list">
        {tasks.map(t => (
          <div key={t.id} className={`task-row ${t.done ? "task-row--done" : ""}`} onClick={() => toggle(t.id)}>
            <div className="task-row__check"><I.Check/></div>
            <div className="task-row__title">{t.title}</div>
            <div className="task-row__due">{t.due}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarMini() {
  // Simple mock: May 2026, today = 9
  const dow = ["S","M","T","W","T","F","S"];
  const days = [];
  // April 26..30 (out), May 1..31, June 1..6 (out) — 6 rows of 7
  const startOut = [26,27,28,29,30];
  for (const d of startOut) days.push({ d, out: true });
  for (let d = 1; d <= 31; d++) days.push({ d, out: false });
  while (days.length < 42) days.push({ d: days.length - (days.length - 36) - 36, out: true });
  // Mark today + has-event days
  const eventDays = new Set([7, 9, 12, 14, 16, 19, 23]);
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">May 2026</span>
        <button className="btn btn--ghost btn--sm">Today</button>
      </div>
      <div className="cal">
        {dow.map(d => <div className="cal__hdr" key={d+Math.random()}>{d}</div>)}
        {days.map((c, i) => {
          const isToday = !c.out && c.d === 9;
          const has = !c.out && eventDays.has(c.d);
          const cls = ["cal__day", c.out && "cal__day--out", isToday && "cal__day--today", has && "cal__day--has"].filter(Boolean).join(" ");
          return <div className={cls} key={i}>{c.d}</div>;
        })}
      </div>
      <div className="events">
        {INKLY_DATA.EVENTS_TODAY.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 10, padding: "8px 6px", borderTop: "1px solid var(--line)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{e.time}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{e.loc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Deadlines() {
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Deadline tracker</span>
        <button className="btn btn--ghost btn--sm">All</button>
      </div>
      <div className="deadlines">
        {INKLY_DATA.DEADLINES.map((d, i) => {
          const tone = d.late ? "late" : d.warn ? "warn" : "";
          return (
            <div className="deadline" key={i}>
              <div>
                <div className="deadline__title">{d.title}</div>
                <div className="deadline__sub">{d.sub}</div>
              </div>
              <div className="deadline__bar">
                <div className={`deadline__bar-fill ${tone ? "deadline__bar-fill--" + tone : ""}`} style={{ width: `${d.pct * 100}%` }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Recent activity</span>
        <button className="btn btn--ghost btn--sm"><window.Icons.Filter/> Filter</button>
      </div>
      <div className="feed">
        {INKLY_DATA.ACTIVITY.map((a, i) => {
          const p = window.peopleById(a.who);
          return (
            <div className="feed__item" key={i}>
              <div className="avatar avatar--sm" style={{ background: p?.color }}>{p?.initials}</div>
              <div>
                <div className="feed__body"><strong>{p?.name}</strong> {a.what} <strong>{a.obj}</strong></div>
                <div className="feed__time">{a.time}</div>
                {a.quote && <div className="feed__quote">"{a.quote}"</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({ onPushToast }) {
  const I = window.Icons;
  const me = INKLY_DATA.ME;
  const today = "Sat · May 9 · Sprint 24, day 9 / 14";

  return (
    <>
      <div className="greet">
        <div>
          <h1 className="greet__h">Good morning, {me.name.split(" ")[0]}.</h1>
          <div className="greet__date">{today}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost btn--sm"><I.Sparkle/> Daily plan</button>
          <button className="btn btn--solid btn--sm"><I.Plus/> New task</button>
        </div>
      </div>

      <div className="kpis">
        <KPI tone="ink"    icon={<I.Check s={14}/>}   label="Completed today"  num="3"  delta="+12% wow" deltaDir="up"/>
        <KPI tone="violet" icon={<I.Layers s={14}/>}  label="In progress"      num="7"  delta="-2 from yest" deltaDir="down"/>
        <KPI tone="amber"  icon={<I.Clock s={14}/>}   label="Due this week"    num="14" delta="3 high pri"   deltaDir="up"/>
        <KPI tone="green"  icon={<I.Users s={14}/>}   label="Team velocity"    num="92" delta="+6% sprint"   deltaDir="up"/>
      </div>

      <div className="dash-grid">
        <div className="dash-grid__main">
          <ProductivityChart/>
          <TodayTasks onPushToast={onPushToast}/>
          <ActivityFeed/>
        </div>
        <div className="dash-grid__side">
          <CalendarMini/>
          <Deadlines/>
        </div>
      </div>
    </>
  );
}

window.Dashboard = Dashboard;
