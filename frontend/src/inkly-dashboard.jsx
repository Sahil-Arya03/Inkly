/* Dashboard v2 — clean, editorial; whitespace + typography over chrome */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './inkly-icons.jsx';
import { Avatar } from './inkly-chrome.jsx';
import { INKLY_DATA, peopleById } from './inkly-data.js';

function DashStat({ label, num, delta, dir }) {
  const cls = dir ? `dash-stat__delta dash-stat__delta--${dir}` : "dash-stat__delta";
  const I = Icons;
  return (
    <div className="dash-stat">
      <div className="dash-stat__lbl">{label}</div>
      <div className="dash-stat__num">{num}</div>
      <div className={cls}>
        {dir === "up" && <I.ArrowU s={10} />}
        {dir === "down" && <I.ArrowD s={10} />}
        <span>{delta}</span>
      </div>
    </div>
  );
}

function DashSection({ title, action, onAction, children }) {
  return (
    <section className="dash-sec">
      <header className="dash-sec__hd">
        <h2 className="dash-sec__title">{title}</h2>
        {action && (
          <button className="dash-sec__action" onClick={onAction}>{action}</button>
        )}
      </header>
      <div className="dash-sec__body">{children}</div>
    </section>
  );
}

function DashSchedule() {
  // mark next + past; mock current time ≈ 12:32
  const events = INKLY_DATA.EVENTS_TODAY.map((e, i) => ({
    ...e,
    state: i < 2 ? "past" : i === 2 ? "next" : "upcoming",
    when: i === 2 ? "28 min" : null,
  }));
  return (
    <div className="dash-sched">
      {events.map((e, i) => (
        <div key={i} className={`dash-sched__row dash-sched__row--${e.state}`}>
          <div className="dash-sched__time">{e.time}</div>
          <div className="dash-sched__mid">
            <div className="dash-sched__title">{e.title}</div>
            <div className="dash-sched__loc">{e.loc}</div>
          </div>
          <div className="dash-sched__pill-slot">
            {e.state === "next" && (
              <span className="dash-sched__pill">
                <span className="dash-sched__pill-dot" aria-hidden="true" />
                Starts in {e.when}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DashFocus({ onPushToast }) {
  const [tasks, setTasks] = useState(INKLY_DATA.TODAY_TASKS);
  const I = Icons;
  const toggle = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
    onPushToast?.("Task updated");
  };
  return (
    <div className="dash-focus">
      {tasks.map(t => (
        <div
          key={t.id}
          className={`dash-focus__row ${t.done ? "dash-focus__row--done" : ""}`}
          onClick={() => toggle(t.id)}
        >
          <div className="dash-focus__check"><I.Check s={11} /></div>
          <div className="dash-focus__title">{t.title}</div>
          <div className="dash-focus__due">{t.due}</div>
        </div>
      ))}
    </div>
  );
}

function DashActivity() {
  return (
    <div className="dash-act">
      {INKLY_DATA.ACTIVITY.map((a, i) => {
        const p = peopleById(a.who);
        return (
          <div key={i} className="dash-act__row">
            <Avatar p={p} />
            <div>
              <div className="dash-act__body">
                <strong>{p?.name.split(" ")[0]}</strong> {a.what} <strong>{a.obj}</strong>
              </div>
              <div className="dash-act__time">{a.time}</div>
              {a.quote && <div className="dash-act__quote">{a.quote}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashWeekChart() {
  const days = INKLY_DATA.PROD_DAYS;
  const today = "SAT";
  const total = days.reduce((s, d) => s + d.v, 0);
  const avg = (total / days.length * 100).toFixed(0);
  return (
    <div>
      <div className="dash-chart">
        {days.map(d => {
          const isToday = d.d === today;
          const isWeekend = d.d === "SAT" || d.d === "SUN";
          const cls = ["dash-chart__col",
            isToday && "dash-chart__col--today",
            isWeekend && !isToday && "dash-chart__col--weekend"
          ].filter(Boolean).join(" ");
          return (
            <div key={d.d} className={cls}>
              <div className="dash-chart__val">{Math.round(d.v * 100)}</div>
              <div className="dash-chart__bar" style={{ height: `${Math.max(d.v, 0.04) * 100}%` }} />
              <div className="dash-chart__day">{d.d}</div>
            </div>
          );
        })}
      </div>
      <div className="dash-chart__foot">
        <span>Weekly avg <strong>{avg}</strong></span>
        <span>vs last week <strong style={{ color: "oklch(0.52 0.10 150)" }}>+6%</strong></span>
      </div>
    </div>
  );
}

function DashDeadlines() {
  return (
    <div className="dash-dl">
      {INKLY_DATA.DEADLINES.map((d, i) => {
        const tone = d.late ? "late" : d.warn ? "warn" : "";
        const pct = Math.round(d.pct * 100);
        return (
          <div className="dash-dl__row" key={i}>
            <div className="dash-dl__hd">
              <div>
                <div className="dash-dl__title">{d.title}</div>
                <div className="dash-dl__sub">{d.sub}</div>
              </div>
              <div className="dash-dl__pct">{pct}%</div>
            </div>
            <div className="dash-dl__bar">
              <div
                className={`dash-dl__fill ${tone ? "dash-dl__fill--" + tone : ""}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard({ onPushToast }) {
  const navigate = useNavigate();
  const I = Icons;
  const me = INKLY_DATA.ME;
  const todayDone = INKLY_DATA.TODAY_TASKS.filter(t => t.done).length;
  const todayTotal = INKLY_DATA.TODAY_TASKS.length;

  return (
    <div className="page dash">
      {/* ===== Hero ===== */}
      <section className="dash__hero">
        <div className="dash__hero-l">
          <div className="dash__eyebrow mono">SAT · MAY 9 · SPRINT 24 · DAY 9 / 14</div>
          <h1 className="dash__h">Good morning, {me.name.split(" ")[0]}.</h1>
          <p className="dash__lede">
            <span>{todayDone} of {todayTotal}</span> tasks done today.&nbsp;
            Next up — <strong>1:1 with Noor</strong> in 28 minutes.
          </p>
        </div>
        <div className="dash__hero-actions">
          <button className="btn btn--ghost" onClick={() => onPushToast?.("AI daily plan generated — check your focus list")}><I.Sparkle s={13} /> Daily plan</button>
          <button className="btn btn--primary" onClick={() => onPushToast?.("Quick-create opened")}>
            <I.Plus s={13} /> New task
          </button>
        </div>
      </section>

      {/* ===== Stats strip ===== */}
      <section className="dash__stats">
        <DashStat label="Completed today" num="3"  delta="+12% wk/wk"        dir="up" />
        <DashStat label="In progress"     num="7"  delta="−2 from yesterday" dir="down" />
        <DashStat label="Due this week"   num="14" delta="3 high priority"   />
        <DashStat label="Team velocity"   num="92" delta="+6% this sprint"   dir="up" />
      </section>

      {/* ===== Body ===== */}
      <section className="dash__body">
        <div className="dash__col-l">
          <DashSection title="Today's schedule" action="OPEN CALENDAR" onAction={() => navigate("/calendar")}>
            <DashSchedule />
          </DashSection>

          <DashSection title="Focus list" action={`${todayDone} / ${todayTotal} DONE`}>
            <DashFocus onPushToast={onPushToast} />
          </DashSection>

          <DashSection title="Activity">
            <DashActivity />
          </DashSection>
        </div>

        <div className="dash__col-r">
          <DashSection title="Productivity" action="LAST 7 DAYS">
            <DashWeekChart />
          </DashSection>

          <DashSection title="Deadlines">
            <DashDeadlines />
          </DashSection>
        </div>
      </section>
    </div>
  );
}
