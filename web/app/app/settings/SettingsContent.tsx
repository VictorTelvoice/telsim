'use client';

import React from 'react';
import { 
  User, 
  Shield, 
  CreditCard, 
  Send, 
  Link2, 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  LogOut, 
  MessageSquare, 
  FileText, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';

export default function SettingsContent() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Card */}
      <div className="bg-[var(--card)] rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 flex items-center gap-6 shadow-[var(--shadow)] transition-colors">
        <div className="relative group">
           {user?.image ? (
             <img 
               src={user.image} 
               alt={userName}
               className="w-20 h-20 rounded-3xl object-cover border-4 border-slate-50 dark:border-slate-800 shadow-xl group-hover:scale-105 transition-transform"
             />
           ) : (
             <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl group-hover:scale-105 transition-transform">
                {userInitials}
             </div>
           )}
           <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900" />
        </div>

        <div className="flex-1 min-w-0">
           <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{userName}</h2>
           <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest truncate">{user?.email}</p>
           <div className="mt-3 flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Miembro Pro</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Chile</span>
           </div>
        </div>

        <Link 
          href="/app/settings/profile"
          className="hidden sm:flex items-center justify-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          Editar Perfil
        </Link>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Account Section */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-4">Cuenta / Seguridad</h3>
           <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[var(--shadow)] transition-colors">
             <SettingsLink icon={<User size={18} />} title="Perfil Público" sub="Nombre, avatar e información" href="/app/settings/profile" />
             <SettingsLink icon={<Shield size={18} />} title="Seguridad" sub="Contraseña y autenticación" href="/app/settings/security" />
             <SettingsLink icon={<CreditCard size={18} />} title="Facturación" sub="Suscripciones y facturas" href="/app/billing" />
           </div>
        </div>

        {/* Integration Section */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-4">Integraciones</h3>
           <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[var(--shadow)] transition-colors">
             <SettingsLink icon={<Send size={18} />} title="Telegram Bot" sub="Recibe SMS en tu canal" href="/app/settings/telegram" />
             <SettingsLink icon={<Link2 size={18} />} title="Webhooks API" sub="Endpoints y notificaciones" href="/app/settings/webhooks" />
             <SettingsLink icon={<Bell size={18} />} title="Notificaciones" sub="Alertas del sistema" href="/app/settings/notifications" />
           </div>
        </div>

        {/* App Config Section */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-4">Aplicación</h3>
           <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[var(--shadow)] transition-colors">
             <div className="p-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                   <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                      {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                   </div>
                   <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Modo Oscuro</p>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Cambiar apariencia del portal</p>
                   </div>
                </div>
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                   <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl transition-all duration-300 ${theme === 'dark' ? 'right-1' : 'left-1'}`} />
                </button>
             </div>
             
             <div className="p-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                <div className="flex items-center gap-4">
                   <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                      <Globe size={18} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Idioma</p>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Localización del portal</p>
                   </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                   <button className="px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg shadow-sm">ES</button>
                   <button className="px-3 py-1.5 text-slate-400">EN</button>
                </div>
             </div>
           </div>
        </div>

        {/* Support Section */}
        <div className="space-y-4">
           <h3 className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] px-4">Centro de Ayuda</h3>
           <div className="bg-[var(--card)] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-[var(--shadow)] transition-colors">
             <SettingsLink icon={<MessageSquare size={18} />} title="Soporte Directo" sub="Chat con operadores" href="/app/support" />
             <SettingsLink icon={<HelpCircle size={18} />} title="Documentación" sub="Guías y API Reference" href="https://docs.telsim.app" external />
             <SettingsLink icon={<FileText size={18} />} title="Términos y Privacidad" sub="Información legal" href="/app/terms" />
           </div>
        </div>
      </div>

      {/* Logout Footer */}
      <div className="flex justify-center pt-8">
         <button 
           onClick={() => signOut()}
           className="flex items-center gap-3 px-10 py-5 bg-red-500/10 text-red-500 rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-red-500/20 active:scale-[0.98] transition-all shadow-xl shadow-red-500/5 group"
         >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Cerrar Sesión
         </button>
      </div>

      <p className="text-center text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em]">Telsim Portal v2.0.0 Alpha • 2026</p>
    </div>
  );
}

function SettingsLink({ icon, title, sub, href, external = false }: { icon: any, title: string, sub: string, href: string, external?: boolean }) {
  const isInternal = href.startsWith('/');
  
  const content = (
    <div className="p-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all duration-300">
           {icon}
        </div>
        <div className="min-w-0">
           <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</p>
           <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate">{sub}</p>
        </div>
      </div>
      <div className="p-2 rounded-full border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-slate-500 dark:text-slate-600 group-hover:text-primary">
         <ChevronRight size={16} />
      </div>
    </div>
  );

  if (isInternal) {
    return <Link href={href}>{content}</Link>;
  }

  return (
    <a href={href} target={external ? "_blank" : "_self"} rel={external ? "noopener noreferrer" : ""}>
      {content}
    </a>
  );
}
