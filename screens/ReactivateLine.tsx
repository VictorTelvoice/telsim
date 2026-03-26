import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';

const isMobileDeviceUA = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Consumo del token del correo de cancelación (#/web/reactivate-line?token=…).
 * Reactiva la suscripción existente en Stripe (sin Checkout) y restaura el slot en BD.
 */
const ReactivateLine: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('Preparando tu reactivación…');
  const [nextUrl, setNextUrl] = useState(isMobileDeviceUA() ? '/#/dashboard/numbers' : '/#/web');
  const closeUrl = isMobileDeviceUA() ? '/#/dashboard/billing' : '/#/web';

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const q = hash.includes('?') ? hash.split('?')[1] ?? '' : '';
    const token = new URLSearchParams(q).get('token')?.trim() ?? '';

    if (!token) {
      setStatus('error');
      setMessage('Falta el token en el enlace. Usa el botón del correo de cancelación.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reactivate-line', token }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          next_url?: string;
          url?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && data.ok === true) {
          setStatus('success');
          setMessage(typeof data.message === 'string' ? data.message : 'Reactivación exitosa.');
          if (!isMobileDeviceUA() && typeof data.next_url === 'string' && data.next_url.trim() !== '') {
            setNextUrl(data.next_url.trim());
          }
          return;
        }
        if (res.ok && typeof data.url === 'string' && data.url.startsWith('http')) {
          window.location.href = data.url;
          return;
        }
        setStatus('error');
        setMessage(typeof data.error === 'string' ? data.error : 'No se pudo completar la reactivación.');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Error de red. Intenta de nuevo en unos minutos.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-8 text-center relative">
        {status === 'success' && (
          <a
            href={closeUrl}
            aria-label="Cerrar y volver a facturación"
            className="absolute top-4 right-4 inline-flex items-center justify-center size-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </a>
        )}
        {status === 'loading' ? (
          <>
            <Loader2 className="w-10 h-10 text-[#0074d4] animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Reactivar línea</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
          </>
        ) : status === 'success' ? (
          <>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Listo</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <a
              href={nextUrl}
              className="inline-flex items-center justify-center rounded-xl bg-[#0074d4] hover:bg-[#0066bd] text-white text-sm font-semibold px-6 py-3 transition-colors"
            >
              Ir a mis números
            </a>
          </>
        ) : (
          <>
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No se pudo continuar</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ReactivateLine;
