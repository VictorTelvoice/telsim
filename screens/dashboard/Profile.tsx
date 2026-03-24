import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { resolveAvatarUrlForUi } from '../../lib/resolveAvatarUrl';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, invalidateProfile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const resolvedAvatarUrl = resolveAvatarUrlForUi(user);

  const [nombre, setNombre] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');
  const [pais, setPais] = useState(user?.user_metadata?.country || 'Chile');
  const [moneda, setMoneda] = useState(user?.user_metadata?.moneda || 'CLP');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(resolvedAvatarUrl);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(resolvedAvatarUrl);
    setAvatarError(false);
  }, [resolvedAvatarUrl]);

  const displayName = nombre || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Cast supabase.auth to any to bypass SupabaseAuthClient type missing updateUser
      await (supabase.auth as any).updateUser({
        data: { full_name: nombre, phone, country: pais, moneda }
      });
      await supabase.from('users').update({
        nombre,
        phone,
        pais,
        moneda,
      }).eq('id', user.id);

      invalidateProfile();
      await refreshProfile();

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error guardando perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatarUrlWithVersion = `${publicUrl}?t=${Date.now()}`;
      // Cast supabase.auth to any to bypass SupabaseAuthClient type missing updateUser
      await (supabase.auth as any).updateUser({ data: { avatar_url: avatarUrlWithVersion } });
      await supabase.from('users').update({ avatar_url: avatarUrlWithVersion }).eq('id', user.id);
      setAvatarUrl(avatarUrlWithVersion);

      invalidateProfile();
      await refreshProfile();
    } catch (err) {
      console.error('Error subiendo avatar:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-background-dark font-display flex flex-col">

      {/* Header */}
      <div className="bg-[#F0F4F8] dark:bg-background-dark pt-12 pb-3 px-5 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="w-[38px] h-[38px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#60a5fa' : '#1e3a8a'} strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="flex-1 text-[20px] font-black text-slate-900 dark:text-white tracking-tight">Editar Perfil</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">

        {/* Avatar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            {uploading ? (
              <div className="w-[80px] h-[80px] rounded-[22px] bg-slate-100 dark:bg-slate-800 border-[3px] border-white dark:border-slate-700 shadow-lg flex items-center justify-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-[80px] h-[80px] rounded-[22px] object-cover border-[3px] border-white dark:border-slate-700 shadow-lg"
              />
            ) : (
              <div className="w-[80px] h-[80px] rounded-[22px] bg-gradient-to-br from-[#0ea5e9] to-primary flex items-center justify-center text-white text-[28px] font-black border-[3px] border-white dark:border-slate-700 shadow-lg">
                {userInitials}
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 w-[26px] h-[26px] rounded-full bg-primary border-2 border-white dark:border-slate-700 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Toca la imagen para cambiarla</p>
        </div>

        {/* Campos editables */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-50 dark:divide-slate-800">

          <div className="px-4 py-3.5">
            <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">Nombre Completo</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="w-full bg-transparent text-[15px] font-semibold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none" />
          </div>

          <div className="px-4 py-3.5">
            <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">Número de Teléfono</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className="w-full bg-transparent text-[15px] font-semibold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none" />
          </div>

          <div className="px-4 py-3.5">
            <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">País / Región</label>
            <input type="text" value={pais} onChange={(e) => setPais(e.target.value)} placeholder="Chile" className="w-full bg-transparent text-[15px] font-semibold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none" />
          </div>

          <div className="px-4 py-3.5">
            <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">Moneda</label>
            <div className="flex gap-2 mt-1">
              {(['CLP', 'USD', 'EUR'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMoneda(m)}
                  className={`px-3 py-1.5 rounded-[8px] text-[11px] font-black transition-all ${moneda === m ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Email solo lectura */}
        <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-slate-100 dark:border-slate-800">
          <div className="px-4 py-3.5">
            <label className="block text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">Email</label>
            <p className="text-[15px] font-semibold text-slate-400 dark:text-slate-600">{user?.email}</p>
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-white font-black text-[14px] py-4 rounded-[18px] flex items-center justify-center gap-2 active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              ¡Guardado!
            </>
          ) : 'Guardar Cambios'}
        </button>

      </div>
    </div>
  );
};

export default Profile;
