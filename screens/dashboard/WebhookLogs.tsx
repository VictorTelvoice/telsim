import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { Activity, ChevronLeft, Loader2, RefreshCw, Search } from 'lucide-react';

export type AutomationLogRow = {
  id: string;
  user_id: string;
  slot_id: string | null;
  status: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const WebhookLogs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState<AutomationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user?.id) return;
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/manage', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'list-automation-logs',
        limit: 80,
        accessToken: session?.access_token || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray((body as { logs?: unknown[] }).logs)) {
      setLogs((((body as { logs?: AutomationLogRow[] }).logs) || []) as AutomationLogRow[]);
    } else {
      setLogs([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }, [user, fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const filteredLogs = searchQuery.trim()
    ? logs.filter((log) => {
        const p = log.payload as Record<string, unknown> | null;
        const sender = (p?.sender ?? '') as string;
        const text = (p?.text ?? '') as string;
        const code = (p?.code ?? '') as string;
        const q = searchQuery.toLowerCase();
        return (
          sender.toLowerCase().includes(q) ||
          text.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q)
        );
      })
    : logs;

  const statusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === '200') return { bg: 'bg-emerald-500', border: 'border-l-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
    if (s === 'error' || s === 'failed' || s === '400') return { bg: 'bg-red-500', border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' };
    return { bg: 'bg-amber-500', border: 'border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };

  const statusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'success' || s === '200') return t('webhook_logs.status_ok');
    if (s === 'error' || s === 'failed' || s === '400') return t('webhook_logs.status_error');
    return t('webhook_logs.status_pending');
  };

  const isLogOk = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === '200' || s === 'success';
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10 max-w-[90vw]`;
    toast.innerHTML = `<span class="text-[11px] font-bold">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const handleRetry = async (logId: string) => {
    if (!user?.id || retryingLogId) return;
    setRetryingLogId(logId);
    try {
      const res = await fetch('/api/webhooks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_id: logId, userId: user.id }),
      });
      const data = await res.json().catch(() => ({}));
      const newStatus = res.ok ? String(data.status ?? '') : '';
      if (res.ok) {
        setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: newStatus } : l));
        showToast(`${t('webhook_logs.retry_toast')}: ${newStatus || 'OK'}`);
      } else {
        showToast(t('webhook_logs.retry_failed'), 'error');
      }
    } catch {
      showToast(t('webhook_logs.retry_failed'), 'error');
    } finally {
      setRetryingLogId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col">
      {/* Header */}
      <div className="bg-[#F0F4F8] dark:bg-background-dark pt-12 pb-3 px-4 flex items-center gap-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0"
        >
          <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Activity size={20} className="text-primary flex-shrink-0" />
          <h1 className="text-[18px] font-black text-slate-900 dark:text-white tracking-tight truncate">
            {t('webhook_logs.title')}
          </h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={18} className={`text-slate-600 dark:text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className={`relative rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('webhook_logs.search_placeholder')}
            className={`w-full pl-10 pr-4 py-3 text-[13px] outline-none placeholder-slate-400 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-slate-800' : 'bg-white border border-slate-100'}`}>
            <Activity size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className={`text-[14px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('webhook_logs.no_logs_yet')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const colors = statusColor(log.status);
              const payload = (log.payload || {}) as Record<string, unknown>;
              const sender = (payload.sender ?? '—') as string;
              const snippet = (payload.text ?? '') as string;
              const shortSnippet = snippet.length > 40 ? `${snippet.slice(0, 40)}…` : snippet;
              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border-l-4 overflow-hidden ${colors.border} ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border shadow-sm`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white">
                        {t('webhook_logs.event_sms_received')}
                      </span>
                      <span className={`text-[11px] font-bold ${colors.text}`}>{statusLabel(log.status)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      {t('webhook_logs.destination')}: {payload.chat_id ? t('webhook_logs.destination_telegram') : t('webhook_logs.destination_webhook')}
                    </p>
                    {sender && sender !== '—' && (
                      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">
                        {sender}
                      </p>
                    )}
                    {shortSnippet && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {shortSnippet}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                      {formatDate(log.created_at)}
                    </p>
                    {!isLogOk(log.status) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                        disabled={!!retryingLogId}
                        className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                      >
                        {retryingLogId === log.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        {retryingLogId === log.id ? t('webhook_logs.retrying') : t('webhook_logs.retry')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookLogs;
