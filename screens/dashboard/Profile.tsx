import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { 
  Camera, 
  Globe, 
  Phone, 
  User as UserIcon, 
  Calendar as CalendarIcon,
  Languages,
  MapPin,
  Loader2
} from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [country, setCountry] = useState(user?.user_metadata?.country || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || '');
  const [birthDate, setBirthDate] = useState(user?.user_metadata?.birth_date || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url, nombre')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setAvatarUrl(data.avatar_url);
          if (data.nombre) setFullName(data.nombre);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setAvatarUrl(user?.user_metadata?.avatar_url || null);
      }
    };
    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      
      if (dbError) throw dbError;

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("Error in avatar process:", err);
      alert("Error al actualizar la imagen de perfil.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          country: country,
          phone_number: phoneNumber,
          birth_date: birthDate
        }
      });
      if (authError) throw authError;
      
      await supabase.from('users').update({ 
        nombre: fullName,
      }).eq('id', user?.id);
      
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 mx-auto max-w-md bg-background-light dark:bg-background-dark">
        
        <div className="pt-16 pb-10 px-6 flex flex-col items-center text-center relative">
          {/* Logo Oficial Unificado con Fallback */}
          <div className="absolute top-8 right-6 size-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden opacity-60">
             <img 
               src="/logo.svg" 
               alt="TELSIM" 
               className="size-7 object-contain" 
               onError={(e) => {
                 (e.target as any).style.display = 'none';
                 (e.target as any).nextSibling.style.display = 'flex';
               }}
             />
             <div style={{ display: 'none' }} className="size-full bg-primary items-center justify-center text-white flex shadow-sm">
                <span className="material-symbols-outlined text-[20px]">sim_card</span>
             </div>
          </div>

          {/* Avatar Area */}
          <div className="relative group mb-6">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div 
              onClick={handleAvatarClick}
              className="size-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-2xl flex items-center justify-center overflow-hidden relative cursor-pointer group active:scale-95 transition-all"
            >
              {uploading ? (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                   <Loader2 className="size-8 animate-spin mb-1" />
                   <span className="text-[8px] font-black uppercase tracking-tighter">Subiendo</span>
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="size-10 text-slate-300" />
              )}
              
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white size-6" />
              </div>
            </div>
            
            <button 
              onClick={handleAvatarClick}
              className="absolute bottom-1 right-1 size-8 bg-primary text-white rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 active:scale-90"
            >
              <Camera className="size-4" />
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {fullName || 'Usuario Telsim'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {user?.email}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 rounded-full border border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" />
                {country || 'Región Global'}
             </div>
             <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
             <div className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-emerald-500" />
                {phoneNumber || 'Sin Teléfono'}
             </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="text-primary text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-all"
            >
              {isEditing ? 'Cerrar Edición' : t('profile.update')}
            </button>
          </div>
        </div>

        {/* Formulario de Edición */}
        {isEditing && (
          <section className="px-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] p-8 border border-primary shadow-2xl shadow-primary/5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">F. Nacimiento</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 h-12 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Datos'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* RESTO DE SECCIONES (Cuenta, Finanzas, etc.) */}
        <section className="px-5 mb-6">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-2">Cuenta</h4>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-soft divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => navigate('/dashboard/security')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Seguridad y Contraseña</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
            <button 
              onClick={() => navigate('/dashboard/identity-verification')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Verificación de Identidad</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
          </div>
        </section>

        <section className="px-5 mb-6">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-2">Finanzas</h4>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-soft divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => navigate('/dashboard/billing')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-brand shrink-0">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">{t('profile.billing')}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
          </div>
        </section>

        <section className="px-5 mb-8 flex flex-col items-center">
          <button 
            onClick={handleLogout}
            className="w-full bg-white dark:bg-surface-dark border border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 font-semibold py-3.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex items-center justify-center gap-2 mb-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            {t('profile.logout')}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Telsim v2.4.0</p>
        </section>
      </div>
    </div>
  );
};

export default Profile;