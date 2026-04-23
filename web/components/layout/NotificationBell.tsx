'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Check, MessageSquare, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';

function formatTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotificationBell() {
  const { data: notifications, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = Array.isArray(notifications) 
    ? notifications.filter((n: any) => !n.read).length 
    : 0;

  const markAsRead = async (id?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      mutate();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
      >
        <Bell size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Notificaciones</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Tienes {unreadCount} sin leer</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAsRead()}
                className="text-[10px] font-black text-primary hover:text-primary-dark uppercase tracking-widest transition-colors flex items-center gap-1"
              >
                <Check size={12} />
                Marcar todo
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar">
            {!Array.isArray(notifications) || notifications.length === 0 ? (
              <div className="p-10 text-center">
                <Bell size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-600 uppercase">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div 
                  key={n.id}
                  className={`p-4 border-b border-slate-50 dark:border-slate-800/50 flex gap-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'sms' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    <MessageSquare size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[11px] font-black uppercase tracking-tight truncate ${!n.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                          className="w-2 h-2 rounded-full bg-primary mt-1"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock size={10} className="text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link 
            href="/app/messages" 
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary uppercase tracking-widest bg-slate-50/30 dark:bg-slate-800/10 transition-colors"
          >
            Ver todos los mensajes
          </Link>
        </div>
      )}

      {/* Backdrop for closing when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
