import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Inbox, Loader2, X } from 'lucide-react';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

export type IncomingSmsRow = {
  id: string;
  created_at: string;
  received_at: string | null;
  display_at: string;
  slot_id: string | null;
  sender: string | null;
  content: string | null;
  user_id: string | null;
  service_name: string | null;
  verification_code: string | null;
  is_spam: boolean;
  message_type: string | null;
  is_read: boolean;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function truncateMsg(s: string | null, max = 72) {
  const t = String(s ?? '').trim();
  if (t.length <= max) return t || '—';
  return `${t.slice(0, max)}…`;
}

const AdminIncomingSms: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<IncomingSmsRow[]>([]);
  const [slotId, setSlotId] = useState('');
  const [sender, setSender] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [hideSpam, setHideSpam] = useState(false);
  const [detail, setDetail] = useState<IncomingSmsRow | null>(null);

  const slotRef = useRef('');
  const senderRef = useRef('');
  const serviceRef = useRef('');
  slotRef.current = slotId;
  senderRef.current = sender;
  serviceRef.current = serviceName;

  const fetchList = useCallback(async () => {
    if (!user?.id) return;
    if ((user.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list-incoming-sms',
          userId: ADMIN_UID,
          slotId: slotRef.current.trim() || undefined,
          sender: senderRef.current.trim() || undefined,
          serviceName: serviceRef.current.trim() || undefined,
          onlyUnread,
          hideSpam,
          limit: 100,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.list)) {
        setRows(data.list as IncomingSmsRow[]);
      } else {
        setRows([]);
        console.error('[AdminIncomingSms]', data);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, onlyUnread, hideSpam]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="flex items-start gap-3 mb-2">
          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700">
            <Inbox size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">SMS Entrantes</h1>
            <p className="text-slate-600 text-sm mt-1">
              Registros de <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">public.sms_logs</code>
              . Orden: recepción más reciente primero (hasta 100 filas).
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Slot
              </label>
              <input
                type="text"
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                placeholder="slot_id…"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-40 max-w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Remitente
              </label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                placeholder="sender…"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-44 max-w-full"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Servicio
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchList()}
                placeholder="service_name…"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-44 max-w-full"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 pt-6">
              <input
                type="checkbox"
                checked={onlyUnread}
                onChange={(e) => setOnlyUnread(e.target.checked)}
                className="rounded border-slate-300"
              />
              Solo no leídos
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 pt-6">
              <input
                type="checkbox"
                checked={hideSpam}
                onChange={(e) => setHideSpam(e.target.checked)}
                className="rounded border-slate-300"
              />
              Ocultar spam
            </label>
            <button
              type="button"
              onClick={() => fetchList()}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 mt-6"
            >
              {loading ? <Loader2 size={16} className="animate-spin inline" /> : 'Buscar'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 font-semibold">
                  <th className="px-5 py-3 whitespace-nowrap">Fecha</th>
                  <th className="px-5 py-3">Slot</th>
                  <th className="px-5 py-3">Remitente</th>
                  <th className="px-5 py-3">Servicio</th>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3 min-w-[180px]">Mensaje</th>
                  <th className="px-5 py-3">Spam</th>
                  <th className="px-5 py-3">Leído</th>
                  <th className="px-5 py-3 w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      No hay registros.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                        {formatWhen(row.display_at)}
                      </td>
                      <td className="px-5 py-3 text-slate-800 font-mono text-xs break-all max-w-[120px]">
                        {row.slot_id ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-800 break-all max-w-[140px]">{row.sender ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-700">{row.service_name ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-700 font-mono text-xs">
                        {row.verification_code ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-md">
                        <span className="line-clamp-2" title={row.content ?? ''}>
                          {truncateMsg(row.content)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            row.is_spam ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.is_spam ? 'Spam' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            row.is_read ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {row.is_read ? 'Leído' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setDetail(row)}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Mensaje completo</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <dl className="space-y-3 text-sm text-slate-800">
              <div>
                <dt className="text-slate-500 font-medium">Fecha</dt>
                <dd className="mt-0.5">{formatWhen(detail.display_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Slot</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">{detail.slot_id ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Remitente</dt>
                <dd className="mt-0.5 break-all">{detail.sender ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Servicio</dt>
                <dd className="mt-0.5">{detail.service_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 font-medium">Contenido</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {detail.content?.trim() ? detail.content : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminIncomingSms;
