/* Inbox — notifications + threaded detail panel */
import { useState, useMemo } from 'react';
import { I, Icons } from './inkly-icons.jsx';
import { Avatar } from './inkly-chrome.jsx';
import { INKLY_DATA, peopleById } from './inkly-data.js';

const INBOX_ITEMS = [
  {
    id: "n01",
    kind: "mention",
    who: "u5", actors: ["u5"],
    title: "Noor Zaidi mentioned you",
    obj:   "INK-219 · Spec: shared smart filters for Boards",
    snippet: "@avery — would love a quick review on the empty filter state before we cut a build.",
    time:  "2h ago",
    when:  "Today · 13:24",
    read:  false,
    tone:  "violet",
    icon:  "Mention",
    type:  "Comment thread",
    detail: [
      { who: "u5", time: "13:21", text: "Started spec for shared smart filters. Going for read-only sharing by default, with owner revoke. Two states matter:" },
      { who: "u5", time: "13:21", text: "Empty (nothing shared yet) and onboarded (1+ filters)." },
      { who: "u5", time: "13:24", text: "@avery — would love a quick review on the empty filter state before we cut a build.", mention: true },
    ],
  },
  {
    id: "n02",
    kind: "assign",
    who: "u1", actors: ["u1"],
    title: "Maren Olsson assigned you",
    obj:   "INK-238 · Investigate cold-start latency on EU region",
    snippet: "P95 has crept past 800ms after Friday's deploy. Owning this would be great if you have capacity.",
    time:  "3h ago",
    when:  "Today · 12:08",
    read:  false,
    tone:  "accent",
    icon:  "Assign",
    type:  "Task assignment",
    detail: [
      { who: "u1", time: "12:08", text: "Assigning this to you since you owned the last image-processing change. Repro is in #incident-208." },
      { who: "u1", time: "12:09", text: "Sentry shows the regression starts at 13:50 Friday UTC — same window as the deploy." },
    ],
  },
  {
    id: "n03",
    kind: "review",
    who: "u3", actors: ["u3","u2"],
    title: "Imani Bell requested your review",
    obj:   "INK-198 · Drag-to-reorder for nested pages",
    snippet: "Gesture polish is in. Reparent feels solid on trackpad — touch on iPad still a little jittery.",
    time:  "yesterday",
    when:  "May 8 · 17:42",
    read:  false,
    tone:  "green",
    icon:  "Review",
    type:  "Review request",
    detail: [
      { who: "u3", time: "17:39", text: "Pushed the gesture polish. Demo at the top of the PR description." },
      { who: "u3", time: "17:42", text: "Single audit event per reparent, permission scope respected, telemetry hooks in place.", mention: false },
    ],
  },
  {
    id: "n04",
    kind: "comment",
    who: "u4", actors: ["u4","u6"],
    title: "Theo Sandoval commented",
    obj:   "INK-214 · Sentry quota alerting → PagerDuty",
    snippet: "Wired up the 80% rule but the integration secrets aren't synced to prod yet — Jules is on it.",
    time:  "yesterday",
    when:  "May 8 · 11:05",
    read:  true,
    tone:  "amber",
    icon:  "Comment",
    type:  "Comment",
    detail: [
      { who: "u4", time: "11:05", text: "Wired up the 80% threshold rule. Tested in staging with a synthetic burst — page fires within ~40s." },
      { who: "u6", time: "11:18", text: "Will sync the prod secrets after the deploy freeze lifts at 3 PM." },
    ],
  },
  {
    id: "n05",
    kind: "deploy",
    who: "u2", actors: ["u2"],
    title: "Deploy succeeded",
    obj:   "inkly-api · v4.6.2 → production",
    snippet: "Merged 12 PRs · 3 minute rollout · zero error budget impact.",
    time:  "yesterday",
    when:  "May 8 · 09:42",
    read:  true,
    tone:  "cyan",
    icon:  "Deploy",
    type:  "Deploy event",
    detail: [
      { who: "u2", time: "09:42", text: "Rollout complete. 12 PRs merged since v4.6.1. No error-budget impact in the first hour." },
    ],
  },
  {
    id: "n06",
    kind: "deadline",
    who: "u5", actors: ["u5"],
    title: "Deadline coming up",
    obj:   "Q2 OKR draft v2 · due Friday",
    snippet: "You're listed as a reviewer. Draft is at 42% — Noor will share by EOD Wednesday.",
    time:  "2 days ago",
    when:  "May 7 · 18:00",
    read:  true,
    tone:  "rose",
    icon:  "Deadline",
    type:  "Deadline reminder",
    detail: [
      { who: "u5", time: "18:00", text: "Q2 OKR draft v2 is in shape. Plan to share with reviewers EOD Wednesday." },
    ],
  },
  {
    id: "n07",
    kind: "status",
    who: "u3", actors: ["u3"],
    title: "Imani moved a card to Review",
    obj:   "INK-188 · Inline citations in AI-summary blocks",
    snippet: "Ready for design review. Citations superscript and anchor offsets look right at 1× and 2× zoom.",
    time:  "3 days ago",
    when:  "May 6 · 14:11",
    read:  true,
    tone:  "violet",
    icon:  "Status",
    type:  "Status change",
    detail: [
      { who: "u3", time: "14:11", text: "Moved to Review. Citations superscript + anchor offsets look right at 1× and 2×." },
    ],
  },
  {
    id: "n08",
    kind: "doc",
    who: "u1", actors: ["u1"],
    title: "Maren shared a page",
    obj:   "Sprint 24 — Closeout notes",
    snippet: "Draft of the retro doc + what we want to carry into Sprint 25.",
    time:  "3 days ago",
    when:  "May 6 · 09:30",
    read:  true,
    tone:  "ink",
    icon:  "Doc",
    type:  "Page shared",
    detail: [
      { who: "u1", time: "09:30", text: "Dropped a draft of the retro doc + carryover candidates for Sprint 25. Comments welcome." },
    ],
  },
];

const INBOX_KIND_ICON = {
  mention:  (p) => <I s={p?.s||14} {...p}><path d="M16 8a4 4 0 1 0-4 4 4 4 0 0 0 4-4Zm0 0v2a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></I>,
  assign:   (p) => <I s={p?.s||14} {...p}><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M19 8v6m3-3h-6" /></I>,
  review:   (p) => <I s={p?.s||14} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></I>,
  comment:  (p) => <I s={p?.s||14} {...p}><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z" /></I>,
  deploy:   (p) => <I s={p?.s||14} {...p}><path d="M5 18a8 8 0 0 1 14-6 5 5 0 0 1-3 9H8a5 5 0 0 1-3-3Z" /><path d="m9 12 3-3 3 3M12 9v8" /></I>,
  deadline: (p) => <I s={p?.s||14} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  status:   (p) => <I s={p?.s||14} {...p}><path d="M4 12h8M4 6h16M4 18h12" /><path d="m17 9 4 3-4 3" /></I>,
  doc:      (p) => <I s={p?.s||14} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></I>,
};

/* Render message text, highlighting @mentions — pure React, no innerHTML, so any
   HTML in the message text is rendered as inert text (no XSS). */
function MentionText({ text }) {
  const parts = String(text).split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^@\w+$/.test(part)
          ? <span key={i} className="inb-mention">{part}</span>
          : part
      )}
    </>
  );
}

function InboxRow({ item, selected, onSelect, onToggleRead, onArchive }) {
  const p = peopleById(item.who);
  const IconK = INBOX_KIND_ICON[item.kind];
  return (
    <li
      className={`inb-row ${selected ? "inb-row--sel" : ""} ${item.read ? "inb-row--read" : ""}`}
      onClick={() => onSelect(item.id)}
    >
      <div className="inb-row__lead">
        <Avatar p={p}/>
        <span className={`inb-row__kind inb-row__kind--${item.tone}`}>
          <IconK s={11}/>
        </span>
      </div>
      <div className="inb-row__body">
        <div className="inb-row__h">
          <span className="inb-row__title">{item.title}</span>
          <span className="inb-row__time mono">{item.time}</span>
        </div>
        <div className="inb-row__obj">{item.obj}</div>
        <div className="inb-row__snip">{item.snippet}</div>
      </div>
      {!item.read && <span className="inb-row__dot" aria-label="Unread"/>}
      <div className="inb-row__hover-actions" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" title={item.read ? "Mark unread" : "Mark read"} onClick={() => onToggleRead(item.id)}>
          <Icons.Check s={12}/>
        </button>
        <button className="icon-btn" title="Archive" onClick={() => onArchive(item.id)}>
          <Icons.X s={12}/>
        </button>
      </div>
    </li>
  );
}

function InboxDetail({ item, onPushToast }) {
  const I = Icons;
  if (!item) {
    return (
      <div className="card inb-detail inb-detail--empty">
        <div className="inb-empty">
          <span className="inb-empty__glyph"><I.Inbox s={22}/></span>
          <h3>Pick a notification</h3>
          <p>Select an item to read its thread and take action.</p>
        </div>
      </div>
    );
  }
  const IconK = INBOX_KIND_ICON[item.kind];

  return (
    <div className="card inb-detail">
      <div className="inb-detail__head">
        <div className={`inb-detail__kind inb-detail__kind--${item.tone}`}>
          <IconK s={14}/>
          <span>{item.type}</span>
        </div>
        <div className="inb-detail__head-actions">
          <button className="btn btn--ghost btn--sm" onClick={() => onPushToast?.("Snoozed for 24h")}><I.Clock s={13}/> Snooze</button>
          <button className="btn btn--ghost btn--sm" onClick={() => onPushToast?.("Archived")}><I.X s={13}/> Archive</button>
          <button className="btn btn--accent btn--sm" onClick={() => onPushToast?.("Replied")}><I.Plus s={12}/> Reply</button>
        </div>
      </div>

      <div className="inb-detail__title">{item.title}</div>
      <a className="inb-detail__obj">{item.obj}</a>
      <div className="inb-detail__when mono">{item.when}</div>

      <div className="inb-detail__thread">
        {item.detail.map((m, i) => {
          const u = peopleById(m.who);
          return (
            <div key={i} className="cmt">
              <Avatar p={u}/>
              <div className="cmt__body">
                <div className="cmt__hd">
                  <span className="cmt__name">{u?.name}</span>
                  <span className="cmt__time mono">{m.time}</span>
                </div>
                <div className="cmt__text">
                  {m.mention
                    ? <MentionText text={m.text} />
                    : m.text
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form className="inb-detail__reply" onSubmit={(e) => { e.preventDefault(); onPushToast?.("Reply sent"); }}>
        <Avatar p={{initials: INKLY_DATA.ME.initials, color: "av-cyan"}}/>
        <input className="modal__input" placeholder="Reply… type @ to mention"/>
        <button className="btn btn--primary" type="submit">Send</button>
      </form>
    </div>
  );
}

export function InboxPage({ onPushToast }) {
  const I = Icons;
  const [items, setItems] = useState(INBOX_ITEMS);
  const [filter, setFilter] = useState("all"); // all|unread|mentions|assigned|review
  const [selectedId, setSelectedId] = useState(INBOX_ITEMS[0].id);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (filter === "unread"  && it.read) return false;
      if (filter === "mentions" && it.kind !== "mention") return false;
      if (filter === "assigned" && !["assign","review"].includes(it.kind)) return false;
      if (filter === "subscribed" && ["mention","assign","review"].includes(it.kind)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!it.title.toLowerCase().includes(q) && !it.obj.toLowerCase().includes(q) && !it.snippet.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  const selected = filtered.find(i => i.id === selectedId) || filtered[0];

  function toggleRead(id) {
    setItems(its => its.map(it => it.id === id ? {...it, read: !it.read} : it));
  }
  function archive(id) {
    setItems(its => its.filter(it => it.id !== id));
    onPushToast?.("Archived");
  }
  function markAllRead() {
    setItems(its => its.map(it => ({...it, read: true})));
    onPushToast?.("All caught up");
  }

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <div className="page page--inbox">
      <div className="page__head">
        <div>
          <h1 className="page__title">Inbox</h1>
          <div className="page__sub">
            {unreadCount === 0 ? "All caught up." : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} · ${items.length} total`}
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={markAllRead}><I.Check s={13}/> Mark all read</button>
          <button className="btn" onClick={() => onPushToast?.("Inbox preferences")}><I.Cog s={13}/> Preferences</button>
        </div>
      </div>

      <div className="inb-toolbar">
        <label className="top__search" style={{flex: "0 1 320px", margin: 0}}>
          <I.Search/>
          <input placeholder="Search notifications…" value={query} onChange={(e) => setQuery(e.target.value)}/>
        </label>
        {[
          { id: "all",        label: "All",        count: items.length },
          { id: "unread",     label: "Unread",     count: items.filter(i => !i.read).length },
          { id: "mentions",   label: "Mentions",   count: items.filter(i => i.kind === "mention").length },
          { id: "assigned",   label: "Assigned",   count: items.filter(i => ["assign","review"].includes(i.kind)).length },
          { id: "subscribed", label: "Subscribed", count: items.filter(i => !["mention","assign","review"].includes(i.kind)).length },
        ].map(f => (
          <button key={f.id}
            className={`btn ${filter === f.id ? "btn--primary" : ""}`}
            onClick={() => setFilter(f.id)}>
            {f.label} <span className="mono" style={{opacity: 0.6, marginLeft: 4}}>{f.count}</span>
          </button>
        ))}
      </div>

      <div className="inb-body">
        <div className="card inb-list-card">
          {filtered.length === 0 ? (
            <div className="inb-empty">
              <span className="inb-empty__glyph"><I.Sparkle s={18}/></span>
              <h3>Inbox zero</h3>
              <p>Nothing to read in this view.</p>
            </div>
          ) : (
            <ul className="inb-list">
              {filtered.map(item => (
                <InboxRow key={item.id} item={item}
                  selected={item.id === (selected && selected.id)}
                  onSelect={setSelectedId}
                  onToggleRead={toggleRead}
                  onArchive={archive}/>
              ))}
            </ul>
          )}
        </div>

        <InboxDetail item={selected} onPushToast={onPushToast}/>
      </div>
    </div>
  );
}
