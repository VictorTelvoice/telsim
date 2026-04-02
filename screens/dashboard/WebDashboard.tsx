import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffectiveUser } from '../../contexts/ImpersonationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
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
  HelpCircle, TrendingUp, Code2, TicketCheck,
  AlertCircle, AlertTriangle, Activity, Volume2, VolumeX, Headphones
} from 'lucide-react';
import TelegramStatusDot from '../../components/TelegramStatusDot';
import UserBillingPanel from '../../components/billing/UserBillingPanel';
import { dedupeLatestSubscriptionPerLine, isInventoryVisibleStatus } from '../../components/billing/subscriptionBillingUtils';
import { resolveAvatarUrlForUi } from '../../lib/resolveAvatarUrl';
import TelsimBrandLogo from '../../components/TelsimBrandLogo';
import { HELP_FAQ_DATA } from '../../lib/helpFaqData';
import RatingModal from '../../components/RatingModal';

type HelpView = 'main' | 'tickets' | 'ticket-chat';
type TicketStatus = 'open' | 'pending' | 'closed';
type SupportTier = 'starter' | 'pro' | 'power' | 'none';
type WebTicket = {
  id: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string | null;
  last_message?: string | null;
  unread?: boolean;
};
type TicketMsg = {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  content: string;
  created_at: string;
};
type LockedSupportChannel = {
  title: string;
  requirement: string;
  hint: string;
} | null;

type VisibleSubscription = {
  id: string;
  user_id: string;
  slot_id: string;
  phone_number: string;
  plan_name: string;
  monthly_limit?: number | null;
  credits_used?: number | null;
  status?: string | null;
  billing_type?: string | null;
  created_at: string;
  amount?: number | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  next_billing_date?: string | null;
  activation_state?: string | null;
  stripe_subscription_id?: string | null;
  stripe_session_id?: string | null;
};

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

type TabId = 'overview' | 'messages' | 'numbers' | 'billing' | 'notifications' | 'support' | 'help' | 'settings';
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

const ReleaseSuccessToastMessage: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const title = 'Suscripción cancelada';
  const sub = 'La suscripción fue cancelada y el número fue liberado del sistema.';
  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 size={16} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">{title}</p>
        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>
      </div>
    </div>
  );
};

const WebDashboard: React.FC = () => {
  const auth = useAuth();
  const effectiveUser = useEffectiveUser(auth.user);
  const user = effectiveUser ?? auth.user;
  const resolvedAvatarUrl = resolveAvatarUrlForUi(user);
  const safeAvatarUrl = resolvedAvatarUrl;
  const { refreshProfile, invalidateProfile, version: authVersion, signOut } = auth;
  const { theme, toggleTheme } = useTheme();
  const { t, language: appLanguage, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'dark';
  const { notifications, unreadCount: notifUnread, loading: notifLoading, markAsRead: markNotifRead, markAllAsRead: markAllNotifRead, clearAll: clearAllNotifs } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('profile');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showRating, setShowRating] = useState(false);
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [supportTier, setSupportTier] = useState<SupportTier>('none');
  const [loadingSupportTier, setLoadingSupportTier] = useState(false);
  const [lockedSupportChannel, setLockedSupportChannel] = useState<LockedSupportChannel>(null);

  useEffect(() => {
    const targetTab = location.state?.activeTab;
    if (targetTab && typeof targetTab === 'string') {
      setActiveTab(targetTab as TabId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  // ─── Ticket support state (web help tab) ───────────────────────────────────
  const [helpView, setHelpView] = useState<HelpView>('main');
  const [helpTickets, setHelpTickets] = useState<WebTicket[]>([]);
  const [helpTicketsLoading, setHelpTicketsLoading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMsg[]>([]);
  const [ticketMessagesLoading, setTicketMessagesLoading] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('open');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketBody, setNewTicketBody] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [sendingTicketReply, setSendingTicketReply] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const ticketBottomRef = useRef<HTMLDivElement>(null);
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
  const [apiSecretKey, setApiSecretKey] = useState<string | null>(null);
  const [apiSecretKeyRevealed, setApiSecretKeyRevealed] = useState<string | null>(null);
  const [apiSecretKeyRegenerating, setApiSecretKeyRegenerating] = useState(false);

  // ─── API Logs (automation_logs) state ───────────────────────────────────────
  const [apiLogs, setApiLogs] = useState<AutomationLogRow[]>([]);
  const [apiLogsLoading, setApiLogsLoading] = useState(false);
  const [automationLogsOverview, setAutomationLogsOverview] = useState<AutomationLogRow[]>([]);
  const [retryingAll, setRetryingAll] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messagePulse, setMessagePulse] = useState(false);
  const feedbackStorageKey = user?.id ? `telsim_feedback_completed:${user.id}` : null;
  const PING_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      audioRef.current = new Audio(PING_URL);
    } catch {
      audioRef.current = null;
    }
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      } catch {
        audioRef.current = null;
      }
    };
  }, []);
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const [apiLogsDrawerLog, setApiLogsDrawerLog] = useState<AutomationLogRow | null>(null);
  const [apiLogsRetryingId, setApiLogsRetryingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSupportTier = async () => {
      if (!auth.user?.id) {
        if (!cancelled) {
          setSupportTier('none');
          setLoadingSupportTier(false);
        }
        return;
      }

      setLoadingSupportTier(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_name, status')
        .eq('user_id', auth.user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[WebDashboard][Help] loadSupportTier error:', error);
        if (!cancelled) {
          setSupportTier('none');
          setLoadingSupportTier(false);
        }
        return;
      }

      const normalized = (Array.isArray(data) ? data : []).map((row) =>
        String(row.plan_name ?? '').trim().toLowerCase()
      );
      const tier: SupportTier = normalized.includes('power')
        ? 'power'
        : normalized.includes('pro')
          ? 'pro'
          : normalized.includes('starter')
            ? 'starter'
            : 'none';

      if (!cancelled) {
        setSupportTier(tier);
        setLoadingSupportTier(false);
      }
    };

    void loadSupportTier();
    return () => {
      cancelled = true;
    };
  }, [auth.user?.id]);

  // ─── Ticket helper functions ────────────────────────────────────────────────
  const fetchHelpTickets = useCallback(async () => {
    if (!auth.user?.id) return;
    setHelpTicketsLoading(true);
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('id, subject, status, created_at, updated_at')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (!data) return setHelpTickets([]);
      const tickets = data as WebTicket[];
      const ticketIds = tickets.map((t) => t.id);
      if (ticketIds.length === 0) {
        setHelpTickets([]);
        return;
      }

      const { data: msgs } = await supabase
        .from('support_messages')
        .select('ticket_id, content, sender_type, created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: false });

      const latestByTicket = new Map<string, { content: string; sender_type: string }>();
      (msgs ?? []).forEach((msg) => {
        const ticketId = String((msg as { ticket_id?: string }).ticket_id || '');
        if (!ticketId || latestByTicket.has(ticketId)) return;
        latestByTicket.set(ticketId, {
          content: String((msg as { content?: string }).content || ''),
          sender_type: String((msg as { sender_type?: string }).sender_type || ''),
        });
      });

      setHelpTickets(
        tickets.map((t) => {
          const last = latestByTicket.get(t.id);
          return {
            ...t,
            last_message: last?.content ?? null,
            unread: last?.sender_type === 'admin',
          };
        })
      );
    } finally {
      setHelpTicketsLoading(false);
    }
  }, [auth.user?.id]);

  const openTicketChat = useCallback(async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setHelpView('ticket-chat');
    setTicketMessagesLoading(true);
    const { data: ticket } = await supabase.from('support_tickets').select('subject, status').eq('id', ticketId).single();
    if (ticket) { setTicketSubject(ticket.subject ?? ''); setTicketStatus(ticket.status as TicketStatus); }
    const { data: msgs } = await supabase.from('support_messages').select('id, ticket_id, sender_type, content, created_at').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    setTicketMessages((msgs as TicketMsg[]) ?? []);
    setTicketMessagesLoading(false);
    setTimeout(() => ticketBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const createHelpTicket = useCallback(async () => {
    if (!newTicketSubject.trim() || !newTicketBody.trim() || !auth.user?.id) return;
    setCreatingTicket(true);
    try {
      const { data: ticket } = await supabase.from('support_tickets').insert({ user_id: auth.user.id, subject: newTicketSubject.trim(), status: 'open' }).select('id').single();
      if (!ticket) return;
      await supabase.from('support_messages').insert({ ticket_id: ticket.id, sender_type: 'user', content: newTicketBody.trim() });
      if (auth.session?.access_token) {
        fetch('/api/manage', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.session.access_token}` }, body: JSON.stringify({ action: 'notify-new-ticket', ticket_id: ticket.id }) }).catch(() => {});
      }
      setNewTicketSubject(''); setNewTicketBody(''); setShowNewTicketForm(false);
      await fetchHelpTickets();
      openTicketChat(ticket.id);
    } finally {
      setCreatingTicket(false);
    }
  }, [newTicketSubject, newTicketBody, auth.user?.id, auth.session?.access_token, fetchHelpTickets, openTicketChat]);

  const sendTicketReply = useCallback(async () => {
    const text = ticketReply.trim();
    if (!text || !selectedTicketId || sendingTicketReply || ticketStatus === 'closed') return;
    setSendingTicketReply(true);
    try {
      const { data: inserted } = await supabase.from('support_messages').insert({ ticket_id: selectedTicketId, sender_type: 'user', content: text }).select('id, ticket_id, sender_type, content, created_at').single();
      if (inserted) setTicketMessages((m) => [...m, inserted as TicketMsg]);
      await supabase.from('support_tickets').update({ updated_at: new Date().toISOString(), status: 'open' }).eq('id', selectedTicketId);
      setTicketStatus('open'); setTicketReply('');
      setTimeout(() => ticketBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } finally {
      setSendingTicketReply(false);
    }
  }, [ticketReply, selectedTicketId, sendingTicketReply, ticketStatus]);

  const supportChannels = useMemo(() => [
    {
      id: 'ticket',
      title: 'Enviar Ticket',
      desc: 'Canal base para todos los clientes. Seguimiento dentro del panel.',
      wait: '1-4 horas',
      enabled: true,
      badge: null as string | null,
      hint: null as string | null,
      icon: <TicketCheck size={18} />,
      tone: isDark
        ? 'from-slate-900 to-slate-800 border-slate-700'
        : 'from-slate-50 to-white border-slate-200',
      iconTone: 'bg-slate-900 text-white',
    },
    {
      id: 'chat',
      title: 'Bot de soporte IA',
      desc: 'Atención automatizada por bot dentro del dashboard. Próximamente disponible.',
      wait: 'Pronto',
      enabled: false,
      badge: 'Próximamente',
      hint: 'Este canal será atendido por un bot y se habilitará pronto.',
      icon: <MessageSquare size={18} />,
      tone: isDark
        ? 'from-primary/15 to-sky-500/10 border-primary/25'
        : 'from-blue-50 to-white border-blue-200',
      iconTone: 'bg-primary text-white',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp 24/7',
      desc: supportTier === 'power'
        ? 'Canal prioritario directo con cobertura continua.'
        : 'Reservado para clientes con plan Power.',
      wait: '24/7',
      enabled: supportTier === 'power',
      badge: supportTier === 'power' ? null : 'Requiere Power',
      hint: supportTier === 'power' ? null : 'Sube a Power para soporte inmediato por WhatsApp 24/7.',
      icon: <Smartphone size={18} />,
      tone: isDark
        ? 'from-emerald-500/10 to-slate-900 border-emerald-500/20'
        : 'from-emerald-50 to-white border-emerald-200',
      iconTone: 'bg-emerald-500 text-white',
    },
  ], [isDark, supportTier]);

  const handleSupportChannelClick = useCallback(async (channelId: 'ticket' | 'chat' | 'whatsapp', enabled: boolean) => {
    if (channelId === 'ticket') {
      setHelpView('tickets');
      await fetchHelpTickets();
      return;
    }

    if (!enabled) {
      setLockedSupportChannel({
        title: channelId === 'chat' ? 'Bot de soporte IA' : 'WhatsApp 24/7',
        requirement: channelId === 'chat' ? 'Este canal será atendido por un bot y aún no está habilitado.' : 'Disponible solo para clientes con plan Power.',
        hint: channelId === 'chat'
          ? 'Muy pronto podrás conversar con un asistente automatizado desde esta misma sección.'
          : 'Sube a Power para desbloquear atención prioritaria por WhatsApp 24/7.',
      });
      return;
    }

    if (channelId === 'chat') {
      setHelpView('tickets');
      await fetchHelpTickets();
      setShowNewTicketForm(true);
      return;
    }

    window.open('https://wa.me/56934449937?text=Hola%20equipo%20Telsim,%20necesito%20soporte%20Power%2024/7.', '_blank', 'noopener,noreferrer');
  }, [fetchHelpTickets]);

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
  const [sidebarAvatarError, setSidebarAvatarError] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);

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
  const totalLimit = Array.isArray(slots) ? (slots.reduce((acc, s) => acc + (s.activeSub?.monthly_limit || 0), 0) || 0) : 0;
  const totalUsed = Array.isArray(slots) ? (slots.reduce((acc, s) => acc + (s.activeSub?.credits_used || 0), 0) || 0) : 0;

  // ─── Data fetching (AbortController: al ir a segundo plano se abortan peticiones para no dejar zombies) ───
  const fetchAbortRef = useRef(new AbortController());
  const inFlightRef = useRef(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchUserAutomationLogs = useCallback(async (limit = 50) => {
    if (!user?.id) return [] as AutomationLogRow[];

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/manage', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'list-automation-logs',
        limit,
        accessToken: session?.access_token || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || 'No se pudieron cargar los logs webhook.');
    }

    return (((body as { logs?: AutomationLogRow[] }).logs) || []) as AutomationLogRow[];
  }, [user?.id]);

  // Cleanup de unmount: abortar requests en vuelo
  useEffect(() => {
    return () => {
      try { fetchAbortRef.current.abort(); } catch {}
    };
  }, []);

  // Cuando el user se va (logout/cambio), abortar requests en vuelo y resetear controladores
  useEffect(() => {
    if (user?.id) return;

    try { fetchAbortRef.current.abort(); } catch {}
    fetchAbortRef.current = new AbortController();
    inFlightRef.current = false;
  }, [user?.id]);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!options?.silent) {
      setLoading(true);
    }
    const signal = fetchAbortRef.current.signal;
    try {
      setFetchError(null);
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select('id, user_id, slot_id, phone_number, plan_name, monthly_limit, credits_used, status, billing_type, created_at, amount, trial_end, current_period_end, next_billing_date, activation_state, stripe_subscription_id, stripe_session_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (signal.aborted) return;
      const visibleSubs = dedupeLatestSubscriptionPerLine((subsData as VisibleSubscription[] | null) || [])
        .filter((sub) => isInventoryVisibleStatus(sub.status));

      if (!visibleSubs || visibleSubs.length === 0) {
        setSlots([]);
        setLoading(false);
        return;
      }

      const uniqueSubs = Array.from(new Map(visibleSubs.map((s) => [s.slot_id, s])).values());

      let slotsData: Slot[] = [];
      let clientRows: Slot[] = [];
      let backendRows: Slot[] = [];

      const { data } = await supabase
        .from('slots')
        .select('slot_id, phone_number, plan_type, assigned_to, created_at, status, region, label, forwarding_active, forwarding_channel, forwarding_config')
        .in('slot_id', uniqueSubs.map(s => s.slot_id))
        .abortSignal(signal);
      if (signal.aborted) return;
      clientRows = (data as Slot[]) || [];

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const slotsRes = await fetch('/api/manage', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'get-owned-slots',
            slotIds: uniqueSubs.map(s => s.slot_id),
            accessToken: session?.access_token || null,
          }),
          signal,
        });
        if (signal.aborted) return;

        const slotsBody = await slotsRes.json().catch(() => ({}));
        if (slotsRes.ok) {
          backendRows = (((slotsBody as { slots?: Slot[] }).slots) || []) as Slot[];
        } else {
          console.warn('[WebDashboard] backend owned slots fetch failed', slotsBody);
        }
      } catch (backendErr) {
        console.warn('[WebDashboard] fallback to client slots query', backendErr);
      }

      const mergedSlotsById = new Map<string, Slot>();
      clientRows.forEach((slot) => mergedSlotsById.set(slot.slot_id, slot));
      backendRows.forEach((slot) => mergedSlotsById.set(slot.slot_id, slot));
      slotsData = Array.from(mergedSlotsById.values());

      const finalData = uniqueSubs
        .map(sub => {
          const slot = slotsData?.find(s => s.slot_id === sub.slot_id);
          if (slot) return { ...slot, activeSub: sub };
          return {
            slot_id: sub.slot_id,
            phone_number: sub.phone_number,
            plan_type: sub.plan_name,
            assigned_to: sub.user_id,
            created_at: sub.created_at,
            status: 'ocupado',
            activeSub: sub,
          };
        })
        .filter(Boolean);

      setSlots(finalData as Slot[]);

      // Limpiar keys de onboarding si el usuario ya tiene SIMs activas
      if ((finalData as Slot[]).length > 0) {
        ['selected_plan', 'selected_billing', 'selected_plan_annual',
         'post_login_redirect', 'selected_plan_price_id', 'selected_plan_price']
          .forEach((k) => localStorage.removeItem(k));
      }

      const { data: msgs } = await supabase
        .from('sms_logs')
        .select('id, user_id, sender, content, received_at, slot_id, service_name, verification_code, is_read')
        .eq('user_id', user?.id)
        .order('received_at', { ascending: false })
        .limit(60)
        .abortSignal(signal);
      if (signal.aborted) return;
      if (msgs) setMessages(msgs as SMSLog[]);

      const logsData = await fetchUserAutomationLogs(50);
      if (signal.aborted) return;
      setAutomationLogsOverview(logsData || []);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error(e);
      // Parche anti-storm: sin retry automático (evita loops ante 5xx / degradación)
      const msg =
        (typeof e?.message === 'string' && e.message) ||
        (typeof e?.error_description === 'string' && e.error_description) ||
        'Error cargando datos. Intenta nuevamente.';
      setFetchError(msg);
    } finally {
      if (!signal.aborted && !options?.silent) setLoading(false);
      inFlightRef.current = false;
    }
  }, [user?.id, fetchUserAutomationLogs]);

  // Primera carga en cuanto user.id esté disponible; no se espera a auth loading
  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id, fetchData]);

  useEffect(() => {
    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        if (visibilityTimer) clearTimeout(visibilityTimer);
        fetchAbortRef.current.abort();
        fetchAbortRef.current = new AbortController();
      } else {
        visibilityTimer = setTimeout(() => fetchData(), 3000);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (visibilityTimer) clearTimeout(visibilityTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchData]);

  useEffect(() => {
    const userId = user?.id;
    if (activeTab !== 'overview' || !userId || fetchError) return;

    const refreshOverviewFeed = async () => {
      try {
        const { data } = await supabase
          .from('sms_logs')
          .select('id, user_id, sender, content, received_at, slot_id, service_name, verification_code, is_read')
          .eq('user_id', userId)
          .order('received_at', { ascending: false })
          .limit(60);
        if (data) setMessages(data as SMSLog[]);
      } catch (e: any) {
        console.error('Error refreshing feed:', e);
      }
    };

    void refreshOverviewFeed();
  }, [user?.id, activeTab, fetchError]);

  const getAvatarStoragePathFromUrl = (url: string): string | null => {
    if (!url || !url.includes('avatars/')) return null;
    const path = url.split('avatars/')[1]?.split('?')[0];
    return path && path.length > 0 ? path : null;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen no puede superar 2MB.'); return; }
    setUploadingAvatar(true);
    try {
      // 1. Si ya tenía foto en Supabase Storage (URL contiene 'avatars/'), eliminarla antes de subir la nueva
      const oldUrl = user?.avatar_url;
      const oldPath = oldUrl ? getAvatarStoragePathFromUrl(oldUrl) : null;
      if (oldPath) {
        try {
          await supabase.storage.from('avatars').remove([oldPath]);
        } catch {
          // Si el borrado falla (ej. archivo no existe), continuamos con la subida
        }
      }

      // 2. Subir la nueva foto al Storage
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      // 3. Actualizar la tabla users con la nueva URL
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);

      await (supabase.auth as any).updateUser({ data: { avatar_url: publicUrl } });

      invalidateProfile();
      await refreshProfile();
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
      const { data } = await supabase
        .from('sms_logs')
        .select('id, user_id, sender, content, received_at, slot_id, service_name, verification_code, is_read')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false })
        .limit(60);
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
    const userId = user?.id;
    if (settingsSection !== 'notifications' || !userId) return;

    const controller = new AbortController();
    let alive = true;

    const loadPrefs = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('notification_preferences')
          .eq('id', userId)
          .abortSignal(controller.signal as any)
          .single();

        if (!alive || controller.signal.aborted) return;

        if (data?.notification_preferences) {
          setNotifPrefs(prev => ({ ...prev, ...data.notification_preferences }));
        }
      } catch (e: any) {
        if (!alive || controller.signal.aborted) return;
        console.error(e);
      }
    };

    loadPrefs();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [settingsSection, user?.id]);

  // ─── Telegram: load config when section opens ─────────────────────────────
  useEffect(() => {
    const userId = user?.id;
    if (settingsSection !== 'telegram' || !userId) return;
    setTgLoading(true);

    const controller = new AbortController();
    let alive = true;

    const loadTg = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('telegram_token, telegram_chat_id')
          .eq('id', userId)
          .abortSignal(controller.signal as any)
          .single();

        if (!alive || controller.signal.aborted) return;

        if (data) {
          setTgToken(data.telegram_token || '');
          setTgChatId(data.telegram_chat_id || '');
        }
      } catch (e: any) {
        if (!alive || controller.signal.aborted) return;
        console.error(e);
      } finally {
        if (!alive || controller.signal.aborted) return;
        setTgLoading(false);
      }
    };

    loadTg();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [settingsSection, user?.id]);

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
      const hasCompleteTelegramConfig = Boolean(tgToken?.trim() && tgChatId?.trim());
      const { error } = await supabase
        .from('users')
        .update({
          telegram_token: tgToken,
          telegram_chat_id: tgChatId,
          telegram_enabled: hasCompleteTelegramConfig,
        })
        .eq('id', user.id);
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
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-bot', telegram_token: token, telegram_chat_id: chatId }),
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
        const data = await fetchUserAutomationLogs(100);
        if (!cancelled) setApiLogs(data || []);
      } finally {
        if (!cancelled) setApiLogsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [settingsSection, user?.id, fetchUserAutomationLogs]);

  // ─── API section: load api_secret_key from users ─────────────────────────
  useEffect(() => {
    if (settingsSection !== 'api' || !user) return;
    (async () => {
      const { data } = await supabase.from('users').select('api_secret_key').eq('id', user.id).single();
      const key = (data as { api_secret_key?: string } | null)?.api_secret_key?.trim() || null;
      setApiSecretKey(key);
      if (key) setWebhookSecret(key);
    })();
  }, [settingsSection, user?.id]);

  const playPing = useCallback(() => {
    if (isMutedRef.current) return;
    if (typeof window === 'undefined') return;
    try {
      if (audioRef.current) audioRef.current.play().catch(() => {});
    } catch {
      // Autoplay bloqueado o error de reproducción
    }
  }, []);

  useEffect(() => {
    setSidebarAvatarError(false);
    setProfileAvatarError(false);
  }, [resolvedAvatarUrl]);

  useEffect(() => {
    if (!user) return;
    // Remover canal existente antes de crear uno nuevo (evita duplicados)
    supabase.removeChannel(supabase.channel('web-sms-live'));
    const ch = supabase.channel('web-sms-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_logs', filter: `user_id=eq.${user.id}` },
        (p) => {
          setMessages(prev => [p.new as SMSLog, ...prev.slice(0, 59)]);
          playPing();
          setMessagePulse(true);
          setTimeout(() => setMessagePulse(false), 400);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, playPing]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try { fetchAbortRef.current.abort(); } catch {}
    fetchAbortRef.current = new AbortController();
    inFlightRef.current = false;
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      navigate('/', { replace: true });
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    if (feedbackStorageKey && localStorage.getItem(feedbackStorageKey)) {
      doLogout();
      return;
    }

    // Only show rating if user hasn't completed it before
    if (user?.id) {
      const [{ data: ratingData }, { data: feedbackStatus }] = await Promise.all([
        supabase
          .from('user_ratings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_feedback_status')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (ratingData || feedbackStatus) {
        if (feedbackStorageKey) {
          localStorage.setItem(feedbackStorageKey, feedbackStatus?.status || 'rated');
        }
        doLogout();
        return;
      }
    }
    setShowRating(true);
  };

  // ─── Label save ───────────────────────────────────────────────────────────────

  const handleSaveLabel = async (slotId: string) => {
    setSavingLabel(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update-slot-label',
          slotId,
          label: labelDraft.trim() || null,
          accessToken: session?.access_token || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error || 'No se pudo guardar la etiqueta.');
      }

      const savedLabel = ((body as { label?: string | null }).label ?? null) || undefined;
      setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, label: savedLabel } : s));
      setEditingSlotId(null);
    } catch (err) {
      console.error('[WebDashboard] save label error', err);
      alert('No se pudo guardar la etiqueta.');
    } finally {
      setSavingLabel(false);
    }
  };

  // ─── Webhook handlers ────────────────────────────────────────────────────────

  const handleWebhookSave = async () => {
    if (!user) return;
    setWebhookSaving(true);
    localStorage.setItem('telsim_webhook_url', webhookUrl);
    localStorage.setItem('telsim_webhook_secret', webhookSecret);
    localStorage.setItem('telsim_webhook_events', JSON.stringify(webhookEvents));
    try {
      const { error } = await supabase.from('users').update({ api_secret_key: webhookSecret?.trim() || null }).eq('id', user.id);
      if (error) throw error;
      setApiSecretKey(webhookSecret?.trim() || null);
    } catch (err: unknown) {
      const detail = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : err != null ? String(err) : '';
      if (detail) alert(`${t('webhooks.error_saving')}\n\n${detail}`);
    }
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
      const { data, error: fnError } = await supabase.functions.invoke('test-webhook-connection', {
        body: { url: webhookUrl.trim(), secret: webhookSecret?.trim() || undefined },
      });
      if (fnError) throw fnError;
      const ok = data?.success === true && data?.statusCode === 200;
      if (ok) {
        alert('✅ Webhook probado correctamente. El servidor respondió 200 OK.');
      } else {
        const code = data?.statusCode;
        const msg = data?.error || (code != null ? `El servidor respondió ${code}` : 'Error al conectar con la URL del webhook.');
        alert(`Prueba fallida: ${msg}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      alert(`Error al conectar con la URL del webhook. ${e?.message || 'Verifica que sea accesible desde internet.'}`);
    } finally {
      setWebhookTesting(false);
    }
  };

  const toggleWebhookEvent = (ev: string) =>
    setWebhookEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);

  const handleRegenerateApiSecretKey = async () => {
    if (!user || apiSecretKeyRegenerating) return;
    setApiSecretKeyRegenerating(true);
    try {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const newKey = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      const { error } = await supabase.from('users').update({ api_secret_key: newKey }).eq('id', user.id);
      if (error) throw error;
      setApiSecretKey(newKey);
      setWebhookSecret(newKey);
      setApiSecretKeyRevealed(newKey);
      setTimeout(() => setApiSecretKeyRevealed(null), 15000);
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const parts = [e?.message, e?.details, e?.hint].filter(Boolean);
      const detail = parts.length ? parts.join(' · ') : (err != null ? String(err) : '');
      alert(`${t('webhooks.error_saving')}${detail ? `\n\n${detail}` : ''}`);
    } finally {
      setApiSecretKeyRegenerating(false);
    }
  };

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

  const handleRetryAllFailed = async () => {
    if (!user?.id || retryingAll) return;
    const overview = Array.isArray(automationLogsOverview) ? automationLogsOverview : [];
    const toRetry = overview.filter(l => {
      const s = (l.status || '').toLowerCase();
      return s !== 'success' && s !== '200';
    });
    if (toRetry.length === 0) return;
    setRetryingAll(true);
    try {
      for (const log of toRetry) {
        const res = await fetch('/api/webhooks/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ log_id: log.id, userId: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.status === 'success' || data.status === '200')) {
          setAutomationLogsOverview(prev => (Array.isArray(prev) ? prev : []).map(l => l.id === log.id ? { ...l, status: String(data.status ?? '') } : l));
        }
      }
      await fetchData();
    } catch {
      alert(t('webhook_logs.retry_failed'));
    } finally {
      setRetryingAll(false);
    }
  };

  const isApiLogOk = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === '200' || s === 'success';
  };

  // ─── Language handler ─────────────────────────────────────────────────────────

  const handleLanguageSave = (lang: 'es' | 'en') => {
    setLanguage(lang);
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
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-test', userId: user.id }),
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

      invalidateProfile();
      await refreshProfile();

      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (e: any) { setEditError(e.message || 'Error al guardar el perfil.'); }
    finally { setEditSaving(false); }
  };

  // ─── Open inbox + mark as read ────────────────────────────────────────────────

  const handleOpenInbox = async (slotId: string) => {
    setSelectedSlot(slotId);
    setActiveTab('messages');
    const unread = (messages || []).filter(m => m.slot_id === slotId && !m.is_read);
    if (unread.length > 0) {
      await supabase.from('sms_logs').update({ is_read: true })
        .eq('slot_id', slotId).eq('is_read', false);
      setMessages(prev => (prev || []).map(m => m.slot_id === slotId ? { ...m, is_read: true } : m));
    }
  };

  // ─── Release slot (cancel subscription + free slot) ───────────────────────────

  const handleReleaseSlot = async () => {
    if (!slotToRelease || !user || !confirmReleaseCheck) return;
    setReleasing(true);
    try {
      const slotId = slotToRelease.slot_id;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'cancel', slot_id: slotId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error al dar de baja la SIM.');

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
      if (newVal && user?.id) {
        const { data: tgData, error: tgError } = await supabase
          .from('users')
          .select('telegram_token, telegram_chat_id, telegram_enabled')
          .eq('id', user.id)
          .single();

        if (tgError) throw tgError;

        const hasTelegramConfig = Boolean(tgData?.telegram_token?.trim() && tgData?.telegram_chat_id?.trim());
        if (!hasTelegramConfig) {
          throw new Error('Configura tu Bot de Telegram en Ajustes antes de activarlo en una línea.');
        }

        if (!tgData?.telegram_enabled) {
          const { error: enableError } = await supabase
            .from('users')
            .update({ telegram_enabled: true })
            .eq('id', user.id);

          if (enableError) throw enableError;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch('/api/manage', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'set-slot-forwarding',
          slotId,
          forwardingActive: newVal,
          accessToken: session?.access_token || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || 'No se pudo guardar el Bot de Telegram.');
      const persistedForwarding = Boolean((body as { forwardingActive?: boolean }).forwardingActive);

      setSlots(prev => prev.map(s => s.slot_id === slotId ? { ...s, forwarding_active: persistedForwarding } : s));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error && e.message ? e.message : 'No se pudo actualizar el Bot de Telegram.');
    }
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
        chip: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500',
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
  const todayMessages = (messages || []).filter(m => new Date(m.received_at).toDateString() === today);
  // slots ya viene filtrado con solo líneas activas/trialing (una por slot_id)
  const activeSlots = slots;

  // ─── API Bridge health (from automation_logs) ─────────────────────────────────
  const logs = Array.isArray(automationLogsOverview) ? automationLogsOverview : [];
  const isLogSuccess = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'success' || s === '200';
  };
  const successCount = (logs?.length ?? 0) > 0 ? logs.filter((l: AutomationLogRow) => isLogSuccess(l?.status)).length : 0;
  const totalLogs = logs?.length ?? 0;
  const automationSuccessRate = totalLogs > 0 ? ((successCount ?? 0) / Math.max(totalLogs, 1)) * 100 : 0;
  const failedLogs = logs.filter((l: AutomationLogRow) => !isLogSuccess(l?.status));
  const failedLogsCount = failedLogs.length;
  const now24h = Date.now() - 24 * 60 * 60 * 1000;
  const totalTriggersToday = logs.filter((l: AutomationLogRow) => l?.created_at && new Date(l.created_at).getTime() >= now24h).length;
  const lastLog = logs[0];
  const lastTriggerTime = lastLog?.created_at
    ? (() => {
        const sec = Math.floor((Date.now() - new Date(lastLog.created_at).getTime()) / 1000);
        if (sec < 60) return `${sec} s`;
        if (sec < 3600) return `${Math.floor(sec / 60)} min`;
        if (sec < 86400) return `${Math.floor(sec / 3600)} h`;
        return `${Math.floor(sec / 86400)} d`;
      })()
    : null;
  const lastAttemptFailed = lastLog ? !isLogSuccess(lastLog.status) : false;
  const bridgeState: 'Operacional' | 'Inestable' | 'Revisar Puente' =
    lastAttemptFailed || automationSuccessRate < 80
      ? 'Revisar Puente'
      : automationSuccessRate >= 95
        ? 'Operacional'
        : 'Inestable';
  const bridgeColor = bridgeState === 'Operacional' ? '#10b981' : bridgeState === 'Inestable' ? '#f59e0b' : '#f43f5e';
  const bridgeSubText = lastTriggerTime ? `Último trigger: hace ${lastTriggerTime}` : 'Sin triggers aún';
  const AVG_LATENCY = '1.2s';

  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return (messages || []).filter(m => new Date(m.received_at).toDateString() === d.toDateString()).length;
  });
  const activityLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][d.getDay()];
  });

  const filteredMessages = (messages || []).filter(m => {
    const matchSlot = !selectedSlot || m.slot_id === selectedSlot;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (m.content || '').toLowerCase().includes(q) || (m.sender || '').toLowerCase().includes(q);
    return matchSlot && matchSearch;
  });

  const unreadCount = (messages || []).filter(m => !m.is_read).length;

  // Header title map
  const TAB_TITLES: Partial<Record<TabId, string>> = {
    overview: 'Dashboard', messages: 'Mensajes SMS',
    numbers: 'Mis números', settings: 'Ajustes'
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className={`flex h-screen items-center justify-center font-display ${isDark ? 'bg-slate-950 text-white' : 'bg-[#F0F4F8] text-slate-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen font-display overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-[#F0F4F8] text-slate-900'}`}>

      {/* Rating modal before logout */}
      {showRating && (
        <RatingModal onDone={() => { setShowRating(false); doLogout(); }} />
      )}

      {/* ──────────────────── SIDEBAR ──────────────────────────────────────── */}
      <aside className={`w-56 flex-shrink-0 flex flex-col border-r ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Logo */}
        <div className="flex min-h-[72px] items-center px-8 py-4">
          <TelsimBrandLogo compact iconClassName="h-10 w-10 rounded-xl" textClassName="text-[1.65rem]" />
        </div>

        {/* Infraestructura IA */}
        <div className="px-3 pb-4">
          <div className={`px-3 py-2.5 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <Globe size={14} className="text-primary flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Infraestructura IA</p>
              <p className="text-[13px] font-black text-slate-900 dark:text-white mt-0.5">{activeSlots.length} Líneas activas</p>
            </div>
          </div>
        </div>

        <div className={`mx-3 mb-3 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={17} />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<MessageSquare size={17} />} label="Mensajes" active={activeTab === 'messages'} badge={unreadCount} onClick={() => setActiveTab('messages')} />
          <NavItem icon={<Smartphone size={17} />} label="Mis números" active={activeTab === 'numbers'} onClick={() => setActiveTab('numbers')} />
          <NavItem icon={<CreditCard size={17} />} label="Facturación" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <NavItem icon={<Bell size={17} />} label="Notificaciones" active={activeTab === 'notifications'} badge={notifUnread} onClick={() => { setActiveTab('notifications'); if (notifUnread > 0) markAllNotifRead(); }} />
          <NavItem icon={<Headphones size={17} />} label="Soporte 24/7" active={activeTab === 'support'} onClick={() => { setActiveTab('support'); setHelpView('main'); }} />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<HelpCircle size={17} />} label="Centro de Ayuda" active={activeTab === 'help'} onClick={() => setActiveTab('help')} />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<Settings size={17} />} label="Ajustes" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setSettingsSection('profile'); }} />

          {(user?.id || '').toLowerCase() === '8e7bcada-3f7a-482f-93a7-9d0fd4828231'.toLowerCase() && (
            <>
              <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
              <button
                type="button"
                onClick={() => navigate('/admin/inventory')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all bg-violet-600 hover:bg-violet-700 text-white shadow-sm border border-violet-500/30"
              >
                <ShieldCheck size={17} className="flex-shrink-0" />
                <span className="flex-1 text-left">Panel Admin</span>
              </button>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-5 flex flex-col gap-2">
          <button onClick={() => navigate('/onboarding/plan')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-[12px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Agregar SIM
          </button>
          <div className={`mt-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
          <div className="flex items-center gap-2.5 px-1 mt-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setSettingsSection('profile');
              }}
              className={`flex items-center gap-2.5 flex-1 min-w-0 text-left px-1 py-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              title="Ajustes > Mi Perfil"
            >
              <span className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center text-white text-[11px] font-black">
                {safeAvatarUrl && !sidebarAvatarError ? (
                  <img
                    src={safeAvatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setSidebarAvatarError(true)}
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black">{userInitials}</span>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <p className="text-[12px] font-bold truncate">{userName}</p>
                <p className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{user?.email}</p>
              </span>
            </button>
            <button onClick={handleLogout} disabled={loggingOut} title="Cerrar sesión"
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
          <button type="button" onClick={() => void fetchData()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}><RefreshCw size={15} className="text-slate-400" /></button>
          <button
            onClick={() => setIsMuted(m => !m)}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}
            title={isMuted ? 'Activar sonido de nuevos SMS' : 'Silenciar notificaciones sonoras'}
          >
            {isMuted ? <VolumeX size={15} className="text-slate-400" /> : <Volume2 size={15} className="text-slate-400" />}
          </button>
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
                {/* Estado del Puente API (con link Reintentar fallidos) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm border border-slate-100 dark:border-transparent">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bridgeColor + '20' }}>
                      <span style={{ color: bridgeColor }} className={bridgeState === 'Operacional' ? 'animate-pulse' : ''}>
                        <Activity size={18} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[26px] font-black text-slate-900 dark:text-white leading-none">{bridgeState}</p>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Estado del Puente API</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">{bridgeSubText}</p>
                    {failedLogsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleRetryAllFailed}
                        disabled={retryingAll}
                        className="text-[10px] font-bold text-primary hover:underline mt-2 flex items-center gap-1 disabled:opacity-50"
                      >
                        {retryingAll ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Reintentar fallidos
                      </button>
                    )}
                  </div>
                </div>
                <div className={`transition-transform duration-150 ${messagePulse ? 'scale-110' : 'scale-100'}`}>
                  <KpiCard icon={<MessageSquare size={18} />} label="Mensajes hoy" value={todayMessages.length} sub={`${(messages || []).length} en total`} trend={todayMessages.length > 0 ? 12 : undefined} color="#10b981" />
                </div>
                <KpiCard icon={<Smartphone size={18} />} label="SIMs activas" value={activeSlots.length} sub={`${slots.length} asignadas`} color="#f59e0b" />
                <KpiCard icon={<Shield size={18} />} label="Tasa de éxito" value={(messages || []).length > 0 ? `${Math.round((((messages || []).length - ((messages || []).filter(m => m.is_spam).length || 0)) / (messages || []).length) * 100)}% OK` : '—'} sub={`Latencia media: ${AVG_LATENCY}`} color="#8b5cf6" />
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
                          const msgsCnt = (messages || []).filter(m => m.slot_id === slot.slot_id).length;
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
                  ) : (messages || []).length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <MessageSquare size={28} /><p className="text-[12px] font-semibold">Sin mensajes aún</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[540px] pr-2">
                      {(messages || []).slice(0, 10).map((msg, idx) => {
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
                  Todos ({(messages || []).length})
                </button>
                {slots.map(slot => (
                  <button key={slot.slot_id} onClick={() => setSelectedSlot(slot.slot_id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 ${selectedSlot === slot.slot_id ? 'bg-primary text-white' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100')}`}>
                    {REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐'}
                    {slot.label || formatPhone(slot.phone_number)}
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
                  <h2 className="text-[16px] font-black">Mis números</h2>
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
                  {(() => {
                    const sorted = [...slots].sort((a: Slot, b: Slot) =>
                      new Date(a.activeSub?.created_at || 0).getTime() - new Date(b.activeSub?.created_at || 0).getTime()
                    );
                    return sorted.map((slot, index) => {
                      const sub = slot.activeSub;
                      const plan = (sub?.plan_name || slot.plan_type || 'starter').toLowerCase();
                      const ps = getWebPlanStyle(plan);
                      const usagePct = Math.min(100, ((sub?.credits_used || 0) / (sub?.monthly_limit || 150)) * 100);
                      const msgsCnt = (messages || []).filter(m => m?.slot_id === slot.slot_id && !m.is_read).length;

                      return (
                        <div key={slot.slot_id} className="flex flex-col gap-2">
                          <div className={`relative w-full aspect-[1.58/1] ${ps.cardBg} p-5 flex flex-col justify-between overflow-hidden shadow-xl`} style={{ clipPath: 'polygon(8px 0, calc(100% - 36px) 0, 100% 36px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 calc(50% + 22px), 7px calc(50% + 22px), 7px calc(50% - 22px), 0 calc(50% - 22px), 0 8px)' }}>
                            <div className="flex items-start justify-between relative z-10">
                              <div>
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-60 ${ps.labelColor}`}>Telsim Online</p>
                                <p className={`text-[13px] font-black italic uppercase ${ps.phoneColor}`}>{slot.label || 'SIN ETIQUETA'}</p>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-slate-200">
                                  <img src={`https://flagcdn.com/80x60/${(slot.region || 'cl').toLowerCase()}.png`} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className={`text-[11px] font-black font-mono ${ps.phoneColor}`}>#{String(index + 1).padStart(2, '0')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                              <div className={`w-14 h-[38px] rounded-lg ${ps.chip} shadow-md flex-shrink-0`} />
                              <div>
                                <p className={`text-[8px] font-bold uppercase opacity-60 mb-0.5 ${ps.labelColor}`}>Subscriber Number</p>
                                <p className={`text-[19px] font-black font-mono tracking-wider ${ps.phoneColor}`}>{formatPhone(slot.phone_number)}</p>
                                <div className="mt-2">
                                  <div className="flex justify-between text-[8px] font-black mb-1 uppercase opacity-80">
                                    <span className={ps.labelColor}>Consumo SMS</span>
                                    <span className={ps.phoneColor}>{sub?.credits_used || 0} / {sub?.monthly_limit || 150}</span>
                                  </div>
                                  <div className="h-1.5 w-32 bg-black/10 rounded-full overflow-hidden">
                                    <div className={`h-full ${plan === 'starter' ? 'bg-primary' : 'bg-white'}`} style={{ width: `${usagePct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-end justify-between relative z-10">
                              <div className="flex flex-col gap-0.5">
                                <span className={`px-2 py-0.5 rounded-full border border-white/30 bg-black/20 text-[9px] font-black uppercase w-fit ${ps.phoneColor}`}>{ps.label}</span>
                                <span className={`text-[8px] font-bold opacity-60 ${ps.labelColor}`}>💳 Plan {sub?.billing_type === 'annual' ? 'Anual' : 'Mensual'}</span>
                              </div>
                              <div className="text-right">
                                <span className={`block text-[9px] font-black ${ps.labelColor}`}>● ACTIVA</span>
                                <span className={`block text-[8px] opacity-60 font-mono ${ps.labelColor}`}>Desde: {sub?.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 p-1 rounded-[1.1rem] border ${isDark ? 'bg-slate-900 border-slate-800/70' : 'bg-white border-slate-100'}`}>
                            <button onClick={() => handleOpenInbox(slot.slot_id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[0.8rem] text-[11px] font-bold transition-colors ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                              <MessageSquare size={12} /> Inbox {msgsCnt > 0 && <span className="bg-primary text-white text-[8px] font-black rounded-full px-1">{msgsCnt > 99 ? '99+' : msgsCnt}</span>}
                            </button>
                            <button
                              onClick={() => navigate('/dashboard/upgrade-plan', {
                                state: {
                                  phoneNumber: slot.phone_number,
                                  slot_id: slot.slot_id,
                                  currentPlanName: (slot as any).activeSub?.plan_name || slot.plan_type || 'Starter',
                                  billing_type: (slot as any).activeSub?.billing_type || 'monthly',
                                }
                              })}
                              title="Renovar / cambiar plan"
                              className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] bg-amber-500/10 text-amber-500"
                            >
                              <Zap size={13} />
                            </button>
                            <button onClick={() => handleCopy(`${slot.slot_id}_num`, slot.phone_number)} title="Copiar número" className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] ${copiedId === `${slot.slot_id}_num` ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{copiedId === `${slot.slot_id}_num` ? <Check size={13} /> : <Copy size={13} />}</button>
                            <button onClick={() => handleToggleForwarding(slot.slot_id, !slot?.forwarding_active)} disabled={togglingSlot === slot.slot_id} title={slot?.forwarding_active ? 'Bot de Telegram activo' : 'Bot de Telegram inactivo'} className={`w-9 h-9 flex items-center justify-center rounded-[0.8rem] ${slot?.forwarding_active ? 'bg-emerald-500 text-white ring-2 ring-emerald-200 shadow-md shadow-emerald-500/25' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{togglingSlot === slot.slot_id ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}</button>
                            <button onClick={() => { setSlotToRelease(slot); setIsReleaseModalOpen(true); }} title="Dar de baja SIM" className="w-9 h-9 flex items-center justify-center rounded-[0.8rem] hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      );
                    });
                  })()}
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
                        const msgsCnt = (messages || []).filter(m => m.slot_id === slot.slot_id && !m.is_read).length;
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
                                  onClick={() => navigate('/dashboard/upgrade-plan', {
                                    state: {
                                      phoneNumber: slot.phone_number,
                                      slot_id: slot.slot_id,
                                      currentPlanName: (slot as any).activeSub?.plan_name || slot.plan_type || 'Starter',
                                      billing_type: (slot as any).activeSub?.billing_type || 'monthly',
                                    }
                                  })}
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
                          {safeAvatarUrl && !profileAvatarError
                            ? (
                              <img
                                src={safeAvatarUrl}
                                alt="avatar"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={() => setProfileAvatarError(true)}
                              />
                            )
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

                      {/* API Secret Key (Firma de Seguridad) */}
                      <div className="mb-5">
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('webhooks.api_secret_key')} · {t('webhooks.security_signature')}</p>
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-mono text-[12px] ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <Key size={13} className="flex-shrink-0 text-amber-500" />
                          <span className="flex-1 truncate">
                            {apiSecretKeyRevealed
                              ? apiSecretKeyRevealed
                              : apiSecretKey
                                ? `whsec_****************${apiSecretKey.slice(-4)}`
                                : t('webhooks.api_secret_key_none')}
                          </span>
                          {apiSecretKeyRevealed && (
                            <button onClick={() => { handleCopy('apisecret', apiSecretKeyRevealed || ''); }}
                              className={`p-1 rounded-lg flex-shrink-0 ${copiedId === 'apisecret' ? 'text-emerald-500' : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
                              {copiedId === 'apisecret' ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleRegenerateApiSecretKey}
                            disabled={apiSecretKeyRegenerating}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex-shrink-0 disabled:opacity-50 ${isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            {apiSecretKeyRegenerating ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                            {apiSecretKeyRegenerating ? t('webhooks.regenerating') : t('webhooks.regenerate_key')}
                          </button>
                        </div>
                        <p className={`text-[10px] mt-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          {apiSecretKeyRevealed ? t('webhooks.key_regenerated') : <>Se usa para firmar el body (HMAC-SHA256) en el header <code className="font-mono">X-Telsim-Signature</code>.</>}
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
                      ) : (apiLogs || []).length === 0 ? (
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
                              {(apiLogs || []).map((log) => {
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

                {/* Facturación (misma experiencia que pestaña Facturación / Billing.tsx) */}
                {settingsSection === 'billing' && (
                  <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CreditCard size={18} className="text-emerald-500" /></div>
                      <div>
                        <h3 className="text-[15px] font-black">Facturación</h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Tus suscripciones, cobros e historial de invoices
                        </p>
                      </div>
                    </div>
                    <UserBillingPanel variant="embedded" embeddedDark={isDark} hideIntroTitle />
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
                        <button key={lang.code} onClick={() => setLanguage(lang.code)}
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
                      El cambio de idioma se aplica inmediatamente en toda la app.
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

          {/* ── BILLING TAB (alineado con Billing.tsx / app móvil) ───────── */}
          {activeTab === 'billing' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-black">Facturación</h2>
                  <p className={`text-[12px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Tus planes, próximos cobros e historial de invoices
                  </p>
                </div>
              </div>
              <UserBillingPanel variant="embedded" embeddedDark={isDark} hideIntroTitle />
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

          {/* ── SUPPORT TAB ──────────────────────────────────────────── */}
          {activeTab === 'support' && (() => {
            const ticketStatusCfg = {
              open:    { label: 'Abierto',    color: 'text-blue-500',    bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
              pending: { label: 'Respondido', color: 'text-amber-500',   bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
              closed:  { label: 'Cerrado',    color: 'text-slate-400',   bg: isDark ? 'bg-slate-700' : 'bg-slate-100' },
            };
            const timeAgo = (iso: string) => {
              const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
              if (m < 1) return 'Ahora'; if (m < 60) return `${m}m`;
              const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
              return `${Math.floor(h / 24)}d`;
            };
            const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

            /* ── TICKET CHAT VIEW ── */
            if (helpView === 'ticket-chat' && selectedTicketId) {
              return (
                <div className="flex flex-col max-w-3xl mx-auto w-full h-[calc(100vh-12rem)]">
                  {/* Header */}
                  <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <button onClick={() => { setHelpView('tickets'); fetchHelpTickets(); }}
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{ticketSubject || 'Ticket'}</p>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${ticketStatusCfg[ticketStatus]?.color}`}>
                        {ticketStatusCfg[ticketStatus]?.label}
                      </span>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className={`flex-1 overflow-y-auto rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    {ticketMessagesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-slate-400" /></div>
                    ) : ticketMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
                        <CheckCircle2 size={28} className="text-primary opacity-40" />
                        <p className={`text-[12px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ticket creado. Te responderemos pronto.</p>
                      </div>
                    ) : ticketMessages.map(msg => {
                      const isUser = msg.sender_type === 'user';
                      return (
                        <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 mt-0.5 shrink-0 shadow">
                              <span className="text-[10px] font-black text-white">T</span>
                            </div>
                          )}
                          <div className="max-w-[72%]">
                            {!isUser && <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Soporte Telsim</p>}
                            <div className={`px-4 py-2.5 rounded-2xl ${isUser ? 'bg-primary text-white rounded-tr-sm' : (isDark ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100 shadow-sm')}`}>
                              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[9px] font-bold mt-1 text-right ${isUser ? 'text-white/60' : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>{fmtTime(msg.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={ticketBottomRef} />
                  </div>
                  {/* Input */}
                  <div className={`mt-3 flex gap-2 ${ticketStatus === 'closed' ? 'opacity-60' : ''}`}>
                    {ticketStatus === 'closed' ? (
                      <div className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[12px] font-bold ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                        <Lock size={13} /> Ticket cerrado
                      </div>
                    ) : (
                      <>
                        <input value={ticketReply} onChange={e => setTicketReply(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTicketReply(); } }}
                          placeholder="Escribe tu mensaje..."
                          className={`flex-1 h-11 px-4 rounded-xl text-[13px] border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary'}`} />
                        <button onClick={sendTicketReply} disabled={!ticketReply.trim() || sendingTicketReply}
                          className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-40 transition-all hover:bg-primary/90 shadow-md shadow-primary/20">
                          {sendingTicketReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            /* ── TICKET LIST VIEW ── */
            if (helpView === 'tickets') {
              return (
                <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setHelpView('main')}
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <ChevronRight size={18} className="rotate-180" />
                      </button>
                      <div>
                        <h2 className={`text-[18px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Mis Tickets</h2>
                        <p className={`text-[12px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Conversaciones con el equipo de soporte</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNewTicketForm(true)}
                      className="flex items-center gap-2 h-9 px-4 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-wider shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors">
                      <Plus size={15} /> Nuevo ticket
                    </button>
                  </div>

                  {/* New ticket form */}
                  {showNewTicketForm && (
                    <div className={`rounded-2xl border p-5 space-y-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-[14px] font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Nuevo Ticket</p>
                        <button onClick={() => { setShowNewTicketForm(false); setNewTicketSubject(''); setNewTicketBody(''); }}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                          <X size={15} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Asunto</label>
                          <input value={newTicketSubject} onChange={e => setNewTicketSubject(e.target.value)} placeholder="Ej: Problema con mi número"
                            className={`w-full h-10 px-3 rounded-xl text-[13px] border outline-none focus:border-primary transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`} />
                        </div>
                        <div>
                          <label className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Descripción</label>
                          <textarea value={newTicketBody} onChange={e => setNewTicketBody(e.target.value)} placeholder="Explica con detalle qué está pasando..."
                            rows={3}
                            className={`w-full px-3 py-2 rounded-xl text-[13px] border outline-none focus:border-primary transition-colors resize-none leading-relaxed ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`} />
                        </div>
                      </div>
                      <button onClick={createHelpTicket} disabled={!newTicketSubject.trim() || !newTicketBody.trim() || creatingTicket}
                        className="w-full h-10 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                        {creatingTicket ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Enviar Ticket</>}
                      </button>
                    </div>
                  )}

                  {/* Tickets list */}
                  {helpTicketsLoading ? (
                    <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
                  ) : helpTickets.length === 0 ? (
                    <div className={`rounded-2xl border p-10 flex flex-col items-center gap-3 text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <MessageSquare size={36} className={isDark ? 'text-slate-700' : 'text-slate-200'} />
                      <p className={`text-[13px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Sin tickets todavía</p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Crea uno con el botón "Nuevo ticket" de arriba.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {helpTickets.map(t => {
                        const sc = ticketStatusCfg[t.status] ?? ticketStatusCfg.open;
                        return (
                          <button key={t.id} onClick={() => openTicketChat(t.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.005] text-left ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sc.bg}`}>
                              <MessageSquare size={18} className={sc.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className={`text-[13px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.subject}</p>
                                {t.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                              </div>
                              {t.last_message && <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.last_message}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
                                <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{timeAgo(t.updated_at ?? t.created_at)}</span>
                              </div>
                            </div>
                            <ChevronRight size={15} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ── MAIN HELP VIEW ── */
            return (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
              {/* Hero + search */}
              <div className={`rounded-2xl p-8 text-center border ${isDark ? 'bg-gradient-to-br from-primary/10 to-sky-500/5 border-primary/20' : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                  <HelpCircle size={22} className="text-white" />
                </div>
                <h2 className="text-[22px] font-black mb-1">Soporte 24/7</h2>
                <p className={`text-[13px] mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Canales operativos, tickets y escalamiento según el plan activo.</p>
                <p className={`text-[11px] mb-5 font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {loadingSupportTier ? 'Evaluando tu cobertura de soporte...' : supportTier === 'power' ? 'Cobertura actual: Power 24/7' : supportTier === 'pro' ? 'Cobertura actual: Pro en tiempo real' : 'Cobertura actual: soporte esencial'}
                </p>
                <div className="relative max-w-md mx-auto">
                  <input value={helpSearch} onChange={e => setHelpSearch(e.target.value)}
                    placeholder="Buscar en soporte..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-[13px] border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary'}`} />
                  <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              </div>

              {/* Support channels */}
              {!helpSearch && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {supportChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => { void handleSupportChannelClick(channel.id as 'ticket' | 'chat' | 'whatsapp', channel.enabled); }}
                      className={`relative overflow-hidden text-left rounded-2xl border p-5 bg-gradient-to-br transition-all hover:scale-[1.01] ${channel.tone} ${isDark ? 'shadow-[0_20px_40px_rgba(2,6,23,0.35)]' : 'shadow-[0_18px_35px_rgba(15,23,42,0.08)]'}`}
                    >
                      {!channel.enabled && (
                        <div className={`absolute inset-y-0 right-0 w-28 bg-gradient-to-l ${isDark ? 'from-slate-950/30' : 'from-white/60'} to-transparent pointer-events-none`} />
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${channel.iconTone}`}>
                          {channel.icon}
                        </div>
                        {channel.badge ? (
                          <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-wide shrink-0">
                            {channel.badge}
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-wide shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                            Disponible
                          </span>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-[15px] font-black tracking-tight">{channel.title}</p>
                          <span className={`text-[10px] font-black uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{channel.wait}</span>
                        </div>
                        <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{channel.desc}</p>
                        {channel.hint && (
                          <p className="text-[11px] font-semibold text-primary leading-relaxed flex items-start gap-2">
                            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                            <span>{channel.hint}</span>
                          </p>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {channel.id === 'ticket' ? 'Workflow base' : channel.id === 'chat' ? 'Tiempo real' : 'Prioridad total'}
                        </span>
                        {channel.enabled ? (
                          <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                        ) : (
                          <ShieldCheck size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Contact + docs links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => { setHelpView('tickets'); fetchHelpTickets(); setShowNewTicketForm(true); }}
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.01] text-left ${isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:shadow-sm'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-primary/10' : 'bg-blue-50'}`}>
                    <TicketCheck size={17} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">Crear ticket de soporte</p>
                    <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Respuesta garantizada en menos de 4 horas</p>
                  </div>
                  <ExternalLink size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                </button>
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
            );
          })()}

          {/* ── HELP CENTER TAB ──────────────────────────────────────────── */}
          {activeTab === 'help' && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
              <div className={`rounded-2xl p-8 text-center border ${isDark ? 'bg-gradient-to-br from-primary/10 to-sky-500/5 border-primary/20' : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100'}`}>
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                  <HelpCircle size={22} className="text-white" />
                </div>
                <h2 className="text-[22px] font-black mb-1">Centro de Ayuda</h2>
                <p className={`text-[13px] mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Documentación, preguntas frecuentes y guías clave para operar Telsim.</p>
                <div className="relative max-w-md mx-auto">
                  <input value={helpSearch} onChange={e => setHelpSearch(e.target.value)}
                    placeholder="Buscar en la documentación..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-[13px] border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary'}`} />
                  <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  { icon: <Key size={16} />, color: 'text-primary', bg: isDark ? 'bg-primary/10' : 'bg-blue-50', title: 'Primeros pasos', desc: 'Configura tu primera SIM y recibe SMS en minutos.', action: () => navigate('/onboarding/plan') },
                  { icon: <Bot size={16} />, color: 'text-sky-500', bg: isDark ? 'bg-sky-500/10' : 'bg-sky-50', title: 'Telegram Bot', desc: 'Recibe SMS de tus SIMs directamente en Telegram.', action: () => { setActiveTab('settings'); setSettingsSection('telegram'); } },
                  { icon: <Link2 size={16} />, color: 'text-violet-500', bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50', title: 'API & Webhooks', desc: 'Integra Telsim con tus apps vía REST API o webhooks.', action: () => navigate('/dashboard/api-guide') },
                  { icon: <Zap size={16} />, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', title: 'Planes y créditos', desc: 'Entiende upgrades, niveles de soporte y capacidad SMS.', action: () => setActiveTab('billing') },
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

              <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <h3 className="text-[14px] font-black">Preguntas frecuentes</h3>
                  <button
                    onClick={() => navigate('/dashboard/faq')}
                    className="text-[11px] font-black text-primary hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                {HELP_FAQ_DATA
                  .filter(f => !helpSearch || f.question.toLowerCase().includes(helpSearch.toLowerCase()) || f.answer.toLowerCase().includes(helpSearch.toLowerCase()))
                  .slice(0, 6)
                  .map((faq, i, arr) => (
                    <div key={i} className={`px-5 py-4 ${i < arr.length - 1 ? (isDark ? 'border-b border-slate-800' : 'border-b border-slate-100') : ''}`}>
                      <p className="text-[13px] font-bold mb-1">{faq.question}</p>
                      <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{faq.answer}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {lockedSupportChannel && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-6">
          <div className={`w-full max-w-md rounded-[28px] border overflow-hidden shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="px-7 pt-7 pb-5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4">
                <ShieldCheck size={22} className="text-primary" />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Canal Premium</p>
              <h3 className={`text-[24px] font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{lockedSupportChannel.title}</h3>
              <p className={`text-[14px] font-semibold leading-relaxed mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{lockedSupportChannel.requirement}</p>
              <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lockedSupportChannel.hint}</p>
            </div>
            <div className="px-7 pb-7 grid grid-cols-2 gap-3">
              <button
                onClick={() => setLockedSupportChannel(null)}
                className={`h-12 rounded-xl text-[12px] font-black uppercase tracking-wide border ${isDark ? 'border-slate-700 text-slate-300 bg-slate-900' : 'border-slate-200 text-slate-600 bg-white'}`}
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setLockedSupportChannel(null);
                  setActiveTab('numbers');
                }}
                className="h-12 rounded-xl bg-primary text-white text-[12px] font-black uppercase tracking-wide shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
              >
                Hacer upgrade
              </button>
            </div>
          </div>
        </div>
      )}

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
          <ReleaseSuccessToastMessage isDark={isDark} />
        </div>
      )}
    </div>
  );
};

export default WebDashboard;
