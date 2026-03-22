import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Consumo del token del correo de cancelación (#/web/reactivate-line?token=…).
 * Redirige a Stripe Checkout para reactivar la línea (misma lógica que compra / webhook).
 */
const ReactivateLine: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState('Preparando tu reactivación…');

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
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (cancelled) return;
        if (res.ok && typeof data.url === 'string' && data.url.startsWith('http')) {
          window.location.href = data.url;
          return;
        }
        setStatus('error');
        setMessage(typeof data.error === 'string' ? data.error : 'No se pudo iniciar la reactivación.');
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
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-8 text-center">
        {status === 'loading' ? (
          <>
            <Loader2 className="w-10 h-10 text-[#0074d4] animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Reactivar línea</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
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
