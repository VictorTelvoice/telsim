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
  const modalRef = useRef<HTMLDivElement>(null);

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
        setTimeout(() => inputRef.current?.focus(), 80);
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
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
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
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery(''); }}
        className="p-2 rounded text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent"
        title="Buscar (⌘K)"
      >
        <Search size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[400] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search size={20} className="text-slate-600 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, email o UUID..."
                className="flex-1 py-2 bg-transparent border-none text-black placeholder-slate-500 outline-none text-base font-medium"
                autoComplete="off"
              />
              <kbd className="hidden sm:inline text-[10px] text-slate-600 font-mono">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12 text-slate-600">
                  <Loader2 size={28} className="animate-spin" />
                </div>
              )}
              {!loading && query.trim().length < 2 && (
                <p className="px-4 py-8 text-center text-slate-800 text-sm font-medium">Escribe al menos 2 caracteres para buscar</p>
              )}
              {!loading && query.trim().length >= 2 && hits.length === 0 && (
                <p className="px-4 py-8 text-center text-slate-800 text-sm font-medium">Sin resultados</p>
              )}
              {!loading && hits.length > 0 && (
                <ul className="py-2">
                  {hits.map((hit) => (
                    <li key={hit.id} className="border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-black text-sm truncate">{hit.nombre || '—'}</p>
                          <p className="text-xs text-slate-950 truncate">{hit.email || hit.id}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => goToUser(hit)}
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            title="Ver en Usuarios"
                          >
                            <User size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => goToSubscriptions(hit)}
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            title="Ver en Suscripciones"
                          >
                            <CreditCard size={18} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminGlobalSearch;
