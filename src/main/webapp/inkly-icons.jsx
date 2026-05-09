/* global React */
const { useState } = React;

const I = ({ d, s = 16, fill = "none", stroke = "currentColor", w = 1.6, children }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);

const Icons = {
  Logo: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.5c-3.4 5.2-6.2 9-6.2 12.4a6.2 6.2 0 1 0 12.4 0c0-3.4-2.8-7.2-6.2-12.4Z" />
    </svg>
  ),
  Search: (p) => <I s={p.s||16}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></I>,
  Plus:   (p) => <I s={p.s||16}><path d="M12 5v14M5 12h14" /></I>,
  Bell:   (p) => <I s={p.s||16}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7Z"/><path d="M10 19a2 2 0 0 0 4 0" /></I>,
  Sun:    (p) => <I s={p.s||16}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></I>,
  Moon:   (p) => <I s={p.s||16}><path d="M21 13.5A8.5 8.5 0 0 1 10.5 3a8 8 0 1 0 10.5 10.5Z"/></I>,
  Chevron:(p) => <I s={p.s||14}><path d="m9 6 6 6-6 6"/></I>,
  ChevDn: (p) => <I s={p.s||14}><path d="m6 9 6 6 6-6"/></I>,
  Home:   (p) => <I s={p.s||15}><path d="M3 11 12 4l9 7"/><path d="M5 10v9h14v-9"/></I>,
  Check:  (p) => <I s={p.s||13} w={2.4}><path d="m4 12 5 5L20 6"/></I>,
  Layers: (p) => <I s={p.s||15}><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/></I>,
  Users:  (p) => <I s={p.s||15}><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 11a3 3 0 1 0 0-6"/><path d="M21 20a5 5 0 0 0-5-5"/></I>,
  Cal:    (p) => <I s={p.s||15}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></I>,
  Chart:  (p) => <I s={p.s||15}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></I>,
  Cog:    (p) => <I s={p.s||15}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.8a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.4a7 7 0 0 0-2 1.2l-2.4-.8-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.8a7 7 0 0 0 2 1.2L10 21h4l.5-2.4a7 7 0 0 0 2-1.2l2.4.8 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/></I>,
  Inbox:  (p) => <I s={p.s||15}><path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6l2-8Z"/></I>,
  Star:   (p) => <I s={p.s||13}><path d="m12 3 2.6 6 6.4.6-4.8 4.4 1.4 6.4L12 17.5 6.4 20.4 7.8 14 3 9.6l6.4-.6L12 3Z"/></I>,
  X:      (p) => <I s={p.s||14}><path d="M6 6l12 12M18 6 6 18"/></I>,
  Eye:    (p) => <I s={p.s||16}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></I>,
  EyeOff: (p) => <I s={p.s||16}><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.5 5.4A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1 0 1.9-.1 2.7-.4"/></I>,
  Lock:   (p) => <I s={p.s||15}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></I>,
  Mail:   (p) => <I s={p.s||15}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></I>,
  Out:    (p) => <I s={p.s||14}><path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H10"/></I>,
  Filter: (p) => <I s={p.s||14}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/></I>,
  Sort:   (p) => <I s={p.s||14}><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 4v14M17 4l-3 3M17 4l3 3"/></I>,
  More:   (p) => <I s={p.s||14}><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></I>,
  Msg:    (p) => <I s={p.s||13}><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4H6a2 2 0 0 1-2-2V6Z"/></I>,
  Clip:   (p) => <I s={p.s||13}><path d="M21 11 12 20a5 5 0 0 1-7-7l9-9a3.5 3.5 0 1 1 5 5l-9 9a2 2 0 1 1-3-3l8.5-8.5"/></I>,
  Flag:   (p) => <I s={p.s||13}><path d="M5 21V4M5 4h13l-2 4 2 4H5"/></I>,
  Clock:  (p) => <I s={p.s||13}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  Sparkle:(p) => <I s={p.s||14}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></I>,
  ArrowU: (p) => <I s={p.s||12} w={2}><path d="M12 19V6M5 12l7-7 7 7"/></I>,
  ArrowD: (p) => <I s={p.s||12} w={2}><path d="M12 5v13M5 12l7 7 7-7"/></I>,
  Globe:  (p) => <I s={p.s||14}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></I>,
  G: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22 12.2c0-.8-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5Z"/>
      <path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.7-4.2H2.8v2.6A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.8V7.3H2.8a10 10 0 0 0 0 9.4l3.5-2.7Z"/>
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 4 1.5l3-3A10 10 0 0 0 2.8 7.3l3.5 2.7A6 6 0 0 1 12 6Z"/>
    </svg>
  ),
  Microsoft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
    </svg>
  ),
};

window.Icons = Icons;
window.I = I;
