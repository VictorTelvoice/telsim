import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const PREFIX = 'template_app_';

type AppTemplates = Record<string, string>;

interface SettingsContextType {
  appTemplates: AppTemplates;
  getAppTemplate: (key: string, fallback?: string) => string;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appTemplates, setAppTemplates] = useState<AppTemplates>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: rows } = await supabase.from('admin_settings').select('id, content');
        if (!mounted || !rows) return;
        const map: AppTemplates = {};
        (rows as { id: string; content: string | null }[]).forEach((r) => {
          if (r.id && r.id.startsWith(PREFIX) && r.content != null && r.content.trim() !== '') {
            map[r.id] = r.content.trim();
          }
        });
        setAppTemplates(map);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getAppTemplate = useCallback(
    (key: string, fallback = '') => {
      const id = key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
      return appTemplates[id] ?? fallback;
    },
    [appTemplates]
  );

  return (
    <SettingsContext.Provider value={{ appTemplates, getAppTemplate, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
