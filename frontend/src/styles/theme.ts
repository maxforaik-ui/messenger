import { ThemeMode } from '../store/useAppStore';
import type { CSSProperties } from 'react';

export const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: { 
    bg: '#f0f2f5', 
    sidebar: '#fff', 
    sidebarAlt: '#f6f8fb', 
    border: '#d9e1ea', 
    text: '#0f172a', 
    muted: '#6b7280', 
    accent: '#3390ec', 
    accentSoft: '#e7f1fd', 
    surface: '#fff', 
    chatBg: '#dbe6ef', 
    incoming: '#fff', 
    outgoing: '#dff5c8', 
    panel: 'rgba(255,255,255,0.96)', 
    shadow: '0 20px 40px rgba(15,23,42,0.12)' 
  },
  dark:  { 
    bg: '#08111b', 
    sidebar: '#101926', 
    sidebarAlt: '#162233', 
    border: '#243246', 
    text: '#e5edf7', 
    muted: '#94a3b8', 
    accent: '#60a5fa', 
    accentSoft: '#172a40', 
    surface: '#101926', 
    chatBg: '#0b1420', 
    incoming: '#132132', 
    outgoing: '#153221', 
    panel: 'rgba(16,25,38,0.98)', 
    shadow: '0 24px 48px rgba(0,0,0,0.35)' 
  }
};

export const createStyles = (p: typeof themeTokens.light) => ({
  // --- LAYOUT & STRUCTURE ---
  layout: { 
    display: 'flex', 
    height: '100vh', 
    width: '100vw', 
    overflow: 'hidden', 
    background: p.bg, 
    fontFamily: 'Inter,Arial,sans-serif' 
  } as CSSProperties,
  
  sidebar: { 
    width: '320px', 
    minWidth: '260px', 
    background: p.sidebar, 
    borderRight: `1px solid ${p.border}`, 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100%', 
    zIndex: 10 
  } as CSSProperties,
  
  main: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100%', 
    background: p.chatBg, 
    position: 'relative' 
  } as CSSProperties,

  messagesArea: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '20px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px',
    backgroundImage: themeTokens.light.bg === p.bg 
      ? 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)' 
      : 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', 
    backgroundSize: '24px 24px' 
  } as CSSProperties,

  // --- AUTH SCREEN ---
  authWrap: { 
    minHeight: '100vh', 
    display: 'grid', 
    placeItems: 'center', 
    background: `linear-gradient(180deg, ${p.chatBg} 0%, ${p.bg} 100%)` 
  } as CSSProperties,
  
  authCard: { 
    width: 420, 
    maxWidth: 'calc(100vw - 32px)', 
    background: p.surface, 
    padding: 28, 
    borderRadius: 20, 
    boxShadow: p.shadow, 
    display: 'grid', 
    gap: 14 
  } as CSSProperties,
  
  authLogo: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    background: p.accent, 
    color: '#fff', 
    display: 'grid', 
    placeItems: 'center', 
    fontSize: 28, 
    fontWeight: 700 
  } as CSSProperties,
  
  switcher: { display: 'flex', gap: 8 } as CSSProperties,
  
  switchBtn: { 
    flex: 1, 
    padding: '10px 12px', 
    borderRadius: 12, 
    border: `1px solid ${p.border}`, 
    background: p.surface, 
    color: p.text, 
    cursor: 'pointer' 
  } as CSSProperties,
  
  switchActive: { 
    flex: 1, 
    padding: '10px 12px', 
    borderRadius: 12, 
    border: 'none', 
    background: p.accentSoft, 
    color: p.accent, 
    cursor: 'pointer', 
    fontWeight: 700 
  } as CSSProperties,

  // --- INPUTS & BUTTONS ---
  input: { 
    width: '100%', 
    padding: '12px 14px', 
    borderRadius: 12, 
    border: `1px solid ${p.border}`, 
    outline: 'none', 
    background: p.surface, 
    color: p.text, 
    boxSizing: 'border-box' 
  } as CSSProperties,
  
  primaryBtn: { 
    padding: '12px 16px', 
    borderRadius: 12, 
    border: 'none', 
    background: p.accent, 
    color: '#fff', 
    cursor: 'pointer', 
    fontWeight: 700 
  } as CSSProperties,
  
  secondaryBtn: { 
    padding: '10px 14px', 
    borderRadius: 12, 
    border: `1px solid ${p.border}`, 
    background: p.surface, 
    color: p.text, 
    cursor: 'pointer', 
    fontWeight: 600 
  } as CSSProperties,
  
  dangerBtn: { 
    padding: '10px 14px', 
    borderRadius: 12, 
    border: 'none', 
    background: '#dc2626', 
    color: '#fff', 
    cursor: 'pointer', 
    fontWeight: 700 
  } as CSSProperties,

  errorBox: { 
    background: '#fff1f2', 
    color: '#be123c', 
    border: '1px solid #fecdd3', 
    borderRadius: 12, 
    padding: 10, 
    fontSize: 14 
  } as CSSProperties,
  
  successBox: { 
    background: '#ecfdf5', 
    color: '#047857', 
    border: '1px solid #a7f3d0', 
    borderRadius: 12, 
    padding: 10, 
    fontSize: 14 
  } as CSSProperties,

  // --- SIDEBAR COMPONENTS ---
  sidebarTopbar: { 
    display: 'flex', 
    gap: 10, 
    alignItems: 'center', 
    padding: 14, 
    borderBottom: `1px solid ${p.border}` 
  } as CSSProperties,
  
  iconBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    border: `1px solid ${p.border}`, 
    background: p.surface, 
    color: p.text, 
    cursor: 'pointer', 
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as CSSProperties,
  
  searchInput: { 
    flex: 1, 
    padding: '12px 14px', 
    borderRadius: 12, 
    border: `1px solid ${p.border}`, 
    background: p.sidebarAlt, 
    color: p.text 
  } as CSSProperties,
  
  meCard: { 
    display: 'flex', 
    gap: 12, 
    alignItems: 'center', 
    padding: 14, 
    borderBottom: `1px solid ${p.border}` 
  } as CSSProperties,
  
  meAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 999, 
    background: p.accent, 
    color: '#fff', 
    display: 'grid', 
    placeItems: 'center', 
    fontWeight: 700,
    flexShrink: 0
  } as CSSProperties,
  
  meName: { fontWeight: 700, color: p.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as CSSProperties,
  meMeta: { fontSize: 13, color: p.muted } as CSSProperties,
  
  logoutBtn: { 
    padding: '8px 12px', 
    borderRadius: 12, 
    border: 'none', 
    background: p.sidebarAlt, 
    color: p.text, 
    cursor: 'pointer', 
    fontWeight: 600 
  } as CSSProperties,

  panelWrap: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '10px' 
  } as CSSProperties,
  
  userList: { display: 'grid', gap: 4 } as CSSProperties,
  
  userRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    width: '100%', 
    border: 'none', 
    background: 'transparent', 
    padding: '10px', 
    borderRadius: 14, 
    cursor: 'pointer',
    textAlign: 'left'
  } as CSSProperties,
  
  avatarSmall: { 
    width: 42, 
    height: 42, 
    borderRadius: 999, 
    background: p.accentSoft, 
    color: p.accent, 
    display: 'grid', 
    placeItems: 'center', 
    fontWeight: 700, 
    flexShrink: 0 
  } as CSSProperties,
  
  userName: { 
    fontWeight: 600, 
    color: p.text, 
    display: 'flex', 
    alignItems: 'center' 
  } as CSSProperties,
  
  userMeta: { fontSize: 12, color: p.muted } as CSSProperties,
  
  messageCta: { color: p.accent, fontWeight: 700, fontSize: 13 } as CSSProperties,
  
  emptyState: { padding: 10, color: p.muted, fontSize: 14, textAlign: 'center', marginTop: 20 } as CSSProperties,
  
  // --- CHAT LIST ---
  chatList: { display: 'grid', gap: 2 } as CSSProperties,
  
  chatRowWrap: { 
    borderRadius: 14,
    transition: 'background 0.1s'
  } as CSSProperties,
  
  chatRow: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    width: '100%', 
    border: 'none', 
    padding: 10, 
    borderRadius: 14, 
    cursor: 'pointer', 
    background: 'transparent', 
    color: p.text,
    textAlign: 'left'
  } as CSSProperties,
  
  chatTopLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } as CSSProperties,
  
  chatName: { 
    fontWeight: 700, 
    color: p.text, 
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis',
    display: 'flex',
    alignItems: 'center'
  } as CSSProperties,
  
  chatTime: { fontSize: 12, color: p.muted } as CSSProperties,
  
  chatSubline: { fontSize: 13, color: p.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as CSSProperties,
  
  unreadBadge: { 
    minWidth: 22, 
    height: 22, 
    borderRadius: 999, 
    background: p.accent, 
    color: '#fff', 
    display: 'grid', 
    placeItems: 'center', 
    fontSize: 12, 
    padding: '0 6px', 
    marginRight: 8 
  } as CSSProperties,

  // --- CHAT HEADER ---
  chatHeader: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    padding: '0 18px', 
    height: 72, 
    background: p.surface, 
    borderBottom: `1px solid ${p.border}`,
    flexShrink: 0
  } as CSSProperties,
  
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 999, 
    background: p.accent, 
    color: '#fff', 
    display: 'grid', 
    placeItems: 'center', 
    fontWeight: 700 
  } as CSSProperties,
  
  chatHeaderTitle: { fontWeight: 700, color: p.text } as CSSProperties,
  chatHeaderMeta: { fontSize: 13, color: p.muted } as CSSProperties,

  // --- MESSAGE BUBBLE ---
  emptyCanvas: { margin: 'auto', background: p.panel, padding: '16px 20px', borderRadius: 16, color: p.muted } as CSSProperties,
  
  bubble: { 
    maxWidth: 560, 
    borderRadius: 18, 
    padding: '10px 12px', 
    boxShadow: themeTokens.light.bg === p.bg ? '0 6px 18px rgba(15,23,42,0.08)' : '0 10px 24px rgba(0,0,0,0.25)',
    wordBreak: 'break-word'
  } as CSSProperties,
  
  bubbleAuthor: { fontSize: 12, fontWeight: 700, color: p.accent, marginBottom: 4 } as CSSProperties,
  bubbleText: { color: p.text, lineHeight: 1.45, whiteSpace: 'pre-wrap' } as CSSProperties,
  bubbleMeta: { marginTop: 6, fontSize: 11, color: p.muted, textAlign: 'right' } as CSSProperties,
  
  attachmentsList: { marginTop: 8, display: 'grid', gap: 6 } as CSSProperties,
  attachmentLink: { color: p.accent, textDecoration: 'none', fontSize: 14 } as CSSProperties,
  
  replyPreview: { padding: '8px 10px', borderRadius: 12, background: p.accentSoft, marginBottom: 8, fontSize: 13, color: p.text } as CSSProperties,
  
  reactionsRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 } as CSSProperties,
  reactionChip: { background: p.sidebarAlt, borderRadius: 999, padding: '4px 8px', fontSize: 12, color: p.text } as CSSProperties,

  // --- COMPOSER (INPUT AREA) ---
  composerWrap: { 
    background: p.surface, 
    borderTop: `1px solid ${p.border}`,
    padding: '10px 14px',
    flexShrink: 0
  } as CSSProperties,
  
  composer: { 
    display: 'flex', 
    gap: 10, 
    alignItems: 'flex-end' 
  } as CSSProperties,
  
  composerTextarea: { 
    flex: 1, 
    padding: '12px 16px', 
    borderRadius: 18, 
    border: `1px solid ${p.border}`, 
    outline: 'none', 
    background: p.sidebarAlt, 
    color: p.text, 
    resize: 'none', 
    minHeight: 44, 
    maxHeight: 120, 
    boxSizing: 'border-box', 
    fontFamily: 'inherit', 
    lineHeight: 1.45 
  } as CSSProperties,
  
  sendBtn: { 
    padding: '12px 18px', 
    borderRadius: 14, 
    border: 'none', 
    background: p.accent, 
    color: '#fff', 
    cursor: 'pointer', 
    fontWeight: 700 
  } as CSSProperties,

  // --- SETTINGS & MODALS ---
  toast: { 
    position: 'fixed', 
    top: 16, 
    right: 16, 
    zIndex: 30, 
    background: '#111827', 
    color: '#fff', 
    padding: '10px 14px', 
    borderRadius: 12, 
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)' 
  } as CSSProperties,
  
  settingsCard: { 
    margin: '0 14px 14px', 
    padding: 14, 
    borderRadius: 16, 
    background: p.sidebarAlt, 
    border: `1px solid ${p.border}`, 
    display: 'grid', 
    gap: 12 
  } as CSSProperties,
  
  settingsTitle: { fontWeight: 700, color: p.text } as CSSProperties,
  settingsSection: { display: 'grid', gap: 8 } as CSSProperties,
  settingsSectionDanger: { display: 'grid', gap: 8, paddingTop: 8, borderTop: `1px dashed ${p.border}` } as CSSProperties,
  
  segmentedRow: { display: 'flex', gap: 8 } as CSSProperties,
  segmentedBtn: { flex: 1, padding: '10px 12px', borderRadius: 12, border: `1px solid ${p.border}`, background: p.surface, color: p.text, cursor: 'pointer' } as CSSProperties,
  segmentedActive: { flex: 1, padding: '10px 12px', borderRadius: 12, border: 'none', background: p.accentSoft, color: p.accent, cursor: 'pointer', fontWeight: 700 } as CSSProperties,

  // --- STATUS INDICATORS ---
  statusDotOnline: { 
    display: 'inline-block', 
    width: 8, 
    height: 8, 
    borderRadius: '50%', 
    background: '#22c55e', 
    marginRight: 6, 
    flexShrink: 0 
  } as CSSProperties,
  
  statusDotOffline: { 
    display: 'inline-block', 
    width: 8, 
    height: 8, 
    borderRadius: '50%', 
    background: '#9ca3af', 
    marginRight: 6, 
    flexShrink: 0 
  } as CSSProperties
});