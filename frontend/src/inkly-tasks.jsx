/* My Tasks — personal task list, grouped by status, with filters + detail modal */
import { useState, useMemo } from 'react';
import { Icons } from './inkly-icons.jsx';
import { Avatar } from './inkly-chrome.jsx';
import { INKLY_DATA, peopleById } from './inkly-data.js';
import { TaskModal } from './inkly-kanban.jsx';

const ME_ID = "u3"; // Avery is represented as u3 across the prototype (matches kanban "Assigned to me")

const MT_STATUS = {
  backlog:  { label: "Backlog",     dot: "" },
  todo:     { label: "To Do",       dot: "violet" },
  progress: { label: "In Progress", dot: "accent" },
  review:   { label: "Review",      dot: "amber" },
  done:     { label: "Completed",   dot: "green" },
};

function MtRow({ t, onOpen }) {
  const I = Icons;
  const pri = INKLY_DATA.PRIORITY[t.pri];
  const done = t.col === "done";
  return (
    <button className={`mt-row ${done ? "mt-row--done" : ""}`} onClick={() => onOpen(t.id)}>
      <span className={`mt-row__status dot dot--${MT_STATUS[t.col].dot}`} aria-hidden="true" />
      <div className="mt-row__main">
        <div className="mt-row__top">
          <span className="mt-row__id mono">{t.id}</span>
          {t.live && <span className="mt-row__live" title="Live update" />}
          <span className="mt-row__title">{t.title}</span>
        </div>
        {t.tags?.length > 0 && (
          <div className="mt-row__tags">
            {t.tags.map((tg) => (
              <span key={tg} className={`chip ${INKLY_DATA.TAGS[tg].cls}`}>{INKLY_DATA.TAGS[tg].label}</span>
            ))}
          </div>
        )}
      </div>
      <span className={`chip ${pri.cls} mt-row__pri`}><I.Flag s={10} /> {pri.label}</span>
      <span className="mt-row__due"><I.Cal s={12} /> {t.due}</span>
      <span className="mt-row__prog">
        {done ? (
          <span className="mt-row__done-chip"><I.Check s={11} /> Done</span>
        ) : (
          <>
            <span className="mt-row__bar"><span className="mt-row__bar-fill" style={{ width: `${Math.round(t.progress * 100)}%` }} /></span>
            <span className="mt-row__pct mono">{Math.round(t.progress * 100)}%</span>
          </>
        )}
      </span>
      <span className="avstack mt-row__people">
        {t.assignees.slice(0, 3).map((a) => <Avatar key={a} p={peopleById(a)} />)}
      </span>
      <span className="mt-row__chev"><I.Chevron s={14} /></span>
    </button>
  );
}

export function MyTasksPage({ onPushToast }) {
  const I = Icons;
  const mine = useMemo(
    () => INKLY_DATA.TASKS.filter((t) => t.assignees.includes(ME_ID)),
    []
  );

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open"); // open | all | done
  const [highOnly, setHighOnly] = useState(false);
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    return mine.filter((t) => {
      if (status === "open" && t.col === "done") return false;
      if (status === "done" && t.col !== "done") return false;
      if (highOnly && !["high", "urgent"].includes(t.pri)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [mine, status, highOnly, query]);

  // group by status, in board order
  const groups = useMemo(() => {
    return INKLY_DATA.COLS
      .map((c) => ({ col: c.id, tasks: filtered.filter((t) => t.col === c.id) }))
      .filter((g) => g.tasks.length > 0);
  }, [filtered]);

  const openCount = mine.filter((t) => t.col !== "done").length;
  const doneCount = mine.filter((t) => t.col === "done").length;
  const inProg = mine.filter((t) => t.col === "progress").length;
  const dueSoon = mine.filter((t) => t.col !== "done" && /May 1[0-9]|May 2[0-4]/.test(t.due)).length;

  return (
    <div className="page mt-page">
      <div className="page__head">
        <div>
          <h1 className="page__title">My Tasks</h1>
          <div className="page__sub">
            {openCount} open · {inProg} in progress · {dueSoon} due this week
          </div>
        </div>
        <button className="btn btn--primary" onClick={() => onPushToast?.("Quick-create opened")}>
          <I.Plus s={13} /> New task
        </button>
      </div>

      {/* summary stats */}
      <div className="mt-stats">
        <button className={`mt-stat ${status === "open" ? "mt-stat--active" : ""}`} onClick={() => setStatus("open")}>
          <span className="mt-stat__num">{openCount}</span>
          <span className="mt-stat__lbl">Open</span>
        </button>
        <button className="mt-stat" onClick={() => setStatus("all")}>
          <span className="mt-stat__num">{inProg}</span>
          <span className="mt-stat__lbl">In progress</span>
        </button>
        <button className={`mt-stat ${highOnly ? "mt-stat--active" : ""}`} onClick={() => setHighOnly((v) => !v)}>
          <span className="mt-stat__num">{mine.filter((t) => ["high", "urgent"].includes(t.pri) && t.col !== "done").length}</span>
          <span className="mt-stat__lbl">High priority</span>
        </button>
        <button className={`mt-stat ${status === "done" ? "mt-stat--active" : ""}`} onClick={() => setStatus("done")}>
          <span className="mt-stat__num">{doneCount}</span>
          <span className="mt-stat__lbl">Completed</span>
        </button>
      </div>

      {/* filter bar */}
      <div className="mt-toolbar">
        <label className="top__search mt-search">
          <I.Search />
          <input placeholder="Search my tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="mt-seg">
          <button className={status === "open" ? "is-on" : ""} onClick={() => setStatus("open")}>Open</button>
          <button className={status === "all" ? "is-on" : ""} onClick={() => setStatus("all")}>All</button>
          <button className={status === "done" ? "is-on" : ""} onClick={() => setStatus("done")}>Completed</button>
        </div>
        <button className={`btn ${highOnly ? "btn--primary" : "btn--ghost"}`} onClick={() => setHighOnly((v) => !v)}>
          <I.Flag s={13} /> High priority
        </button>
      </div>

      {/* grouped list */}
      <div className="mt-list">
        {groups.length === 0 && (
          <div className="mt-empty">
            <div className="mt-empty__icon"><I.Check s={22} /></div>
            <div className="mt-empty__title">Nothing here</div>
            <div className="mt-empty__sub">No tasks match your filters. Try clearing search or switching to "All".</div>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.col} className="mt-group">
            <header className="mt-group__hd">
              <span className={`dot dot--${MT_STATUS[g.col].dot}`} />
              <span className="mt-group__name">{MT_STATUS[g.col].label}</span>
              <span className="mt-group__count">{g.tasks.length}</span>
            </header>
            <div className="mt-group__rows">
              {g.tasks.map((t) => <MtRow key={t.id} t={t} onOpen={setOpenId} />)}
            </div>
          </section>
        ))}
      </div>

      {openId && (
        <TaskModal
          taskId={openId}
          allTasks={INKLY_DATA.TASKS}
          onClose={() => setOpenId(null)}
          onPushToast={onPushToast}
        />
      )}
    </div>
  );
}
