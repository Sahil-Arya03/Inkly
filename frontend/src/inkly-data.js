/* Inkly mock data — used by pages not yet wired to the API */

const PEOPLE = [
  { id: "u1", name: "Maren Olsson",   role: "Product Lead",      initials: "MO", color: "av-rose"   },
  { id: "u2", name: "Devon Park",     role: "Sr. Engineer",      initials: "DP", color: "av-cyan"   },
  { id: "u3", name: "Imani Bell",     role: "Design Eng",        initials: "IB", color: "av-violet" },
  { id: "u4", name: "Theo Sandoval",  role: "Backend",           initials: "TS", color: "av-amber"  },
  { id: "u5", name: "Noor Zaidi",     role: "PM",                initials: "NZ", color: "av-green"  },
  { id: "u6", name: "Jules Renard",   role: "QA Lead",           initials: "JR", color: "av-ink"    },
];

const ME = { name: "Avery Walsh", initials: "AW", role: "Product Designer", email: "avery@inkly.team" };

const TAGS = {
  design:    { label: "Design",     cls: "chip--violet" },
  api:       { label: "API",        cls: "chip--cyan"   },
  bug:       { label: "Bug",        cls: "chip--rose"   },
  research:  { label: "Research",   cls: "chip--amber"  },
  growth:    { label: "Growth",     cls: "chip--green"  },
  infra:     { label: "Infra",      cls: "chip--ghost"  },
};

const PRIORITY = {
  urgent: { label: "Urgent",  cls: "chip--rose"  },
  high:   { label: "High",    cls: "chip--amber" },
  med:    { label: "Medium",  cls: "chip--ghost" },
  low:    { label: "Low",     cls: "chip--ghost" },
};

const TASKS = [
  { id:"INK-241", col:"backlog",  title:"Migrate billing webhooks to v3 contract",
    desc:"Replace deprecated webhook endpoints. Coordinate with finance and ensure no double-charges during cutover.",
    pri:"med",   tags:["api","infra"], assignees:["u4","u2"], due:"May 24", progress:0.0,  comments:3, attachments:1 },
  { id:"INK-238", col:"backlog",  title:"Investigate cold-start latency on EU region",
    desc:"P95 has crept past 800ms after Friday's deploy. Correlate with new image-processing job.",
    pri:"high",  tags:["infra","bug"], assignees:["u2"], due:"May 22", progress:0.1, comments:5, attachments:0 },
  { id:"INK-235", col:"backlog",  title:"Audit accessibility of empty-state illustrations",
    desc:"WCAG 2.2 AA. Check contrast and alt text in all empty states across the app.",
    pri:"low",   tags:["design"], assignees:["u3"], due:"Jun 04", progress:0.0, comments:1, attachments:2 },

  { id:"INK-219", col:"todo",     title:"Spec: shared smart filters for Boards",
    desc:"Saved filter sets sharable per workspace. Owner can revoke. Read-only by default.",
    pri:"med",   tags:["design","research"], assignees:["u1","u5"], due:"May 20", progress:0.15, comments:4, attachments:1 },
  { id:"INK-217", col:"todo",     title:"Onboarding empty state for solo workspaces",
    desc:"First-run flow when user creates a workspace without inviting teammates.",
    pri:"high",  tags:["growth","design"], assignees:["u3"], due:"May 19", progress:0.2, comments:8, attachments:3 },
  { id:"INK-214", col:"todo",     title:"Sentry quota alerting → PagerDuty",
    desc:"Currently silent past 80% quota. Page on-call before we hit 100% or Sentry drops events.",
    pri:"urgent",tags:["infra"], assignees:["u4"], due:"May 17", progress:0.0, comments:2, attachments:0, live:true },

  { id:"INK-198", col:"progress", title:"Drag-to-reorder for nested pages",
    desc:"Reorder + reparent in one gesture. Should respect permission scope and emit a single audit event.",
    pri:"high",  tags:["design","api"], assignees:["u3","u2"], due:"May 19", progress:0.6, comments:12, attachments:4, live:true },
  { id:"INK-201", col:"progress", title:"Workspace SSO setup wizard v2",
    desc:"OIDC + SAML in 3 steps. Detect IdP from email domain when possible.",
    pri:"high",  tags:["growth"], assignees:["u5","u4"], due:"May 21", progress:0.45, comments:6, attachments:1 },
  { id:"INK-205", col:"progress", title:"Comment notifications batching",
    desc:"Roll up >3 comments in 10 minutes into a single email digest.",
    pri:"med",   tags:["api"], assignees:["u2"], due:"May 23", progress:0.3, comments:2, attachments:0 },

  { id:"INK-188", col:"review",   title:"Inline citations in AI-summary blocks",
    desc:"Sources are rendered as superscript links anchored to the original message.",
    pri:"med",   tags:["design"], assignees:["u3","u1"], due:"May 16", progress:0.9, comments:7, attachments:2 },
  { id:"INK-184", col:"review",   title:"Audit logs export — CSV + signed URL",
    desc:"Admin-only download with HMAC-signed link, valid for 1 hour.",
    pri:"low",   tags:["api","infra"], assignees:["u4","u6"], due:"May 18", progress:0.85, comments:3, attachments:0 },

  { id:"INK-176", col:"done",     title:"Search: rank pinned pages above recents",
    desc:"Within a workspace, pinned content always sorts first.",
    pri:"med",   tags:["growth"], assignees:["u2"], due:"May 12", progress:1.0, comments:4, attachments:1 },
  { id:"INK-171", col:"done",     title:"Mobile: gesture to archive a card",
    desc:"Swipe left to archive, undo within 5s.",
    pri:"low",   tags:["design"], assignees:["u3"], due:"May 10", progress:1.0, comments:9, attachments:2 },
  { id:"INK-168", col:"done",     title:"Fix: avatar gradient drift on Safari 17",
    desc:"oklch in linear-gradient was rendering as black. Add hex fallback.",
    pri:"urgent",tags:["bug","design"], assignees:["u3"], due:"May 09", progress:1.0, comments:2, attachments:0 },
];

const COLS = [
  { id: "backlog",  name: "Backlog" },
  { id: "todo",     name: "To Do" },
  { id: "progress", name: "In Progress" },
  { id: "review",   name: "Review" },
  { id: "done",     name: "Completed" },
];

const TODAY_TASKS = [
  { id:"t1", title:"Review Imani's pages-reorder PR",         due:"10:30", done:true  },
  { id:"t2", title:"Sync with Noor on SSO wizard scope",       due:"13:00", done:false },
  { id:"t3", title:"Draft April retro doc",                    due:"15:00", done:false },
  { id:"t4", title:"Approve onboarding copy variants",         due:"16:30", done:false },
  { id:"t5", title:"Send Friday demo recap to #design-weekly", due:"17:00", done:false },
];

const ACTIVITY = [
  { who:"u3", what:"merged", obj:"INK-198 · Drag-to-reorder for nested pages", time:"3m ago", quote:null },
  { who:"u5", what:"commented on", obj:"INK-217 · Onboarding empty state",
    time:"24m ago", quote:"Can we A/B the illustration vs. the calendar prompt? My gut says calendar wins for solo." },
  { who:"u2", what:"opened a PR for", obj:"INK-205 · Comment batching", time:"1h ago", quote:null },
  { who:"u1", what:"mentioned you in", obj:"INK-219 · Shared smart filters",
    time:"2h ago", quote:"@avery — would love a quick review on the empty filter state before we cut a build." },
  { who:"u4", what:"resolved", obj:"INK-168 · Avatar gradient drift on Safari", time:"yesterday", quote:null },
];

const EVENTS_TODAY = [
  { time:"09:30", title:"Design crit · Empty states",     loc:"Studio · Floor 3",      tone:"violet" },
  { time:"11:00", title:"Standup",                          loc:"Async · Slack thread", tone:""       },
  { time:"13:00", title:"1:1 with Noor",                    loc:"Zoom",                 tone:"green"  },
  { time:"15:30", title:"Sprint review · Sprint 24",        loc:"Atrium",               tone:"amber"  },
];

const DEADLINES = [
  { title:"Sprint 24 closeout",        sub:"in 2 days",    pct: 0.78 },
  { title:"Q2 OKR draft v2",           sub:"in 5 days",    pct: 0.42, warn: true },
  { title:"SSO launch readiness",      sub:"in 9 days",    pct: 0.30 },
  { title:"Annual access review",      sub:"in 11 days",   pct: 0.10 },
];

const PROD_DAYS = [
  { d:"MON", v:0.62, p:0.55 },
  { d:"TUE", v:0.78, p:0.60 },
  { d:"WED", v:0.45, p:0.62 },
  { d:"THU", v:0.88, p:0.72 },
  { d:"FRI", v:0.71, p:0.70 },
  { d:"SAT", v:0.18, p:0.20 },
  { d:"SUN", v:0.10, p:0.12 },
];

export const INKLY_DATA = { PEOPLE, ME, TAGS, PRIORITY, TASKS, COLS, TODAY_TASKS, ACTIVITY, EVENTS_TODAY, DEADLINES, PROD_DAYS };
export const peopleById = (id) => PEOPLE.find(p => p.id === id);
