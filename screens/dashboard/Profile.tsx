import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { supabase } from '../../lib/supabase';
import { 
  Camera, 
  Plus, 
  Check, 
  X, 
  Mail, 
  Globe, 
  Phone, 
  User as UserIcon, 
  Calendar as CalendarIcon,
  QrCode,
  Languages
} from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [country, setCountry] = useState(user?.user_metadata?.country || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || '');
  const [birthDate, setBirthDate] = useState(user?.user_metadata?.birth_date || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          country: country,
          phone_number: phoneNumber,
          birth_date: birthDate,
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;
      setIsEditing(false);
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white transition-colors duration-200">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden pb-24 mx-auto max-w-md bg-background-light dark:bg-background-dark">
        
        <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background-light dark:bg-background-dark sticky top-0 z-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('profile.settings')}</h1>
          <div className="flex items-center justify-center size-10 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-slate-100 dark:border-slate-700">
            <img src="/logo.png" alt="TELSIM" className="size-7 object-contain" />
          </div>
        </header>

        <section className="px-5 mb-6">
          <div className={`bg-surface-light dark:bg-surface-dark rounded-[2.5rem] p-6 shadow-soft transition-all duration-300 border ${isEditing ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100 dark:border-slate-800'}`}>
            <div className="flex flex-col items-center">
              <div className="relative group mb-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
                <div 
                  onClick={handleAvatarClick}
                  className={`size-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden relative ${isEditing ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Plus className="size-8 mb-0.5" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Agregar</span>
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white size-6" />
                    </div>
                  )}
                </div>
              </div>

              {!isEditing ? (
                <>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                    {user?.user_metadata?.full_name || 'Usuario Telsim'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">{user?.email}</p>
                  
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                     <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700">
                       {user?.user_metadata?.country || 'Región no definida'}
                     </span>
                     <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700">
                       {user?.user_metadata?.phone_number || 'Sin Teléfono'}
                     </span>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-primary text-[11px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-all border-b-2 border-primary/20 pb-0.5"
                    >
                      {t('profile.update')}
                    </button>
                    <button className="text-slate-400 hover:text-primary transition-colors">
                      <QrCode className="size-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                        placeholder="Nombre y Apellido"
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
                          className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                          placeholder="Chile, etc."
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
                          className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-primary transition-all"
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
                        className="w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary transition-all"
                        placeholder="+56 9 ..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modificación de Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input 
                        type="email" 
                        disabled
                        value={user?.email || ''}
                        className="w-full h-12 pl-11 pr-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-400 opacity-60"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 uppercase">Protegido</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <X className="size-4" />
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 h-12 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      ) : (
                        <>
                          <Check className="size-4" />
                          Guardar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-5 mb-6">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-2">Cuenta</h4>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
            <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Seguridad y Contraseña</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
            <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
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
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
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

        <section className="px-5 mb-6">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-2">{t('profile.settings')}</h4>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
            <div className="w-full flex items-center gap-4 px-4 py-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white">Notificaciones Push</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="w-full flex items-center gap-4 px-4 py-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <Languages className="size-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white">{t('profile.lang')}</p>
              </div>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                  onClick={() => setLanguage('es')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'es' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ES
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="w-full flex items-center gap-4 px-4 py-4">
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white">Modo Oscuro</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                />
                <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </section>

        <section className="px-5 mb-6">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-2">Soporte</h4>
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] divide-y divide-slate-100 dark:divide-slate-800 transition-colors duration-200 border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => navigate('/dashboard/help')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-[20px]">help</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">{t('profile.help')}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
            <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-[20px]">support_agent</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Contactar Soporte 24/7</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
            </button>
            <button 
              onClick={() => navigate('/dashboard/terms')}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Términos y Privacidad</p>
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