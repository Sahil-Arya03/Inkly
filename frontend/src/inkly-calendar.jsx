/* Calendar page — month/week view, event chips, sidebar with filters.
   Data comes from the live API (native events + card deadlines, plus any
   Google Calendar events synced into Inkly). */
import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from './inkly-icons.jsx';
import { INKLY_DATA } from './inkly-data.js';
import { INKLY_API } from './inkly-api.js';

const CAL_CATEGORIES = [
  { id: "sprint",  name: "Sprint events",   tone: "accent", count: 6 },
  { id: "review",  name: "Design reviews",  tone: "violet", count: 4 },
  { id: "1on1",    name: "1:1s & syncs",    tone: "green",  count: 11 },
  { id: "deadline",name: "Deadlines",       tone: "amber",  count: 3 },
  { id: "personal",name: "Personal · focus",tone: "cyan",   count: 7 },
];

const CAT_TONE = {
  sprint: "accent", review: "violet", "1on1": "green", deadline: "amber", personal: "cyan",
};

// Categories the filter chips understand. Anything else (e.g. an imported
// Google event tagged GENERAL) is bucketed into "personal" so it stays visible.
const KNOWN_CATS = new Set(CAL_CATEGORIES.map(c => c.id));

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

export function CalendarPage({ onPushToast }) {
  const I = Icons;
  const [view, setView] = useState("month");
  const [year] = useState(2026);
  const [month, setMonth] = useState(4); // May
  const [active, setActive] = useState(new Set(CAL_CATEGORIES.map(c => c.id)));
  const [picked, setPicked] = useState(9);

  const [apiEvents, setApiEvents] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [connected, setConnected] = useState(null); // null = unknown

  // Range for the visible month — [first day, first day of next month).
  const from = useMemo(() => new Date(year, month, 1).toISOString().slice(0, 10), [year, month]);
  const to   = useMemo(() => new Date(year, month + 1, 1).toISOString().slice(0, 10), [year, month]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const monthName = ["January","February","March","April","May","June","July","August","September","October","November","December"][month];

  // On mount: is Google connected?
  useEffect(() => {
    INKLY_API.calendar.getConnection()
      .then(r => setConnected(r.connected))
      .catch(() => setConnected(false));
  }, []);

  // Whenever the visible month changes: (re)load events for that range.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    INKLY_API.calendar.fetchEvents(from, to)
      .then(events => { if (!cancelled) setApiEvents(events); })
      .catch(() => { if (!cancelled) setApiEvents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  // API events → existing day-of-month → [event chip] shape.
  const eventsByDay = useMemo(() => {
    const map = {};
    apiEvents.forEach(evt => {
      const start = new Date(evt.startsAt);
      const d = start.getDate();
      if (!map[d]) map[d] = [];
      const rawCat = evt.objectType === 'CARD'
        ? 'deadline'
        : (evt.category ? evt.category.toLowerCase() : 'personal');
      map[d].push({
        t:          evt.title,
        time:       evt.allDay ? 'all day'
                  : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cat:        KNOWN_CATS.has(rawCat) ? rawCat : 'personal',
        who:        (evt.createdByName || '?').split(' ').map(w => w[0]).join('').slice(0, 2),
        objectType: evt.objectType,
        id:         evt.id,
      });
    });
    return map;
  }, [apiEvents]);

  function toggleCat(id) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function refetch() {
    setLoading(true);
    return INKLY_API.calendar.fetchEvents(from, to)
      .then(events => setApiEvents(events))
      .catch(() => setApiEvents([]))
      .finally(() => setLoading(false));
  }

  // upcoming events list (next 14 days from picked)
  const upcoming = useMemo(() => {
    const list = [];
    for (let d = picked; d <= picked + 14 && d <= 31; d++) {
      const ev = eventsByDay[d];
      if (!ev) continue;
      for (const e of ev) {
        if (!active.has(e.cat)) continue;
        list.push({ ...e, day: d });
      }
      if (list.length >= 6) break;
    }
    return list.slice(0, 6);
  }, [picked, active, eventsByDay]);

  const dayEvents = (eventsByDay[picked] || []).filter(e => active.has(e.cat));

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

      {connected === false && (
        <div className="cal-connect-banner" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "10px 14px", marginBottom: 12,
          border: "1px solid var(--line)", borderRadius: 10, background: "var(--paper-2)",
        }}>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Connect Google Calendar to sync your events
          </span>
          <button className="btn btn--accent btn--sm" onClick={() => {
            INKLY_API.calendar.startOAuth()
              .then(r => { window.location.href = r.url; })
              .catch(() => onPushToast?.("Could not start Google connection"));
          }}>
            Connect
          </button>
        </div>
      )}

      <div className="cal-page__body">
        {/* main calendar */}
        {view === "month" && (
        <div className="card cal-month">
          <div className="cal-month__hdr">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div className="cal-month__hdr-cell" key={d}>{d}</div>
            ))}
          </div>
          <div className="cal-month__grid">
            {cells.map(c => {
              const events = c.inMonth ? (eventsByDay[c.day] || []).filter(e => active.has(e.cat)) : [];
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
        )}

        {view === "week" && (
        <div className="card" style={{ flex: 1, minHeight: 400 }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 0, borderBottom: "1px solid var(--line)" }}>
            <div style={{ padding: 8 }} />
            {(() => {
              const weekStart = picked - ((new Date(2026, month, picked).getDay()) || 0);
              return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => {
                const day = weekStart + i;
                const isToday = day === 9 && month === 4;
                const isPicked = day === picked;
                return (
                  <div key={d} style={{ padding: "8px 6px", textAlign: "center", borderLeft: "1px solid var(--line)", cursor: "pointer", background: isPicked ? "var(--accent-tint, var(--paper-2))" : "transparent" }}
                       onClick={() => { if (day >= 1 && day <= 31) setPicked(day); }}>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{d}</div>
                    <div style={{ fontSize: 18, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--accent)" : "var(--ink-1)" }}>{day > 0 && day <= 31 ? day : ""}</div>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", gap: 0 }}>
            {[9,10,11,12,13,14,15,16,17].map(h => {
              const weekStart = picked - ((new Date(2026, month, picked).getDay()) || 0);
              return (
                <React.Fragment key={h}>
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)", borderTop: "1px solid var(--line)", textAlign: "right" }}>
                    {h}:00
                  </div>
                  {[0,1,2,3,4,5,6].map(di => {
                    const day = weekStart + di;
                    const dayEvs = (day >= 1 && day <= 31) ? (eventsByDay[day] || []).filter(e => active.has(e.cat)) : [];
                    const hourEvs = dayEvs.filter(e => e.time.startsWith(String(h).padStart(2, "0")) || (h === 9 && e.time === "all day"));
                    return (
                      <div key={di} style={{ minHeight: 36, borderTop: "1px solid var(--line)", borderLeft: "1px solid var(--line)", padding: 2 }}>
                        {hourEvs.map((e, i) => (
                          <div key={i} className={`cal-ev cal-ev--${CAT_TONE[e.cat]}`} style={{ fontSize: 10.5, padding: "2px 4px" }}>
                            <span className="cal-ev__title">{e.t}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        )}

        {view === "day" && (
        <div className="card" style={{ flex: 1, minHeight: 400 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: picked === 9 ? "var(--accent)" : "var(--ink-1)" }}>{picked}</div>
            <div>
              <div style={{ fontWeight: 500 }}>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(2026, month, picked).getDay()]}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{monthName} {year}</div>
            </div>
          </div>
          <div style={{ padding: "0 16px" }}>
            {[8,9,10,11,12,13,14,15,16,17,18].map(h => {
              const dayEvs = (eventsByDay[picked] || []).filter(e => active.has(e.cat));
              const hourEvs = dayEvs.filter(e => e.time.startsWith(String(h).padStart(2, "0")) || (h === 8 && e.time === "all day"));
              return (
                <div key={h} style={{ display: "flex", borderTop: "1px solid var(--line)", minHeight: 48 }}>
                  <div style={{ width: 56, padding: "8px 8px 8px 0", fontSize: 12, color: "var(--ink-4)", fontFamily: "var(--font-mono)", textAlign: "right", flexShrink: 0 }}>
                    {h}:00
                  </div>
                  <div style={{ flex: 1, padding: "4px 0" }}>
                    {hourEvs.map((e, i) => (
                      <div key={i} className={`cal-day__row cal-day__row--${CAT_TONE[e.cat]}`} style={{ marginBottom: 4 }}>
                        <div className="cal-day__bar" />
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
                </div>
              );
            })}
          </div>
        </div>
        )}

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
            <button
              className="btn btn--ghost btn--sm cal-sync-btn"
              style={{ marginTop: 10, width: "100%" }}
              disabled={loading || !connected}
              onClick={() => {
                setLoading(true);
                INKLY_API.calendar.syncNow()
                  .then(() => { onPushToast?.("Calendar synced"); return refetch(); })
                  .catch(() => { onPushToast?.("Sync failed"); setLoading(false); });
              }}
            >
              {loading ? "Syncing…" : connected ? "Sync now" : "Connect Google to sync"}
            </button>
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
