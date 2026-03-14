import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, RefreshCw, X, FileJson } from 'lucide-react';

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

const AdminLogs: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'info' | 'warning'>('all');

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, event_type, severity, message, user_email, payload, source, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setLogs((data as AuditLogRow[]) || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  const filteredLogs = severityFilter === 'all'
    ? logs
    : logs.filter((log) => (log.severity || 'info') === severityFilter);

  const badgeClass = (severity: string) => {
    const s = (severity || 'info').toLowerCase();
    if (s === 'error') return 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30';
    if (s === 'warning') return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
    return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30';
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'} pb-20`}>
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">Logs de auditoría</h1>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="ml-auto p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-slate-500' : 'text-slate-600 dark:text-slate-400'} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3">
          {(['all', 'error', 'warning', 'info'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                severityFilter === s
                  ? isDark ? 'bg-primary text-white' : 'bg-primary text-white'
                  : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={28} className="text-slate-400 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-slate-900' : 'bg-white'} border border-slate-200 dark:border-slate-800`}>
            <FileJson size={40} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No hay registros</p>
          </div>
        ) : (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                    <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-3">Fecha</th>
                    <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-3">Evento</th>
                    <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-3">Email</th>
                    <th className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-4 py-3">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`border-b cursor-pointer transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800/70' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatRelative(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${badgeClass(log.severity || 'info')}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {log.user_email || '—'}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {log.message || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className={`w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <span className={`text-sm font-black ${badgeClass(selectedLog.severity || 'info')} px-2 py-1 rounded-lg`}>
                {selectedLog.event_type}
              </span>
              <button onClick={() => setSelectedLog(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2 text-[11px]">
              <p><span className="font-bold text-slate-500 dark:text-slate-400">Mensaje:</span> {selectedLog.message || '—'}</p>
              <p><span className="font-bold text-slate-500 dark:text-slate-400">Email:</span> {selectedLog.user_email || '—'}</p>
              <p><span className="font-bold text-slate-500 dark:text-slate-400">Origen:</span> {selectedLog.source || '—'}</p>
            </div>
            <div className="px-4 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Payload (JSON)</p>
              <pre className={`p-3 rounded-xl text-[11px] overflow-auto max-h-[40vh] ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-800'}`}>
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
