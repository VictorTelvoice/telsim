import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, RefreshCw, X, FileJson, Terminal, Wifi } from 'lucide-react';

export type AuditLogRow = {
  id: string;
  event_type: string;
  severity: string;
  message: string | null;
  user_email: string | null;
  payload: Record<string, unknown> | null;
  source: string | null;
  created_at: string;
};

export type HttpResponseRow = {
  id: string | number;
  status_code: number;
  created: string;
  url: string | null;
};

type ViewFilter = 'all' | 'errors' | 'payments';
type MainSection = 'audit' | 'network';

function formatRelative(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return 'hace un momento';
    if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
    if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
    if (sec < 172800) return 'ayer';
    if (sec < 604800) return `hace ${Math.floor(sec / 86400)} días`;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function rowBgClass(severity: string): string {
  const s = (severity || 'info').toLowerCase();
  if (s === 'error' || s === 'critical') return 'bg-red-950/50 border-l-4 border-red-500 hover:bg-red-950/70';
  if (s === 'warning') return 'bg-amber-950/40 border-l-4 border-amber-500 hover:bg-amber-950/60';
  return 'bg-emerald-950/30 border-l-4 border-emerald-500 hover:bg-emerald-950/50';
}

function badgeClass(severity: string): string {
  const s = (severity || 'info').toLowerCase();
  if (s === 'error' || s === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (s === 'warning') return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
}

function httpRowBgClass(statusCode: number): string {
  if (statusCode >= 500) return 'bg-red-950/50 border-l-4 border-red-500 hover:bg-red-950/70';
  if (statusCode >= 400) return 'bg-amber-950/40 border-l-4 border-amber-500 hover:bg-amber-950/60';
  return 'bg-emerald-950/30 border-l-4 border-emerald-500 hover:bg-emerald-950/50';
}

function httpStatusBadgeClass(statusCode: number): string {
  if (statusCode >= 500) return 'bg-red-500/20 text-red-400 border-red-500/50';
  if (statusCode >= 400) return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
}

const PAYMENT_EVENT_PREFIX = 'PAYMENT';

const AdminLogs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainSection, setMainSection] = useState<MainSection>('audit');
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkLogs, setNetworkLogs] = useState<HttpResponseRow[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  const fetchLogs = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch('/api/manage', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'list-audit-logs',
        limit: 200,
        accessToken: session?.access_token || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray((body as { logs?: unknown[] }).logs)) {
      setLogs((((body as { logs?: AuditLogRow[] }).logs) || []) as AuditLogRow[]);
    } else {
      setLogs([]);
    }
  }, []);

  const fetchNetworkLogs = useCallback(async () => {
    const { data, error } = await supabase
      .schema('net')
      .from('_http_response')
      .select('id, status_code, created, url')
      .order('created', { ascending: false })
      .limit(20);
    if (!error && data) setNetworkLogs((data as HttpResponseRow[]) || []);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs, user]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (mainSection !== 'network') return;
    setNetworkLoading(true);
    fetchNetworkLogs().finally(() => setNetworkLoading(false));
  }, [mainSection, fetchNetworkLogs]);

  useEffect(() => {
    if (mainSection !== 'network') return;
    const interval = setInterval(() => fetchNetworkLogs(), 30_000);
    return () => clearInterval(interval);
  }, [mainSection, fetchNetworkLogs]);

  const filteredLogs = (() => {
    if (viewFilter === 'all') return logs;
    if (viewFilter === 'errors') return logs.filter((log) => ['error', 'critical'].includes((log.severity || '').toLowerCase()));
    if (viewFilter === 'payments') return logs.filter((log) => (log.event_type || '').toUpperCase().startsWith(PAYMENT_EVENT_PREFIX));
    return logs;
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-emerald-500" />
            <h1 className="text-lg font-black text-white">Logs de auditoría</h1>
          </div>
          <button
            onClick={() => {
              if (mainSection === 'audit') {
                setLoading(true);
                fetchLogs().finally(() => setLoading(false));
              } else {
                setNetworkLoading(true);
                fetchNetworkLogs().finally(() => setNetworkLoading(false));
              }
            }}
            disabled={mainSection === 'audit' ? loading : networkLoading}
            className="ml-auto p-2 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 text-slate-400 hover:text-white"
          >
            <RefreshCw size={18} className={mainSection === 'audit' ? (loading ? 'animate-spin' : '') : (networkLoading ? 'animate-spin' : '')} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-2">
          {[
            { id: 'audit' as MainSection, label: 'Auditoría', icon: <FileJson size={14} /> },
            { id: 'network' as MainSection, label: 'Logs de Red', icon: <Wifi size={14} /> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setMainSection(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                mainSection === id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {mainSection === 'audit' && (
          <div className="flex gap-2 px-4 pb-3">
            {[
              { id: 'all' as ViewFilter, label: 'Todos' },
              { id: 'errors' as ViewFilter, label: 'Errores' },
              { id: 'payments' as ViewFilter, label: 'Pagos' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setViewFilter(id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  viewFilter === id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="p-4">
        {mainSection === 'audit' && (
          <>
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={28} className="text-slate-500 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-slate-900/80 border border-slate-800">
                <FileJson size={40} className="mx-auto text-slate-500 mb-3" />
                <p className="text-sm font-medium text-slate-400">No hay registros</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80">
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Fecha</th>
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Evento</th>
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Email</th>
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`border-b border-slate-800 cursor-pointer transition-colors ${rowBgClass(log.severity || 'info')}`}
                        >
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatRelative(log.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${badgeClass(log.severity || 'info')}`}>
                              {log.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-300 truncate max-w-[140px]">
                            {log.user_email || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-300 truncate max-w-[200px]">
                            {log.message || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {mainSection === 'network' && (
          <>
            {networkLoading && networkLogs.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={28} className="text-slate-500 animate-spin" />
              </div>
            ) : networkLogs.length === 0 ? (
              <div className="text-center py-16 rounded-xl bg-slate-900/80 border border-slate-800">
                <Wifi size={40} className="mx-auto text-slate-500 mb-3" />
                <p className="text-sm font-medium text-slate-400">No hay respuestas HTTP registradas</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80">
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Fecha</th>
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">Status</th>
                        <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-4 py-3">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkLogs.map((row) => (
                        <tr
                          key={String(row.id)}
                          className={`border-b border-slate-800 transition-colors ${httpRowBgClass(row.status_code)}`}
                        >
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {formatRelative(row.created)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-bold ${httpStatusBadgeClass(row.status_code)}`}>
                              {row.status_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-300 truncate max-w-[280px]" title={row.url || ''}>
                            {row.url || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl bg-slate-900 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <span className={`text-sm font-black px-2 py-1 rounded-lg border ${badgeClass(selectedLog.severity || 'info')}`}>
                {selectedLog.event_type}
              </span>
              <button onClick={() => setSelectedLog(null)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2 text-xs text-slate-300">
              <p><span className="font-bold text-slate-500">Mensaje:</span> {selectedLog.message || '—'}</p>
              <p><span className="font-bold text-slate-500">Email:</span> {selectedLog.user_email || '—'}</p>
              <p><span className="font-bold text-slate-500">Origen:</span> {selectedLog.source || '—'}</p>
            </div>
            <div className="px-4 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Payload (error técnico Stripe / Vercel)
              </p>
              <pre className="p-4 rounded-lg text-[11px] overflow-auto max-h-[50vh] bg-slate-950 text-slate-300 font-mono border border-slate-700 whitespace-pre-wrap break-all">
                {JSON.stringify(selectedLog.payload ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
