
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Webhook, 
  Save,
  Loader2,
  ExternalLink,
  Info,
  Globe,
  Zap,
  Code,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const Webhooks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_webhook_url, webhook_is_active')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (data) {
          setWebhookUrl(data.user_webhook_url || '');
          setIsActive(data.webhook_is_active || false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setShowSuccess(false);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          user_webhook_url: webhookUrl,
          webhook_is_active: isActive
        })
        .eq('id', user.id);
      
      if (error) throw error;
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(t('webhooks.error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const examplePayload = {
    "event": "sms.received",
    "from": "REMITENTE",
    "content": "Texto del SMS",
    "verification_code": "123456",
    "service": "Google",
    "slot_id": "1A",
    "received_at": new Date().toISOString()
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-24">
      <header className="flex items-center justify-between px-6 py-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">{t('webhooks.developers')}</h1>
        </div>
        <div className="size-9"></div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="size-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-sm">
            <Webhook className="size-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">{t('webhooks.title')}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[35ch] mx-auto leading-relaxed">
            {t('webhooks.desc')}
          </p>
        </div>

        {showSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-2xl flex items-center gap-3 animate-reveal-number">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{t('webhooks.success')}</p>
          </div>
        )}

        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-soft space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Globe className="size-3" />
              {t('webhooks.url_label')}
            </label>
            <input 
              type="url" 
              value={webhookUrl} 
              onChange={(e) => setWebhookUrl(e.target.value)} 
              className="w-full h-14 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 text-sm font-mono outline-none focus:border-primary transition-all"
              placeholder={t('webhooks.url_placeholder')}
            />
            <p className="text-[10px] text-slate-400 font-medium ml-1">{t('webhooks.url_hint')}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                <Zap className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{t('webhooks.status_label')}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{isActive ? t('webhooks.active') : t('webhooks.inactive')}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 bg-white size-4 rounded-full transition-transform duration-200 ${isActive ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full h-16 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('webhooks.saving')}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {t('webhooks.save')}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Info className="size-5" />
              <p className="text-xs font-bold uppercase tracking-wider">{t('webhooks.what_is_title')}</p>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {t('webhooks.what_is_desc')}
            </p>
            <button 
              onClick={() => navigate('/dashboard/webhooks/guide')}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800 rounded-xl text-[10px] font-black text-primary uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
            >
              {t('webhooks.view_guide')}
              <ExternalLink className="size-3" />
            </button>
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Code className="size-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">{t('webhooks.payload_example')}</p>
              </div>
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto p-4 bg-black/30 rounded-xl border border-white/5 no-scrollbar leading-relaxed">
              {JSON.stringify(examplePayload, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Webhooks;
