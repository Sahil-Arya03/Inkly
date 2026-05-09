/* Inkly dashboard — KPIs · productivity chart · today's tasks · calendar + schedule */
const { useState: useStateDash } = React;

/* ── KPI card ──────────────────────────────────────────────────────────── */
function KPI({ tone, icon, label, num, delta, deltaDir }) {
  return (
    <div className={`kpi kpi--${tone}`}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon">{icon}</span>
      </div>
      <div className="kpi__num">{num}</div>
      {delta && (
        <div className={`kpi__delta kpi__delta--${deltaDir}`}>
          {deltaDir === "up" ? <Icons.ArrowU /> : <Icons.ArrowD />}
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}

/* ── Productivity bar chart ─────────────────────────────────────────────── */
function ProductivityChart() {
  const days = INKLY_DATA.PROD_DAYS;
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Productivity · this week</span>
        <button className="btn btn--ghost btn--sm">Last 7d <Icons.ChevDn /></button>
      </div>
      <div className="chart">
        {days.map(d => (
          <div className="chart__bar" key={d.d}>
            <div className="chart__bar-track">
              <div className="chart__bar-fill--prev" style={{ height: `${d.p * 100}%` }} />
              <div className="chart__bar-fill"       style={{ height: `${d.v * 100}%` }} />
            </div>
            <div className="chart__bar-label">{d.d}</div>
          </div>
        ))}
      </div>
      <div className="chart__legend">
        <span className="chart__legend-key">
          <span className="swatch" style={{ background: "var(--accent)" }} /> This week
        </span>
        <span className="chart__legend-key">
          <span className="swatch" style={{ background: "var(--paper-3)" }} /> Last week
        </span>
      </div>
    </div>
  );
}

/* ── Today's task list ──────────────────────────────────────────────────── */
function TodayTasks({ onPushToast }) {
  const [tasks, setTasks] = useStateDash(INKLY_DATA.TODAY_TASKS);
  const toggle = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
    onPushToast?.("Task updated");
  };
  const done = tasks.filter(t => t.done).length;
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">
          Today's tasks · <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{done}/{tasks.length}</span>
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => onPushToast?.("Add task")}>
          <Icons.Plus /> Add
        </button>
      </div>
      <div className="tasks-list">
        {tasks.map(t => (
          <div key={t.id} className={`task-row ${t.done ? "task-row--done" : ""}`} onClick={() => toggle(t.id)}>
            <div className="task-row__check"><Icons.Check /></div>
            <div className="task-row__title">{t.title}</div>
            <div className="task-row__due">{t.due}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mini calendar + today's schedule ──────────────────────────────────── */
function CalendarMini() {
  const [selected, setSelected] = useStateDash(9); // today = May 9

  // May 2026: May 1 is a Friday → Sunday-indexed offset = 5
  const DOW       = ["S", "M", "T", "W", "T", "F", "S"];
  const OFFSET    = 5;
  const PREV_TAIL = [26, 27, 28, 29, 30]; // last days of April
  const TOTAL     = 31;
  const EVENT_DAYS = new Set([6, 7, 9, 12, 14, 16, 19, 23]);

  const cells = [];
  for (let i = 0; i < OFFSET; i++) cells.push({ d: PREV_TAIL[i], out: true });
  for (let d = 1; d <= TOTAL; d++) cells.push({ d, out: false });

  const toneColor = (tone) => {
    if (tone === "violet") return "var(--hue-violet)";
    if (tone === "green")  return "var(--hue-green)";
    if (tone === "amber")  return "var(--hue-amber)";
    return "var(--accent)";
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div className="card__head">
        <span className="card__title">May 2026</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setSelected(9)}>Today</button>
      </div>

      {/* Calendar grid */}
      <div className="cal">
        {DOW.map((d, i) => (
          <div className="cal__hdr" key={i}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const isToday    = !c.out && c.d === 9;
          const isSelected = !c.out && c.d === selected && !isToday;
          const hasEvt     = !c.out && EVENT_DAYS.has(c.d);
          const cls = [
            "cal__day",
            c.out     && "cal__day--out",
            isToday   && "cal__day--today",
            hasEvt    && "cal__day--has",
          ].filter(Boolean).join(" ");
          return (
            <div
              key={i}
              className={cls}
              style={isSelected ? { background: "var(--accent-soft)", borderRadius: 5 } : {}}
              onClick={() => !c.out && setSelected(c.d)}
            >
              {c.d}
            </div>
          );
        })}
      </div>

      {/* Schedule */}
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
          Today
        </div>
        {INKLY_DATA.EVENTS_TODAY.map((ev, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "40px 3px 1fr",
            gap: "0 10px",
            padding: "8px 0",
            borderTop: i > 0 ? "1px solid var(--line)" : "none",
            alignItems: "start",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", paddingTop: 2, textAlign: "right" }}>
              {ev.time}
            </div>
            <div style={{ alignSelf: "stretch", width: 3, borderRadius: 2, background: toneColor(ev.tone) }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)", lineHeight: 1.35 }}>{ev.title}</div>
              <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{ev.loc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dashboard root ─────────────────────────────────────────────────────── */
function Dashboard({ onPushToast }) {
  const me    = INKLY_DATA.ME;
  const today = "Sat · May 9 · Sprint 24, day 9 / 14";

  return (
    <>
      {/* Welcome header */}
      <div className="greet">
        <div>
          <h1 className="greet__h">Good morning, {me.name.split(" ")[0]}.</h1>
          <div className="greet__date">{today}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost btn--sm" onClick={() => onPushToast?.("Daily plan opened")}>
            <Icons.Sparkle /> Daily plan
          </button>
          <button className="btn btn--solid btn--sm" onClick={() => onPushToast?.("New task created")}>
            <Icons.Plus /> New task
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpis">
        <KPI tone="ink"    icon={<Icons.Check  s={14} />} label="Completed today" num="3"  delta="+12% wow"     deltaDir="up"   />
        <KPI tone="violet" icon={<Icons.Layers s={14} />} label="In progress"     num="7"  delta="-2 from yest" deltaDir="down" />
        <KPI tone="amber"  icon={<Icons.Clock  s={14} />} label="Due this week"   num="14" delta="3 high pri"   deltaDir="up"   />
        <KPI tone="green"  icon={<Icons.Users  s={14} />} label="Team velocity"   num="92" delta="+6% sprint"   deltaDir="up"   />
      </div>

      {/* 2-column layout: chart+tasks | calendar+schedule */}
      <div className="dash-grid">
        <div className="dash-grid__main">
          <ProductivityChart />
          <TodayTasks onPushToast={onPushToast} />
        </div>
        <div className="dash-grid__side">
          <CalendarMini />
        </div>
      </div>
    </>
  );
}

window.Dashboard = Dashboard;
