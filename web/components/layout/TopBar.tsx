'use client';

import React from 'react';
import { 
  Bell, 
  Menu, 
  Search, 
  User, 
  LogOut, 
  ChevronDown,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // Simple breadcrumb logic
  const pageTitle = pathname.split('/').pop() || 'Dashboard';
  const formattedTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  return (
    <header className="h-16 bg-[var(--header-bg)] border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between transition-all">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} className="text-slate-600 dark:text-slate-400" />
        </button>
        
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">App</span>
          <span className="text-slate-400 dark:text-slate-600">/</span>
          <h1 className="text-slate-900 dark:text-white font-bold tracking-tight truncate max-w-[150px] lg:max-w-none">
            {formattedTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-5">
        {/* Search - Desktop only for now */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-transparent focus-within:border-primary/20 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
          <Search size={16} className="text-slate-500 dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="bg-transparent border-none outline-none text-sm w-40 lg:w-60 text-slate-700 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
          aria-label="Toggle theme"
        >
          {mounted ? (
            isDark ? (
              <Sun size={20} className="text-amber-400" />
            ) : (
              <Moon size={20} className="text-slate-600" />
            )
          ) : (
            <div className="w-5 h-5" /> // Placeholder to avoid shift
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group">
          <Bell size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800" />
        </button>

        {/* User Profile Dropdown */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800 ml-2">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {session?.user?.name || 'Usuario'}
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {session?.user?.role || 'Cliente'}
            </span>
          </div>
          
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(session?.user?.name || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {session?.user?.email}
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 font-medium tracking-tight">Gestionar cuenta</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                  <User size={18} />
                  Mi Perfil
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                  <Globe size={18} />
                  Idioma
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />
                <button 
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/15 transition-all"
                >
                  <LogOut size={18} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
