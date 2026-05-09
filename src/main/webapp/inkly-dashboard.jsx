/* Inkly dashboard — KPIs · sprint banner · chart · tasks · calendar · deadlines · activity */
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

/* ── Sprint progress banner ─────────────────────────────────────────────── */
function SprintBanner() {
  const done  = INKLY_DATA.TASKS.filter(t => t.col === "done").length;
  const total = INKLY_DATA.TASKS.length;
  const pct   = Math.round((done / total) * 100);
  return (
    <div className="sprint-banner">
      <div className="sprint-banner__info">
        <span className="sprint-banner__name">
          <span className="dot dot--accent" style={{ marginRight: 7 }} />
          Sprint 24
        </span>
        <span className="sprint-banner__sub">Day 9 of 14 · ends Friday</span>
      </div>
      <div className="sprint-banner__track">
        <div className="sprint-banner__fill" style={{ width: "64%" }} />
      </div>
      <div className="sprint-banner__stats">
        <span>{done}/{total} tasks shipped</span>
        <span className="sprint-banner__sep">·</span>
        <span>27 / 41 pts</span>
        <span className="chip chip--accent">{pct}%</span>
      </div>
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
        <button className="btn btn--ghost btn--sm">Last 7d <Icons.ChevDn s={12} /></button>
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
        <div>
          <span className="card__title">Today's tasks</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>
            {done}/{tasks.length} done
          </span>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => onPushToast?.("Add task")}>
          <Icons.Plus s={13} /> Add
        </button>
      </div>

      {/* mini progress bar */}
      <div style={{ height: 3, background: "var(--paper-3)", borderRadius: 999, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(done / tasks.length) * 100}%`, background: "var(--accent)", borderRadius: 999, transition: "width .3s" }} />
      </div>

      <div className="tasks-list">
        {tasks.map(t => (
          <div key={t.id} className={`task-row ${t.done ? "task-row--done" : ""}`} onClick={() => toggle(t.id)}>
            <div className="task-row__check"><Icons.Check s={10} /></div>
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
  const [selected, setSelected] = useStateDash(9);
  const DOW       = ["S","M","T","W","T","F","S"];
  const OFFSET    = 5;
  const PREV_TAIL = [26,27,28,29,30];
  const TOTAL     = 31;
  const EVENT_DAYS = new Set([6,7,9,12,14,16,19,23]);

  const cells = [];
  for (let i = 0; i < OFFSET; i++) cells.push({ d: PREV_TAIL[i], out: true });
  for (let d = 1; d <= TOTAL; d++) cells.push({ d, out: false });

  const toneColor = (tone) => ({
    violet: "var(--hue-violet)", green: "var(--hue-green)", amber: "var(--hue-amber)"
  }[tone] || "var(--accent)");

  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">May 2026</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setSelected(9)}>Today</button>
      </div>

      <div className="cal">
        {DOW.map((d, i) => <div className="cal__hdr" key={i}>{d}</div>)}
        {cells.map((c, i) => {
          const isToday    = !c.out && c.d === 9;
          const isSelected = !c.out && c.d === selected && !isToday;
          const hasEvt     = !c.out && EVENT_DAYS.has(c.d);
          const cls = ["cal__day", c.out && "cal__day--out", isToday && "cal__day--today", hasEvt && "cal__day--has"].filter(Boolean).join(" ");
          return (
            <div
              key={i}
              className={cls}
              style={isSelected ? { background: "var(--accent-soft)", borderRadius: 5 } : {}}
              onClick={() => !c.out && setSelected(c.d)}
            >{c.d}</div>
          );
        })}
      </div>

      <div className="cal-events">
        <div className="cal-events__hdr">Today</div>
        {INKLY_DATA.EVENTS_TODAY.map((ev, i) => (
          <div key={i} className="cal-event">
            <div className="cal-event__time">{ev.time}</div>
            <div className="cal-event__bar" style={{ background: toneColor(ev.tone) }} />
            <div className="cal-event__body">
              <div className="cal-event__title">{ev.title}</div>
              <div className="cal-event__loc">{ev.loc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Deadlines card ─────────────────────────────────────────────────────── */
function DeadlinesCard() {
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Upcoming deadlines</span>
        <button className="btn btn--ghost btn--sm"><Icons.Filter s={12} /></button>
      </div>
      <div className="deadlines">
        {INKLY_DATA.DEADLINES.map((d, i) => (
          <div key={i} className="deadline">
            <div className="deadline__row">
              <div className="deadline__title">{d.title}</div>
              <div className="deadline__sub">{d.sub}</div>
            </div>
            <div className="deadline__bar">
              <div
                className={`deadline__bar-fill ${d.warn ? "deadline__bar-fill--warn" : ""} ${d.pct < 0.2 ? "deadline__bar-fill--late" : ""}`}
                style={{ width: `${d.pct * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Team activity card ─────────────────────────────────────────────────── */
function ActivityCard() {
  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Team activity</span>
        <span className="chip chip--green" style={{ fontSize: 10, height: 18 }}>● Live</span>
      </div>
      <div className="feed">
        {INKLY_DATA.ACTIVITY.slice(0, 4).map((a, i) => {
          const p = peopleById(a.who);
          return (
            <div key={i} className="feed__item">
              <Avatar p={p} />
              <div style={{ minWidth: 0 }}>
                <div className="feed__body">
                  <strong>{p.name}</strong> {a.what}
                  <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.obj}
                  </div>
                </div>
                <div className="feed__time">{a.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Dashboard root ─────────────────────────────────────────────────────── */
function Dashboard({ onPushToast }) {
  const me = INKLY_DATA.ME;

  return (
    <>
      <div className="greet">
        <div>
          <h1 className="greet__h">Good morning, {me.name.split(" ")[0]}.</h1>
          <div className="greet__date">Sat · May 9, 2026 · Sprint 24, day 9 of 14</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn--sm" onClick={() => onPushToast?.("Daily plan opened")}>
            <Icons.Sparkle s={13} /> Daily plan
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => onPushToast?.("New task created")}>
            <Icons.Plus s={13} /> New task
          </button>
        </div>
      </div>

      <div className="kpis">
        <KPI tone="accent" icon={<Icons.Check  s={14} />} label="Completed today" num="3"  delta="+12% vs yesterday"  deltaDir="up"   />
        <KPI tone="violet" icon={<Icons.Layers s={14} />} label="In progress"     num="7"  delta="−2 from yesterday"  deltaDir="down" />
        <KPI tone="amber"  icon={<Icons.Clock  s={14} />} label="Due this week"   num="14" delta="3 high priority"    deltaDir="up"   />
        <KPI tone="green"  icon={<Icons.Users  s={14} />} label="Team velocity"   num="92" delta="+6% this sprint"    deltaDir="up"   />
      </div>

      <SprintBanner />

      <div className="dash-grid">
        <div className="dash-grid__main">
          <ProductivityChart />
          <TodayTasks onPushToast={onPushToast} />
        </div>
        <div className="dash-grid__side">
          <CalendarMini />
          <DeadlinesCard />
          <ActivityCard />
        </div>
      </div>
    </>
  );
}

window.Dashboard = Dashboard;
