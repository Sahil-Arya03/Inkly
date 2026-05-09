/* Kanban board with drag & drop */
const { useState: useStateKan, useMemo: useMemoKan, useEffect: useEffectKan } = React;

function TaskCard({ t, onOpen, onDragStart, onDragEnd, dragging }) {
  const pri = INKLY_DATA.PRIORITY[t.pri];
  return (
    <div
      className={`kc ${dragging ? "kc--dragging" : ""}`}
      draggable
      onDragStart={(e) => {e.dataTransfer.effectAllowed = "move";onDragStart(t.id);}}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(t.id)}>
      
      {t.live && <span className="kc__live" title="Live update" />}
      <div className="kc__top">
        <span className="kc__id mono">{t.id}</span>
        <span className={`chip ${pri.cls}`}><Icons.Flag s={10} /> {pri.label}</span>
        <span className="kc__top-spacer" />
        <button className="kc__more" onClick={(e) => e.stopPropagation()}><Icons.More s={14} /></button>
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
    </div>);

}

function Column({ col, tasks, onCardOpen, onDragStart, onDragEnd, draggingId, onDropInto, dropTarget, onDragOver, onDragLeave }) {
  const isDrop = dropTarget === col.id;
  return (
    <div
      className={`col ${isDrop ? "col--drop" : ""}`}
      onDragOver={(e) => {e.preventDefault();onDragOver(col.id);}}
      onDragLeave={() => onDragLeave(col.id)}
      onDrop={() => onDropInto(col.id)}>
      
      <div className="col__hd">
        <span className={`dot dot--${col.id === "done" ? "green" : col.id === "review" ? "amber" : col.id === "progress" ? "accent" : col.id === "todo" ? "violet" : ""}`} />
        <span className="col__title">{col.name}</span>
        <span className="col__count">{tasks.length}</span>
        <span className="col__hd-spacer" />
        <button className="col__hd-add" title="Add task"><Icons.Plus s={13} /></button>
      </div>
      <div className="col__body">
        {tasks.map((t) =>
        <TaskCard key={t.id} t={t}
        onOpen={onCardOpen}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        dragging={draggingId === t.id} />

        )}
        <button className="col__add-row"><Icons.Plus s={12} /> Add task</button>
      </div>
    </div>);

}

function TaskModal({ taskId, allTasks, onClose, onPushToast }) {
  const t = allTasks.find((x) => x.id === taskId);
  const [comment, setComment] = useStateKan("");
  if (!t) return null;
  const pri = INKLY_DATA.PRIORITY[t.pri];
  const colName = INKLY_DATA.COLS.find((c) => c.id === t.col)?.name;

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
          <span className="modal__id">{t.id}</span>
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
              { t: "Update API contract for nested moves", done: true },
              { t: "Add audit-event coalescing", done: true },
              { t: "Permission scope checks per move", done: false },
              { t: "Telemetry: record gesture latency", done: false }].
              map((s, i) =>
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
                  {t.assignees.map((a) => {
                    const p = peopleById(a);
                    return (
                      <div key={a} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar p={p} />
                        <span>{p.name}</span>
                      </div>);

                  })}
                </div>
              </dd>

              <dt>Due date</dt>
              <dd className="mono">{t.due}, 2026</dd>

              <dt>Sprint</dt>
              <dd>Sprint 24 · ends Fri</dd>

              <dt>Tags</dt>
              <dd>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {t.tags.map((tg) => <span key={tg} className={`chip ${INKLY_DATA.TAGS[tg].cls}`}>{INKLY_DATA.TAGS[tg].label}</span>)}
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
    </div>);

}

function RightPanel({ onClose }) {
  return (
    <div className="rp">
      <div className="card" style={{ width: "828.8px", height: "150.275px" }}>
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

      <div className="card">
        <div className="card__head">
          <h3 className="card__title">Activity</h3>
          <button className="btn btn--ghost"><Icons.Filter /></button>
        </div>
        <div className="feed">
          {INKLY_DATA.ACTIVITY.slice(0, 4).map((a, i) => {
            const p = peopleById(a.who);
            return (
              <div key={i} className="feed__item">
                <Avatar p={p} />
                <div>
                  <div className="feed__body" style={{ fontSize: 12.5 }}>
                    <strong>{p.name}</strong> {a.what}
                    <div style={{ color: "var(--ink-3)" }}>{a.obj}</div>
                  </div>
                  <div className="feed__time">{a.time}</div>
                </div>
              </div>);

          })}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <h3 className="card__title">Upcoming deadlines</h3>
        </div>
        <div className="deadlines">
          {INKLY_DATA.DEADLINES.slice(0, 3).map((d, i) =>
          <div key={i} className="deadline">
              <div>
                <div className="deadline__title" style={{ fontSize: 12.5 }}>{d.title}</div>
                <div className="deadline__sub">{d.sub.toUpperCase()}</div>
              </div>
              <div className="deadline__bar" style={{ width: 70 }}>
                <div className={`deadline__bar-fill ${d.warn ? "deadline__bar-fill--warn" : ""}`} style={{ width: `${d.pct * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>);

}

function Kanban({ onPushToast }) {
  const [tasks, setTasks] = useStateKan(INKLY_DATA.TASKS);
  const [draggingId, setDraggingId] = useStateKan(null);
  const [dropTarget, setDropTarget] = useStateKan(null);
  const [openId, setOpenId] = useStateKan(null);
  const [showSide, setShowSide] = useStateKan(true);
  const [filter, setFilter] = useStateKan("all");
  const [query, setQuery] = useStateKan("");

  const filtered = useMemoKan(() => {
    return tasks.filter((t) => {
      if (filter === "mine" && !t.assignees.includes("u3")) return false;
      if (filter === "high" && !["high", "urgent"].includes(t.pri)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filter, query]);

  function startDrag(id) {setDraggingId(id);}
  function endDrag() {setDraggingId(null);setDropTarget(null);}
  function dragOver(colId) {if (dropTarget !== colId) setDropTarget(colId);}
  function dragLeave(colId) {/* leave alone — dragOver of next col will replace */}
  function dropInto(colId) {
    if (!draggingId) return;
    setTasks((ts) => ts.map((t) => t.id === draggingId ? { ...t, col: colId, progress: colId === "done" ? 1 : colId === "review" ? Math.max(0.85, t.progress) : t.progress } : t));
    onPushToast?.(`Moved to ${INKLY_DATA.COLS.find((c) => c.id === colId).name}`);
    endDrag();
  }

  return (
    <div className={`kan ${showSide ? "" : "kan--no-side"}`}>
      <div className="kan__main">
        <div className="kan__hd">
          <div className="kan__hd-l">
            <h1 className="kan__hd-h">Kanban Workflow <span className="chip chip--accent">SPRINT 24</span></h1>
            <div className="kan__hd-meta">
              <span><span className="mono">9 / 14</span> days remaining</span>
              <span>·</span>
              <span><span className="mono">{tasks.filter((t) => t.col === "done").length}</span> of <span className="mono">{tasks.length}</span> shipped</span>
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
            <button className="btn" onClick={() => setShowSide((s) => !s)} title="Toggle activity panel">
              <Icons.Layers s={13} /> {showSide ? "Hide" : "Show"} panel
            </button>
            <button className="btn btn--accent" onClick={() => onPushToast?.("Quick-create opened")}>
              <Icons.Plus s={13} /> Create task
            </button>
          </div>
        </div>

        <div className="kan__filters">
          <label className="top__search" style={{ flex: "0 1 280px", margin: 0 }}>
            <Icons.Search />
            <input placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className={`btn ${filter === "all" ? "btn--primary" : ""}`} onClick={() => setFilter("all")}>All <span className="mono" style={{ opacity: 0.6, marginLeft: 4 }}>{tasks.length}</span></button>
          <button className={`btn ${filter === "mine" ? "btn--primary" : ""}`} onClick={() => setFilter("mine")}>Assigned to me</button>
          <button className={`btn ${filter === "high" ? "btn--primary" : ""}`} onClick={() => setFilter("high")}>High priority</button>
          <span style={{ flex: 1 }} />
          <button className="btn btn--ghost"><Icons.Filter /> Filter</button>
          <button className="btn btn--ghost"><Icons.Sort /> Group</button>
        </div>

        <div className="kan__board">
          {INKLY_DATA.COLS.map((col) =>
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
            onDragLeave={dragLeave} />

          )}
        </div>
      </div>

      {showSide && <RightPanel onClose={() => setShowSide(false)} />}

      {openId && <TaskModal taskId={openId} allTasks={tasks} onClose={() => setOpenId(null)} onPushToast={onPushToast} />}
    </div>);

}

window.Kanban = Kanban;