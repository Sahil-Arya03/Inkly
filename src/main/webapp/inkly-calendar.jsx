/* Calendar page — month/week view, event chips, sidebar with filters */
const { useState: useStateCal, useMemo: useMemoCal } = React;

const CAL_CATEGORIES = [
  { id: "sprint",  name: "Sprint events",   tone: "accent", count: 6 },
  { id: "review",  name: "Design reviews",  tone: "violet", count: 4 },
  { id: "1on1",    name: "1:1s & syncs",    tone: "green",  count: 11 },
  { id: "deadline",name: "Deadlines",       tone: "amber",  count: 3 },
  { id: "personal",name: "Personal · focus",tone: "cyan",   count: 7 },
];

// Hand-built May 2026 dataset — day-of-month → array of events
const CAL_EVENTS = {
  2:  [{ t: "Maker day",          time: "all day", cat: "personal", who: "AW" }],
  5:  [{ t: "Sprint 24 kickoff",   time: "10:00",   cat: "sprint",   who: "MO" }],
  6:  [{ t: "Q2 OKR working sesh", time: "13:00",   cat: "1on1",     who: "NZ" }],
  7:  [{ t: "Design crit",         time: "11:00",   cat: "review",   who: "IB" },
       { t: "1:1 with Maren",      time: "15:30",   cat: "1on1",     who: "MO" }],
  9:  [{ t: "Design crit · Empty states", time: "09:30", cat: "review", who: "IB" },
       { t: "1:1 with Noor",       time: "13:00",   cat: "1on1",     who: "NZ" },
       { t: "Sprint review",       time: "15:30",   cat: "sprint",   who: "MO" }],
  11: [{ t: "All-hands",           time: "10:00",   cat: "sprint",   who: "MO" }],
  12: [{ t: "Onboarding readout",  time: "14:00",   cat: "review",   who: "IB" },
       { t: "Q2 draft v2 due",     time: "EOD",     cat: "deadline", who: "NZ" }],
  13: [{ t: "1:1 with Devon",      time: "11:30",   cat: "1on1",     who: "DP" }],
  14: [{ t: "Sprint 24 ends",      time: "17:00",   cat: "sprint",   who: "MO" },
       { t: "Retro",               time: "16:00",   cat: "1on1",     who: "MO" }],
  18: [{ t: "Sprint 25 planning",  time: "10:00",   cat: "sprint",   who: "MO" },
       { t: "Focus block",         time: "13:00",   cat: "personal", who: "AW" }],
  19: [{ t: "SSO design review",   time: "14:00",   cat: "review",   who: "NZ" },
       { t: "1:1 with Imani",      time: "16:00",   cat: "1on1",     who: "IB" }],
  20: [{ t: "Smart filters spec",  time: "EOD",     cat: "deadline", who: "NZ" }],
  21: [{ t: "1:1 with Theo",       time: "11:00",   cat: "1on1",     who: "TS" }],
  22: [{ t: "Demo Friday",         time: "15:00",   cat: "sprint",   who: "MO" }],
  25: [{ t: "Memorial Day · OOO",  time: "all day", cat: "personal", who: "AW" }],
  26: [{ t: "Crit · SSO wizard",   time: "11:00",   cat: "review",   who: "IB" }],
  27: [{ t: "Sprint review",       time: "15:30",   cat: "sprint",   who: "MO" }],
  28: [{ t: "SSO launch readiness",time: "EOD",     cat: "deadline", who: "NZ" }],
  29: [{ t: "1:1 with Jules",      time: "10:30",   cat: "1on1",     who: "JR" }],
};

const CAT_TONE = {
  sprint: "accent", review: "violet", "1on1": "green", deadline: "amber", personal: "cyan",
};

function buildMonthGrid(year, month) {
  // month: 0-indexed. Returns 42 cells with {date, day, inMonth, isToday}
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const startDow = first.getDay(); // 0 = Sun
  const today = new Date(2026, 4, 9); // pinned "today" to May 9, 2026

  const cells = [];
  for (let i = 0; i < startDow; i++) {
    const d = daysInPrev - startDow + 1 + i;
    cells.push({ day: d, inMonth: false, key: `p-${d}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const isToday = dt.toDateString() === today.toDateString();
    cells.push({ day: d, inMonth: true, isToday, key: `c-${d}` });
  }
  while (cells.length < 42) {
    const d = cells.length - daysInMonth - startDow + 1;
    cells.push({ day: d, inMonth: false, key: `n-${d}` });
  }
  return cells;
}

function CalendarPage({ onPushToast }) {
  const I = window.Icons;
  const [view, setView] = useStateCal("month");
  const [year] = useStateCal(2026);
  const [month, setMonth] = useStateCal(4); // May
  const [active, setActive] = useStateCal(new Set(CAL_CATEGORIES.map(c => c.id)));
  const [picked, setPicked] = useStateCal(9);

  const cells = useMemoCal(() => buildMonthGrid(year, month), [year, month]);
  const monthName = ["January","February","March","April","May","June","July","August","September","October","November","December"][month];

  function toggleCat(id) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // upcoming events list (next 7 days from picked)
  const upcoming = useMemoCal(() => {
    const list = [];
    for (let d = picked; d <= picked + 14 && d <= 31; d++) {
      const ev = CAL_EVENTS[d];
      if (!ev) continue;
      for (const e of ev) {
        if (!active.has(e.cat)) continue;
        list.push({ ...e, day: d });
      }
      if (list.length >= 6) break;
    }
    return list.slice(0, 6);
  }, [picked, active]);

  const dayEvents = (CAL_EVENTS[picked] || []).filter(e => active.has(e.cat));

  return (
    <div className="page page--cal">
      <div className="cal-page__head">
        <div>
          <h1 className="page__title">Calendar</h1>
          <div className="page__sub">{monthName} {year} · {INKLY_DATA.ME.name.split(" ")[0]}'s schedule</div>
        </div>
        <div className="cal-page__head-actions">
          <div className="seg">
            <button className={view === "month" ? "seg__btn seg__btn--active" : "seg__btn"} onClick={() => setView("month")}>Month</button>
            <button className={view === "week"  ? "seg__btn seg__btn--active" : "seg__btn"} onClick={() => setView("week")}>Week</button>
            <button className={view === "day"   ? "seg__btn seg__btn--active" : "seg__btn"} onClick={() => setView("day")}>Day</button>
          </div>
          <div className="cal-page__nav">
            <button className="icon-btn" onClick={() => setMonth(m => Math.max(0, m - 1))} aria-label="Previous month">
              <span style={{transform: "rotate(180deg)", display: "inline-flex"}}><I.Chevron/></span>
            </button>
            <button className="btn" onClick={() => { setMonth(4); setPicked(9); onPushToast?.("Jumped to today"); }}>Today</button>
            <button className="icon-btn" onClick={() => setMonth(m => Math.min(11, m + 1))} aria-label="Next month">
              <I.Chevron/>
            </button>
          </div>
          <button className="btn btn--accent" onClick={() => onPushToast?.("Event composer opened")}>
            <I.Plus s={13}/> New event
          </button>
        </div>
      </div>

      <div className="cal-page__body">
        {/* main calendar */}
        <div className="card cal-month">
          <div className="cal-month__hdr">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div className="cal-month__hdr-cell" key={d}>{d}</div>
            ))}
          </div>
          <div className="cal-month__grid">
            {cells.map(c => {
              const events = c.inMonth ? (CAL_EVENTS[c.day] || []).filter(e => active.has(e.cat)) : [];
              const cls = [
                "cal-month__cell",
                !c.inMonth && "cal-month__cell--out",
                c.isToday && "cal-month__cell--today",
                picked === c.day && c.inMonth && "cal-month__cell--picked",
              ].filter(Boolean).join(" ");
              return (
                <div key={c.key} className={cls} onClick={() => c.inMonth && setPicked(c.day)}>
                  <div className="cal-month__cell-h">
                    <span className="cal-month__cell-day">{c.day}</span>
                    {events.length > 2 && <span className="cal-month__cell-more">+{events.length - 2}</span>}
                  </div>
                  <div className="cal-month__cell-evs">
                    {events.slice(0, 2).map((e, i) => (
                      <div key={i} className={`cal-ev cal-ev--${CAT_TONE[e.cat]}`}>
                        <span className="cal-ev__time mono">{e.time}</span>
                        <span className="cal-ev__title">{e.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* right rail */}
        <aside className="cal-page__side">

          <div className="card">
            <div className="card__head">
              <h3 className="card__title">My calendars</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setActive(new Set(CAL_CATEGORIES.map(c => c.id)))}>All</button>
            </div>
            <div className="cal-cats">
              {CAL_CATEGORIES.map(cat => {
                const on = active.has(cat.id);
                return (
                  <label key={cat.id} className={`cal-cats__row ${on ? "" : "cal-cats__row--off"}`}>
                    <span className={`cal-cats__box cal-cats__box--${cat.tone}`}>
                      {on && <I.Check s={10}/>}
                    </span>
                    <input type="checkbox" checked={on} onChange={() => toggleCat(cat.id)} hidden/>
                    <span className="cal-cats__name">{cat.name}</span>
                    <span className="cal-cats__count mono">{cat.count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <h3 className="card__title">
                {picked === 9 ? "Today · " : `May ${String(picked).padStart(2, "0")} · `}
                <span style={{color: "var(--ink-3)", fontWeight: 400}}>{dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}</span>
              </h3>
              <button className="btn btn--ghost btn--sm"><I.Plus s={12}/></button>
            </div>
            {dayEvents.length === 0 ? (
              <div className="cal-empty">
                <I.Sparkle/> No events — perfect for a focus block.
              </div>
            ) : (
              <div className="cal-day">
                {dayEvents.map((e, i) => (
                  <div key={i} className={`cal-day__row cal-day__row--${CAT_TONE[e.cat]}`}>
                    <div className="cal-day__time mono">{e.time}</div>
                    <div className="cal-day__bar"/>
                    <div className="cal-day__body">
                      <div className="cal-day__title">{e.t}</div>
                      <div className="cal-day__meta">
                        <span className="av av-violet" style={{width: 18, height: 18, fontSize: 9}}>{e.who}</span>
                        <span>·</span>
                        <span style={{textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-3)"}}>{e.cat}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card__head">
              <h3 className="card__title">Up next</h3>
              <span className="chip chip--ghost mono">14D</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="cal-empty"><I.Clock/> Nothing scheduled.</div>
            ) : (
              <div className="cal-upnext">
                {upcoming.map((e, i) => (
                  <div key={i} className="cal-upnext__row" onClick={() => setPicked(e.day)}>
                    <div className="cal-upnext__date">
                      <div className="cal-upnext__date-d mono">{String(e.day).padStart(2, "0")}</div>
                      <div className="cal-upnext__date-m mono">MAY</div>
                    </div>
                    <div className="cal-upnext__body">
                      <div className="cal-upnext__title">{e.t}</div>
                      <div className="cal-upnext__meta">
                        <span className={`dot dot--${CAT_TONE[e.cat]}`}/>
                        <span className="mono" style={{fontSize: 11, color: "var(--ink-3)"}}>{e.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  );
}

window.CalendarPage = CalendarPage;
