import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Slot, SMSLog } from '../../types';
import {
  LayoutDashboard, MessageSquare, Smartphone, Settings,
  LogOut, Moon, Sun, Bell, Copy, Check, RefreshCw,
  Zap, Shield, ChevronRight, Search, Plus,
  ArrowUpRight, ArrowDownRight, Circle, Wifi, Clock,
  CheckCircle2, Send, Link2, CreditCard, Pencil, X,
  Bot, Key, User, Save, Loader2, Info, LayoutGrid, List, Trash2,
  Globe, Lock, Eye, EyeOff, ExternalLink, ShieldCheck,
  HelpCircle, Download, TrendingUp, Receipt, FileText, Calendar, Star, Code2,
  AlertCircle, AlertTriangle, Activity
} from 'lucide-react';
import TelegramStatusDot from '../../components/TelegramStatusDot';

// ─── Brand Logos (SVG inline) ──────────────────────────────────────────────────

const BrandLogo: React.FC<{ brand: string; size?: number }> = ({ brand, size = 18 }) => {
  const b = brand.toLowerCase();
  if (b === 'whatsapp') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path fill="#25D366" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.393A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
      <path fill="white" d="M16.75 14.45c-.25-.12-1.47-.72-1.7-.8-.23-.08-.4-.12-.57.12-.17.24-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.1-.5.12-.12.25-.31.38-.46.12-.16.16-.27.25-.45.08-.17.04-.33-.02-.46-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.24-.87.85-.87 2.07 0 1.22.9 2.4 1.02 2.57.13.17 1.76 2.69 4.26 3.77.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
  if (b === 'google') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
  if (b === 'facebook') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#1877F2" />
      <path fill="white" d="M16.5 7.5h-2c-.55 0-1 .45-1 1v1.5h3l-.5 3h-2.5V21h-3v-8H9v-3h1.5V8.5C10.5 6.57 12.07 5 14 5h2.5v2.5z" />
    </svg>
  );
  if (b === 'instagram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433" /><stop offset="25%" stopColor="#e6683c" /><stop offset="50%" stopColor="#dc2743" /><stop offset="75%" stopColor="#cc2366" /><stop offset="100%" stopColor="#bc1888" /></linearGradient></defs>
      <rect width="24" height="24" rx="5" fill="url(#igGrad)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
  if (b === 'telegram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path fill="white" d="M5.5 11.5l12-5-4 13-3-4-5 3 1.5-7zM9.5 13l.8 3 1.2-2.8L9.5 13z" />
    </svg>
  );
  if (b === 'amazon') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#FF9900" />
      <text x="5" y="16" fontSize="12" fontWeight="bold" fill="white" fontFamily="Arial">a</text>
      <path fill="white" d="M4 17c3 2 11 2 16-1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
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
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" fill="#141414" />
      <text x="4" y="19" fontSize="18" fontWeight="900" fill="#E50914" fontFamily="Arial">N</text>
    </svg>
  );
  if (b === 'spotify') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path fill="white" d="M16.7 10.7c-2.6-1.5-6.8-1.7-9.3-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 2.8-.9 7.5-.7 10.5 1.1.4.2.5.7.3 1.1-.2.3-.7.4-1.1.1zM16.4 13c-.2.3-.6.4-1 .2-2.2-1.3-5.5-1.7-8.1-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 2.9-.9 6.6-.5 9.1 1 .4.2.5.7.4 1.1v-.2zm-1.1 2.2c-.2.3-.5.3-.8.2-1.9-1.1-4.3-1.4-7.1-.8-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3-.7 5.7-.4 7.8.9.3.2.4.5.4.8z" />
    </svg>
  );
  if (b === 'discord') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#5865F2" />
      <path fill="white" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
    </svg>
  );
  if (b === 'twitter' || b === 'twitter/x' || b === 'x (twitter)') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#000" />
      <path fill="white" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L2.127 2.25H8.28l4.259 5.631 5.705-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
  if (b === 'microsoft') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
  if (b === 'linkedin') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#0077B5" />
      <path fill="white" d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
    </svg>
  );
  if (b === 'paypal') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="4" fill="#003087" />
      <path fill="#009CDE" d="M19.15 8.46A4.72 4.72 0 0 0 14.93 6H9.05L7 18h3.77l.57-3.49a3.45 3.45 0 0 1 3.41-2.92 2.35 2.35 0 0 0 2.4-2.71 3.7 3.7 0 0 0 2 -.42z" />
      <path fill="white" d="M9.82 10H14c1.5 0 2.5.75 2.5 2.17 0 2.1-1.5 3.33-3.5 3.33H11.5L11 18H8l1.82-8z" />
    </svg>
  );
  if (b === 'tiktok') return (
    <svg viewBox="0 0 24 24" width={size} height={size}><rect width="24" height="24" rx="5" fill="#010101" />
      <path fill="#FE2C55" d="M19 7.65A5.17 5.17 0 0 1 14.83 3v.05h-2.98v12.74a2.36 2.36 0 1 1-1.6-2.23v-3.1a5.34 5.34 0 1 0 4.58 5.27V9.97a8.2 8.2 0 0 0 4.17 1.1V8.1A5.17 5.17 0 0 1 19 7.65z" />
      <path fill="#25F4EE" d="M18 6.65A5.17 5.17 0 0 1 13.83 2h-2.98v12.74a2.36 2.36 0 1 1-1.6-2.23v-3.1A5.34 5.34 0 1 0 13.83 14.7V8.97a8.2 8.2 0 0 0 4.17 1.1V7.1A5.17 5.17 0 0 1 18 6.65z" />
    </svg>
  );
  return null;
};

// ─── Service Map ───────────────────────────────────────────────────────────────

const SERVICE_MAP: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', bg: '#dcfce7', darkBg: '#14532d' },
  google: { label: 'Google', color: '#4285F4', bg: '#dbeafe', darkBg: '#1e3a8a' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#fce7f3', darkBg: '#831843' },
  telegram: { label: 'Telegram', color: '#229ED9', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  amazon: { label: 'Amazon', color: '#FF9900', bg: '#fef3c7', darkBg: '#78350f' },
  microsoft: { label: 'Microsoft', color: '#00A4EF', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  twitter: { label: 'Twitter/X', color: '#1DA1F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  uber: { label: 'Uber', color: '#06b6d4', bg: '#cffafe', darkBg: '#164e63' },
  tiktok: { label: 'TikTok', color: '#ff0050', bg: '#fce7f3', darkBg: '#831843' },
  ebay: { label: 'eBay', color: '#E53238', bg: '#fee2e2', darkBg: '#7f1d1d' },
  mercadolibre: { label: 'Mercado Libre', color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  mercado: { label: 'Mercado Libre', color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  netflix: { label: 'Netflix', color: '#E50914', bg: '#fee2e2', darkBg: '#7f1d1d' },
  spotify: { label: 'Spotify', color: '#1DB954', bg: '#dcfce7', darkBg: '#14532d' },
  linkedin: { label: 'LinkedIn', color: '#0077B5', bg: '#dbeafe', darkBg: '#1e3a8a' },
  apple: { label: 'Apple', color: '#555555', bg: '#f1f5f9', darkBg: '#1e293b' },
  paypal: { label: 'PayPal', color: '#003087', bg: '#dbeafe', darkBg: '#1e3a8a' },
  discord: { label: 'Discord', color: '#5865F2', bg: '#ede9fe', darkBg: '#3730a3' },
  snapchat: { label: 'Snapchat', color: '#FFFC00', bg: '#fefce8', darkBg: '#713f12' },
  twitch: { label: 'Twitch', color: '#9146FF', bg: '#ede9fe', darkBg: '#3730a3' },
  binance: { label: 'Binance', color: '#F0B90B', bg: '#fefce8', darkBg: '#713f12' },
  coinbase: { label: 'Coinbase', color: '#0052FF', bg: '#dbeafe', darkBg: '#1e3a8a' },
  airbnb: { label: 'Airbnb', color: '#FF5A5F', bg: '#fee2e2', darkBg: '#7f1d1d' },
  shopify: { label: 'Shopify', color: '#96BF48', bg: '#dcfce7', darkBg: '#14532d' },
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
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatPhone(raw: string | undefined | null): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  // Chile mobile: 569XXXXXXXX (11 digits)
  if (digits.startsWith('569') && digits.length === 11)
    return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  // Chile landline: 562XXXXXXXX (11 digits)
  if (digits.startsWith('56') && digits.length === 11)
    return `+56 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  // Argentina: 549XXXXXXXXXX
  if (digits.startsWith('549') && digits.length >= 12)
    return `+54 9 ${digits.slice(3, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`;
  // Generic: just prepend + if needed
  return raw.startsWith('+') ? raw : `+${raw}`;
}

const REGION_FLAGS: Record<string, string> = {
  CL: '🇨🇱', AR: '🇦🇷', MX: '🇲🇽', US: '🇺🇸', BR: '🇧🇷',
  CO: '🇨🇴', PE: '🇵🇪', ES: '🇪🇸', DE: '🇩🇪', GB: '🇬🇧',
};

const PLAN_COLORS: Record<string, { border: string; badge: string; text: string; label: string }> = {
  starter: { border: '#3b82f6', badge: '#dbeafe', text: '#1d4ed8', label: 'Starter' },
  pro: { border: '#8b5cf6', badge: '#ede9fe', text: '#6d28d9', label: 'Pro' },
  power: { border: '#f59e0b', badge: '#fef3c7', text: '#b45309', label: 'Power' },
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
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary text-white shadow-sm'
      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
      }`}>
    <span className={`flex-shrink-0 ${active ? 'text-white' : ''}`}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge != null && badge > 0 && (
      <span className={`min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 ${active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
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

type TabId = 'overview' | 'messages' | 'numbers' | 'billing' | 'notifications' | 'help' | 'settings';
type SettingsSection = 'profile' | 'profile-edit' | 'telegram' | 'api' | 'api-logs' | 'notifications' | 'billing' | 'language' | 'security';

type AutomationLogRow = {
  id: string;
  user_id: string;
  slot_id: string | null;
  status: string;
  payload: Record<string, unknown> | null;
  response_body?: unknown;
  created_at: string;
};

const WebDashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const { notifications, unreadCount: notifUnread, loading: notifLoading, markAsRead: markNotifRead, markAllAsRead: markAllNotifRead, clearAll: clearAllNotifs } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [simsView, setSimsView] = useState<'card' | 'list'>('card');
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [slotToRelease, setSlotToRelease] = useState<Slot | null>(null);
  const [confirmReleaseCheck, setConfirmReleaseCheck] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseSuccessToast, setReleaseSuccessToast] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [notifFilter, setNotifFilter] = useState<string>('all');
  const [notifPrefs, setNotifPrefs] = useState<Record<string, { inapp: boolean; email: boolean; telegram: boolean }>>({
    sms_received:    { inapp: true,  email: false, telegram: false },
    code_detected:   { inapp: true,  email: false, telegram: true  },
    sim_activated:   { inapp: true,  email: true,  telegram: false },
    sim_expired:     { inapp: true,  email: true,  telegram: true  },
    payment_success: { inapp: true,  email: true,  telegram: false },
    payment_failed:  { inapp: true,  email: true,  telegram: true  },
    security_alerts: { inapp: true,  email: true,  telegram: false },
    daily_summary:   { inapp: false, email: false, telegram: false },
  });
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);
  const [notifPrefsSaved, setNotifPrefsSaved] = useState(false);
  const [testNotifLoading, setTestNotifLoading] = useState(false);

  // ─── Webhook config state ─────────────────────────────────────────────────
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('telsim_webhook_url') || '');
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem('telsim_webhook_secret') || '');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('telsim_webhook_events') || '["sms_received"]'); } catch { return ['sms_received']; }
  });
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);

  // ─── API Logs (automation_logs) state ───────────────────────────────────────
  const [apiLogs, setApiLogs] = useState<AutomationLogRow[]>([]);
  const [apiLogsLoading, setApiLogsLoading] = useState(false);
  const [apiLogsDrawerLog, setApiLogsDrawerLog] = useState<AutomationLogRow | null>(null);
  const [apiLogsRetryingId, setApiLogsRetryingId] = useState<string | null>(null);

  // ─── Language state ───────────────────────────────────────────────────────
  const [appLanguage, setAppLanguage] = useState<'es' | 'en'>(() =>
    (localStorage.getItem('telsim_language') as 'es' | 'en') || 'es'
  );
  const [langSaved, setLangSaved] = useState(false);

  // ─── Security / Password state ────────────────────────────────────────────
  const [secNewPw, setSecNewPw] = useState('');
  const [secConfirmPw, setSecConfirmPw] = useState('');
  const [secSaving, setSecSaving] = useState(false);
  const [secError, setSecError] = useState('');
  const [secSuccess, setSecSuccess] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ─── Telegram Config state ────────────────────────────────────────────────
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);
  const [tgBotStatus, setTgBotStatus] = useState<'idle' | 'online' | 'error'>('idle');
  const tgVerifyCacheRef = useRef<{ key: string; status: 'online' | 'error'; until: number } | null>(null);

  // ─── Profile Edit state ───────────────────────────────────────────────────
  const [editFullName, setEditFullName] = useState(user?.user_metadata?.full_name || '');
  const [editPhone, setEditPhone] = useState(user?.user_metadata?.phone || '');
  const [editCountry, setEditCountry] = useState(user?.user_metadata?.country || 'Chile');
  const [editCurrency, setEditCurrency] = useState(user?.user_metadata?.moneda || 'CLP');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  // ─── Live Feed Auto-refresh state ──────────────────────────────────────────
  const [feedRefreshing, setFeedRefreshing] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const savedPlanId: string = (() => {
    const raw = localStorage.getItem('selected_plan') || 'starter';
    try { const p = JSON.parse(raw); return (p.planId || p.id || p.plan || 'starter').toLowerCase(); }
    catch { return raw.toLowerCase(); }
  })();
  const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);
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
      if (slotsRes.data) setSlots(slotsRes.data);
      if (msgsRes.data) setMessages(msgsRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Auto-refresh feed en vivo every 5 seconds ────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'overview' && user) {
        const fetchFeed = async () => {
          try {
            const { data } = await supabase.from('sms_logs').select('*').eq('user_id', user.id)
              .order('received_at', { ascending: false }).limit(60);
            if (data) setMessages(data as SMSLog[]);
          } catch (e: any) {
            console.error('Error refreshing feed:', e);
          }
        };
        fetchFeed();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, activeTab]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen no puede superar 2MB.'); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
      await (supabase.auth as any).updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      alert(err.message || 'Error al subir la imagen.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Manual feed refresh function ──────────────────────────────────────────────
  const handleFeedRefresh = async () => {
    if (!user) return;
    setFeedRefreshing(true);
    try {
      const { data } = await supabase.from('sms_logs').select('*').eq('user_id', user.id)
        .order('received_at', { ascending: false }).limit(60);
      if (data) setMessages(data);
    } catch (e) { console.error('Error refreshing feed:', e); }
    finally { setFeedRefreshing(false); }
  };

  // ─── Profile Edit: load current data when section opens ───────────────────────
  useEffect(() => {
    if (settingsSection !== 'profile-edit' || !user) return;
    setEditFullName(user?.user_metadata?.full_name || '');
    setEditPhone(user?.user_metadata?.phone || '');
    setEditCountry(user?.user_metadata?.country || 'Chile');
    setEditCurrency(user?.user_metadata?.moneda || 'CLP');
    setEditError('');
    setEditSuccess(false);
  }, [settingsSection, user]);

  useEffect(() => {
    if (!user) return;
    const loadAvatar = async () => {
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      else if (user.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
    };
    loadAvatar();
  }, [user]);

  useEffect(() => {
    if (settingsSection !== 'notifications' || !user) return;
    const loadPrefs = async () => {
      const { data } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();
      if (data?.notification_preferences) {
        setNotifPrefs(prev => ({ ...prev, ...data.notification_preferences }));
      }
    };
    loadPrefs();
  }, [settingsSection, user]);

  // ─── Telegram: load config when section opens ─────────────────────────────
  useEffect(() => {
    if (settingsSection !== 'telegram' || !user) return;
    setTgLoading(true);

    const loadTg = async () => {
      try {
        const { data } = await supabase.from('users').select('telegram_token, telegram_chat_id').eq('id', user.id).single();
        if (data) {
          setTgToken(data.telegram_token || '');
          setTgChatId(data.telegram_chat_id || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTgLoading(false);
      }
    };
    loadTg();
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
      // Verificar bot tras guardar (API cachea por 5 min)
      verifyTgBot(tgToken, tgChatId);
    } catch { alert('Error al guardar la configuración.'); }
    finally { setTgSaving(false); }
  };

  const CACHE_TTL_MS = 5 * 60 * 1000;
  const verifyTgBot = useCallback(async (token: string, chatId: string) => {
    if (!token?.trim() || !chatId?.trim()) {
      setTgBotStatus('idle');
      return;
    }
    const key = `${token}:${chatId}`;
    const cached = tgVerifyCacheRef.current;
    if (cached && cached.key === key && Date.now() < cached.until) {
      setTgBotStatus(cached.status);
      return;
    }
    setTgBotStatus('idle');
    try {
      const res = await fetch('/api/notifications/verify-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_token: token, telegram_chat_id: chatId }),
      });
      const data = await res.json();
      const status = data.status === 'online' ? 'online' : 'error';
      setTgBotStatus(status);
      tgVerifyCacheRef.current = { key, status, until: Date.now() + CACHE_TTL_MS };
    } catch {
      setTgBotStatus('error');
      tgVerifyCacheRef.current = { key, status: 'error', until: Date.now() + CACHE_TTL_MS };
    }
  }, []);

  useEffect(() => {
    if (settingsSection === 'telegram' && !tgLoading && tgToken?.trim() && tgChatId?.trim()) {
      verifyTgBot(tgToken, tgChatId);
    } else if (settingsSection === 'telegram' && !tgLoading && (!tgToken?.trim() || !tgChatId?.trim())) {
      setTgBotStatus('idle');
    }
  }, [settingsSection, tgLoading, tgToken, tgChatId, verifyTgBot]);

  useEffect(() => {
    if (settingsSection !== 'api-logs' || !user) return;
    let cancelled = false;
    setApiLogsLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from('automation_logs')
          .select('id, user_id, slot_id, status, payload, response_body, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);
        if (!cancelled && data) setApiLogs((data as AutomationLogRow[]) || []);
      } finally {
        if (!cancelled) setApiLogsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [settingsSection, user?.id]);

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
    localStorage.setItem('telsim_webhook_url', webhookUrl);
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

  // ─── API Log retry ───────────────────────────────────────────────────────────
  const handleApiLogRetry = async (logId: string) => {
    if (!user?.id || apiLogsRetryingId) return;
    setApiLogsRetryingId(logId);
    try {
      const res = await fetch('/api/webhooks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || t('webhook_logs.retry_failed'));
        return;
      }
      const newStatus = String(data.status ?? '');
      const newResponseBody = data.response_body;
      setApiLogs(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus, response_body: newResponseBody } : l));
      if (apiLogsDrawerLog?.id === logId) {
        setApiLogsDrawerLog(prev => prev ? { ...prev, status: newStatus, response_body: newResponseBody } : null);
      }
    } catch {
      alert(t('webhook_logs.retry_failed'));
    } finally {
      setApiLogsRetryingId(null);
    }
  };

  const isApiLogOk = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === '200' || s === 'success';
  };

  // ─── Language handler ─────────────────────────────────────────────────────────

  const handleLanguageSave = (lang: 'es' | 'en') => {
    setAppLanguage(lang);
    localStorage.setItem('telsim_language', lang);
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 3000);
  };

  const handleNotifPrefToggle = async (key: string, channel: 'inapp' | 'email' | 'telegram') => {
    const updated = {
      ...notifPrefs,
      [key]: { ...notifPrefs[key], [channel]: !notifPrefs[key][channel] }
    };
    setNotifPrefs(updated);
    setNotifPrefsSaving(true);
    try {
      await supabase
        .from('users')
        .update({ notification_preferences: updated })
        .eq('id', user!.id);
      setNotifPrefsSaved(true);
      setTimeout(() => setNotifPrefsSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setNotifPrefsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;
    setTestNotifLoading(true);
    try {
      const res = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || t('notif_settings.test_error_fallback'));
        return;
      }
      alert(t('notif_settings.test_notification_sent'));
    } catch (e) {
      alert(t('notif_settings.connection_error'));
    } finally {
      setTestNotifLoading(false);
    }
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

  // ─── Profile edit handler ──────────────────────────────────────────────────────

  const handleProfileSave = async () => {
    setEditError('');
    if (!editFullName.trim()) { setEditError('El nombre completo es obligatorio.'); return; }
    setEditSaving(true);
    try {
      await (supabase.auth as any).updateUser({
        data: { full_name: editFullName.trim(), phone: editPhone.trim(), country: editCountry, moneda: editCurrency }
      });
      await supabase.from('users').update({
        nombre: editFullName.trim(),
        phone: editPhone.trim(),
        pais: editCountry,
        moneda: editCurrency,
      }).eq('id', user?.id);
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (e: any) { setEditError(e.message || 'Error al guardar el perfil.'); }
    finally { setEditSaving(false); }
  };

  // ─── Billing data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'billing' || !user) return;
    setBillingLoading(true);
    supabase.from('subscriptions').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setSubscriptions(data); setBillingLoading(false); });
  }, [activeTab, user]);

  // ─── Open inbox + mark as read ────────────────────────────────────────────────

  const handleOpenInbox = async (slotId: string) => {
    setSelectedSlot(slotId);
    setActiveTab('messages');
    const unread = messages.filter(m => m.slot_id === slotId && !m.is_read);
    if (unread.length > 0) {
      await supabase.from('sms_logs').update({ is_read: true })
        .eq('slot_id', slotId).eq('is_read', false);
      setMessages(prev => prev.map(m => m.slot_id === slotId ? { ...m, is_read: true } : m));
    }
  };

  // ─── Download CSV usage report ────────────────────────────────────────────────

  const handleDownloadReport = () => {
    const rows = [
      ['Fecha', 'Número', 'Region', 'Remitente', 'Contenido', 'Código Extraído'].join(','),
      ...messages.map(m => {
        const slot = slots.find(s => s.slot_id === m.slot_id);
        return [
          new Date(m.received_at).toLocaleDateString('es-CL'),
          slot?.phone_number || m.slot_id,
          slot?.region || '',
          `"${(m.sender || '').replace(/"/g, '""')}"`,
          `"${(m.content || '').replace(/"/g, '""')}"`,
          m.extracted_code || '',
        ].join(',');
      }),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `telsim-reporte-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Stripe Customer Portal ───────────────────────────────────────────────────

  const handleStripePortal = async () => {
    const sub = subscriptions.find(s => s.stripe_customer_id);
    if (!sub?.stripe_customer_id) { alert('No se encontró información de tu suscripción en Stripe. Contacta soporte.'); return; }
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: sub.stripe_customer_id, returnUrl: window.location.href }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e: any) { alert('Error al abrir el portal de Stripe: ' + e.message); }
  };

  // ─── Release slot (cancel subscription + free slot) ───────────────────────────

  const handleReleaseSlot = async () => {
    if (!slotToRelease || !user || !confirmReleaseCheck) return;
    setReleasing(true);
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('slot_id', slotToRelease.slot_id)
        .eq('user_id', user.id);

      const { error: slotError } = await supabase
        .from('slots')
        .update({
          assigned_to: null,
          status: 'libre',
          plan_type: null,
          label: null,
          forwarding_active: false,
        })
        .eq('slot_id', slotToRelease.slot_id);

      if (slotError) throw slotError;

      setSlots(prev => prev.filter(s => s.slot_id !== slotToRelease.slot_id));
      setIsReleaseModalOpen(false);
      setSlotToRelease(null);
      setConfirmReleaseCheck(false);
      setReleaseSuccessToast(true);
      setTimeout(() => setReleaseSuccessToast(false), 4000);
    } catch (err: any) {
      console.error('[RELEASE ERROR]', err);
      alert(err.message || 'Error al dar de baja la SIM.');
    } finally {
      setReleasing(false);
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
        cardBg: 'bg-gradient-to-br from-[#B49248] via-[#D4AF37] to-[#8C6B1C]',
        chip: 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-100',
        label: 'Power',
        phoneColor: 'text-white',
        labelColor: 'text-white/80',
      };
      case 'pro': return {
        cardBg: 'bg-gradient-to-br from-[#0047FF] via-[#0094FF] to-[#00C8FF]',
        chip: 'bg-gradient-to-br from-slate-200 via-slate-100 to-white',
        label: 'Pro',
        phoneColor: 'text-white',
        labelColor: 'text-white/80',
      };
      default: return {
        cardBg: 'bg-white border border-slate-200',
        chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
        label: 'Starter',
        phoneColor: 'text-slate-900',
        labelColor: 'text-slate-400',
      };
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const today = new Date().toDateString();
  const todayMessages = messages.filter(m => new Date(m.received_at).toDateString() === today);
  const activeSlots = slots.filter(s => s.status !== 'expired');

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return messages.filter(m => new Date(m.received_at).toDateString() === d.toDateString()).length;
  });
  const activityLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][d.getDay()];
  });

  const filteredMessages = messages.filter(m => {
    const matchSlot = !selectedSlot || m.slot_id === selectedSlot;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || m.content.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q);
    return matchSlot && matchSearch;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  // Header title map
  const TAB_TITLES: Partial<Record<TabId, string>> = {
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
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<MessageSquare size={17} />} label="Mensajes" active={activeTab === 'messages'} badge={unreadCount} onClick={() => setActiveTab('messages')} />
          <NavItem icon={<Smartphone size={17} />} label="Mis SIMs" active={activeTab === 'numbers'} badge={activeSlots.length} onClick={() => setActiveTab('numbers')} />
          <NavItem icon={<CreditCard size={17} />} label="Facturación" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <NavItem icon={<Bell size={17} />} label="Notificaciones" active={activeTab === 'notifications'} badge={notifUnread} onClick={() => { setActiveTab('notifications'); if (notifUnread > 0) markAllNotifRead(); }} />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<Settings size={17} />} label="Ajustes" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setSettingsSection('profile'); }} />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<HelpCircle size={17} />} label="Centro de Ayuda" active={activeTab === 'help'} onClick={() => setActiveTab('help')} />
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
          <button onClick={fetchData} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}><RefreshCw size={15} className="text-slate-400" /></button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>{isDark ? <Sun size={15} className="text-slate-400" /> : <Moon size={15} className="text-slate-400" />}</button>
          <button
            onClick={() => { setActiveTab('notifications'); if (notifUnread > 0) markAllNotifRead(); }}
            className={`relative p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>
            <Bell size={15} className="text-slate-400" />
            {notifUnread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
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
                <KpiCard icon={<Zap size={18} />} label="Créditos disponibles" value={planCredits} sub={`Plan ${planName}`} color="#1152d4" />
                <KpiCard icon={<MessageSquare size={18} />} label="Mensajes hoy" value={todayMessages.length} sub={`${messages.length} en total`} trend={todayMessages.length > 0 ? 12 : undefined} color="#10b981" />
                <KpiCard icon={<Smartphone size={18} />} label="SIMs activas" value={activeSlots.length} sub={`${slots.length} asignadas`} color="#f59e0b" />
                <KpiCard icon={<Shield size={18} />} label="Tasa de éxito" value={messages.length > 0 ? `${Math.round(((messages.length - (messages.filter(m => m.is_spam).length || 0)) / messages.length) * 100)}%` : '—'} sub="Verificaciones OK" trend={3} color="#8b5cf6" />
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
                          const flag = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                          const msgsCnt = messages.filter(m => m.slot_id === slot.slot_id).length;
                          const isActive = slot.status !== 'expired';
                          const pc = PLAN_COLORS[slot.plan_type?.toLowerCase()] ?? PLAN_COLORS.starter;
                          return (
                            <div key={slot.slot_id}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border-l-[3px] ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}
                              style={{ borderLeftColor: pc.border, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}>
                              <div className="text-xl flex-shrink-0">{flag}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate">{slot.label || formatPhone(slot.phone_number)}</p>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleFeedRefresh}
                        disabled={feedRefreshing}
                        className={`p-2 rounded-lg transition-all flex items-center justify-center ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                          } ${feedRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Actualizar feed"
                      >
                        <RefreshCw size={16} className={feedRefreshing ? 'animate-spin' : ''} />
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-emerald-500">En vivo</span>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex items-center justify-center py-8"><RefreshCw size={20} className="text-slate-400 animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <MessageSquare size={28} /><p className="text-[12px] font-semibold">Sin mensajes aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[540px] pr-2">
                      {messages.slice(0, 10).map((msg, idx) => {
                        const svc = detectService(msg.sender, msg.content);
                        const code = msg.verification_code || extractCode(msg.content);
                        const slot = slots.find(s => s.slot_id === msg.slot_id);
                        const flag = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                        const simNum = slot?.phone_number ?? slot?.label ?? 'SIM';
                        const hasLogo = BrandLogo({ brand: svc.key }) !== null;
                        const isLatest = idx === 0;

                        return (
                          <div
                            key={msg.id}
                            className={`animate-in fade-in slide-in-from-bottom-3 duration-400 rounded-2xl border p-4 flex flex-col gap-3 relative transition-all ${isLatest
                              ? isDark ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/60 shadow-lg shadow-primary/20' : 'bg-gradient-to-br from-blue-50 to-blue-25 border-primary/40 shadow-lg shadow-primary/15'
                              : isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/80 border-slate-200'
                              }`}
                            style={{ animationDelay: `${idx * 60}ms` }}
                          >

                            {/* Header: Logo + Brand + Time */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                {/* Service avatar/logo */}
                                <div
                                  className="w-10 h-10 rounded-[0.9rem] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border"
                                  style={{
                                    background: isDark ? svc.darkBg : svc.bg,
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                  }}
                                >
                                  {hasLogo
                                    ? <BrandLogo brand={svc.key} size={20} />
                                    : <span className="text-[10px] font-black" style={{ color: svc.color }}>{svc.label.slice(0, 2).toUpperCase()}</span>
                                  }
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black uppercase tracking-widest truncate" style={{ color: svc.color }}>{svc.label}</p>
                                  <p className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    {flag} {simNum}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`text-[9px] font-black flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(msg.received_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={`text-[8px] font-bold flex-shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {timeAgo(msg.received_at)}
                                </span>
                              </div>
                            </div>

                            {/* SMS Message Bubble */}
                            <div className={`rounded-[1.2rem] rounded-tl-[0.3rem] px-4 py-3 border ${isDark ? 'bg-slate-700/80 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                              }`}>
                              <p className="text-[12px] leading-[1.5] font-medium break-words">{msg.content}</p>
                            </div>

                            {/* Code Block */}
                            {code && (
                              <div className={`rounded-[1.2rem] rounded-tl-[0.3rem] border px-3.5 py-3 flex items-center justify-between ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-white'
                                }`}>
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Código</p>
                                  <p className="text-[20px] font-black font-mono tracking-[0.2em] tabular-nums leading-none">{code}</p>
                                </div>
                                <button
                                  onClick={() => handleCopy(msg.id, code)}
                                  title="Copiar código"
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${copiedId === msg.id ? 'bg-emerald-500 text-white' : 'bg-white/15 text-white/70 hover:bg-white/25'
                                    }`}
                                >
                                  {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                                </button>
                              </div>
                            )}
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
                      const svc = detectService(msg.sender, msg.content);
                      const code = msg.verification_code || extractCode(msg.content);
                      const slot = slots.find(s => s.slot_id === msg.slot_id);
                      const flag = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                      const hasLogo = BrandLogo({ brand: svc.key }) !== null;
                      return (
                        <tr key={msg.id} className={`border-b transition-colors ${isDark ? `border-slate-800 ${!msg.is_read ? 'bg-primary/5' : ''} hover:bg-slate-800` : `border-slate-50 ${!msg.is_read ? 'bg-blue-50/50' : ''} hover:bg-slate-50`}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: isDark ? svc.darkBg : svc.bg }}>
                                {hasLogo ? <BrandLogo brand={svc.key} size={17} /> : <span className="text-[9px] font-black" style={{ color: svc.color }}>{svc.label.slice(0, 2).toUpperCase()}</span>}
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
                    const plan = (slot.plan_type || 'starter').toLowerCase();
                    const ps = getWebPlanStyle(plan);
                    const msgsCnt = messages.filter(m => m.slot_id === slot.slot_id && !m.is_read).length;
                    const isActive = slot.status !== 'expired';
                    const isForwarding = !!slot.forwarding_active;
                    const isTog = togglingSlot === slot.slot_id;
                    const isEditing = editingSlotId === slot.slot_id;
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
                                      if (e.key === 'Enter') handleSaveLabel(slot.slot_id);
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
                              <p className={`text-[17px] font-black font-mono tracking-wide leading-none ${ps.phoneColor}`}>
                                {formatPhone(slot.phone_number)}
                              </p>
                            </div>
                          </div>

                          {/* ── Row 3: Plan badge + active indicator ── */}
                          <div className="flex items-end justify-between relative z-10">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${plan === 'power' ? 'border-amber-300/60 text-amber-100   bg-black/20' :
                              plan === 'pro' ? 'border-white/40   text-white/90    bg-black/20' :
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
                        <div className={`flex items-center gap-1 p-1 rounded-[1.1rem] border ${isDark ? 'bg-slate-900 border-slate-800/70' : 'bg-white border-slate-100'}`}>

                          {/* INBOX — wider, primary action */}
                          <button
                            onClick={() => handleOpenInbox(slot.slot_id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[0.8rem] text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                            <MessageSquare size={12} />
                            <span>Inbox</span>
                            {msgsCnt > 0 && (
                              <span className="bg-primary text-white text-[8px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
                                {msgsCnt > 99 ? '99+' : msgsCnt}
                              </span>
                            )}
                          </button>

                          {/* UPGRADE */}
                          <button
                            onClick={() => navigate('/onboarding/plan')}
                            title="Renovar / cambiar plan"
                            className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] transition-colors flex-shrink-0 ${isDark ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-500'}`}>
                            <Zap size={13} />
                          </button>

                          {/* COPY number */}
                          <button
                            onClick={() => handleCopy(`${slot.slot_id}_num`, slot.phone_number)}
                            title="Copiar número"
                            className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] transition-colors flex-shrink-0 ${copiedId === `${slot.slot_id}_num`
                              ? 'bg-emerald-500 text-white'
                              : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-500')
                              }`}>
                            {copiedId === `${slot.slot_id}_num` ? <Check size={13} /> : <Copy size={13} />}
                          </button>

                          {/* BOT toggle */}
                          <button
                            onClick={() => handleToggleForwarding(slot.slot_id, !isForwarding)}
                            disabled={isTog}
                            title={isForwarding ? 'Bot activo – clic para desactivar' : 'Bot inactivo – clic para activar'}
                            className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] transition-colors flex-shrink-0 ${isForwarding
                              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                              : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-500')
                              } ${isTog ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isTog ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                          </button>

                          {/* CANCEL subscription */}
                          <button
                            onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }}
                            title="Dar de baja SIM"
                            className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] transition-colors flex-shrink-0 ${isDark ? 'bg-slate-800 hover:bg-red-900/40 text-slate-500 hover:text-red-400' : 'bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-400'}`}>
                            <Trash2 size={13} />
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
                        const plan = (slot.plan_type || 'starter').toLowerCase();
                        const pc = PLAN_COLORS[plan] ?? PLAN_COLORS.starter;
                        const msgsCnt = messages.filter(m => m.slot_id === slot.slot_id && !m.is_read).length;
                        const isActive = slot.status !== 'expired';
                        const isForwarding = !!slot.forwarding_active;
                        const isTog = togglingSlot === slot.slot_id;
                        const flag = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                        const isEditing = editingSlotId === slot.slot_id;
                        return (
                          <tr key={slot.slot_id}
                            className={`border-b transition-colors border-l-[3px] ${isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50/80'}`}
                            style={{ borderLeftColor: pc.border }}>

                            {/* Número */}
                            <td className="px-5 py-3.5">
                              <span className={`font-bold text-[13px] font-mono tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{formatPhone(slot.phone_number)}</span>
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
                                  className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${isForwarding ? 'bg-sky-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')
                                    } ${isTog ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isForwarding ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                                <span className={`text-[11px] font-medium ${isForwarding ? 'text-sky-500' : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>
                                  {isForwarding ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </td>

                            {/* Acciones: Inbox · Upgrade · Copy · Cancel */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">

                                {/* Inbox */}
                                <button
                                  onClick={() => handleOpenInbox(slot.slot_id)}
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

                                {/* Upgrade */}
                                <button
                                  onClick={() => navigate('/onboarding/plan')}
                                  title="Renovar / cambiar plan"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isDark ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-500'}`}>
                                  <Zap size={11} />
                                </button>

                                {/* Copy */}
                                <button
                                  onClick={() => handleCopy(`${slot.slot_id}_lst`, slot.phone_number)}
                                  title="Copiar número"
                                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${copiedId === `${slot.slot_id}_lst`
                                    ? 'bg-emerald-500 text-white'
                                    : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500')
                                    }`}>
                                  {copiedId === `${slot.slot_id}_lst` ? <Check size={11} /> : <Copy size={11} />}
                                </button>

                                {/* Cancel subscription */}
                                <button
                                  onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }}
                                  title="Dar de baja SIM"
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
                  { id: 'profile', icon: <Settings size={15} />, label: 'Mi Perfil' },
                  { id: 'telegram', icon: <Send size={15} />, label: 'Telegram Bot' },
                  { id: 'api', icon: <Link2 size={15} />, label: 'API & Webhooks' },
                  { id: 'api-logs', icon: <Activity size={15} />, label: t('webhook_logs.api_logs') },
                  { id: 'notifications', icon: <Bell size={15} />, label: 'Notificaciones' },
                  { id: 'language', icon: <Globe size={15} />, label: 'Idioma' },
                  { id: 'security', icon: <ShieldCheck size={15} />, label: 'Seguridad' },
                ] as { id: SettingsSection; icon: React.ReactNode; label: string }[]).map(item => (
                  <button key={item.id} onClick={() => setSettingsSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all mb-0.5 ${settingsSection === item.id ? 'bg-primary text-white' : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')
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
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center">
                          {avatarUrl
                            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            : <span className="text-white text-[22px] font-black">{userInitials}</span>
                          }
                        </div>
                        <label className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-2 shadow-sm transition-colors ${isDark ? 'bg-slate-700 border-slate-900 hover:bg-slate-600' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                          {uploadingAvatar
                            ? <Loader2 size={11} className="animate-spin text-primary" />
                            : <Pencil size={11} className="text-slate-400" />
                          }
                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                        </label>
                      </div>
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
                      <button onClick={() => setSettingsSection('profile-edit')} className="px-4 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors">Editar perfil</button>
                      <button onClick={() => setSettingsSection('security')} className={`px-4 py-2.5 text-[12px] font-bold rounded-xl transition-colors ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Cambiar contraseña</button>
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
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-black flex items-center gap-2">
                          {t('profile.telegram_bot')}
                          <TelegramStatusDot status={tgBotStatus} />
                        </h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('settings.telegram_bot_sub')}</p>
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
                          <p className={`text-[10px] ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('tg.botfather_hint')}</p>
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
                            {t('tg.test_connection')}
                          </button>
                          <button
                            onClick={handleTgSave}
                            disabled={tgSaving || tgTesting}
                            className="flex-1 h-10 flex items-center justify-center gap-2 text-[12px] font-bold rounded-xl bg-primary text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50"
                          >
                            {tgSaving ? <Loader2 size={13} className="animate-spin" /> : tgSaved ? <Check size={13} /> : <Save size={13} />}
                            {tgSaved ? t('notif_settings.saved_excl') : t('common.save')}
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
                            { id: 'sms_received', label: 'SMS recibido', desc: 'Cada mensaje entrante a cualquier SIM' },
                            { id: 'code_detected', label: 'Código OTP detectado', desc: 'Cuando se extrae un código automáticamente' },
                            { id: 'sim_activated', label: 'SIM activada', desc: 'Activación de una nueva SIM' },
                            { id: 'sim_expired', label: 'SIM expirada', desc: 'Cuando vence el período de una SIM' },
                          ].map(ev => (
                            <label key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${webhookEvents.includes(ev.id)
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

                {/* Logs de API (automation_logs) */}
                {settingsSection === 'api-logs' && (
                  <div className="flex flex-col gap-4 relative">
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Activity size={18} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-black">{t('webhook_logs.api_logs')}</h3>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('webhook_logs.event_sms_received')} · {t('webhook_logs.destination')} · {t('webhook_logs.status')}
                          </p>
                        </div>
                      </div>
                      {apiLogsLoading ? (
                        <div className="flex justify-center py-12">
                          <Loader2 size={24} className="animate-spin text-primary" />
                        </div>
                      ) : apiLogs.length === 0 ? (
                        <p className={`py-8 text-center text-[13px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          {t('webhook_logs.no_logs_yet')}
                        </p>
                      ) : (
                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                          <table className="w-full text-left">
                            <thead className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                              <tr>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('webhook_logs.event_sms_received')}</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('webhook_logs.destination')}</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('webhook_logs.status')}</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('webhook_logs.date')}</th>
                                <th className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider w-24 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                              </tr>
                            </thead>
                            <tbody>
                              {apiLogs.map((log) => {
                                const status = (log.status || '').toLowerCase();
                                const statusDisplay = status === 'success' || status === '200' ? t('webhook_logs.status_ok') : status === 'error' || status === 'failed' || status === '400' ? t('webhook_logs.status_error') : t('webhook_logs.status_pending');
                                const dest = (log.payload as Record<string, unknown>)?.chat_id ? t('webhook_logs.destination_telegram') : t('webhook_logs.destination_webhook');
                                const dateStr = log.created_at ? new Date(log.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';
                                const canRetry = !isApiLogOk(log.status);
                                const isRetrying = apiLogsRetryingId === log.id;
                                return (
                                  <tr
                                    key={log.id}
                                    onClick={() => setApiLogsDrawerLog(log)}
                                    className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800 border-b border-slate-800' : 'hover:bg-slate-50 border-b border-slate-100'}`}
                                  >
                                    <td className="px-4 py-3 text-[12px] font-medium text-slate-900 dark:text-white">{t('webhook_logs.event_sms_received')}</td>
                                    <td className="px-4 py-3 text-[12px] text-slate-600 dark:text-slate-300">{dest}</td>
                                    <td className="px-4 py-3 text-[12px] font-semibold">{statusDisplay}</td>
                                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">{dateStr}</td>
                                    <td className="px-4 py-3 text-[11px]" onClick={e => e.stopPropagation()}>
                                      {canRetry && (
                                        <button
                                          type="button"
                                          onClick={() => handleApiLogRetry(log.id)}
                                          disabled={!!apiLogsRetryingId}
                                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} disabled:opacity-50`}
                                        >
                                          {isRetrying ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                          {isRetrying ? t('webhook_logs.retrying') : t('webhook_logs.retry')}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Drawer: Payload + Response */}
                    {apiLogsDrawerLog && (
                      <>
                        <div className="fixed inset-0 bg-black/50 z-[200]" onClick={() => setApiLogsDrawerLog(null)} />
                        <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md z-[201] shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <h4 className="text-[14px] font-black">{t('webhook_logs.payload')} / {t('webhook_logs.response')}</h4>
                            <div className="flex items-center gap-2">
                              {!isApiLogOk(apiLogsDrawerLog.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleApiLogRetry(apiLogsDrawerLog.id)}
                                  disabled={!!apiLogsRetryingId}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} disabled:opacity-50`}
                                >
                                  {apiLogsRetryingId === apiLogsDrawerLog.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                  {apiLogsRetryingId === apiLogsDrawerLog.id ? t('webhook_logs.retrying') : t('webhook_logs.retry')}
                                </button>
                              )}
                              <button onClick={() => setApiLogsDrawerLog(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <X size={18} />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('webhook_logs.payload')}</p>
                              <pre className={`p-4 rounded-xl text-[11px] overflow-x-auto font-mono ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                                {JSON.stringify(apiLogsDrawerLog.payload ?? {}, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('webhook_logs.response')}</p>
                              <pre className={`p-4 rounded-xl text-[11px] overflow-x-auto font-mono ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
                                {apiLogsDrawerLog.response_body != null
                                  ? JSON.stringify(apiLogsDrawerLog.response_body, null, 2)
                                  : (t('webhook_logs.status') + ': ' + (apiLogsDrawerLog.status || '—'))}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Notificaciones */}
                {settingsSection === 'notifications' && (
                  <div className="flex flex-col gap-4">

                    {/* Header card */}
                    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Bell size={18} className="text-amber-500" />
                          </div>
                          <div>
                            <h3 className="text-[15px] font-black">{t('notif_settings.notifications_heading')}</h3>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('notif_settings.notifications_subheading')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {notifPrefsSaving && <Loader2 size={13} className="animate-spin text-slate-400" />}
                          {notifPrefsSaved && !notifPrefsSaving && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                              <Check size={12} /> {t('notif_settings.saved')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Channel legend */}
                      <div className={`flex items-center gap-4 mt-4 px-4 py-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('notif_settings.channels_label')}</span>
                        {[
                          { icon: '🔔', labelKey: 'notif_settings.channel_inapp' },
                          { icon: '✉️', labelKey: 'notif_settings.channel_email' },
                          { icon: '🤖', labelKey: 'notif_settings.channel_telegram' },
                        ].map(c => (
                          <div key={c.labelKey} className="flex items-center gap-1.5">
                            <span className="text-sm">{c.icon}</span>
                            <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t(c.labelKey)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notification rows */}
                    {([
                      {
                        section: 'SMS & Mensajes',
                        items: [
                          { key: 'sms_received',  icon: '💬', label: 'SMS recibido',       desc: 'Cada mensaje entrante a cualquier SIM' },
                          { key: 'code_detected', icon: '🔐', label: 'Código OTP detectado', desc: 'Extracción automática de código de verificación' },
                        ]
                      },
                      {
                        section: 'SIMs',
                        items: [
                          { key: 'sim_activated', icon: '📱', label: 'SIM activada',    desc: 'Confirmación cuando una SIM queda operativa' },
                          { key: 'sim_expired',   icon: '⏰', label: 'SIM por vencer',  desc: 'Aviso 3 días antes del vencimiento' },
                        ]
                      },
                      {
                        section: 'Pagos & Facturación',
                        items: [
                          { key: 'payment_success', icon: '✅', label: 'Pago exitoso', desc: 'Confirmación de cobro procesado correctamente' },
                          { key: 'payment_failed',  icon: '⚠️', label: 'Pago fallido', desc: 'Alerta si falla un cobro o hay problema con tu tarjeta' },
                        ]
                      },
                      {
                        section: 'Sistema',
                        items: [
                          { key: 'security_alerts', icon: '🛡️', label: 'Alertas de seguridad', desc: 'Inicios de sesión y cambios en tu cuenta' },
                          { key: 'daily_summary',   icon: '📊', label: 'Resumen diario',       desc: 'Estadísticas del día: SMS recibidos y códigos detectados' },
                        ]
                      },
                    ] as { section: string; items: { key: string; icon: string; label: string; desc: string }[] }[]).map(group => (
                      <div key={group.section} className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                        <div className={`px-5 py-3 border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{group.section}</p>
                        </div>
                        {group.items.map((item, i) => {
                          const prefs = notifPrefs[item.key] ?? { inapp: false, email: false, telegram: false };
                          return (
                            <div key={item.key} className={`flex items-center gap-4 px-5 py-4 ${i < group.items.length - 1 ? `border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}` : ''}`}>
                              {/* Icon + label */}
                              <span className="text-xl flex-shrink-0">{item.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold">{item.label}</p>
                                <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                              </div>

                              {/* Channel toggles */}
                              <div className="flex items-center gap-4 flex-shrink-0">
                                {/* In-app */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{t('notif_settings.channel_inapp')}</span>
                                  <button
                                    onClick={() => handleNotifPrefToggle(item.key, 'inapp')}
                                    className={`relative w-9 h-5 rounded-full transition-all duration-300 ${prefs.inapp ? 'bg-amber-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.inapp ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{t('notif_settings.channel_email')}</span>
                                  <button
                                    onClick={() => handleNotifPrefToggle(item.key, 'email')}
                                    className={`relative w-9 h-5 rounded-full transition-all duration-300 ${prefs.email ? 'bg-primary' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.email ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                                </div>

                                {/* Telegram */}
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{t('notif_settings.channel_telegram')}</span>
                                  <button
                                    onClick={() => handleNotifPrefToggle(item.key, 'telegram')}
                                    className={`relative w-9 h-5 rounded-full transition-all duration-300 ${prefs.telegram ? 'bg-sky-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${prefs.telegram ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Footer info */}
                    <div className={`flex gap-3 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span dangerouslySetInnerHTML={{ __html: t('notif_settings.footer_email_telegram') }} />
                        </p>
                      </div>
                    </div>

                    {/* Probar notificaciones */}
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={testNotifLoading}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 text-[13px] font-bold transition-colors ${isDark ? 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-700/50' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {testNotifLoading ? <Loader2 size={16} className="animate-spin" /> : `🧪 ${t('notif_settings.test_notifications')}`}
                    </button>
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
                          className={`p-4 rounded-xl border-2 text-left transition-all ${appLanguage === lang.code
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

                {/* ── EDITAR PERFIL ── */}
                {settingsSection === 'profile-edit' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><User size={18} className="text-primary" /></div>
                      <div>
                        <h3 className="text-[15px] font-black">Editar Perfil</h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actualiza tu información personal</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-5 max-w-2xl">
                      {/* Full Name */}
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Nombre Completo
                        </label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={e => { setEditFullName(e.target.value); setEditError(''); }}
                          placeholder="Tu nombre completo"
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'}`}
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          placeholder="+56 9 XXXX XXXX"
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'}`}
                        />
                      </div>

                      {/* Country */}
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          País
                        </label>
                        <select
                          value={editCountry}
                          onChange={e => setEditCountry(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary'}`}
                        >
                          <option value="Chile">Chile</option>
                          <option value="Argentina">Argentina</option>
                          <option value="Colombia">Colombia</option>
                          <option value="Mexico">México</option>
                          <option value="Perú">Perú</option>
                          <option value="Venezuela">Venezuela</option>
                          <option value="Bolivia">Bolivia</option>
                          <option value="Ecuador">Ecuador</option>
                          <option value="Paraguay">Paraguay</option>
                          <option value="Uruguay">Uruguay</option>
                          <option value="España">España</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {/* Currency */}
                      <div>
                        <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Moneda
                        </label>
                        <select
                          value={editCurrency}
                          onChange={e => setEditCurrency(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-primary' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary'}`}
                        >
                          <option value="CLP">CLP - Peso Chileno</option>
                          <option value="ARS">ARS - Peso Argentino</option>
                          <option value="COP">COP - Peso Colombiano</option>
                          <option value="MXN">MXN - Peso Mexicano</option>
                          <option value="PEN">PEN - Sol Peruano</option>
                          <option value="VES">VES - Bolívar Venezolano</option>
                          <option value="BOB">BOB - Boliviano</option>
                          <option value="USD">USD - Dólar Estadounidense</option>
                          <option value="EUR">EUR - Euro</option>
                        </select>
                      </div>

                      {/* Error */}
                      {editError && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                          <Info size={13} className="text-red-500 flex-shrink-0" />
                          <p className="text-[12px] text-red-500 font-semibold">{editError}</p>
                        </div>
                      )}

                      {/* Success */}
                      {editSuccess && (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                          <p className="text-[12px] text-emerald-500 font-semibold">¡Perfil actualizado correctamente!</p>
                        </div>
                      )}

                      <button onClick={handleProfileSave} disabled={editSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 w-fit">
                        {editSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {editSaving ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
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
                              {[1, 2, 3, 4].map(level => (
                                <div key={level} className={`flex-1 h-1 rounded-full transition-colors ${secNewPw.length >= level * 3
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
                              className={`w-full px-3 py-2.5 pr-10 rounded-xl border text-[13px] outline-none transition-colors ${secConfirmPw && secConfirmPw !== secNewPw
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

          {/* ── BILLING TAB ─────────────────────────────────────────────── */}
          {activeTab === 'billing' && (
            <div className="flex flex-col gap-6">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-black">Facturación</h2>
                  <p className={`text-[12px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gestiona tu plan, facturas y métodos de pago</p>
                </div>
                <button onClick={handleDownloadReport}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  <Download size={13} /> Descargar reporte CSV
                </button>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: <Smartphone size={15} />, label: 'SIMs activas', value: activeSlots.length.toString(), color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50' },
                  { icon: <MessageSquare size={15} />, label: 'SMS este mes', value: messages.length.toString(), color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
                  { icon: <Receipt size={15} />, label: 'Próxima factura', value: billingLoading ? '...' : (() => { const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing'); const total = active.reduce((acc, s) => acc + (Number(s.amount) || 0), 0); return total > 0 ? `$${total.toFixed(2)}` : '$0.00'; })(), color: 'text-primary', bg: isDark ? 'bg-primary/10' : 'bg-blue-50' },
                  { icon: <Calendar size={15} />, label: 'Próximo cobro', value: billingLoading ? '...' : (() => { const s = subscriptions.find(x => x.status === 'active' && x.renewal_date); return s ? new Date(s.renewal_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'; })(), color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-2xl p-4 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
                      <span className={stat.color}>{stat.icon}</span>
                    </div>
                    <p className="text-[20px] font-black">{stat.value}</p>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Current plan card */}
                <div className={`lg:col-span-1 rounded-2xl p-5 border shadow-sm flex flex-col gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary/10' : 'bg-blue-50'}`}>
                      <Star size={14} className="text-primary" />
                    </div>
                    <h3 className="text-[13px] font-black">Plan actual</h3>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[22px] font-black capitalize">{planName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 uppercase">Activo</span>
                    </div>
                    <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{planCredits} créditos SMS / mes · {activeSlots.length} SIM{activeSlots.length !== 1 ? 's' : ''}</p>
                    <div className={`rounded-xl p-3 text-[11px] ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <div className="flex justify-between mb-1.5">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>SMS usados</span>
                        <span className="font-bold">{messages.length} / {planCredits}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (messages.length / Math.max(planCredits, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-auto">
                    <button onClick={handleStripePortal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors">
                      <ExternalLink size={13} /> Gestionar en Stripe
                    </button>
                    <button onClick={() => navigate('/onboarding/plan')}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-colors border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <TrendingUp size={13} /> Cambiar plan
                    </button>
                  </div>
                </div>

                {/* Invoice history */}
                <div className={`lg:col-span-2 rounded-2xl p-5 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                      <FileText size={14} className="text-emerald-500" />
                    </div>
                    <h3 className="text-[13px] font-black">Historial de facturas</h3>
                  </div>
                  {billingLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw size={18} className="text-slate-400 animate-spin" />
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <FileText size={28} className="text-slate-300" />
                      <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sin facturas disponibles</p>
                    </div>
                  ) : (
                    <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <table className="w-full text-left text-[12px]">
                        <thead>
                          <tr className={`text-[10px] font-black uppercase tracking-wider border-b ${isDark ? 'border-slate-800 text-slate-500 bg-slate-800/50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}>
                            <th className="px-4 py-2.5">Fecha</th>
                            <th className="px-4 py-2.5">Número</th>
                            <th className="px-4 py-2.5">Plan</th>
                            <th className="px-4 py-2.5">Créditos</th>
                            <th className="px-4 py-2.5">Importe</th>
                            <th className="px-4 py-2.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptions.map((sub, i) => (
                            <tr key={sub.id || i} className={`border-b transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800/40' : 'border-slate-50 hover:bg-slate-50'}`}>
                              <td className="px-4 py-3 font-mono text-[11px]">{sub.created_at ? new Date(sub.created_at).toLocaleDateString('es-ES') : '—'}</td>
                              <td className="px-4 py-3 font-mono text-[11px]">{sub.phone_number || '—'}</td>
                              <td className="px-4 py-3 font-semibold capitalize">{sub.plan_name || sub.plan_type || 'Starter'}</td>
                              <td className="px-4 py-3">{sub.monthly_limit ? `${sub.monthly_limit} SMS` : '—'}</td>
                              <td className="px-4 py-3 font-bold">{sub.amount ? `$${Number(sub.amount).toFixed(2)} ${(sub.currency || 'usd').toUpperCase()}` : '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                  sub.status === 'trialing' ? 'bg-sky-500/10 text-sky-500' :
                                    sub.status === 'past_due' ? 'bg-amber-500/10 text-amber-500' :
                                      sub.status === 'canceled' ? 'bg-slate-500/10 text-slate-400' :
                                        'bg-emerald-500/10 text-emerald-500'
                                  }`}>{sub.status || 'active'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment method row */}
              <div className={`rounded-2xl p-5 border shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <CreditCard size={14} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold">Método de pago</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Gestiona tus tarjetas y métodos de pago en el portal de Stripe</p>
                    </div>
                  </div>
                  <button onClick={handleStripePortal}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <ExternalLink size={12} /> Abrir portal
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── NOTIFICATIONS TAB ───────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-black">Notificaciones</h2>
                  <p className={`text-[12px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Centro de control · Actualizaciones en tiempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  {notifUnread > 0 && (
                    <button onClick={markAllNotifRead}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors border ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <Check size={12} /> Marcar todo leído
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={clearAllNotifs}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-colors border ${isDark ? 'border-slate-800 text-slate-500 hover:border-red-800 hover:text-red-400 hover:bg-red-900/10' : 'border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400 hover:bg-red-50'}`}>
                      <Trash2 size={12} /> Limpiar todo
                    </button>
                  )}
                </div>
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={20} className="text-slate-400 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className={`rounded-2xl p-16 flex flex-col items-center gap-4 text-center border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <Bell size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[14px] font-black mb-1">Sin actividad reciente</p>
                    <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Aquí verás: activaciones de SIM, compras, alertas de pago, seguridad y más.</p>
                  </div>
                </div>
              ) : (() => {
                const getNotifIcon = (type: string, size = 18) => {
                  switch (type) {
                    case 'activation': return <Smartphone size={size} />;
                    case 'subscription': return <CreditCard size={size} />;
                    case 'success': return <CheckCircle2 size={size} />;
                    case 'error': return <AlertCircle size={size} />;
                    case 'warning': return <AlertTriangle size={size} />;
                    case 'security': return <ShieldCheck size={size} />;
                    default: return <Bell size={size} />;
                  }
                };
                const getNotifStyle = (type: string) => {
                  switch (type) {
                    case 'activation': return { icon: 'text-primary', bg: isDark ? 'bg-primary/10' : 'bg-blue-50', ring: isDark ? 'ring-primary/20' : 'ring-primary/30' };
                    case 'subscription': return { icon: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50', ring: isDark ? 'ring-violet-500/20' : 'ring-violet-300' };
                    case 'success': return { icon: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', ring: isDark ? 'ring-emerald-500/20' : 'ring-emerald-300' };
                    case 'error': return { icon: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50', ring: isDark ? 'ring-rose-500/20' : 'ring-rose-300' };
                    case 'warning': return { icon: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', ring: isDark ? 'ring-amber-500/20' : 'ring-amber-300' };
                    case 'security': return { icon: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50', ring: isDark ? 'ring-rose-500/20' : 'ring-rose-300' };
                    default: return { icon: 'text-slate-500', bg: isDark ? 'bg-slate-800' : 'bg-slate-100', ring: isDark ? 'ring-slate-700' : 'ring-slate-200' };
                  }
                };
                const fmtTime = (ds: string) => {
                  const d = new Date(ds), diff = Math.floor((Date.now() - d.getTime()) / 60000);
                  if (diff < 1) return 'ahora';
                  if (diff < 60) return `${diff}m`;
                  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
                  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                };
                const LABELS: Record<string, string> = {
                  all: 'Todos', activation: 'Activaciones', subscription: 'Suscripciones',
                  success: 'Éxito', error: 'Errores', warning: 'Alertas', security: 'Seguridad', system: 'Sistema', info: 'Info', message: 'Mensajes',
                };
                const counts: Record<string, number> = { all: notifications.length };
                notifications.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
                const pills = ['all', ...Object.keys(counts).filter(k => k !== 'all')];
                const filtered = notifFilter === 'all' ? notifications : notifications.filter(n => n.type === notifFilter);

                return (
                  <>
                    {/* Filter pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {pills.map(type => (
                        <button key={type} onClick={() => setNotifFilter(type)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${notifFilter === type
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                            }`}>
                          {type !== 'all' && <span className={notifFilter === type ? 'text-white/80' : getNotifStyle(type).icon}>{getNotifIcon(type, 11)}</span>}
                          {LABELS[type] || type}
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${notifFilter === type ? 'bg-white/20 text-white' : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>{counts[type] || 0}</span>
                        </button>
                      ))}
                    </div>

                    {/* Notification cards */}
                    <div className="flex flex-col gap-2.5">
                      {filtered.length === 0 ? (
                        <div className={`rounded-2xl p-8 flex flex-col items-center gap-2 text-center border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                          <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sin notificaciones en esta categoría</p>
                        </div>
                      ) : filtered.map(notif => {
                        const s = getNotifStyle(notif.type);
                        return (
                          <div key={notif.id}
                            onClick={() => markNotifRead(notif.id)}
                            className={`relative flex gap-4 p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.005] ${notif.is_read
                              ? (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
                              : (isDark
                                ? `bg-slate-900 border-slate-700 ring-1 ring-inset ${s.ring}`
                                : `bg-white border-slate-200 shadow-sm ring-1 ring-inset ${s.ring}`)
                              }`}>
                            {!notif.is_read && <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-primary rounded-r-full" />}
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                              <span className={s.icon}>{getNotifIcon(notif.type)}</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  {!notif.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                                  <h4 className={`text-[13px] font-black leading-tight truncate ${notif.is_read ? (isDark ? 'text-slate-400' : 'text-slate-600') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                    {notif.title}
                                  </h4>
                                </div>
                                <span className={`text-[10px] font-semibold flex-shrink-0 tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{fmtTime(notif.created_at)}</span>
                              </div>
                              <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{notif.message}</p>
                              {notif.link && (
                                <button onClick={e => { e.stopPropagation(); navigate(notif.link!); }}
                                  className="mt-2 flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-wider hover:underline">
                                  Ver detalles <ExternalLink size={10} />
                                </button>
                              )}
                              {notif.details && (
                                <div className={`mt-3 grid grid-cols-2 gap-2 p-3 rounded-xl text-[10px] ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                  {notif.details.number && <div><span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Número</span><p className="font-mono font-black text-[12px]">{notif.details.number}</p></div>}
                                  {notif.details.plan && <div><span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Plan</span><p className="font-bold capitalize">{notif.details.plan}</p></div>}
                                  {notif.details.activationDate && <div><span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Activación</span><p className="font-bold">{notif.details.activationDate}</p></div>}
                                  {notif.details.price && <div><span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Precio</span><p className="font-bold">{notif.details.price}</p></div>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* ── HELP CENTER TAB ──────────────────────────────────────────── */}
          {activeTab === 'help' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">

              {/* Hero + search */}
              <div className={`rounded-2xl p-8 text-center border ${isDark ? 'bg-gradient-to-br from-primary/20 to-sky-500/10 border-primary/20' : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                  <HelpCircle size={22} className="text-white" />
                </div>
                <h2 className="text-[22px] font-black mb-1">Centro de Ayuda</h2>
                <p className={`text-[13px] mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>¿En qué podemos ayudarte hoy?</p>
                <div className="relative max-w-md mx-auto">
                  <input
                    value={helpSearch}
                    onChange={e => setHelpSearch(e.target.value)}
                    placeholder="Buscar en la documentación..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-[13px] border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary'}`}
                  />
                  <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              </div>

              {/* Quick guides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  { icon: <Key size={16} />, color: 'text-primary', bg: isDark ? 'bg-primary/10' : 'bg-blue-50', title: 'Primeros pasos', desc: 'Configura tu primera SIM y recibe SMS en minutos.', action: undefined },
                  { icon: <Bot size={16} />, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50', title: 'Telegram Bot', desc: 'Recibe SMS de tus SIMs directamente en Telegram.', action: () => { setActiveTab('settings'); setSettingsSection('telegram'); } },
                  { icon: <Link2 size={16} />, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50', title: 'API & Webhooks', desc: 'Integra Telsim con tus apps vía REST API o webhooks.', action: () => navigate('/dashboard/api-guide') },
                  { icon: <Zap size={16} />, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', title: 'Planes y créditos', desc: 'Entiende cómo funcionan los planes y los créditos SMS.', action: () => navigate('/onboarding/plan') },
                  { icon: <Shield size={16} />, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', title: 'Seguridad', desc: 'Firma de webhooks, autenticación y buenas prácticas.', action: () => navigate('/dashboard/api-guide') },
                  { icon: <CreditCard size={16} />, color: 'text-rose-500', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50', title: 'Facturación', desc: 'Facturas, métodos de pago y gestión de suscripciones.', action: () => setActiveTab('billing') },
                ] as { icon: React.ReactNode; color: string; bg: string; title: string; desc: string; action?: () => void }[])
                  .filter(c => !helpSearch || c.title.toLowerCase().includes(helpSearch.toLowerCase()) || c.desc.toLowerCase().includes(helpSearch.toLowerCase()))
                  .map(card => (
                    <button key={card.title} onClick={card.action}
                      className={`text-left p-4 rounded-2xl border transition-all hover:scale-[1.02] ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${card.bg}`}>
                        <span className={card.color}>{card.icon}</span>
                      </div>
                      <p className="text-[13px] font-bold mb-1">{card.title}</p>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{card.desc}</p>
                    </button>
                  ))}
              </div>

              {/* FAQ */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className="text-[14px] font-black">Preguntas frecuentes</h3>
                </div>
                {([
                  { q: '¿Cómo funciona Telsim?', a: 'Telsim te proporciona números de teléfono reales con SIM física. Puedes recibir SMS (códigos OTP, verificaciones) en cualquier lugar del mundo a través del dashboard, Telegram o API.' },
                  { q: '¿Cuánto tarda en activarse una SIM?', a: 'La activación es inmediata una vez completado el pago. Recibirás el número asignado en tu dashboard en segundos.' },
                  { q: '¿Puedo usar mi SIM para WhatsApp o Telegram?', a: 'Sí. Los números de Telsim sirven para verificar cuentas en cualquier plataforma que admita SMS: WhatsApp, Telegram, Google, Facebook, etc.' },
                  { q: '¿Cómo configuro el webhook?', a: 'Ve a Ajustes → API & Webhooks, ingresa tu URL de endpoint y selecciona los eventos que deseas recibir. Cada SMS dispara un POST con el contenido y el código extraído.' },
                  { q: '¿Qué pasa cuando expira mi SIM?', a: 'Al expirar, el número queda liberado. Puedes renovar antes del vencimiento desde el dashboard para mantener el mismo número si está disponible.' },
                  { q: '¿Cómo cancelo mi suscripción?', a: 'Cancela desde la tarjeta de cada SIM (botón de papelera) o desde el portal de Stripe en Facturación. La SIM permanece activa hasta el final del período pagado.' },
                ] as { q: string; a: string }[])
                  .filter(f => !helpSearch || f.q.toLowerCase().includes(helpSearch.toLowerCase()) || f.a.toLowerCase().includes(helpSearch.toLowerCase()))
                  .map((faq, i, arr) => (
                    <div key={i} className={`px-5 py-4 ${i < arr.length - 1 ? (isDark ? 'border-b border-slate-800' : 'border-b border-slate-100') : ''}`}>
                      <p className="text-[13px] font-bold mb-1">{faq.q}</p>
                      <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{faq.a}</p>
                    </div>
                  ))}
              </div>

              {/* Contact + docs links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="mailto:soporte@telsim.app"
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01] ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:shadow-sm'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-sky-500/10' : 'bg-sky-50'}`}>
                    <MessageSquare size={17} className="text-sky-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">Contactar soporte</p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>soporte@telsim.app · respuesta en &lt;24 h</p>
                  </div>
                  <ExternalLink size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                </a>
                <button onClick={() => navigate('/dashboard/api-guide')}
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01] text-left ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:shadow-sm'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <Code2 size={17} className="text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">Documentación API</p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>REST API · Webhooks · Ejemplos de código</p>
                  </div>
                  <ExternalLink size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                </button>
              </div>

            </div>
          )}

        </main>
      </div>

      {isReleaseModalOpen && slotToRelease && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">

            {/* Header rojo */}
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-7 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight uppercase">Confirmar Baja</h2>
              <p className="text-[12px] font-semibold text-white/70 mt-1">
                {formatPhone(slotToRelease.phone_number)}
              </p>
            </div>

            {/* Body */}
            <div className="p-7 flex flex-col gap-5">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Al confirmar, tu suscripción quedará cancelada de inmediato y el número será liberado del sistema. <strong className="text-slate-700 dark:text-slate-200">Esta acción no puede deshacerse.</strong>
              </p>

              {/* Checklist de consecuencias */}
              <div className={`rounded-2xl p-4 flex flex-col gap-2.5 ${isDark ? 'bg-slate-800' : 'bg-rose-50'}`}>
                {[
                  'Perderás acceso al número de forma permanente',
                  'Los SMS pendientes no podrán recuperarse',
                  'No se realizará ningún reembolso proporcional',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X size={9} className="text-rose-500" />
                    </div>
                    <span className={`text-[11px] font-semibold leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Checkbox confirmación */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmReleaseCheck}
                  onChange={e => setConfirmReleaseCheck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-rose-500 cursor-pointer flex-shrink-0"
                />
                <span className={`text-[11px] font-bold leading-snug select-none ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-700'} transition-colors`}>
                  Confirmo que entiendo las consecuencias y deseo dar de baja este número
                </span>
              </label>

              {/* Botones */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleReleaseSlot}
                  disabled={!confirmReleaseCheck || releasing}
                  className={`w-full h-12 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 ${
                    confirmReleaseCheck
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/30 active:scale-[0.98]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}>
                  {releasing ? <Loader2 size={15} className="animate-spin" /> : 'Dar de baja definitivamente'}
                </button>
                <button
                  onClick={() => { setIsReleaseModalOpen(false); setConfirmReleaseCheck(false); }}
                  className={`w-full h-10 rounded-2xl text-[11px] font-bold transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>
                  Cancelar, mantener mi SIM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {releaseSuccessToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">Suscripción cancelada exitosamente</p>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>El número ha sido liberado del sistema</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebDashboard;
