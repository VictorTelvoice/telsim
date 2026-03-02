import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Slot, SMSLog } from '../../types';
import {
  LayoutDashboard, MessageSquare, Smartphone, Settings,
  LogOut, Moon, Sun, Bell, Copy, Check, RefreshCw,
  TrendingUp, Zap, Shield, Activity, ChevronRight,
  Search, Plus, Filter, ArrowUpRight, ArrowDownRight,
  Circle, Wifi, Globe, Clock, CheckCircle2
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_MAP: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  whatsapp:      { label: 'WhatsApp',       color: '#25D366', bg: '#dcfce7', darkBg: '#14532d' },
  google:        { label: 'Google',         color: '#4285F4', bg: '#dbeafe', darkBg: '#1e3a8a' },
  facebook:      { label: 'Facebook',       color: '#1877F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  instagram:     { label: 'Instagram',      color: '#E1306C', bg: '#fce7f3', darkBg: '#831843' },
  telegram:      { label: 'Telegram',       color: '#229ED9', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  amazon:        { label: 'Amazon',         color: '#FF9900', bg: '#fef3c7', darkBg: '#78350f' },
  microsoft:     { label: 'Microsoft',      color: '#00A4EF', bg: '#e0f2fe', darkBg: '#0c4a6e' },
  twitter:       { label: 'Twitter/X',      color: '#1DA1F2', bg: '#dbeafe', darkBg: '#1e3a8a' },
  uber:          { label: 'Uber',           color: '#06b6d4', bg: '#cffafe', darkBg: '#164e63' },
  tiktok:        { label: 'TikTok',         color: '#ff0050', bg: '#fce7f3', darkBg: '#831843' },
  ebay:          { label: 'eBay',           color: '#E53238', bg: '#fee2e2', darkBg: '#7f1d1d' },
  mercadolibre:  { label: 'Mercado Libre',  color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  mercado:       { label: 'Mercado Libre',  color: '#FFE600', bg: '#fefce8', darkBg: '#713f12' },
  netflix:       { label: 'Netflix',        color: '#E50914', bg: '#fee2e2', darkBg: '#7f1d1d' },
  spotify:       { label: 'Spotify',        color: '#1DB954', bg: '#dcfce7', darkBg: '#14532d' },
  linkedin:      { label: 'LinkedIn',       color: '#0077B5', bg: '#dbeafe', darkBg: '#1e3a8a' },
  apple:         { label: 'Apple',          color: '#555555', bg: '#f1f5f9', darkBg: '#1e293b' },
  paypal:        { label: 'PayPal',         color: '#003087', bg: '#dbeafe', darkBg: '#1e3a8a' },
  discord:       { label: 'Discord',        color: '#5865F2', bg: '#ede9fe', darkBg: '#3730a3' },
  snapchat:      { label: 'Snapchat',       color: '#FFFC00', bg: '#fefce8', darkBg: '#713f12' },
  twitter_x:     { label: 'X (Twitter)',    color: '#000000', bg: '#f1f5f9', darkBg: '#1e293b' },
  twitch:        { label: 'Twitch',         color: '#9146FF', bg: '#ede9fe', darkBg: '#3730a3' },
  binance:       { label: 'Binance',        color: '#F0B90B', bg: '#fefce8', darkBg: '#713f12' },
  coinbase:      { label: 'Coinbase',       color: '#0052FF', bg: '#dbeafe', darkBg: '#1e3a8a' },
  airbnb:        { label: 'Airbnb',         color: '#FF5A5F', bg: '#fee2e2', darkBg: '#7f1d1d' },
  shopify:       { label: 'Shopify',        color: '#96BF48', bg: '#dcfce7', darkBg: '#14532d' },
};

function detectService(sender: string, content: string) {
  const text = (sender + ' ' + content).toLowerCase();
  for (const [key, val] of Object.entries(SERVICE_MAP)) {
    if (text.includes(key)) return { key, ...val };
  }
  return { key: 'other', label: sender || 'Desconocido', color: '#64748b', bg: '#f1f5f9', darkBg: '#1e293b' };
}

function extractCode(content: string): string | null {
  const m = content.match(/\b(\d{4,8})\b/);
  return m ? m[1] : null;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const REGION_FLAGS: Record<string, string> = {
  CL: '🇨🇱', AR: '🇦🇷', MX: '🇲🇽', US: '🇺🇸', BR: '🇧🇷',
  CO: '🇨🇴', PE: '🇵🇪', ES: '🇪🇸', DE: '🇩🇪', GB: '🇬🇧',
};

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

const BarChart: React.FC<{ data: number[]; labels: string[]; isDark: boolean }> = ({ data, labels, isDark }) => {
  const max = Math.max(...data, 1);
  const barW = 36;
  const gap = 10;
  const chartH = 100;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 24}`} className="w-full" style={{ height: 124 }}>
      {data.map((v, i) => {
        const h = Math.max(4, (v / max) * chartH);
        const x = i * (barW + gap);
        const y = chartH - h;
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h}
              rx={6}
              fill={isToday ? '#1152d4' : (isDark ? '#334155' : '#cbd5e1')}
              opacity={isToday ? 1 : 0.7}
            />
            <text
              x={x + barW / 2} y={chartH + 16}
              textAnchor="middle"
              fontSize={9}
              fill={isDark ? '#64748b' : '#94a3b8'}
              fontFamily="inherit"
            >
              {labels[i]}
            </text>
            {isToday && (
              <text
                x={x + barW / 2} y={y - 5}
                textAnchor="middle"
                fontSize={9}
                fontWeight="bold"
                fill="#1152d4"
                fontFamily="inherit"
              >
                {v}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────

const NavItem: React.FC<{
  icon: React.ReactNode; label: string; active?: boolean; badge?: number;
  onClick: () => void;
}> = ({ icon, label, active, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      active
        ? 'bg-primary text-white shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
    }`}
  >
    <span className={`flex-shrink-0 ${active ? 'text-white' : ''}`}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge != null && badge > 0 && (
      <span className={`min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 ${
        active ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
      }`}>
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

// ─── KPI Card ────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: number; color: string;
}> = ({ icon, label, value, sub, trend, color }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm border border-slate-100 dark:border-transparent">
    <div className="flex items-start justify-between">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: color + '20' }}>
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

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = 'overview' | 'messages' | 'numbers';

const WebDashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [messages, setMessages] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Plan parsing seguro — soporta tanto string plano ('pro') como JSON object
  const savedPlanId: string = (() => {
    const raw = localStorage.getItem('selected_plan') || 'starter';
    try {
      const parsed = JSON.parse(raw);
      return (parsed.planId || parsed.id || parsed.plan || 'starter').toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  })();
  const planName = savedPlanId.charAt(0).toUpperCase() + savedPlanId.slice(1);

  const PLAN_CREDITS: Record<string, number> = { starter: 150, pro: 400, power: 1400 };
  const planCredits = PLAN_CREDITS[savedPlanId] ?? 150;

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [slotsRes, msgsRes] = await Promise.all([
        supabase.from('slots').select('*').eq('assigned_to', user.id),
        supabase.from('sms_logs').select('*').eq('user_id', user.id).order('received_at', { ascending: false }).limit(60),
      ]);
      if (slotsRes.data) setSlots(slotsRes.data);
      if (msgsRes.data) setMessages(msgsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('web-dashboard-sms')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setMessages(prev => [payload.new as SMSLog, ...prev.slice(0, 59)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  // ─── Derived metrics ───────────────────────────────────────────────────────

  const today = new Date().toDateString();
  const todayMessages = messages.filter(m => new Date(m.received_at).toDateString() === today);
  const activeSlots = slots.filter(s => s.status !== 'expired');

  // 7-day activity bars
  const activityData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return messages.filter(m => new Date(m.received_at).toDateString() === d.toDateString()).length;
  });
  const activityLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'][d.getDay()];
  });

  // Filtered messages
  const filteredMessages = messages.filter(m => {
    const matchSlot = !selectedSlot || m.slot_id === selectedSlot;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || m.content.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q);
    return matchSlot && matchSearch;
  });

  const unreadCount = messages.filter(m => !m.is_read).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-screen font-display overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-[#F0F4F8] text-slate-900'}`}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`w-56 flex-shrink-0 flex flex-col border-r ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Telsim" className="w-7 h-7" />
            <span className="text-[17px] font-black tracking-tight text-primary">telsim</span>
          </div>
        </div>

        {/* Plan badge */}
        <div className="px-3 pb-4">
          <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${isDark ? 'bg-primary/10' : 'bg-blue-50'}`}>
            <Zap size={13} className="text-primary" />
            <span className="text-[11px] font-black text-primary uppercase tracking-wider">{planName}</span>
            <span className={`ml-auto text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{planCredits} créditos</span>
          </div>
        </div>

        <div className={`mx-3 mb-3 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-1">
          <NavItem
            icon={<LayoutDashboard size={17} />}
            label="Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <NavItem
            icon={<MessageSquare size={17} />}
            label="Mensajes"
            active={activeTab === 'messages'}
            badge={unreadCount}
            onClick={() => setActiveTab('messages')}
          />
          <NavItem
            icon={<Smartphone size={17} />}
            label="Mis SIMs"
            active={activeTab === 'numbers'}
            badge={activeSlots.length}
            onClick={() => setActiveTab('numbers')}
          />

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

          <NavItem icon={<Settings size={17} />} label="Ajustes" onClick={() => navigate('/dashboard/settings')} />
          <NavItem icon={<Globe size={17} />} label="API & Webhooks" onClick={() => navigate('/dashboard/webhooks')} />
        </nav>

        {/* Bottom: Add SIM + User */}
        <div className="px-3 pb-5 flex flex-col gap-2">
          <button
            onClick={() => navigate('/onboarding/plan')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white text-[12px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Agregar SIM
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
            <button onClick={handleLogout} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`} title="Cerrar sesión">
              <LogOut size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className={`flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1">
            <h1 className="text-[15px] font-black">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'messages' && 'Mensajes SMS'}
              {activeTab === 'numbers' && 'Mis SIMs'}
            </h1>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Search */}
          <div className={`relative flex items-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-xl px-3 py-2 gap-2 w-56`}>
            <Search size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar mensajes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`bg-transparent text-[12px] outline-none flex-1 ${isDark ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`}
            />
          </div>

          {/* Actions */}
          <button onClick={fetchData} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>
            <RefreshCw size={15} className="text-slate-400" />
          </button>
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`}>
            {isDark ? <Sun size={15} className="text-slate-400" /> : <Moon size={15} className="text-slate-400" />}
          </button>
          <button className={`relative p-2 rounded-xl ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} transition-colors`} onClick={() => navigate('/dashboard/notifications')}>
            <Bell size={15} className="text-slate-400" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </header>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">

              {/* Welcome */}
              <div>
                <h2 className="text-[22px] font-black">
                  {(() => {
                    const h = new Date().getHours();
                    if (h < 12) return `Buenos días, ${userName.split(' ')[0]} ☀️`;
                    if (h < 18) return `Buenas tardes, ${userName.split(' ')[0]} 👋`;
                    return `Buenas noches, ${userName.split(' ')[0]} 🌙`;
                  })()}
                </h2>
                <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Aquí tienes el resumen de tu actividad en Telsim.
                </p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-4 gap-4">
                <KpiCard
                  icon={<Zap size={18} />}
                  label="Créditos disponibles"
                  value={planCredits}
                  sub={`Plan ${planName}`}
                  color="#1152d4"
                />
                <KpiCard
                  icon={<MessageSquare size={18} />}
                  label="Mensajes hoy"
                  value={todayMessages.length}
                  sub={`${messages.length} en total`}
                  trend={todayMessages.length > 0 ? 12 : undefined}
                  color="#10b981"
                />
                <KpiCard
                  icon={<Smartphone size={18} />}
                  label="SIMs activas"
                  value={activeSlots.length}
                  sub={`${slots.length} asignadas`}
                  color="#f59e0b"
                />
                <KpiCard
                  icon={<Shield size={18} />}
                  label="Tasa de éxito"
                  value={messages.length > 0 ? `${Math.round(((messages.length - (messages.filter(m => m.is_spam).length || 0)) / messages.length) * 100)}%` : '—'}
                  sub="Verificaciones OK"
                  trend={3}
                  color="#8b5cf6"
                />
              </div>

              {/* Chart + Feed — grid 3+2 cols: izquierda = chart + estado SIMs, derecha = feed */}
              <div className="grid grid-cols-5 gap-4 items-start">

                {/* Columna izquierda: chart + estado de SIMs apilados */}
                <div className="col-span-3 flex flex-col gap-4">

                  {/* Activity chart */}
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

                  {/* Estado de SIMs — justo debajo del chart */}
                  {slots.length > 0 && (
                    <div className={`rounded-2xl p-5 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-black">Estado de SIMs</h3>
                        <button onClick={() => setActiveTab('numbers')} className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                          Ver todo <ChevronRight size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {slots.map(slot => {
                          const flag = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                          const msgsCount = messages.filter(m => m.slot_id === slot.slot_id).length;
                          const isActive = slot.status !== 'expired';
                          return (
                            <div key={slot.slot_id} className={`flex items-center gap-2.5 p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="text-xl flex-shrink-0">{flag}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate">{slot.label || slot.phone_number}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{msgsCount} msgs</p>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna derecha: Feed en vivo */}
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
                    <div className="flex-1 flex items-center justify-center py-8">
                      <RefreshCw size={20} className="text-slate-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className={`flex-1 flex flex-col items-center justify-center gap-2 py-8 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                      <MessageSquare size={28} />
                      <p className="text-[12px] font-semibold">Sin mensajes aún</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto">
                      {messages.slice(0, 10).map(msg => {
                        const svc = detectService(msg.sender, msg.content);
                        const code = msg.verification_code || extractCode(msg.content);
                        const slot = slots.find(s => s.slot_id === msg.slot_id);
                        const flag = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                        // Nombre limpio del servicio: si no se detectó, usar "SMS"
                        const displayName = svc.key !== 'other' ? svc.label : 'SMS';
                        const iconLetters = svc.key !== 'other'
                          ? svc.label.slice(0, 2).toUpperCase()
                          : 'SM';

                        return (
                          <div key={msg.id} className={`flex flex-col gap-2 p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            {/* Fila superior: marca + SIM destino + tiempo */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0"
                                style={{ background: isDark ? svc.darkBg : svc.bg, color: svc.color }}>
                                {iconLetters}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-black" style={{ color: svc.color }}>{displayName}</p>
                                <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {flag} {slot?.phone_number ?? 'SIM'} · {timeAgo(msg.received_at)}
                                </p>
                              </div>
                              {code && (
                                <button
                                  onClick={() => handleCopy(msg.id, code)}
                                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-black hover:bg-primary/20 transition-colors"
                                >
                                  {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                                  {code}
                                </button>
                              )}
                            </div>
                            {/* Fila inferior: texto completo del mensaje */}
                            <p className={`text-[11px] leading-relaxed pl-10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {msg.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => setActiveTab('messages')}
                    className="mt-4 flex items-center justify-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    Ver todos <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── MESSAGES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'messages' && (
            <div className="flex flex-col gap-4">

              {/* Filters */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                    !selectedSlot ? 'bg-primary text-white' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100')
                  }`}
                >
                  Todos ({messages.length})
                </button>
                {slots.map(slot => (
                  <button
                    key={slot.slot_id}
                    onClick={() => setSelectedSlot(slot.slot_id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      selectedSlot === slot.slot_id
                        ? 'bg-primary text-white'
                        : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100')
                    }`}
                  >
                    <span>{REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐'}</span>
                    {slot.label || slot.phone_number.slice(-6)}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className={`rounded-2xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                      <th className="px-5 py-3">Servicio</th>
                      <th className="px-5 py-3">Número SIM</th>
                      <th className="px-5 py-3 flex-1">Mensaje</th>
                      <th className="px-5 py-3">Código</th>
                      <th className="px-5 py-3">Hora</th>
                      <th className="px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <RefreshCw size={20} className="text-slate-400 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredMessages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <MessageSquare size={28} />
                            <p className="text-[12px] font-semibold">Sin mensajes</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMessages.map((msg, idx) => {
                      const svc = detectService(msg.sender, msg.content);
                      const code = msg.verification_code || extractCode(msg.content);
                      const slot = slots.find(s => s.slot_id === msg.slot_id);
                      const flag = REGION_FLAGS[slot?.region?.toUpperCase() ?? ''] ?? '🌐';
                      return (
                        <tr
                          key={msg.id}
                          className={`border-b transition-colors ${
                            isDark
                              ? `border-slate-800 ${!msg.is_read ? 'bg-primary/5' : ''} hover:bg-slate-800`
                              : `border-slate-50 ${!msg.is_read ? 'bg-blue-50/50' : ''} hover:bg-slate-50`
                          }`}
                        >
                          {/* Service */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0"
                                style={{ background: isDark ? svc.darkBg : svc.bg, color: svc.color }}>
                                {svc.label.slice(0, 2).toUpperCase()}
                              </div>
                              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{svc.label}</span>
                            </div>
                          </td>
                          {/* SIM */}
                          <td className="px-5 py-3">
                            <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {flag} {slot?.phone_number ?? '—'}
                            </span>
                          </td>
                          {/* Content */}
                          <td className="px-5 py-3 max-w-[300px]">
                            <p className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'} ${!msg.is_read ? 'font-semibold' : ''}`}>
                              {msg.content}
                            </p>
                          </td>
                          {/* Code */}
                          <td className="px-5 py-3">
                            {code ? (
                              <button
                                onClick={() => handleCopy(msg.id, code)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-black hover:bg-primary/20 transition-colors"
                              >
                                {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                                {code}
                              </button>
                            ) : (
                              <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
                            )}
                          </td>
                          {/* Time */}
                          <td className="px-5 py-3">
                            <div className={`flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              <Clock size={11} />
                              <span>{new Date(msg.received_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          {/* Read */}
                          <td className="px-5 py-3">
                            {msg.is_read
                              ? <CheckCircle2 size={15} className="text-emerald-500" />
                              : <Circle size={15} className="text-primary fill-primary/20" />
                            }
                          </td>
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-black">Mis SIMs</h2>
                  <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{activeSlots.length} activas · {slots.length} total</p>
                </div>
                <button
                  onClick={() => navigate('/onboarding/plan')}
                  className="flex items-center gap-2 bg-primary text-white text-[12px] font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} />
                  Nueva SIM
                </button>
              </div>

              <div className={`rounded-2xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                      <th className="px-5 py-3">Número</th>
                      <th className="px-5 py-3">Región</th>
                      <th className="px-5 py-3">Etiqueta</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Mensajes</th>
                      <th className="px-5 py-3">Reenvío</th>
                      <th className="px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <RefreshCw size={20} className="text-slate-400 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : slots.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Smartphone size={28} />
                            <p className="text-[12px] font-semibold">Sin SIMs asignadas</p>
                            <button
                              onClick={() => navigate('/onboarding/plan')}
                              className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-bold hover:bg-primary/90 transition-colors"
                            >
                              Activar primera SIM
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : slots.map(slot => {
                      const flag = REGION_FLAGS[slot.region?.toUpperCase() ?? ''] ?? '🌐';
                      const msgsCount = messages.filter(m => m.slot_id === slot.slot_id).length;
                      const isActive = slot.status !== 'expired';
                      return (
                        <tr
                          key={slot.slot_id}
                          className={`border-b transition-colors cursor-pointer ${
                            isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-50 hover:bg-slate-50'
                          }`}
                          onClick={() => navigate('/dashboard/numbers')}
                        >
                          <td className="px-5 py-3">
                            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{slot.phone_number}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5">{flag} <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{slot.region ?? '—'}</span></span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{slot.label || '—'}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase">{slot.plan_type}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{msgsCount}</span>
                          </td>
                          <td className="px-5 py-3">
                            {slot.forwarding_active
                              ? <span className="flex items-center gap-1 text-emerald-500 text-[11px] font-semibold"><Wifi size={11} /> Activo</span>
                              : <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                              {isActive ? 'Activa' : 'Expirada'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default WebDashboard;
