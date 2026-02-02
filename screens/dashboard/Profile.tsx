
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Slot } from '../../types';
import { Sun, Moon } from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Component States
  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [userSlots, setUserSlots] = useState<Slot[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);

  // Sync Google/OAuth Photo if available
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const calculatePrice = (planType: string) => {
    const type = (planType || '').toLowerCase();
    if (type.includes('power') || type.includes('pro')) return 99.00;
    return 13.90;
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '---';
    const cleaned = ('' + phoneNumber).replace(/\D/g, '');
    if (cleaned.startsWith('569') && cleaned.length === 11) {
        return `+56 9 ${cleaned.substring(3, 7)}...`;
    }
    return phoneNumber;
  };

  // Load user data and active services
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // 1. Fetch user identity
        const { data: userData } = await supabase
          .from('users')
          .select('nombre')
          .eq('id', user.id)
          .single();

        if (userData) {
          setNombre(userData.nombre || '');
        } else {
          setNombre(user.user_metadata?.nombre || user.user_metadata?.full_name || '');
        }

        // 2. Fetch all active slots for billing calculation
        const { data: slotsData } = await supabase
          .from('slots')
          .select('*')
          .eq('assigned_to', user.id);

        if (slotsData) {
          setUserSlots(slotsData);
          const total = slotsData.reduce((acc, slot) => acc + calculatePrice(slot.plan_type), 0);
          setTotalMonthly(total);
        }
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          nombre: nombre,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display pb-24 relative overflow-hidden">
      
      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm">
            <span className="material-symbols-rounded text-lg">check_circle</span>
            {t('profile.update_success') || 'Perfil actualizado correctamente'}
          </div>
        </div>
      )}

      {/* Header with Back */}
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('profile.title')}</h1>
        <div className="w-10"></div>
      </header>

      <main className="px-6 space-y-6 max-w-md mx-auto">
        
        {/* SECTION 1: IDENTITY */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-soft">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-primary/10 flex items-center justify-center text-primary overflow-hidden shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-rounded text-[32px]">person</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-dark flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-rounded text-[12px] fill-1">verified</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <input 
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoFocus
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold text-base transition-all"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {saving ? '...' : 'Guardar'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="h-8 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {t('profile.cancel') || 'Cancelar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group cursor-pointer" onClick={() => setIsEditing(true)}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">{nombre || 'Usuario Telsim'}</h2>
                    <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition-colors text-base">edit</span>
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-xs truncate flex items-center gap-1">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: SUBSCRIPTION & BILLING */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('profile.subscription')}</h3>
          <section className="bg-white dark:bg-surface-dark rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-soft">
            <div className="p-5 border-b border-slate-50 dark:border-slate-800">
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Resumen de Facturación</p>
               
               {userSlots.length > 0 ? (
                 <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2 mb-2">
                      <div className="col-span-6">Servicio</div>
                      <div className="col-span-3">Plan</div>
                      <div className="col-span-3 text-right">Costo</div>
                    </div>
                    {userSlots.map((slot) => (
                      <div key={slot.port_id} className="grid grid-cols-12 gap-2 py-1 items-center">
                        <div className="col-span-6 text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate font-mono tracking-tighter">
                          {formatPhoneNumber(slot.phone_number)}
                        </div>
                        <div className="col-span-3 text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">
                          {slot.plan_type?.split(' ')[1] || 'FLEX'}
                        </div>
                        <div className="col-span-3 text-right text-xs font-bold text-slate-900 dark:text-white font-mono">
                          ${calculatePrice(slot.plan_type).toFixed(2)}
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Total Mensual</span>
                       <span className="text-xl font-black text-primary dark:text-blue-400 font-mono tracking-tighter">
                          ${totalMonthly.toFixed(2)}
                       </span>
                    </div>
                 </div>
               ) : (
                 <div className="py-6 text-center">
                    <span className="material-symbols-rounded text-slate-200 dark:text-slate-700 text-4xl mb-2">subtitles_off</span>
                    <p className="text-xs font-bold text-slate-400 italic">Sin servicios activos</p>
                 </div>
               )}
            </div>

            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                      <span className="text-[7px] font-black italic text-blue-800">VISA</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">•••• 4242</span>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm">
                    <span>💳 Cambiar Tarjeta</span>
                  </button>
               </div>

               <button 
                onClick={() => navigate('/onboarding/plan')}
                className="w-full bg-slate-900 dark:bg-blue-600 hover:opacity-90 text-white font-black h-12 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
               >
                <span>Añadir nueva línea</span>
                <span className="material-icons-round text-sm">add_circle</span>
               </button>

               <div className="text-center">
                  <button className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto">
                    <span>📄 Descargar Facturas / Recibos</span>
                  </button>
               </div>
            </div>
          </section>
        </div>

        {/* SECTION 4: PREFERENCES */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Preferencias</h3>
          
          <div className="bg-white dark:bg-surface-dark rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-soft space-y-6">
            {/* Language Selection */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{t('profile.lang')}</span>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setLanguage('es')}
                  className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${language === 'es' ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  <span className="text-base">🇪🇸</span>
                  <span className="font-bold text-[10px] uppercase tracking-widest">Español</span>
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${language === 'en' ? 'border-primary bg-blue-50 dark:bg-blue-900/20 text-primary shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  <span className="text-base">🇺🇸</span>
                  <span className="font-bold text-[10px] uppercase tracking-widest">English</span>
                </button>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Tema Visual</span>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-blue-50 text-primary shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  <Sun className="size-4" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Claro</span>
                </button>
                <button 
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center justify-center gap-2 h-12 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-blue-900/20 text-blue-400 shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  <Moon className="size-4" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">Oscuro</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: SUPPORT */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Soporte</h3>
          <div className="space-y-2">
             <button className="w-full h-12 flex items-center justify-between px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                   <span className="text-base">📚</span>
                   <span className="text-[11px] font-bold uppercase tracking-wide">Guías de Conexión (Make/API)</span>
                </div>
                <span className="material-symbols-rounded text-slate-300 text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
             </button>
             <button className="w-full h-12 flex items-center justify-between px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                   <span className="text-base">💬</span>
                   <span className="text-[11px] font-bold uppercase tracking-wide">Contactar Soporte</span>
                </div>
                <span className="material-symbols-rounded text-slate-300 text-lg group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
             </button>
          </div>
        </div>

        {/* SECTION 6: SECURITY & LOGOUT */}
        <section className="bg-white dark:bg-surface-dark rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-soft">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                <span className="material-symbols-rounded text-xl">security</span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('profile.privacy')}</span>
            </div>
            <span className="material-symbols-rounded text-slate-300 text-lg">chevron_right</span>
          </button>
          
          <div className="p-3">
            <button 
              onClick={handleLogout} 
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-red-100 dark:border-red-900/20 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-[10px] uppercase tracking-widest active:scale-[0.98]"
            >
              <span className="material-symbols-rounded text-base">logout</span>
              {t('profile.logout')}
            </button>
          </div>
        </section>

        <div className="pt-4 text-center">
          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">Telsim Infrastructure v1.4.2</p>
        </div>

      </main>
    </div>
  );
};

export default Profile;
