
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, 
  Send, 
  Bot, 
  Key, 
  User, 
  Save,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';

const TelegramConfig: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('telegram_token, telegram_chat_id')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (data) {
          setTgToken(data.telegram_token || '');
          setTgChatId(data.telegram_chat_id || '');
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
    try {
      const { error } = await supabase
        .from('users')
        .update({
          telegram_token: tgToken,
          telegram_chat_id: tgChatId
        })
        .eq('id', user.id);
      
      if (error) throw error;
      alert("Configuración de Telegram guardada correctamente");
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Configuración Bot</h1>
        </div>
        <div className="size-9"></div>
      </header>

      <main className="px-6 py-8 max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="size-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-sm">
            <Bot className="size-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Telegram Bot</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[30ch] mx-auto leading-relaxed">
            Vincula tu bot para recibir notificaciones de SMS en tiempo real.
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-soft space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Key className="size-3" />
              Bot API Token
            </label>
            <input 
              type="password" 
              value={tgToken} 
              onChange={(e) => setTgToken(e.target.value)} 
              className="w-full h-14 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 text-sm font-mono outline-none focus:border-primary transition-all"
              placeholder="Ej: 582910..."
            />
            <p className="text-[10px] text-slate-400 font-medium ml-1">Obtenlo de @BotFather en Telegram</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <User className="size-3" />
              Chat ID
            </label>
            <input 
              type="text" 
              value={tgChatId} 
              onChange={(e) => setTgChatId(e.target.value)} 
              className="w-full h-14 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 text-sm font-mono outline-none focus:border-primary transition-all"
              placeholder="Ej: 91823..."
            />
            <p className="text-[10px] text-slate-400 font-medium ml-1">Obtenlo de @userinfobot</p>
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
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 flex gap-4">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-900 dark:text-white">¿No sabes cómo obtener estos datos?</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Hemos preparado una guía paso a paso para que puedas crear tu bot y obtener tu ID en menos de 2 minutos.
            </p>
            <button 
              onClick={() => navigate('/dashboard/telegram-guide')}
              className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              Ver guía de configuración
              <ExternalLink className="size-3" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TelegramConfig;
