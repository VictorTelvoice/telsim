import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2 } from 'lucide-react';

export type AdminSettingRow = { id: string; content: string | null; updated_at: string | null };

const DEFAULT_KEYS: { key: string; label: string; placeholder: string }[] = [
  { key: 'email_purchase_success_title_es', label: 'Email: Título compra exitosa (ES)', placeholder: '¡Suscripción activada!' },
  { key: 'email_purchase_success_title_en', label: 'Email: Título compra exitosa (EN)', placeholder: 'Subscription activated!' },
  { key: 'telegram_new_purchase', label: 'Telegram: Nueva compra (HTML). Placeholders: {{phone}}, {{plan}}', placeholder: '<b>🚀 NUEVA COMPRA: SIM {{phone}} activada</b>\n📱 <b>Número:</b> {{phone}}\n💎 <b>Plan:</b> {{plan}}' },
  { key: 'telegram_upgrade_success', label: 'Telegram: Upgrade exitoso (Markdown). Placeholders: {{phone}}, {{plan}}, {{billing}}, {{now}}, {{status}}', placeholder: '⚡ *UPGRADE EXITOSO*\n📱 Número: +{{phone}}\n📦 Plan: {{plan}} · {{billing}}' },
  { key: 'telegram_subscription_cancelled', label: 'Telegram: Suscripción cancelada (HTML). Placeholders: {{plan}}, {{end_date}}', placeholder: '<b>⚠️ SUSCRIPCIÓN CANCELADA</b>\n💎 <b>Plan:</b> {{plan}}\n📅 <b>Activo hasta:</b> {{end_date}}' },
  { key: 'telegram_cancellation', label: 'Telegram: Cancelación (Markdown). Placeholders: {{phone}}, {{plan}}, {{date}}, {{status}}', placeholder: '❌ *CANCELACIÓN*\n📱 Número: +{{phone}}\n📦 Plan: {{plan}}' },
];

const AdminContent: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('admin_settings').select('id, content');
    const map: Record<string, string> = {};
    (data || []).forEach((r: { id: string; content: string | null }) => {
      map[r.id] = r.content ?? '';
    });
    setSettings(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const { key } of DEFAULT_KEYS) {
        const content = settings[key] ?? '';
        await supabase.from('admin_settings').upsert(
          { id: key, content, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-black text-white mb-2">CMS de Notificaciones</h2>
      <p className="text-sm text-slate-400 mb-6">
        Edita los textos de emails y mensajes de Telegram. Si un campo está vacío, se usa el valor por defecto del código.
      </p>

      <div className="space-y-4">
        {DEFAULT_KEYS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
            <textarea
              value={settings[key] ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={key.startsWith('telegram') ? 4 : 2}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        Guardar cambios
      </button>
    </div>
  );
};

export default AdminContent;
