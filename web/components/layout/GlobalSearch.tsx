'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Smartphone, MessageSquare, Hash, ArrowRight, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSWR(
    query.length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null,
    fetcher
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = data?.results || { slots: [], messages: [] };
  const hasResults = results.slots.length > 0 || results.messages.length > 0;

  const handleSelect = (link: string) => {
    router.push(link);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative flex-1 max-w-xl" ref={containerRef}>
      <div className={`flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${isOpen ? 'border-primary/40 bg-white dark:bg-slate-900 shadow-lg shadow-primary/5' : 'border-transparent'}`}>
        {isLoading ? (
          <Loader2 size={16} className="text-primary animate-spin" />
        ) : (
          <Search size={16} className="text-slate-500 dark:text-slate-400" />
        )}
        <input 
          type="text" 
          placeholder="Buscar mensajes, códigos o números..." 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-500 dark:placeholder:text-slate-500 font-bold"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
          <div className="max-h-[480px] overflow-y-auto no-scrollbar p-2">
            {!isLoading && !hasResults ? (
              <div className="p-8 text-center">
                <Search size={32} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                <p className="text-xs font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">No se encontraron resultados</p>
              </div>
            ) : (
              <div className="space-y-4 p-2">
                {/* Slots Section */}
                {results.slots.length > 0 && (
                  <div>
                    <h3 className="px-3 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Números y Slots</h3>
                    <div className="space-y-1">
                      {results.slots.map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => handleSelect(s.link)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                            <Smartphone size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{s.title}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 truncate">{s.subtitle}</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Section */}
                {results.messages.length > 0 && (
                  <div>
                    <h3 className="px-3 mb-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Mensajes Recientes</h3>
                    <div className="space-y-1">
                      {results.messages.map((m: any) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelect(m.link)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
                            <MessageSquare size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">{m.title}</p>
                              {m.code && (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-md border border-primary/20 tracking-wider uppercase">
                                  OTP: {m.code}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 line-clamp-1">{m.subtitle}</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-center">
             <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
               Presiona <span className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 mx-1">ESC</span> para cerrar
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
