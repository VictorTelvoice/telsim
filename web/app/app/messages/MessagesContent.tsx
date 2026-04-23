'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { 
  Search, 
  MessageSquare, 
  Copy, 
  Check, 
  RefreshCw,
  Clock,
  Smartphone,
  Circle
} from 'lucide-react';
import { detectService, extractCode } from '@/utils/serviceDetector';
import BrandLogos from '@/components/common/BrandLogos';
import { useTheme } from 'next-themes';
import { useEffect, useState as reactState } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface MessagesContentProps {
  initialData: any;
}

function formatRelativeTime(date: string | Date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} d`;
}

export default function MessagesContent({ initialData }: MessagesContentProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'otp' | 'others'>('all');
  const [slotFilter, setSlotFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = reactState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  const { data: messages, mutate, isValidating } = useSWR('/api/dashboard/messages', fetcher, {
    fallbackData: initialData.messages,
    refreshInterval: 5000
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    
    return messages.filter((msg: any) => {
      const matchesSearch = !search || 
        msg.content.toLowerCase().includes(search.toLowerCase()) || 
        msg.sender.toLowerCase().includes(search.toLowerCase());
      
      const code = extractCode(msg.content);
      const isOtp = !!code;
      const matchesSlot = slotFilter === 'all' || msg.slotId === slotFilter;

      if (typeFilter === 'spam' as any) {
        return matchesSearch && matchesSlot && msg.isSpam;
      }

      const matchesType = typeFilter === 'all' || 
        (typeFilter === 'otp' && isOtp) || 
        (typeFilter === 'others' && !isOtp);

      return matchesSearch && matchesType && matchesSlot && !msg.isSpam;
    });
  }, [messages, search, typeFilter, slotFilter]);

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Mis mensajes</h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Bandeja de entrada en tiempo real</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="flex-1 lg:flex-none relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar remitente o contenido..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full lg:w-72 pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-primary/50 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl">
            <FilterButton active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} label="Todos" />
            <FilterButton active={typeFilter === 'otp'} onClick={() => setTypeFilter('otp')} label="OTP" />
            <FilterButton active={typeFilter === 'others'} onClick={() => setTypeFilter('others')} label="Genéricos" />
            <FilterButton active={typeFilter === 'spam' as any} onClick={() => setTypeFilter('spam' as any)} label="Spam" />
          </div>

          {/* Refresh */}
          <button 
            onClick={() => mutate()}
            className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${isValidating ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMessages.length === 0 ? (
          <div className="py-20 text-center animate-in fade-in zoom-in duration-500 lg:col-span-2">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400 dark:text-slate-600">
               <MessageSquare size={40} />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest px-10">
               No se han recibido mensajes todavía
            </p>
          </div>
        ) : (
            filteredMessages.map((msg: any) => (
              <MessageCard 
                key={msg.id} 
                msg={msg} 
                onCopy={() => handleCopy(extractCode(msg.content) || msg.content, msg.id)}
                isCopied={copiedId === msg.id}
                isDark={isDark}
                mounted={mounted}
              />
            ))
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

function MessageCard({ msg, onCopy, isCopied, isDark, mounted }: any) {
  const service = detectService(msg.sender, msg.content);
  const code = extractCode(msg.content);

  return (
    <div className={`bg-[var(--card)] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-5 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lg)] transition-all group overflow-hidden relative ${msg.isSpam ? 'opacity-60 saturate-50' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-[0.03] rounded-full -mr-16 -mt-16`} style={{ backgroundColor: service.color }} />
      
      {msg.isSpam && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <span className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-rose-500/30">
            Mensaje de Operador / Spam
          </span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-sm border" 
            style={{ 
              backgroundColor: mounted ? (isDark ? service.darkBg : service.bg) : service.bg,
              borderColor: mounted ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'rgba(0,0,0,0.06)'
            }}
          >
            <BrandLogos brand={service.key} size={24} />
          </div>
          <div>
            <h4 className="text-base font-black uppercase tracking-tight leading-none mb-1" style={{ color: service.color }}>
              {service.label}
            </h4>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              <span>De: {msg.sender}</span>
              <Circle size={4} className="fill-current" />
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatRelativeTime(msg.receivedAt || msg.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        {/* SIM number badge */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <Smartphone size={12} className="text-slate-600 dark:text-slate-400" />
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 tabular-nums tracking-tighter">
            {msg.slot?.phoneNumber || '+56 9 **** ****'}
          </span>
        </div>
      </div>

      {/* Message body */}
      <div className="p-5 rounded-3xl border relative z-10 bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700">
        <p className="text-sm font-medium leading-relaxed italic text-slate-700 dark:text-slate-300">
          "{msg.content}"
        </p>
      </div>

      {/* Code block */}
      {code && (
        <div className="flex items-center justify-between gap-4 mt-auto relative z-10">
          <div className="flex flex-col">
            <div className="px-5 py-3 bg-slate-900 dark:bg-slate-950 border border-slate-800 flex flex-col min-w-[140px] rounded-[1.5rem] rounded-tl-[0.3rem]">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Código de verificación</span>
              <span className="text-xl font-black tracking-[0.3em] text-white font-mono leading-none">{code}</span>
            </div>
          </div>
          <button 
            onClick={onCopy}
            className={`flex items-center justify-center w-12 h-12 rounded-[1.2rem] transition-all shadow-xl ${
              isCopied 
                ? 'bg-emerald-500 text-white animate-in zoom-in duration-300' 
                : 'bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95'
            }`}
          >
            {isCopied ? <Check size={18} /> : <Copy size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
