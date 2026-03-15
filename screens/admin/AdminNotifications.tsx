import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const CONFIG_ALERT_KEY = 'config_alert_telegram_admin_enabled';

const AdminNotifications: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [savingSwitch, setSavingSwitch] = useState(false);
  const [simulatingAlert, setSimulatingAlert] = useState(false);

  const showLocalToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 ${type === 'success' ? 'bg-slate-900/95' : 'bg-rose-600'} backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-white/10 max-w-[90vw]`;
    toast.innerHTML = `<span class="text-[11px] font-bold">${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }, []);

  /** Carga solo config_alert_telegram_admin_enabled desde admin_settings. */
  const fetchAlertConfig = useCallback(async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('content')
      .eq('id', CONFIG_ALERT_KEY)
      .maybeSingle();
    const content = (data as { content: string | null } | null)?.content ?? '';
    const isEnabled = String(content).toLowerCase() === 'true';
    setEnabled(isEnabled);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAlertConfig().finally(() => setLoading(false));
  }, [fetchAlertConfig]);

  const handleToggle = useCallback(async () => {
    const next = !enabled;
    setSavingSwitch(true);
    try {
      await supabase.from('admin_settings').upsert(
        { id: CONFIG_ALERT_KEY, content: next ? 'true' : 'false', updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      setEnabled(next);
    } catch (e) {
      console.error('Error guardando interruptor:', e);
      showLocalToast('Error al guardar. Reintenta.', 'error');
    } finally {
      setSavingSwitch(false);
    }
  }, [enabled, showLocalToast]);

  const handleSimulate = useCallback(async () => {
    setSimulatingAlert(true);
    try {
      // Refresco: leer el valor más reciente de la DB antes de simular
      const { data: fresh } = await supabase
        .from('admin_settings')
        .select('content')
        .eq('id', CONFIG_ALERT_KEY)
        .maybeSingle();
      const content = (fresh as { content: string | null } | null)?.content ?? '';
      const isEnabled = String(content).toLowerCase() === 'true';
      const res = await fetch('/api/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate-critical-alert' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.sent) {
        showLocalToast(data.message ?? 'Alerta enviada. Revisa tu Telegram.');
      } else {
        console.log('Alerta bloqueada: El interruptor está apagado.');
        showLocalToast(data.message ?? 'Alerta bloqueada: El interruptor está apagado.', 'error');
      }
    } catch (e) {
      console.error('Simular error crítico:', e);
      showLocalToast('Error al simular la alerta.', 'error');
    } finally {
      setSimulatingAlert(false);
    }
  }, [showLocalToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bg-slate-50 min-h-screen">
        <Loader2 size={32} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 p-6">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Notificaciones
        </h1>
        <p className="text-slate-600 mb-6">
          Alertas de administrador: recibe en tu Telegram los fallos críticos del sistema (webhook, etc.).
        </p>

        <section className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Configuración de Alertas de Sistema
          </h2>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="alert-telegram-switch" className="text-sm text-slate-600">
              Recibir alertas de fallos en mi Telegram
            </label>
            <button
              id="alert-telegram-switch"
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={savingSwitch}
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-70 ${
                enabled ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
                  enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Cuando está activado, los errores críticos (p. ej. webhook Stripe) se envían al Telegram del CEO usando TELEGRAM_ADMIN_TOKEN. El cambio se guarda al instante.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={simulatingAlert}
              onClick={handleSimulate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-sm font-semibold hover:bg-amber-200 disabled:opacity-50 transition-colors"
            >
              {simulatingAlert ? (
                <Loader2 size={18} className="animate-spin" />
              ) : null}
              Simular Error Crítico
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminNotifications;
