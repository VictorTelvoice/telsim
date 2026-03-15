import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SearchHit = {
  id: string;
  nombre: string | null;
  email: string | null;
};

const AdminGlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchUsers = useCallback(async (q: string) => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const pattern = `%${term}%`;
      const { data, error } = await supabase
        .from('users')
        .select('id, nombre, email')
        .or(`id.ilike.${pattern},nombre.ilike.${pattern},email.ilike.${pattern}`)
        .limit(10);

      if (error) {
        setHits([]);
        return;
      }
      setHits((data as SearchHit[]) || []);
    } catch {
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(query), 200);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('click', onClickOutside);
    return () => document.removeEventListener('click', onClickOutside);
  }, [open]);

  const goToUser = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    navigate(`/admin/users?search=${encodeURIComponent(hit.id)}`);
  };

  const goToSubscriptions = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    navigate(`/admin/subscriptions?search=${encodeURIComponent(hit.id)}`);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <button
        type="button"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors text-left text-sm"
      >
        <Search size={16} className="flex-shrink-0" />
        <span className="flex-1 truncate">Buscar por nombre, email o UUID…</span>
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-700 text-[10px] font-mono text-slate-400">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-slate-700 bg-slate-900 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
            <Search size={16} className="text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, email o UUID..."
              className="flex-1 bg-transparent border-none text-white placeholder-slate-500 outline-none text-sm"
              autoComplete="off"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 size={24} className="animate-spin" />
              </div>
            )}
            {!loading && query.trim().length < 2 && (
              <p className="px-4 py-3 text-slate-500 text-sm">Escribe al menos 2 caracteres</p>
            )}
            {!loading && query.trim().length >= 2 && hits.length === 0 && (
              <p className="px-4 py-3 text-slate-500 text-sm">Sin resultados</p>
            )}
            {!loading && hits.length > 0 && (
              <ul className="py-1">
                {hits.map((hit) => (
                  <li key={hit.id} className="border-b border-slate-800 last:border-0">
                    <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800/80">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{hit.nombre || '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{hit.email || hit.id}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => goToUser(hit)}
                          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          title="Ver en Usuarios"
                        >
                          <User size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => goToSubscriptions(hit)}
                          className="p-1.5 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                          title="Ver en Suscripciones"
                        >
                          <CreditCard size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGlobalSearch;
