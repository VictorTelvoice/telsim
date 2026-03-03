import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Slot, SMSLog } from '../../types';
import {
  LayoutDashboard, MessageSquare, Smartphone, Settings,
  LogOut, Moon, Sun, Bell, Copy, Check, RefreshCw,
  Zap, Shield, ChevronRight, Search, Plus,
  ArrowUpRight, ArrowDownRight, Circle, Wifi, Clock,
  CheckCircle2, Send, Link2, CreditCard, Pencil, X,
  Bot, Key, User, Save, Loader2, Info, LayoutGrid, List, Trash2,
  Globe, Lock, Eye, EyeOff, ExternalLink, ShieldCheck
} from 'lucide-react';

// ─── Brand Logos (SVG inline) ──────────────────────────────────────────────────

const BrandLogo: React.FC<{ brand: string; size?: number }> = ({ brand, size = 18 }) => {
  const b = brand.toLowerCase();
  if (b === 'whatsapp') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path fill="#25D366" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.393A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
      <path fill="white" d="M16.75 14.45c-.25-.12-1.47-.72-1.7-.8-.23-.08-.4-.12-.57.12-.17.24-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.1-.5.12-.12.25-.31.38-.46.12-.16.16-.27.25-.45.08-.17.04-.33-.02-.46-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.24-.87.85-.87 2.07 0 1.22.9 2.4 1.02 2.57.13.17 1.76 2.69 4.26 3.77.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z"/>
    </svg>
  );
  if (b === 'google') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
  if (b === 'facebook') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#1877F2"/>
      <path fill="white" d="M16.5 7.5h-2c-.55 0-1 .45-1 1v1.5h3l-.5 3h-2.5V21h-3v-8H9v-3h1.5V8.5C10.5 6.57 12.07 5 14 5h2.5v2.5z"/>
    </svg>
  );
  if (b === 'instagram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect width="24" height="24" rx="5" fill="url(#igGrad)"/>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
    </svg>
  );
  if (b === 'telegram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="12" fill="#229ED9"/>
      <path fill="white" d="M5.5 11.5l12-5-4 13-3-4-5 3 1.5-7zM9.5 13l.8 3 1.2-2.8L9.5 13z"/>
    </svg>
  );
  if (b === 'amazon') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#FF9900"/>
      <text x="5" y="16" fontSize="12" fontWeight="bold" fill="white" fontFamily="Arial">a</text>
      <path fill="white" d="M4 17c3 2 11 2 16-1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
  if (b === 'ebay') return (
    <svg viewBox="0 0 40 16" width={size * 2} height={size}>
      <text x="0" y="13" fontSize="15" fontWeight="900" fontFamily="Arial">
        <tspan fill="#E53238">e</tspan><tspan fill="#0064D2">b</tspan><tspan fill="#F5AF02">a</tspan><tspan fill="#86B817">y</tspan>
      </text>
    </svg>
  );
  if (b === 'netflix') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" fill="#141414"/>
      <text x="4" y="19" fontSize="18" fontWeight="900" fill="#E50914" fontFamily="Arial">N</text>
    </svg>
  );
  if (b === 'spotify') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="12" fill="#1DB954"/>
      <path fill="white" d="M16.7 10.7c-2.6-1.5-6.8-1.7-9.3-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 2.8-.9 7.5-.7 10.5 1.1.4.2.5.7.3 1.1-.2.3-.7.4-1.1.1zM16.4 13c-.2.3-.6.4-1 .2-2.2-1.3-5.5-1.7-8.1-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 2.9-.9 6.6-.5 9.1 1 .4.2.5.7.4 1.1v-.2zm-1.1 2.2c-.2.3-.5.3-.8.2-1.9-1.1-4.3-1.4-7.1-.8-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3-.7 5.7-.4 7.8.9.3.2.4.5.4.8z"/>
    </svg>
  );
  if (b === 'discord') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#5865F2"/>
      <path fill="white" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/>
    </svg>
  );
  if (b === 'twitter' || b === 'twitter/x' || b === 'x (twitter)') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#000"/>
      <path fill="white" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L2.127 2.25H8.28l4.259 5.631 5.705-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
    </svg>
  );
  if (b === 'microsoft') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
    </svg>
  );
  if (b === 'linkedin') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#0077B5"/>
      <path fill="white" d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z"/>
    </svg>
  );
  if (b === 'paypal') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#003087"/>
      <path fill="#009CDE" d="M19.15 8.46A4.72 4.72 0 0 0 14.93 6H9.05L7 18h3.77l.57-3.49a3.45 3.45 0 0 1 3.41-2.92 2.35 2.35 0 0 0 2.4-2.71 3.7 3.7 0 0 0 2 -.42z"/>
      <path fill="white" d="M9.82 10H14c1.5 0 2.5.75 2.5 2.17 0 2.1-1.5 3.33-3.5 3.33H11.5L11 18H8l1.82-8z"/>
    </svg>
  );
  if (b === 'tiktok') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#010101"/>
      <path fill="#FE2C55" d="M19 7.65A5.17 5.17 0 0 1 14.83 3v.05h-2.98v12.74a2.36 2.36 0 1 1-1.6-2.23v-3.1a5.34 5.34 0 1 0 4.58 5.27V9.97a8.2 8.2 0 0 0 4.17 1.1V8.1A5.17 5.17 0 0 1 19 7.65z"/>
      <path fill="#25F4EE" d="M18 6.65A5.17 5.17 0 0 1 13.83 2h-2.98v12.74a2.36 2.36 0 1 1-1.6-2.23v-3.1A5.34 5.34 0 1 0 13.83 14.7V8.97a8.2 8.2 0 0 0 4.17 1.1V7.1A5.17 5.17 0 0 1 18 6.65z"/>
    </svg>
  );
  return null;
};

// ─── Service Map ───────────────────────────────────────────────────────────────

const SERVICE_MAP: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  whatsapp:     { label: 'WhatsApp',      color: '#25D366', bg: '#dcfce7', darkBg: '#14532d' },
  google:       { label: 'Google',        color: '#4285F4', bg: '#dbeafe', darkBg: '#1e3a8a' },
  facebook:     { label: 'Facebook',      color: '#1877F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  instagram:    { label: 'Instagram',     color: '#E1306C', bg: '#fce7f3', darkBg: '#831843' },
  telegram:     { label: 'Telegram',      color: '#229ED9', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  amazon:       { label: 'Amazon',        color: '#FF9900', bg: '#fef3c7', darkBg: '#78350f' },
  microsoft:    { label: 'Microsoft',     color: '#00A4EF', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  twitter:      { label: 'Twitter/X',     color: '#1DA1F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  uber:         { label: 'Uber',          color: '#06b6d4', bg: '#cffafe', darkBg: '#164e63' },
  tiktok:       { label: 'TikTok',        color: '#ff0050', bg: '#fce7f3', darkBg: '#831843' },
  ebay:         { label: 'eBay',          color: '#E53238', bg: '#fee2e2', darkBg: '#7f1d1d' },
  mercadolibre: { label: 'Mercado Libre', color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  mercado:      { label: 'Mercado Libre', color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  netflix:      { label: 'Netflix',       color: '#E50914', bg: '#fee2e2', darkBg: '#7f1d1d' },
  spotify:      { label: 'Spotify',       color: '#1DB954', bg: '#dcfce7', darkBg: '#14532d' },
  linkedin:     { label: 'LinkedIn',      color: '#0077B5', bg: '#dbeafe', darkBg: '#1e3a8a' },
  apple:        { label: 'Apple',         color: '#555555', bg: '#f1f5f9', darkBg: '#1e293b' },
  paypal:       { label: 'PayPal',        color: '#003087', bg: '#dbeafe', darkBg: '#1e3a8a' },
  discord:      { label: 'Discord',       color: '#5865F2', bg: '#ede9fe', darkBg: '#3730a3' },
  snapchat:     { label: 'Snapchat',      color: '#FFFC00', bg: '#fefce8', darkBg: '#713f12' },
  twitch:       { label: 'Twitch',        color: '#9146FF', bg: '#ede9fe', darkBg: '#3730a3' },
  binance:      { label: 'Binance',       color: '#F0B90B', bg: '#fefce8', darkBg: '#713f12' },
  coinbase:     { label: 'Coinbase',      color: '#0052FF', bg: '#dbeafe', darkBg: '#1e3a8a' },
  airbnb:       { label: 'Airbnb',        color: '#FF5A5F', bg: '#fee2e2', darkBg: '#7f1d1d' },
  shopify:      { label: 'Shopify',       color: '#96BF48', bg: '#dcfce7', darkBg: '#14532d' },
};

function detectService(sender: string, content: string) {
  const text = (sender + ' ' + content).toLowerCase();
  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    if (text.includes(key)) return { key, ...val };
  }
  return { key: 'other', label: 'SMS', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b' };
}

function extractCode(content: string): string | null {
  const m = content.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const REGION_FLAGS: Record<string, string> = {
  CL: '🇨🇱', AR: '🇦🇷', MX: '🇲🇽', US: '🇺🇸', BR: '🇧🇷',
  CO: '🇨🇴', PE: '🇵🇪', ES: '🇪🇸', DE: '🇩🇪', GB: '🇬🇧',
};

const PLAN_COLORS: Record<string, { border: string; badge: string; text: string; label: string }> = {
  starter: { border: '#3b82f6', badge: '#dbeafe', text: '#1d4ed8', label: 'Starter' },
  pro:     { border: '#8b5cf6', badge: '#ede9fe', text: '#6d28d9', label: 'Pro' },
  power:   { border: '#f59e0b', badge: '#fef3c7', text: '#b45309', label: 'Power' },
};

// ─── Bar Chart ─────────────────────────────────────────────────────────────────

const BarChart: React.FC<{ data: number[]; labels: string[]; isDark: boolean }> = ({ data, labels, isDark }) => {
  const max = Math.max(...data, 1);
  const barW = 36, gap = 10, chartH = 100;
  const totalW = data.length * (barW + gap) - gap;
  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 24}`} className="w-full" style={{ height: 124 }}>
      {data.map((v, i) => {
        const h = Math.max(4, (v / max) * chartH);
        const x = i * (barW + gap), y = chartH - h;
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={6}
              fill={isToday ? '#1152d4' : (isDark ? '#334155' : '#cbd5e1')} opacity={isToday ? 1 : 0.7} />
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={9}
              fill={isDark ? '#64748b' : '#94a3b8'} fontFamily="inherit">{labels[i]}</text>
            {isToday && v > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={9}
                fontWeight="bold" fill="#1152d4" fontFamily="inherit">{v}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Nav Item ──────────────────────────────────────────────────────────────────

const NavItem: React.FC<{
  icon: React.ReactNode; label: string; active?: boolean;
  badge?: number; onClick: () => void;
}> = ({ icon, label, active, badge, onClick }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active ? 'bg-primary text-white shadow-sm'
             : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
    }`}>
    <span className={`flex-shrink-0 ${active ? 'text-white' : ''}`}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge != null && badge > 0 && (
      <span className={`min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 ${
        active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
      }`}>{badge > 99 ? '99+' : badge}</span>
    )}
  </button>
);

// ─── KPI Card ──────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: number; color: string;
}> = ({ icon, label, value, sub, trend, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm border border-slate-100 dark:border-transparent">
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[11px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-[26px] font-black text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────────

type TabId = 'overview' | 'messages' | 'numbers' | 'settings';
type SettingsSection = 'profile' | 'telegram' | 'api' | 'notifications' | 'billing' | 'language' | 'security';

const WebDashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab]           = useState<TabId>('overview');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile');
  const [slots, setSlots]                   = useState<Slot[]>([]);
  const [messages, setMessages]             = useState<SMSLog[]>([]);
  const [loading, setLoading]               = useState(true);
  const [copiedId, setCopiedId]             = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedSlot, setSelectedSlot]     = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId]   = useState<string | null>(null);
  const [labelDraft, setLabelDraft]         = useState('');
  const [savingLabel, setSavingLabel]       = useState(false);
  const [simsView, setSimsView]             = useState<'card' | 'list'>('card');
  const [togglingSlot, setTogglingSlot]     = useState<string | null>(null);

  // ─── Webhook config state ─────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl]       = useState(() => localStorage.getItem('telsim_webhook_url') || '');
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem('telsim_webhook_secret') || '');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('telsim_webhook_events') || '["sms_received"]'); } catch { return ['sms_received']; }
  });
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved]   = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);

  // ─── Language state ───────────────────────────────────────────────────────
  const [appLanguage, setAppLanguage] = useState<'es' | 'en'>(() =>
    (localStorage.getItem('telsim_language') as 'es' | 'en') || 'es'
  );
  const [langSaved, setLangSaved] = useState(false);

  // ─── Security / Password state ────────────────────────────────────────────
  const [secNewPw, setSecNewPw]           = useState('');
  const [secConfirmPw, setSecConfirmPw]   = useState('');
  const [secSaving, setSecSaving]         = useState(false);
  const [secError, setSecError]           = useState('');
  const [secSuccess, setSecSuccess]       = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ─── Telegram Config state ────────────────────────────────────────────────
  const [tgToken, setTgToken]   = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgSaving, setTgSaving]   = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgSaved, setTgSaved]     = useState(false);

  const userName     = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const savedPlanId: string = (() => {
    const raw = localStorage.getItem('selected_plan') || 'starter';
    try { const p = JSON.parse(raw); return (p.planId || p.id || p.plan || 'starter').toLowerCase(); }
    catch { return raw.toLowerCase(); }
  })();
  const planName    = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);
  const PLAN_CREDITS: Record<string, number> = { starter: 150, pro: 400, power: 1400 };
  const planCredits = PLAN_CREDITS[savedPlanId] ?? 150;

  // ─── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [slotsRes, msgsRes] = await Promise.all([
        supabase.from('slots').select('*').eq('assigned_to', user.id),
        supabase.from('sms_logs').select('*').eq('user_id', user.id)
          .order('received_at', { ascending: false }).limit(60),
      ]);
      if (slotsRes.data)  setSlots(slotsRes.data);
      if (msgsRes.data)   setMessages(msgsRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Telegram: load config when section opens ─────────────────────────────
  useEffect(() => {
    if (settingsSection !== 'telegram' || !user) return;
    setTgLoading(true);
    supabase.from('users').select('telegram_token, telegram_chat_id').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) { setTgToken(data.telegram_token || ''); setTgChatId(data.telegram_chat_id || ''); }
      })
      .finally(() => setTgLoading(false));
  }, [settingsSection, user]);

  const handleTgTest = async () => {
    if (!tgToken || !tgChatId) { alert('Completa el token y el Chat ID primero'); return; }
    setTgTesting(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: '✅ Telsim: conexión exitosa con tu bot de Telegram.' }),
      });
      if (!res.ok) throw new Error();
      alert('¡Mensaje de prueba enviado con éxito!');
    } catch { alert('Error al conectar con Telegram. Revisa el token y el Chat ID.'); }
    finally { setTgTesting(false); }
  };

  const handleTgSave = async () => {
    if (!user) return;
    setTgSaving(true);
    try {
      const { error } = await supabase.from('users').update({ telegram_token: tgToken, telegram_chat_id: tgChatId }).eq('id', user.id);
      if (error) throw error;
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 3000);
    } catch { alert('Error al guardar la configuración.'); }
    finally { setTgSaving(false); }
  };

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('web-sms-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_logs', filter: `user_id=eq.${user.id}` },
        (p) => setMessages(prev => [p.new as SMSLog, ...prev.slice(0, 59)]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await (supabase.auth as any).signOut();
    navigate('/');
  };

  // ─── Label save ───────────────────────────────────────────────────────────────

  const handleSaveLabel = async (slotId: string) => {
    setSavingLabel(true);
    await supabase.from('slots').update({ label: labelDraft.trim() || null }).eq('slot_id', slotId);
    setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, label: labelDraft.trim() || undefined } : s));
    setEditingSlotId(null);
    setSavingLabel(false);
  };

  // ─── Webhook handlers ────────────────────────────────────────────────────────

  const handleWebhookSave = () => {
    setWebhookSaving(true);
    localStorage.setItem('telsim_webhook_url',    webhookUrl);
    localStorage.setItem('telsim_webhook_secret', webhookSecret);
    localStorage.setItem('telsim_webhook_events', JSON.stringify(webhookEvents));
    setTimeout(() => {
      setWebhookSaving(false);
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    }, 600);
  };

  const handleWebhookTest = async () => {
    if (!webhookUrl) { alert('Ingresa una URL de webhook primero.'); return; }
    setWebhookTesting(true);
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telsim-Test': '1' },
        body: JSON.stringify({ event: 'test', message: 'Webhook de prueba desde Telsim', timestamp: new Date().toISOString() }),
      });
      alert('✅ Solicitud de prueba enviada. Verifica que tu servidor la recibió.');
    } catch { alert('Error al conectar con la URL del webhook. Verifica que sea accesible desde internet.'); }
    finally { setWebhookTesting(false); }
  };

  const toggleWebhookEvent = (ev: string) =>
    setWebhookEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  // ─── Language handler ─────────────────────────────────────────────────────────

  const handleLanguageSave = (lang: 'es' | 'en') => {
    setAppLanguage(lang);
    localStorage.setItem('telsim_language', lang);
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 3000);
  };

  // ─── Password change handler ──────────────────────────────────────────────────

  const handlePasswordChange = async () => {
    setSecError('');
    if (secNewPw.length < 6) { setSecError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (secNewPw !== secConfirmPw) { setSecError('Las contraseñas no coinciden.'); return; }
    setSecSaving(true);
    try {
      const { error } = await (supabase.auth as any).updateUser({ password: secNewPw });
      if (error) throw error;
      setSecSuccess(true);
      setSecNewPw(''); setSecConfirmPw('');
      setTimeout(() => setSecSuccess(false), 4000);
    } catch (e: any) { setSecError(e.message || 'Error al actualizar la contraseña.'); }
    finally { setSecSaving(false); }
  };

  // ─── Cancel subscription ─────────────────────────────────────────────────────

  const handleCancelSubscription = (slotId: string) => {
    const slot = slots.find(s => s.slot_id === slotId);
    const confirmed = window.confirm(
      `¿Cancelar la suscripción para ${slot?.phone_number ?? 'esta SIM'}?\n\nSerás redirigido a Facturación para gestionar la cancelación.`
    );
    if (confirmed) {
      setActiveTab('settings');
      setSettingsSection('billing');
    }
  };

  // ─── Toggle Telegram forwarding per SIM ──────────────────────────────────────

  const handleToggleForwarding = async (slotId: string, newVal: boolean) => {
    setTogglingSlot(slotId);
    try {
      await supabase.from('slots').update({ forwarding_active: newVal }).eq('slot_id', slotId);
      setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, forwarding_active: newVal } : s));
    } catch (e) { console.error(e); }
    finally { setTogglingSlot(null); }
  };

  // ─── Plan style helper (SIM card visuals) ────────────────────────────────────

  const getWebPlanStyle = (plan: string) => {
    switch (plan) {
      case 'power': return {
        cardBg:     'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C]',
        chip:       'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
        label:      'Power',
        phoneColor: 'text-white',
        labelColor: 'text-white/80',
      };
      case 'pro': return {
        cardBg:     'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00C8FF]',
        chip:       'bg-gradient-to-br from-slate-200 via-slate-100 to-white',
        label:      'Pro',
        phoneColor: 'text-white',
        labelColor: 'text-white/80',
      };
      default: return {
        cardBg:     'bg-white border border-slate-200',
        chip:       'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
        label:      'Starter',
        phoneColor: 'text-slate-900',
        labelColor: 'text-slate-400',
      };
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const today         = new Date().toDateString();
  const todayMessages = messages.filter(m => new Date(m.received_at).toDateString() === today);
  const activeSlots   = slots.filter(s => s.status !== 'expired');

  const activityData   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return messages.filter(m => new Date(m.received_at).toDateString() === d.toDateString()).length;
  });
  const activityLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return ['Do','Lu','Ma','Mi','Ju','Vi','Sá'][d.getDay()];
  });

  const filteredMessages = messages.filter(m => {
    const matchSlot   = !selectedSlot || m.slot_id === selectedSlot;
    const q           = searchQuery.toLowerCase();
    const matchSearch = !q || m.content.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q);
    return matchSlot && matchSearch;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  // Header title map
  const TAB_TITLES: Record<TabId, string> = {
    overview: 'Dashboard', messages: 'Mensajes SMS',
    numbers: 'Mis SIMs', settings: 'Ajustes'
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-screen font-display overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-[#F0F4F8] text-slate-900'}`}>

      {/* ──────────────────── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`w-56 flex-shrink-0 flex flex-col border-r ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="material-symbols-rounded text-white text-[17px]">sim_card</span>
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">Telsim</span>
        </div>

        {/* Plan badge */}
        <div className="px-3 pb-4">
          <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${isDark ? 'bg-primary/10' : 'bg-blue-50'}`}>
            <Zap size={13} className="text-primary" />
            <span className="text-[11px] font-black text-primary uppercase tracking-wider">{planName}</span>
            <span className="ml-auto text-[10px] font-semibold text-slate-400">{planCredits} créditos</span>
          </div>
        </div>

        <div className={`mx-3 mb-3 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview"    active={activeTab === 'overview'}  onClick={() => setActiveTab('overview')} />
          <NavItem icon={<MessageSquare size={17} />}   label="Mensajes"    active={activeTab === 'messages'}  badge={unreadCount} onClick={() => setActiveTab('messages')} />
          <NavItem icon={<Smartphone size={17} />}      label="Mis SIMs"    active={activeTab === 'numbers'}   badge={activeSlots.length} onClick={() => setActiveTab('numbers')} />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<Settings size={17} />} label="Ajustes"     active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setSettingsSection('profile'); }} />
          <NavItem icon={<Send size={17} />}     label="Telegram Bot" onClick={() => { setActiveTab('settings'); setSettingsSection('telegram'); }} />
          <NavItem icon={<Link2 size={17} />}    label="API & Webhooks" onClick={() => { setActiveTab('settings'); setSettingsSection('api'); }} />
          <NavItem icon={<Bell size={17} />}     label="Notificaciones" onClick={() => { setActiveTab('settings'); setSettingsSection('notifications'); }} />
          <NavItem icon={<CreditCard size={17} />} label="Facturación"  onClick={() => { setActiveTab('settings'); setSettingsSection('billing'); }} />
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 flex flex-col gap-2">
          <button onClick={() => navigate('/onboarding/plan')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-[12px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Agregar SIM
          </button>
          <div className={`mt-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          <div className="flex items-center gap-2.5 px-1 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center text-white text-[11px] font-black flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate">{userName}</p>
              <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión"
              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>
              <LogOut size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* ──────────────────── MAIN ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1">
            <h1 className="text-[15px] font-black">{TAB_TITLES[activeTab]}</h1>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className={`relative flex items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl px-3 py-2 gap-2 w-56`}>
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input type="text" placeholder="Buscar mensajes..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`bg-transparent text-[12px] outline-none flex-1 ${isDark ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`} />
          </div>
          <button onClick={fetchData}   className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}><RefreshCw size={15} className="text-slate-400" /></button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>{isDark ? <Sun size={15} className="text-slate-400" /> : <Moon size={15} className="text-slate-400" />}</button>
          <button onClick={() => navigate('/dashboard/notifications')} className={`relative p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>
            <Bell size={15} className="text-slate-400" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </header>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[22px] font-black">
                  {(() => { const h = new Date().getHours(); return h < 12 ? `Buenos días, ${userName.split(' ')[0]} ☀️` : h < 18 ? `Buenas tardes, ${userName.split(' ')[0]} 👋` : `Buenas noches, ${userName.split(' ')[0]} 🌙`; })()}
                </h2>
                <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Resumen de tu actividad en Telsim.</p>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-4 gap-4">
                <KpiCard icon={<Zap size={18} />}        label="Créditos disponibles" value={planCredits} sub={`Plan ${planName}`} color="#1152d4" />
                <KpiCard icon={<MessageSquare size={18} />} label="Mensajes hoy"       value={todayMessages.length} sub={`${messages.length} en total`} trend={todayMessages.length > 0 ? 12 : undefined} color="#10b981" />
                <KpiCard icon={<Smartphone size={18} />} label="SIMs activas"          value={activeSlots.length} sub={`${slots.length} asignadas`} color="#f59e0b" />
                <KpiCard icon={<Shield size={18} />}     label="Tasa de éxito"         value={messages.length > 0 ? `${Math.round(((messages.length - (messages.filter(m => m.is_spam).length || 0)) / messages.length) * 100)}%` : '—'} sub="Verificaciones OK" trend={3} color="#8b5cf6" />
              </div>

              {/* Chart left + Feed right */}
              <div className="grid grid-cols-5 gap-4 items-start">

                {/* Col izquierda: chart + estado SIMs */}
                <div className="col-span-3 flex flex-col gap-4">
                  <div className={`rounded-2xl p-5 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[14px] font-black">Actividad SMS</h3>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Últimos 7 días</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                        <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mensajes recibidos</span>
                      </div>
                    </div>
                    <BarChart data={activityData} labels={activityLabels} isDark={isDark} />
                  </div>

                  {slots.length > 0 && (
                    <div className={`rounded-2xl p-5 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-black">Estado de SIMs</h3>
                        <button onClick={() => setActiveTab('numbers')} className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">Ver todo <ChevronRight size={12} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {slots.map(slot => {
                          const flag    = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                          const msgsCnt = messages.filter(m => m.slot_id === slot.slot_id).length;
                          const isActive = slot.status !== 'expired';
                          const pc = PLAN_COLORS[slot.plan_type?.toLowerCase()] ?? PLAN_COLORS.starter;
                          return (
                            <div key={slot.slot_id}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border-l-[3px] ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}
                              style={{ borderLeftColor: pc.border, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}>
                              <div className="text-xl flex-shrink-0">{flag}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate">{slot.label || slot.phone_number}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{msgsCnt} msgs</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Feed en vivo — burbujas SMS */}
                <div className={`col-span-2 rounded-2xl p-5 shadow-sm border flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-[14px] font-black">Feed en vivo</h3>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Últimos SMS recibidos</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-semibold text-emerald-500">En vivo</span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex items-center justify-center py-8"><RefreshCw size={20} className="text-slate-400 animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <MessageSquare size={28} /><p className="text-[12px] font-semibold">Sin mensajes aún</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px] pr-1">
                      {messages.slice(0, 10).map(msg => {
                        const svc    = detectService(msg.sender, msg.content);
                        const code   = msg.verification_code || extractCode(msg.content);
                        const slot   = slots.find(s => s.slot_id === msg.slot_id);
                        const flag   = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                        const simNum = slot?.phone_number ?? slot?.label ?? 'SIM';
                        const hasLogo = BrandLogo({ brand: svc.key }) !== null;

                        return (
                          <div key={msg.id} className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            {/* Header de marca */}
                            <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                style={{ background: isDark ? svc.darkBg : svc.bg }}>
                                {hasLogo
                                  ? <BrandLogo brand={svc.key} size={20} />
                                  : <span className="text-[10px] font-black" style={{ color: svc.color }}>{svc.label.slice(0,2).toUpperCase()}</span>
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black" style={{ color: svc.color }}>{svc.label}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {flag} {simNum}
                                </p>
                              </div>
                              <span className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-300'} flex-shrink-0`}>
                                <Clock size={10} className="inline mr-0.5" />{timeAgo(msg.received_at)}
                              </span>
                            </div>

                            {/* Burbuja SMS */}
                            <div className="px-3 pb-3">
                              <div className={`rounded-2xl rounded-tl-sm px-3 py-2.5 text-[12px] leading-relaxed ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700 shadow-sm'}`}>
                                {msg.content}
                              </div>
                              {code && (
                                <div className="flex justify-end mt-2">
                                  <button onClick={() => handleCopy(msg.id, code)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[11px] font-black hover:bg-primary/20 transition-colors">
                                    {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                                    Código: {code}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button onClick={() => setActiveTab('messages')} className="mt-4 flex items-center justify-center gap-1 text-[11px] font-bold text-primary hover:underline">
                    Ver todos <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MESSAGES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'messages' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setSelectedSlot(null)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${!selectedSlot ? 'bg-primary text-white' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100')}`}>
                  Todos ({messages.length})
                </button>
                {slots.map(slot => (
                  <button key={slot.slot_id} onClick={() => setSelectedSlot(slot.slot_id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 ${selectedSlot === slot.slot_id ? 'bg-primary text-white' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100')}`}>
                    {REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐'}
                    {slot.label || slot.phone_number.slice(-6)}
                  </button>
                ))}
              </div>

              <div className={`rounded-2xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                      <th className="px-5 py-3">Servicio</th><th className="px-5 py-3">SIM destino</th>
                      <th className="px-5 py-3">Mensaje</th><th className="px-5 py-3">Código</th>
                      <th className="px-5 py-3">Hora</th><th className="px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-12"><RefreshCw size={20} className="text-slate-400 animate-spin mx-auto" /></td></tr>
                    ) : filteredMessages.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12"><div className="flex flex-col items-center gap-2 text-slate-400"><MessageSquare size={28} /><p className="text-[12px] font-semibold">Sin mensajes</p></div></td></tr>
                    ) : filteredMessages.map(msg => {
                      const svc  = detectService(msg.sender, msg.content);
                      const code = msg.verification_code || extractCode(msg.content);
                      const slot = slots.find(s => s.slot_id === msg.slot_id);
                      const flag = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                      const hasLogo = BrandLogo({ brand: svc.key }) !== null;
                      return (
                        <tr key={msg.id} className={`border-b transition-colors ${isDark ? `border-slate-800 ${!msg.is_read ? 'bg-primary/5' : ''} hover:bg-slate-800` : `border-slate-50 ${!msg.is_read ? 'bg-blue-50/50' : ''} hover:bg-slate-50`}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: isDark ? svc.darkBg : svc.bg }}>
                                {hasLogo ? <BrandLogo brand={svc.key} size={17} /> : <span className="text-[9px] font-black" style={{ color: svc.color }}>{svc.label.slice(0,2).toUpperCase()}</span>}
                              </div>
                              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{svc.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3"><span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{flag} {slot?.phone_number ?? '—'}</span></td>
                          <td className="px-5 py-3 max-w-[280px]"><p className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'} ${!msg.is_read ? 'font-semibold' : ''}`}>{msg.content}</p></td>
                          <td className="px-5 py-3">
                            {code ? (
                              <button onClick={() => handleCopy(msg.id, code)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-black hover:bg-primary/20 transition-colors">
                                {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}{code}
                              </button>
                            ) : <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>—</span>}
                          </td>
                          <td className="px-5 py-3"><div className={`flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><Clock size={11} />{new Date(msg.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div></td>
                          <td className="px-5 py-3">{msg.is_read ? <CheckCircle2 size={15} className="text-emerald-500" /> : <Circle size={15} className="text-primary fill-primary/20" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── NUMBERS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'numbers' && (
            <div className="flex flex-col gap-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-black">Mis SIMs</h2>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {activeSlots.length} activas · {slots.length} total
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className={`flex items-center rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                    <button
                      onClick={() => setSimsView('card')}
                      title="Vista SIM card"
                      className={`px-3 py-2 transition-all ${simsView === 'card'
                        ? 'bg-primary text-white'
                        : (isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-400 hover:text-slate-700 bg-slate-50')}`}>
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      onClick={() => setSimsView('list')}
                      title="Vista lista"
                      className={`px-3 py-2 transition-all ${simsView === 'list'
                        ? 'bg-primary text-white'
                        : (isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-400 hover:text-slate-700 bg-slate-50')}`}>
                      <List size={15} />
                    </button>
                  </div>
                  <button onClick={() => navigate('/onboarding/plan')}
                    className="flex items-center gap-2 bg-primary text-white text-[12px] font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                    <Plus size={14} /> Nueva SIM
                  </button>
                </div>
              </div>

              {/* Loading */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={24} className="text-slate-400 animate-spin" />
                </div>

              /* Empty state */
              ) : slots.length === 0 ? (
                <div className={`rounded-2xl p-14 flex flex-col items-center gap-3 text-center border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <Smartphone size={32} className="text-slate-300" />
                  <p className={`text-[13px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sin SIMs asignadas</p>
                  <button onClick={() => navigate('/onboarding/plan')}
                    className="mt-1 px-5 py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold hover:bg-primary/90 transition-colors">
                    Activar primera SIM
                  </button>
                </div>

              /* ── CARD VIEW (SIM card grid) ── */
              ) : simsView === 'card' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {slots.map(slot => {
                    const plan        = (slot.plan_type || 'starter').toLowerCase();
                    const ps          = getWebPlanStyle(plan);
                    const msgsCnt     = messages.filter(m => m.slot_id === slot.slot_id).length;
                    const isActive    = slot.status !== 'expired';
                    const isForwarding = !!slot.forwarding_active;
                    const isTog       = togglingSlot === slot.slot_id;
                    const isEditing   = editingSlotId === slot.slot_id;
                    const countryCode = (slot.region ?? 'cl').toUpperCase();

                    return (
                      <div key={slot.slot_id} className="flex flex-col gap-2">

                        {/* ═══ SIM Card ═══
                            Shape: chamfered top-right corner (36px) + left-side center notch (SIM tray notch)
                            All other 3 corners: 8px chamfer for physical SIM aesthetic          */}
                        <div
                          className={`relative w-full aspect-[1.58/1] ${ps.cardBg} p-5 flex flex-col justify-between overflow-hidden select-none shadow-xl`}
                          style={{
                            clipPath: [
                              '8px 0',
                              'calc(100% - 36px) 0',   /* top-right: start of corner cut */
                              '100% 36px',              /* top-right: end of corner cut   */
                              '100% calc(100% - 8px)',
                              'calc(100% - 8px) 100%',
                              '8px 100%',
                              '0 calc(100% - 8px)',
                              '0 calc(50% + 22px)',     /* left edge: below tray notch    */
                              '7px calc(50% + 22px)',   /* tray notch inner bottom-right  */
                              '7px calc(50% - 22px)',   /* tray notch inner top-right     */
                              '0 calc(50% - 22px)',     /* left edge: above tray notch    */
                              '0 8px',
                            ].map(p => p).join(', ').replace(/^/, 'polygon(') + ')',
                          }}>

                          {/* Decorative rings */}
                          <div className="absolute top-[-20%] right-[-8%] w-[52%] h-[52%] rounded-full border-[22px] border-white/[0.07] pointer-events-none" />
                          <div className="absolute bottom-[-12%] right-[8%]  w-[36%] h-[36%] rounded-full border-[12px] border-white/[0.05] pointer-events-none" />

                          {/* ── Row 1: Brand name + Circular flag ── */}
                          <div className="flex items-start justify-between relative z-10">
                            <div>
                              <p className={`text-[9px] font-black uppercase tracking-[0.22em] ${ps.labelColor}`}>Telsim Online</p>

                              {/* Editable label inline on the card */}
                              {isEditing ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <input
                                    autoFocus value={labelDraft}
                                    onChange={e => setLabelDraft(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter')  handleSaveLabel(slot.slot_id);
                                      if (e.key === 'Escape') setEditingSlotId(null);
                                    }}
                                    className="text-[11px] px-2 py-0.5 rounded-md border outline-none w-28 bg-black/20 border-white/30 text-white placeholder-white/40 font-bold"
                                    placeholder="Etiqueta..."
                                  />
                                  <button onClick={() => handleSaveLabel(slot.slot_id)} disabled={savingLabel}
                                    className="p-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors">
                                    {savingLabel ? <RefreshCw size={9} className="animate-spin text-white" /> : <Check size={9} className="text-white" />}
                                  </button>
                                  <button onClick={() => setEditingSlotId(null)}
                                    className="p-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
                                    <X size={9} className="text-white/70" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingSlotId(slot.slot_id); setLabelDraft(slot.label || ''); }}
                                  className="flex items-center gap-1 mt-0.5 group">
                                  <span className={`text-[12px] font-bold italic uppercase tracking-widest ${ps.phoneColor}`}>
                                    {slot.label
                                      ? slot.label
                                      : <span className={`not-italic normal-case tracking-normal font-normal opacity-50 ${ps.labelColor}`}>Sin etiqueta</span>
                                    }
                                  </span>
                                  <Pencil size={8} className={`${ps.labelColor} opacity-40 group-hover:opacity-90 transition-opacity ml-0.5`} />
                                </button>
                              )}
                            </div>

                            {/* Circular flag */}
                            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white/25 shadow-lg flex-shrink-0 bg-slate-300">
                              <img
                                src={`https://flagcdn.com/80x60/${countryCode.toLowerCase()}.png`}
                                alt={countryCode}
                                className="w-full h-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </div>
                          </div>

                          {/* ── Row 2: SIM chip (left) + Subscriber number (right) ── */}
                          <div className="flex items-center gap-4 relative z-10">
                            {/* SIM chip — solid rectangle, simulates the physical gold contact pad */}
                            <div className={`w-14 h-[38px] rounded-lg ${ps.chip} shadow-md flex-shrink-0`} />

                            <div>
                              <p className={`text-[8px] font-bold uppercase tracking-[0.22em] mb-1 ${ps.labelColor}`}>
                                Subscriber Number
                              </p>
                              <p className={`text-[18px] font-black font-mono tracking-wider leading-none ${ps.phoneColor}`}>
                                {slot.phone_number ?? '—'}
                              </p>
                            </div>
                          </div>

                          {/* ── Row 3: Plan badge + active indicator ── */}
                          <div className="flex items-end justify-between relative z-10">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                              plan === 'power' ? 'border-amber-300/60 text-amber-100   bg-black/20' :
                              plan === 'pro'   ? 'border-white/40   text-white/90    bg-black/20' :
                                                 'border-slate-300/70 text-slate-600 bg-white/60'
                            }`}>
                              {plan === 'power' && <span className="text-[11px]">👑</span>}
                              {ps.label}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${isActive ? ps.labelColor : 'text-red-400/80'}`}>
                              {isActive ? '● Activa' : '○ Expirada'}
                            </span>
                          </div>
                        </div>

                        {/* ── Action buttons bar ── */}
                        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>

                          {/* INBOX — wider, primary action */}
                          <button
                            onClick={() => { setSelectedSlot(slot.slot_id); setActiveTab('messages'); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                            <MessageSquare size={13} />
                            <span>Inbox</span>
                            {msgsCnt > 0 && (
                              <span className="bg-primary text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                                {msgsCnt > 99 ? '99+' : msgsCnt}
                              </span>
                            )}
                          </button>

                          {/* COPY number */}
                          <button
                            onClick={() => handleCopy(`${slot.slot_id}_num`, slot.phone_number)}
                            title="Copiar número"
                            className={`w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                              copiedId === `${slot.slot_id}_num`
                                ? 'bg-emerald-500 text-white'
                                : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')
                            }`}>
                            {copiedId === `${slot.slot_id}_num` ? <Check size={14} /> : <Copy size={14} />}
                          </button>

                          {/* BOT toggle */}
                          <button
                            onClick={() => handleToggleForwarding(slot.slot_id, !isForwarding)}
                            disabled={isTog}
                            title={isForwarding ? 'Bot activo – clic para desactivar' : 'Bot inactivo – clic para activar'}
                            className={`w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                              isForwarding
                                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                                : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500')
                            } ${isTog ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isTog ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                          </button>

                          {/* CANCEL subscription */}
                          <button
                            onClick={() => handleCancelSubscription(slot.slot_id)}
                            title="Cancelar suscripción"
                            className={`w-[42px] h-[42px] flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${isDark ? 'bg-slate-800 hover:bg-red-900/40 text-slate-500 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              /* ── LIST VIEW ── */
              ) : (
                <div className={`rounded-2xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                        <th className="px-5 py-3">Número</th>
                        <th className="px-5 py-3">Etiqueta</th>
                        <th className="px-5 py-3">Región</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Estado</th>
                        <th className="px-5 py-3">Telegram Bot</th>
                        <th className="px-5 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map(slot => {
                        const plan  = (slot.plan_type || 'starter').toLowerCase();
                        const pc    = PLAN_COLORS[plan] ?? PLAN_COLORS.starter;
                        const msgsCnt = messages.filter(m => m.slot_id === slot.slot_id).length;
                        const isActive = slot.status !== 'expired';
                        const isForwarding = !!slot.forwarding_active;
                        const isTog = togglingSlot === slot.slot_id;
                        const flag  = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                        const isEditing = editingSlotId === slot.slot_id;
                        return (
                          <tr key={slot.slot_id}
                            className={`border-b transition-colors border-l-[3px] ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50/80'}`}
                            style={{ borderLeftColor: pc.border }}>

                            {/* Número */}
                            <td className="px-5 py-3.5">
                              <span className={`font-bold text-[13px] font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{slot.phone_number}</span>
                            </td>

                            {/* Etiqueta editable */}
                            <td className="px-5 py-3.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input autoFocus value={labelDraft} onChange={e => setLabelDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(slot.slot_id); if (e.key === 'Escape') setEditingSlotId(null); }}
                                    className={`text-[12px] px-2 py-1 rounded-lg border outline-none w-28 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                                    placeholder="Ej: Marketing" />
                                  <button onClick={() => handleSaveLabel(slot.slot_id)} disabled={savingLabel}
                                    className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                    {savingLabel ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                                  </button>
                                  <button onClick={() => setEditingSlotId(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <X size={11} className="text-slate-400" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 group">
                                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                    {slot.label || <span className="italic text-slate-300 dark:text-slate-600">—</span>}
                                  </span>
                                  <button onClick={() => { setEditingSlotId(slot.slot_id); setLabelDraft(slot.label || ''); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                                    <Pencil size={11} className="text-slate-400" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Región */}
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-1.5">
                                {flag} <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{slot.region ?? '—'}</span>
                              </span>
                            </td>

                            {/* Plan badge */}
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                                style={{ background: pc.badge, color: pc.text }}>{pc.label}</span>
                            </td>

                            {/* Estado */}
                            <td className="px-5 py-3.5">
                              <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                {isActive ? 'Activa' : 'Expirada'}
                              </span>
                            </td>

                            {/* Telegram Bot toggle */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleForwarding(slot.slot_id, !isForwarding)}
                                  disabled={isTog}
                                  className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                                    isForwarding ? 'bg-sky-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')
                                  } ${isTog ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isForwarding ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                                <span className={`text-[11px] font-medium ${isForwarding ? 'text-sky-500' : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>
                                  {isForwarding ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </td>

                            {/* Acciones: Inbox · Copy · Cancel */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">

                                {/* Inbox */}
                                <button
                                  onClick={() => { setSelectedSlot(slot.slot_id); setActiveTab('messages'); }}
                                  title="Ver mensajes"
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                                  <MessageSquare size={12} />
                                  <span>Inbox</span>
                                  {msgsCnt > 0 && (
                                    <span className="bg-primary text-white text-[9px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
                                      {msgsCnt > 99 ? '99+' : msgsCnt}
                                    </span>
                                  )}
                                </button>

                                {/* Copy */}
                                <button
                                  onClick={() => handleCopy(`${slot.slot_id}_lst`, slot.phone_number)}
                                  title="Copiar número"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                                    copiedId === `${slot.slot_id}_lst`
                                      ? 'bg-emerald-500 text-white'
                                      : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500')
                                  }`}>
                                  {copiedId === `${slot.slot_id}_lst` ? <Check size={11} /> : <Copy size={11} />}
                                </button>

                                {/* Cancel subscription */}
                                <button
                                  onClick={() => handleCancelSubscription(slot.slot_id)}
                                  title="Cancelar suscripción"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-red-900/40 text-slate-500 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="flex gap-6 h-full">
              {/* Sub-nav izquierda */}
              <div className={`w-52 flex-shrink-0 rounded-2xl p-3 shadow-sm border self-start ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                {([
                  { id: 'profile',       icon: <Settings size={15} />,     label: 'Mi Perfil' },
                  { id: 'telegram',      icon: <Send size={15} />,         label: 'Telegram Bot' },
                  { id: 'api',           icon: <Link2 size={15} />,        label: 'API & Webhooks' },
                  { id: 'notifications', icon: <Bell size={15} />,         label: 'Notificaciones' },
                  { id: 'billing',       icon: <CreditCard size={15} />,   label: 'Facturación' },
                  { id: 'language',      icon: <Globe size={15} />,        label: 'Idioma' },
                  { id: 'security',      icon: <ShieldCheck size={15} />,  label: 'Seguridad' },
                ] as { id: SettingsSection; icon: React.ReactNode; label: string }[]).map(item => (
                  <button key={item.id} onClick={() => setSettingsSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all mb-0.5 ${
                      settingsSection === item.id ? 'bg-primary text-white' : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')
                    }`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>

              {/* Contenido derecha */}
              <div className="flex-1">

                {/* Perfil */}
                {settingsSection === 'profile' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <h3 className="text-[15px] font-black mb-5">Mi Perfil</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center text-white text-[22px] font-black flex-shrink-0">{userInitials}</div>
                      <div>
                        <p className="text-[16px] font-black">{userName}</p>
                        <p className={`text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: PLAN_COLORS[savedPlanId]?.badge, color: PLAN_COLORS[savedPlanId]?.text }}>
                          <Zap size={9} /> Plan {planName}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Nombre completo', value: userName },
                        { label: 'Correo electrónico', value: user?.email || '' },
                        { label: 'Plan actual', value: planName },
                        { label: 'Créditos disponibles', value: `${planCredits} SMS/mes` },
                      ].map(field => (
                        <div key={field.label}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{field.label}</p>
                          <div className={`px-3 py-2.5 rounded-xl text-[13px] font-medium ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>{field.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => navigate('/dashboard/profile')} className="px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors">Editar perfil</button>
                      <button onClick={() => navigate('/dashboard/security')} className={`px-4 py-2.5 text-[12px] font-bold rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Cambiar contraseña</button>
                    </div>
                  </div>
                )}

                {/* Telegram Bot */}
                {settingsSection === 'telegram' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#229ED9]/10 flex items-center justify-center">
                        <Bot size={18} className="text-[#229ED9]" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-black">Telegram Bot</h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Recibe SMS directamente en Telegram</p>
                      </div>
                    </div>

                    {tgLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>
                    ) : (
                      <div className="space-y-5">
                        {/* Token input */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                            <Key size={11} /> Bot Token
                          </label>
                          <input
                            type="password"
                            value={tgToken}
                            onChange={(e) => setTgToken(e.target.value)}
                            placeholder="Ej: 582910..."
                            className={`w-full h-11 rounded-xl px-4 text-[13px] font-mono outline-none focus:ring-2 focus:ring-primary/30 border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                          />
                          <p className={`text-[10px] ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Obténlo desde <span className="font-bold">@BotFather</span> en Telegram</p>
                        </div>

                        {/* Chat ID input */}
                        <div className="space-y-1.5">
                          <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                            <User size={11} /> Chat ID
                          </label>
                          <input
                            type="text"
                            value={tgChatId}
                            onChange={(e) => setTgChatId(e.target.value)}
                            placeholder="Ej: 91823..."
                            className={`w-full h-11 rounded-xl px-4 text-[13px] font-mono outline-none focus:ring-2 focus:ring-primary/30 border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                          />
                          <p className={`text-[10px] ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Consúltalo con <span className="font-bold">@userinfobot</span></p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={handleTgTest}
                            disabled={tgTesting || tgSaving}
                            className={`flex-1 h-10 flex items-center justify-center gap-2 text-[12px] font-bold rounded-xl border transition-all disabled:opacity-50 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                          >
                            {tgTesting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Probar conexión
                          </button>
                          <button
                            onClick={handleTgSave}
                            disabled={tgSaving || tgTesting}
                            className="flex-1 h-10 flex items-center justify-center gap-2 text-[12px] font-bold rounded-xl bg-primary text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                          >
                            {tgSaving ? <Loader2 size={13} className="animate-spin" /> : tgSaved ? <Check size={13} /> : <Save size={13} />}
                            {tgSaved ? '¡Guardado!' : 'Guardar'}
                          </button>
                        </div>

                        {/* Info hint + guide link */}
                        <div className={`flex gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-blue-50'}`}>
                          <Info size={14} className="text-primary shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className={`text-[11px] leading-relaxed mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              ¿No sabes cómo configurarlo? Sigue la guía paso a paso para crear y vincular tu bot en minutos.
                            </p>
                            <button
                              onClick={() => navigate('/dashboard/telegram-guide')}
                              className="inline-flex items-center gap-1.5 text-[11px] font-black text-primary hover:underline uppercase tracking-wide"
                            >
                              <Bot size={12} />
                              Ver guía de configuración →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* API & Webhooks */}
                {settingsSection === 'api' && (
                  <div className="flex flex-col gap-4">

                    {/* Header card */}
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Link2 size={18} className="text-primary" /></div>
                          <div>
                            <h3 className="text-[15px] font-black">API & Webhooks</h3>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Integra Telsim con tu stack</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/dashboard/api-guide')}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                          <ExternalLink size={12} /> Ver documentación
                        </button>
                      </div>

                      {/* API Key display */}
                      <div className="mb-5">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tu API Key</p>
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-mono text-[12px] ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <Key size={13} className="flex-shrink-0 text-primary" />
                          <span className="flex-1 truncate">{user?.id ? `telsim_${user.id.slice(0, 8)}xxxxxxxxxxxx` : '—'}</span>
                          <button onClick={() => handleCopy('apikey', user?.id || '')}
                            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${copiedId === 'apikey' ? 'text-emerald-500' : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
                            {copiedId === 'apikey' ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <p className={`text-[10px] mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          Incluye este token en el header: <code className="font-mono">Authorization: Bearer &lt;API_KEY&gt;</code>
                        </p>
                      </div>

                      {/* Quick links */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'REST API', desc: 'Consulta SIMs y mensajes', icon: '⚡' },
                          { label: 'SDK Node.js', desc: 'Librería oficial npm', icon: '📦' },
                          { label: 'Guía rápida', desc: 'Ejemplos de código', icon: '📖' },
                        ].map(item => (
                          <button key={item.label} onClick={() => navigate('/dashboard/api-guide')}
                            className={`p-3 rounded-xl text-left transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                            <p className="text-[16px] mb-1">{item.icon}</p>
                            <p className="text-[11px] font-bold">{item.label}</p>
                            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Webhook configuration */}
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Zap size={16} className="text-amber-500" /></div>
                        <div>
                          <h4 className="text-[13px] font-black">Configuración de Webhook</h4>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Recibe eventos SMS en tu servidor en tiempo real</p>
                        </div>
                      </div>

                      {/* Webhook URL */}
                      <div className="mb-4">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          URL del Endpoint
                        </label>
                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={e => setWebhookUrl(e.target.value)}
                          placeholder="https://tuapp.com/webhooks/telsim"
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'}`}
                        />
                      </div>

                      {/* Webhook Secret */}
                      <div className="mb-4">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Secreto (para verificar firma)
                        </label>
                        <input
                          type="text"
                          value={webhookSecret}
                          onChange={e => setWebhookSecret(e.target.value)}
                          placeholder="whsec_xxxxxxxxxxxxxxxx"
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] font-mono outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'}`}
                        />
                        <p className={`text-[10px] mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          Enviado como header <code className="font-mono">X-Telsim-Signature</code> en cada request.
                        </p>
                      </div>

                      {/* Events to subscribe */}
                      <div className="mb-5">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Eventos a recibir
                        </label>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'sms_received',  label: 'SMS recibido',     desc: 'Cada mensaje entrante a cualquier SIM' },
                            { id: 'code_detected', label: 'Código OTP detectado', desc: 'Cuando se extrae un código automáticamente' },
                            { id: 'sim_activated', label: 'SIM activada',     desc: 'Activación de una nueva SIM' },
                            { id: 'sim_expired',   label: 'SIM expirada',     desc: 'Cuando vence el período de una SIM' },
                          ].map(ev => (
                            <label key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                              webhookEvents.includes(ev.id)
                                ? (isDark ? 'border-primary/40 bg-primary/10' : 'border-primary/30 bg-primary/5')
                                : (isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50')
                            }`}>
                              <input type="checkbox" checked={webhookEvents.includes(ev.id)} onChange={() => toggleWebhookEvent(ev.id)} className="w-4 h-4 accent-primary" />
                              <div>
                                <p className="text-[12px] font-bold">{ev.label}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{ev.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <button onClick={handleWebhookSave} disabled={webhookSaving}
                          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                          {webhookSaving ? <Loader2 size={13} className="animate-spin" /> : webhookSaved ? <Check size={13} /> : <Save size={13} />}
                          {webhookSaved ? '¡Guardado!' : 'Guardar webhook'}
                        </button>
                        <button onClick={handleWebhookTest} disabled={webhookTesting || !webhookUrl}
                          className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold rounded-xl transition-colors disabled:opacity-40 ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                          {webhookTesting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          Probar webhook
                        </button>
                        <button onClick={() => navigate('/dashboard/api-guide')}
                          className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          <ExternalLink size={12} /> Ver documentación
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notificaciones */}
                {settingsSection === 'notifications' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Bell size={18} className="text-amber-500" /></div>
                      <div><h3 className="text-[15px] font-black">Notificaciones</h3><p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Administra cómo te alertamos</p></div>
                    </div>
                    {[
                      { label: 'SMS recibido', desc: 'Notificación cada vez que llega un mensaje', enabled: true },
                      { label: 'Código detectado', desc: 'Alerta cuando se extrae un código OTP', enabled: true },
                      { label: 'SIM expirada', desc: 'Aviso 3 días antes del vencimiento', enabled: true },
                      { label: 'Resumen diario', desc: 'Estadísticas al final del día', enabled: false },
                    ].map((n, i) => (
                      <div key={i} className={`flex items-center justify-between py-3 ${i < 3 ? `border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}` : ''}`}>
                        <div>
                          <p className="text-[13px] font-semibold">{n.label}</p>
                          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{n.desc}</p>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${n.enabled ? 'bg-primary' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}>
                          <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${n.enabled ? 'right-[3px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Facturación */}
                {settingsSection === 'billing' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CreditCard size={18} className="text-emerald-500" /></div>
                      <div><h3 className="text-[15px] font-black">Plan y Facturación</h3><p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gestiona tu suscripción</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {(['starter', 'pro', 'power'] as const).map(p => {
                        const pc = PLAN_COLORS[p];
                        const prices: Record<string, string> = { starter: 'USD 19.90/mes', pro: 'USD 39.90/mes', power: 'USD 99.00/mes' };
                        const limits: Record<string, string> = { starter: '150 créditos', pro: '400 créditos', power: '1400 créditos' };
                        const isCurrent = savedPlanId === p;
                        return (
                          <div key={p} className={`p-4 rounded-xl border-2 transition-all ${isCurrent ? '' : (isDark ? 'border-slate-700' : 'border-slate-200')}`}
                            style={isCurrent ? { borderColor: pc.border, background: pc.badge + '33' } : {}}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: pc.text }}>{pc.label}</span>
                            <p className="text-[20px] font-black mt-1">{prices[p]}</p>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{limits[p]} / mes</p>
                            {isCurrent && <span className="mt-2 inline-flex text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: pc.border, color: 'white' }}>Plan activo</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => navigate('/dashboard/billing')} className="px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors">Ver historial de pagos</button>
                      <button onClick={() => navigate('/onboarding/plan')} className={`px-4 py-2.5 text-[12px] font-bold rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Cambiar plan</button>
                    </div>
                  </div>
                )}

                {/* ── IDIOMA ── */}
                {settingsSection === 'language' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><Globe size={18} className="text-sky-500" /></div>
                      <div>
                        <h3 className="text-[15px] font-black">Idioma</h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selecciona el idioma de la interfaz</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {([
                        { code: 'es', label: 'Español', flag: '🇪🇸', desc: 'Interfaz en español latinoamericano' },
                        { code: 'en', label: 'English', flag: '🇺🇸', desc: 'Interface in English' },
                      ] as { code: 'es' | 'en'; label: string; flag: string; desc: string }[]).map(lang => (
                        <button key={lang.code} onClick={() => setAppLanguage(lang.code)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            appLanguage === lang.code
                              ? 'border-primary bg-primary/5'
                              : (isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300')
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{lang.flag}</span>
                            {appLanguage === lang.code && (
                              <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check size={11} className="text-white" />
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] font-black">{lang.label}</p>
                          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{lang.desc}</p>
                        </button>
                      ))}
                    </div>

                    {langSaved && (
                      <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <p className="text-[12px] font-semibold text-emerald-500">Idioma guardado correctamente.</p>
                      </div>
                    )}

                    <button onClick={() => handleLanguageSave(appLanguage)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors">
                      <Save size={13} /> Guardar preferencia
                    </button>
                    <p className={`text-[10px] mt-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      El cambio de idioma se aplicará al recargar la aplicación.
                    </p>
                  </div>
                )}

                {/* ── SEGURIDAD Y CONTRASEÑA ── */}
                {settingsSection === 'security' && (
                  <div className="flex flex-col gap-4">

                    {/* Change password */}
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Lock size={18} className="text-red-500" /></div>
                        <div>
                          <h3 className="text-[15px] font-black">Cambiar contraseña</h3>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actualiza tu contraseña de acceso</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 max-w-md">
                        {/* New password */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Nueva contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPw ? 'text' : 'password'}
                              value={secNewPw}
                              onChange={e => { setSecNewPw(e.target.value); setSecError(''); }}
                              placeholder="Mínimo 6 caracteres"
                              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'}`}
                            />
                            <button type="button" onClick={() => setShowNewPw(p => !p)}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                              {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          {/* Password strength indicator */}
                          {secNewPw && (
                            <div className="flex gap-1 mt-2">
                              {[1,2,3,4].map(level => (
                                <div key={level} className={`flex-1 h-1 rounded-full transition-colors ${
                                  secNewPw.length >= level * 3
                                    ? (secNewPw.length >= 12 ? 'bg-emerald-500' : secNewPw.length >= 8 ? 'bg-amber-400' : 'bg-red-400')
                                    : (isDark ? 'bg-slate-700' : 'bg-slate-200')
                                }`} />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Confirm password */}
                        <div>
                          <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Confirmar contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPw ? 'text' : 'password'}
                              value={secConfirmPw}
                              onChange={e => { setSecConfirmPw(e.target.value); setSecError(''); }}
                              placeholder="Repite la nueva contraseña"
                              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-[13px] outline-none transition-colors ${
                                secConfirmPw && secConfirmPw !== secNewPw
                                  ? 'border-red-400 focus:border-red-400'
                                  : (isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary')
                              } ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                            />
                            <button type="button" onClick={() => setShowConfirmPw(p => !p)}
                              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                              {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Error */}
                        {secError && (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                            <Info size={13} className="text-red-500 flex-shrink-0" />
                            <p className="text-[12px] text-red-500 font-semibold">{secError}</p>
                          </div>
                        )}

                        {/* Success */}
                        {secSuccess && (
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                            <p className="text-[12px] text-emerald-500 font-semibold">¡Contraseña actualizada correctamente!</p>
                          </div>
                        )}

                        <button onClick={handlePasswordChange} disabled={secSaving || !secNewPw || !secConfirmPw}
                          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 w-fit">
                          {secSaving ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                          {secSaving ? 'Actualizando…' : 'Actualizar contraseña'}
                        </button>
                      </div>
                    </div>

                    {/* Active sessions */}
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><ShieldCheck size={18} className="text-violet-500" /></div>
                        <div>
                          <h3 className="text-[15px] font-black">Seguridad de la cuenta</h3>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sesiones activas y autenticación</p>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between py-3.5 px-4 rounded-xl border mb-3 ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold">Sesión actual</p>
                            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email} · Activa ahora</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">Activa</span>
                      </div>

                      <div className={`flex items-center justify-between py-3.5 px-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                        <div>
                          <p className="text-[12px] font-bold">Proveedor de inicio de sesión</p>
                          <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {user?.app_metadata?.provider === 'google' ? '🔵 Google OAuth' : '📧 Correo y contraseña'}
                          </p>
                        </div>
                      </div>

                      <button onClick={handleLogout}
                        className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500'}`}>
                        <LogOut size={13} /> Cerrar sesión en todos los dispositivos
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default WebDashboard;
