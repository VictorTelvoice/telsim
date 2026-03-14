import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, Mail } from 'lucide-react';

const COMPRA_EXITOSA_KEYS = [
  { key: 'email_purchase_success_subject_es', label: 'Asunto (ES)', placeholder: 'Tu número SIM Telsim está activo' },
  { key: 'email_purchase_success_subject_en', label: 'Asunto (EN)', placeholder: 'Your Telsim SIM number is active' },
  { key: 'email_purchase_success_title_es', label: 'Título en correo (ES)', placeholder: '¡Suscripción activada!' },
  { key: 'email_purchase_success_title_en', label: 'Título en correo (EN)', placeholder: 'Subscription activated!' },
  { key: 'email_purchase_success_body_es', label: 'Cuerpo del mensaje (ES)', placeholder: 'Tu plan {{plan}} está activo. Ya puedes acceder a tu número SIM...' },
  { key: 'email_purchase_success_body_en', label: 'Cuerpo del mensaje (EN)', placeholder: 'Your {{plan}} plan is now active. You can access your SIM number...' },
];

/**
 * Panel para editar textos de correos y Telegram. Usa admin_settings.
 * Enfocado en Compra Exitosa: asunto y cuerpo.
 */
const ContentCMS: React.FC = () => {
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
      for (const { key } of COMPRA_EXITOSA_KEYS) {
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
      <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
        <Mail size={22} />
        CMS de contenido
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        Edita asunto y cuerpo de los mensajes de <strong>Compra Exitosa</strong>. La Edge Function send-email usará estos valores desde admin_settings si existen.
      </p>

      <div className="space-y-4">
        {COMPRA_EXITOSA_KEYS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
            <textarea
              value={settings[key] ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={key.includes('body') ? 4 : 2}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        En el cuerpo puedes usar placeholders: {'{{plan}}'}, {'{{amount}}'}, {'{{phone_number}}'}, {'{{next_date}}'}, {'{{billing_type}}'}.
      </p>

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

export default ContentCMS;
