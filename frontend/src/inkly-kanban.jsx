/* Kanban board with drag & drop */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Icons } from './inkly-icons.jsx';
import { Avatar } from './inkly-chrome.jsx';
import { INKLY_DATA, peopleById } from './inkly-data.js';
import { INKLY_API } from './inkly-api.js';
import { useInkly } from './inkly-context.js';

function CardMenu({ t, allColumns, onOpen, onMoveCard, onDeleteCard, onClose, wrapRef }) {
  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const otherCols = (allColumns || []).filter((c) => c.id !== t.col);

  return (
    <ul className="kc-menu" role="menu" onClick={(e) => e.stopPropagation()}>
      <li className="kc-menu__opt" role="menuitem"
        onClick={(e) => { e.stopPropagation(); onClose(); onOpen(t.id); }}>
        <Icons.Eye s={14} /><span className="kc-menu__label">Open</span>
      </li>
      {otherCols.map((c) =>
        <li key={c.id} className="kc-menu__opt" role="menuitem"
          onClick={(e) => { e.stopPropagation(); onClose(); onMoveCard?.(t.id, c.id); }}>
          <Icons.Swap s={14} /><span className="kc-menu__label">Move to {c.name}</span>
        </li>
      )}
      <li className="kc-menu__opt kc-menu__opt--danger" role="menuitem"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          if (window.confirm(`Delete "${t.title}"? This cannot be undone.`)) onDeleteCard?.(t.id);
        }}>
        <Icons.Trash s={14} /><span className="kc-menu__label">Delete card</span>
      </li>
    </ul>
  );
}

function TaskCard({ t, onOpen, onDragStart, onDragEnd, dragging, onPushToast, allColumns, onMoveCard, onDeleteCard }) {
  const pri = INKLY_DATA.PRIORITY[t.pri];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);
  return (
    <div
      className={`kc ${dragging ? "kc--dragging" : ""}`}
      draggable
      onDragStart={(e) => {e.dataTransfer.effectAllowed = "move";onDragStart(t.id);}}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(t.id)}>

      {t.live && <span className="kc__live" title="Live update" />}
      <div className="kc__top">
        <span className="kc__id mono">{t.humanId || t.id}</span>
        <span className={`chip ${pri.cls}`}><Icons.Flag s={10} /> {pri.label}</span>
        <span className="kc__top-spacer" />
        <span className="kc-menu-wrap" ref={menuWrapRef}>
          <button
            className="kc__more"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}>
            <Icons.More s={14} />
          </button>
          {menuOpen &&
            <CardMenu
              t={t}
              allColumns={allColumns}
              onOpen={onOpen}
              onMoveCard={onMoveCard}
              onDeleteCard={onDeleteCard}
              onPushToast={onPushToast}
              onClose={() => setMenuOpen(false)}
              wrapRef={menuWrapRef} />
          }
        </span>
      </div>
      <div className="kc__title">{t.title}</div>
      <div className="kc__desc">{t.desc}</div>
      {t.tags?.length > 0 &&
        <div className="kc__tags">
          {t.tags.map((tg) => <span key={tg} className={`chip ${INKLY_DATA.TAGS[tg].cls}`}>{INKLY_DATA.TAGS[tg].label}</span>)}
        </div>
      }
      {t.progress > 0 && t.progress < 1 &&
        <div className="kc__progress">
          <div className="kc__progress-fill kc__progress-fill--accent" style={{ width: `${t.progress * 100}%` }} />
        </div>
      }
      <div className="kc__foot">
        <span className="kc__foot-meta"><Icons.Cal s={12} /> {t.due}</span>
        <span className="kc__foot-spacer" />
        {t.comments > 0 && <span className="kc__foot-meta"><Icons.Msg /> {t.comments}</span>}
        {t.attachments > 0 && <span className="kc__foot-meta"><Icons.Clip /> {t.attachments}</span>}
        <span className="avstack">
          {t.assignees.slice(0, 3).map((a) => <Avatar key={a} p={peopleById(a)} />)}
        </span>
      </div>
    </div>
  );
}

function colDot(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("done") || n.includes("complete")) return "green";
  if (n.includes("review"))                          return "amber";
  if (n.includes("progress"))                        return "accent";
  if (n.includes("todo") || n.includes("to do"))     return "violet";
  return "";
}

function Column({ col, tasks, onCardOpen, onDragStart, onDragEnd, draggingId, onDropInto, dropTarget, onDragOver, onDragLeave, onPushToast, allColumns, onMoveCard, onDeleteCard }) {
  const isDrop = dropTarget === col.id;
  return (
    <div
      className={`col ${isDrop ? "col--drop" : ""}`}
      onDragOver={(e) => {e.preventDefault();onDragOver(col.id);}}
      onDragLeave={() => onDragLeave(col.id)}
      onDrop={() => onDropInto(col.id)}>

      <div className="col__hd">
        <span className={`dot dot--${colDot(col.name)}`} />
        <span className="col__title">{col.name}</span>
        <span className="col__count">{tasks.length}</span>
        <span className="col__hd-spacer" />
      </div>
      <div className="col__body">
        {tasks.map((t) =>
          <TaskCard key={t.id} t={t}
            onOpen={onCardOpen}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            dragging={draggingId === t.id}
            onPushToast={onPushToast}
            allColumns={allColumns}
            onMoveCard={onMoveCard}
            onDeleteCard={onDeleteCard} />
        )}
      </div>
    </div>
  );
}

/* ---- Themed select — keyboard-accessible, drop-up-aware ---- */
function ThemedSelect({ value, onChange, options, icon, ariaLabel }) {
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const wrapRef = useRef(null);
  const btnRef  = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActive(idx);
    if (btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const estH  = Math.min(216, options.length * 38 + 10);
      const below = window.innerHeight - r.bottom;
      setDropUp(below < estH + 12 && r.top > below);
    }
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (v) => { setOpen(false); onChange(v); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(options[active].value); else setOpen(true);
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    }
  };

  return (
    <div className={`tsel ${open ? "tsel--open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className="tsel__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}>
        {icon && <span className="tsel__icon">{icon}</span>}
        <span className="tsel__value">{current ? current.label : "Select…"}</span>
        <span className="tsel__chev"><Icons.ChevDn s={15} /></span>
      </button>
      {open &&
        <ul className={`tsel__menu ${dropUp ? "tsel__menu--up" : ""}`} role="listbox">
          {options.map((o, i) =>
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`tsel__opt ${o.value === value ? "tsel__opt--sel" : ""} ${i === active ? "tsel__opt--active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); choose(o.value); }}>
              {o.dot && <span className={`dot dot--${o.dot}`} />}
              <span className="tsel__opt-label">{o.label}</span>
              {o.value === value && <span className="tsel__check"><Icons.Check s={13} /></span>}
            </li>
          )}
        </ul>
      }
    </div>
  );
}

/* ---- Create Task Modal ---- */
function CreateTaskModal({ columns, onSubmit, onClose }) {
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [colId,      setColId]      = useState(columns[0]?.id || "");
  const [pri,        setPri]        = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [assignees,  setAssignees]  = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    INKLY_API.kanban.fetchAssignees().then(setAssignees).catch(() => {});
  }, []);

  const PRIORITIES = [
    { value: "URGENT", label: "Urgent" },
    { value: "HIGH",   label: "High"   },
    { value: "MEDIUM", label: "Medium" },
    { value: "LOW",    label: "Low"    },
  ];

  const colOptions      = columns.map((c) => ({ value: c.id, label: c.name, dot: colDot(c.name) }));
  const priOptions      = PRIORITIES.map((p) => ({ value: p.value, label: p.label }));
  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...assignees.map((a) => ({ value: a.id, label: `${a.name} · ${a.email}` })),
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr("Give the task a title."); return; }
    if (!desc.trim())  { setErr("Description is required."); return; }
    setSubmitting(true);
    await onSubmit(colId, title.trim(), desc.trim(), pri, assigneeId || null);
    setSubmitting(false);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <form className="qc" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="qc__hd">
          <span className="qc__eyebrow"><Icons.Plus s={14} /> Create task</span>
          <button type="button" className="modal__close" onClick={onClose}><Icons.X /></button>
        </div>

        <div className="qc__body">
          <label className="field" style={{ margin: 0 }}>
            <span className="field__label">Title</span>
            <div className={`input-wrap ${err ? "input-wrap--error" : ""}`}>
              <input
                ref={titleRef}
                placeholder="What needs doing?"
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (err) setErr(""); }} />
            </div>
            {err && <div className="field__err"><Icons.X s={11} /> {err}</div>}
          </label>

          <label className="field" style={{ margin: 0 }}>
            <span className="field__label">Description</span>
            <div className="input-wrap">
              <textarea
                placeholder="Add context, acceptance criteria, links…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                style={{ resize: "vertical" }} />
            </div>
          </label>

          <div className="qc__row">
            <label className="field" style={{ margin: 0 }}>
              <span className="field__label">Column</span>
              <ThemedSelect
                ariaLabel="Column"
                value={colId}
                onChange={setColId}
                icon={<Icons.Layers s={15} />}
                options={colOptions} />
            </label>
            <label className="field" style={{ margin: 0 }}>
              <span className="field__label">Priority</span>
              <ThemedSelect
                ariaLabel="Priority"
                value={pri}
                onChange={setPri}
                icon={<Icons.Flag s={14} />}
                options={priOptions} />
            </label>
          </div>

          <label className="field" style={{ margin: 0 }}>
            <span className="field__label">Assigned to <span className="qc__opt">optional</span></span>
            <ThemedSelect
              ariaLabel="Assigned to"
              value={assigneeId}
              onChange={setAssigneeId}
              icon={<Icons.Users s={15} />}
              options={assigneeOptions} />
          </label>
        </div>

        <div className="qc__ft">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={!title.trim() || !desc.trim() || submitting}>
            {submitting
              ? <><span className="spinner" /> Creating…</>
              : <><Icons.Plus s={12} /> Create task</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskModal({ taskId, allTasks, allColumns, onClose, onPushToast }) {
  const t = allTasks.find((x) => x.id === taskId);
  const [comment, setComment] = useState("");
  if (!t) return null;
  const pri     = INKLY_DATA.PRIORITY[t.pri];
  const colName = (allColumns || []).find((c) => c.id === t.col)?.name;

  function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    onPushToast?.("Comment posted");
    setComment("");
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__hd">
          <span className="modal__id">{t.humanId || t.id}</span>
          <span className="chip">{colName}</span>
          <span className={`chip ${pri.cls}`}><Icons.Flag s={10} /> {pri.label}</span>
          <button className="modal__close" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="modal__body">
          <div className="modal__main">
            <h2 className="modal__title">{t.title}</h2>
            <div className="modal__desc">{t.desc}</div>

            <div className="modal__h">Subtasks</div>
            <div className="tasks-list">
              {[
                { t: "Update API contract for nested moves",   done: true  },
                { t: "Add audit-event coalescing",             done: true  },
                { t: "Permission scope checks per move",       done: false },
                { t: "Telemetry: record gesture latency",      done: false },
              ].map((s, i) =>
                <div key={i} className={`task-row ${s.done ? "task-row--done" : ""}`}>
                  <div className="task-row__check"><Icons.Check s={11} /></div>
                  <div className="task-row__title">{s.t}</div>
                  <span /><span /><span />
                </div>
              )}
            </div>

            <div className="modal__h">Comments · {t.comments}</div>
            <div>
              <div className="cmt">
                <Avatar p={peopleById("u5")} />
                <div className="cmt__body">
                  <div className="cmt__hd"><span className="cmt__name">Noor Zaidi</span><span className="cmt__time">2H AGO</span></div>
                  <div className="cmt__text">@avery — would love a quick review on the empty filter state before we cut a build.</div>
                </div>
              </div>
              <div className="cmt">
                <Avatar p={peopleById("u3")} />
                <div className="cmt__body">
                  <div className="cmt__hd"><span className="cmt__name">Imani Bell</span><span className="cmt__time">YESTERDAY</span></div>
                  <div className="cmt__text">Pushed the gesture polish to the prototype. Reparent feels solid on trackpad — still a touch jittery on iPad, looking now.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal__side">
            <dl>
              <dt>Assignees</dt>
              <dd>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.assignees.length > 0
                    ? t.assignees.map((a) => {
                        const p = peopleById(a);
                        return (
                          <div key={a} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar p={p} />
                            <span>{p.name}</span>
                          </div>
                        );
                      })
                    : <span style={{ color: "var(--ink-3)", fontSize: 12 }}>Unassigned</span>
                  }
                </div>
              </dd>

              <dt>Due date</dt>
              <dd className="mono">{t.due}</dd>

              <dt>Sprint</dt>
              <dd>Sprint 24 · ends Fri</dd>

              <dt>Tags</dt>
              <dd>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.tags.length > 0
                    ? t.tags.map((tg) => <span key={tg} className={`chip ${INKLY_DATA.TAGS[tg].cls}`}>{INKLY_DATA.TAGS[tg].label}</span>)
                    : <span style={{ color: "var(--ink-3)", fontSize: 12 }}>None</span>
                  }
                </div>
              </dd>

              <dt>Progress</dt>
              <dd>
                <div className="kc__progress" style={{ marginBottom: 4 }}>
                  <div className="kc__progress-fill kc__progress-fill--accent" style={{ width: `${t.progress * 100}%` }} />
                </div>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{Math.round(t.progress * 100)}% complete</span>
              </dd>

              <dt>Watchers</dt>
              <dd>
                <span className="avstack">
                  {INKLY_DATA.PEOPLE.slice(0, 4).map((p) => <Avatar key={p.id} p={p} />)}
                </span>
              </dd>
            </dl>
          </div>
        </div>
        <form className="modal__ft" onSubmit={submitComment}>
          <Avatar p={{ initials: INKLY_DATA.ME.initials, color: "av-cyan" }} />
          <input className="modal__input" placeholder="Write a comment… type @ to mention" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn btn--primary" type="submit"><Icons.Plus s={12} /> Post</button>
        </form>
      </div>
    </div>
  );
}

function RightPanel({ onClose }) {
  return (
    <div className="rp">
      <div className="card">
        <div className="card__head">
          <h3 className="card__title">Sprint 24 progress</h3>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={onClose} title="Close panel"><Icons.X s={12} /></button>
        </div>
        <div className="sprint__row">
          <div>
            <div className="sprint__num">62%</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>9 of 14 days · ends Fri</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>
            <div className="mono" style={{ color: "var(--ink-1)" }}>27 / 41 pts</div>
            <div>14 pts remaining</div>
          </div>
        </div>
        <div className="sprint__bar"><div className="sprint__bar-fill" style={{ width: "62%" }} /></div>
        <div className="sprint__legend">
          <span><span className="dot dot--accent" /> on track</span>
          <span><span className="dot dot--amber" /> 2 at risk</span>
        </div>
      </div>
    </div>
  );
}

/* Map an API card response to the internal task shape the components expect. */
function mapApiCard(card) {
  const PRI = { LOW: "low", MEDIUM: "med", HIGH: "high", URGENT: "urgent" };
  return {
    id:          card.id,
    humanId:     card.humanId,
    col:         card.columnId,
    title:       card.title,
    desc:        card.description || "",
    pri:         PRI[card.priority] || "med",
    tags:        [],
    assignees:   [],
    due:         card.dueDate
                   ? new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                   : "—",
    progress:    0,
    comments:    card.commentCount,
    attachments: card.attachmentCount,
    live:        false,
    rank:        card.rank,
  };
}

function Kanban({ onPushToast }) {
  const { user } = useInkly();
  const [columns,     setColumns]     = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [boardId,     setBoardId]     = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [apiMode,     setApiMode]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [draggingId,  setDraggingId]  = useState(null);
  const [dropTarget,  setDropTarget]  = useState(null);
  const [openId,      setOpenId]      = useState(null);
  const [showSide,    setShowSide]    = useState(true);
  const [filter,      setFilter]      = useState("all");
  const [query,       setQuery]       = useState("");
  const [showCreate,  setShowCreate]  = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    INKLY_API.kanban.fetchBoard()
      .then((data) => {
        if (cancelled) return;
        setWorkspaceId(data.workspaceId);
        setBoardId(data.boardId);
        setColumns(data.columns.map((col) => ({
          id: col.id, name: col.name, rank: col.rank, wipLimit: col.wipLimit,
        })));
        setTasks(data.columns.flatMap((col) => col.cards.map(mapApiCard)));
        setApiMode(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const doneColId = useMemo(() => {
    if (!apiMode) return "done";
    const col = columns.find((c) =>
      c.name.toLowerCase().includes("done") || c.name.toLowerCase().includes("complete"));
    return col ? col.id : null;
  }, [columns, apiMode]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "mine" && !apiMode && !t.assignees.includes("u3")) return false;
      if (filter === "high" && !["high", "urgent"].includes(t.pri)) return false;
      if (query) {
        const q       = query.toLowerCase();
        const display = String(t.humanId || t.id).toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !display.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter, query, apiMode]);

  function startDrag(id)    { setDraggingId(id); }
  function endDrag()        { setDraggingId(null); setDropTarget(null); }
  function dragOver(colId)  { if (dropTarget !== colId) setDropTarget(colId); }
  function dragLeave()      {}

  async function moveCardTo(cardId, colId) {
    if (!cardId) return;
    const col      = columns.find((c) => c.id === colId);
    const name     = col?.name || colId;
    const snapshot = tasks;
    const current  = snapshot.find((t) => t.id === cardId);
    if (current && current.col === colId) return;

    setTasks((ts) => ts.map((t) => t.id === cardId ? { ...t, col: colId } : t));

    if (!apiMode) { onPushToast?.(`Moved to ${name}`); return; }

    const colCards = snapshot
      .filter((t) => t.col === colId && t.id !== cardId)
      .sort((a, b) => (a.rank || "").localeCompare(b.rank || ""));
    const lastCard = colCards[colCards.length - 1];

    try {
      const res = await INKLY_API.kanban.moveCard(cardId, colId, lastCard?.id ?? null, null);
      setTasks((ts) => ts.map((t) => t.id === cardId ? { ...t, rank: res.rank } : t));
      if (res.overLimit) onPushToast?.(`Moved to ${name} · WIP limit reached`);
      else               onPushToast?.(`Moved to ${name}`);
    } catch {
      setTasks(snapshot);
      onPushToast?.("Move failed — please try again");
    }
  }

  async function deleteCard(cardId) {
    if (!cardId) return;
    const snapshot = tasks;
    const card     = snapshot.find((t) => t.id === cardId);
    if (!card) return;

    setTasks((ts) => ts.filter((t) => t.id !== cardId));
    if (openId === cardId) setOpenId(null);

    if (!apiMode) { onPushToast?.(`Deleted "${card.title}"`); return; }

    try {
      await INKLY_API.kanban.deleteCard(cardId);
      onPushToast?.(`Deleted "${card.title}"`);
    } catch {
      setTasks(snapshot);
      onPushToast?.("Delete failed — please try again");
    }
  }

  function dropInto(colId) {
    if (!draggingId) return;
    const cardId = draggingId;
    endDrag();
    moveCardTo(cardId, colId);
  }

  async function addTask(colId, title, desc, priority, assigneeId) {
    const col     = columns.find((c) => c.id === colId);
    const colName = col?.name || colId;
    const PRI_MAP = { URGENT: "urgent", HIGH: "high", MEDIUM: "med", LOW: "low" };

    if (!apiMode) {
      const newId  = "INK-" + (300 + Math.floor(Math.random() * 100));
      const newTask = {
        id: newId, humanId: newId, col: colId, title,
        desc: desc || "", pri: PRI_MAP[priority] || "med", tags: [], assignees: ["u3"],
        due: "—", progress: 0, comments: 0, attachments: 0, live: false,
      };
      setTasks((ts) => [...ts, newTask]);
      setShowCreate(false);
      onPushToast?.(`Created "${title}" in ${colName}`);
      return;
    }

    try {
      const payload = { workspaceId, boardId, columnId: colId, title, description: desc, priority: priority || "MEDIUM" };
      if (assigneeId) payload.assigneeId = assigneeId;
      const res = await INKLY_API.kanban.createCard(payload);
      setTasks((ts) => [...ts, mapApiCard(res)]);
      setShowCreate(false);
      onPushToast?.(`Created "${title}" in ${colName}`);
    } catch (err) {
      onPushToast?.("Failed to create card — " + err.message);
    }
  }

  const shippedCount = tasks.filter((t) => t.col === doneColId).length;

  return (
    <div className={`kan ${showSide ? "" : "kan--no-side"}`}>
      <div className="kan__main">
        <div className="kan__hd">
          <div className="kan__hd-l">
            <h1 className="kan__hd-h">
              Kanban Workflow <span className="chip chip--accent">SPRINT 24</span>
              {loading && <span className="chip" style={{ marginLeft: 8, opacity: 0.5 }}>Loading…</span>}
            </h1>
            <div className="kan__hd-meta">
              <span><span className="mono">9 / 14</span> days remaining</span>
              <span>·</span>
              <span>
                <span className="mono">{shippedCount}</span> of{" "}
                <span className="mono">{tasks.length}</span> shipped
              </span>
              <span>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Team
                <span className="avstack">
                  {INKLY_DATA.PEOPLE.slice(0, 5).map((p) => <Avatar key={p.id} p={p} />)}
                </span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setShowSide((s) => !s)} title="Toggle sprint panel">
              <Icons.Layers s={13} /> {showSide ? "Hide" : "Show"} panel
            </button>
            <button className="btn btn--accent" onClick={() => setShowCreate(true)}>
              <Icons.Plus s={13} /> Create task
            </button>
          </div>
        </div>

        <div className="kan__filters">
          <label className="top__search" style={{ flex: "0 1 280px", margin: 0 }}>
            <Icons.Search />
            <input placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className={`btn ${filter === "all"  ? "btn--primary" : ""}`} onClick={() => setFilter("all")}>
            All <span className="mono" style={{ opacity: 0.6, marginLeft: 4 }}>{tasks.length}</span>
          </button>
          <button className={`btn ${filter === "mine" ? "btn--primary" : ""}`} onClick={() => setFilter("mine")}>Assigned to me</button>
          <button className={`btn ${filter === "high" ? "btn--primary" : ""}`} onClick={() => setFilter("high")}>High priority</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn--ghost" onClick={() => onPushToast?.("Advanced filters coming soon")}><Icons.Filter /> Filter</button>
          <button className="btn btn--ghost" onClick={() => onPushToast?.("Grouping options coming soon")}><Icons.Sort /> Group</button>
        </div>

        <div className="kan__board">
          {columns.map((col) =>
            <Column
              key={col.id}
              col={col}
              tasks={filtered.filter((t) => t.col === col.id)}
              onCardOpen={setOpenId}
              onDragStart={startDrag}
              onDragEnd={endDrag}
              draggingId={draggingId}
              onDropInto={dropInto}
              dropTarget={dropTarget}
              onDragOver={dragOver}
              onDragLeave={dragLeave}
              onPushToast={onPushToast}
              allColumns={columns}
              onMoveCard={moveCardTo}
              onDeleteCard={deleteCard} />
          )}
        </div>
      </div>

      {showSide && <RightPanel onClose={() => setShowSide(false)} />}

      {openId && <TaskModal taskId={openId} allTasks={tasks} allColumns={columns} onClose={() => setOpenId(null)} onPushToast={onPushToast} />}

      {showCreate && <CreateTaskModal columns={columns} onSubmit={addTask} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

export { Kanban, TaskModal };
