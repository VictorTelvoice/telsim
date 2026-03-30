import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface MessagesContextType {
  unreadSmsCount: number;
  refreshUnreadCount: () => Promise<void>;
  setUnreadSmsCount: React.Dispatch<React.SetStateAction<number>>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);

  const inFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorAtRef = useRef(0);
  const lastFocusRefreshAtRef = useRef(0);

  const MIN_REFRESH_MS = 2500;
  const ERROR_BACKOFF_MS = 10000;
  const FOCUS_REFRESH_MS = 45000;

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadSmsCount(0);
      return;
    }
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < MIN_REFRESH_MS) return;
    if (now - lastErrorAtRef.current < ERROR_BACKOFF_MS) return;
    inFlightRef.current = true;
    
    try {
      const { count, error } = await supabase
        .from('sms_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadSmsCount(count || 0);
        lastRefreshAtRef.current = Date.now();
      } else {
        lastErrorAtRef.current = Date.now();
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
      lastErrorAtRef.current = Date.now();
    } finally {
      inFlightRef.current = false;
    }
  }, [user?.id]);

  const scheduleRefresh = useCallback(() => {
    if (!user?.id) return;
    if (debounceTimerRef.current) return;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      refreshUnreadCount();
    }, 300);
  }, [user?.id, refreshUnreadCount]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadSmsCount(0);
      return;
    }

    refreshUnreadCount();

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < FOCUS_REFRESH_MS) return;
      if (now - lastErrorAtRef.current < ERROR_BACKOFF_MS) return;
      lastFocusRefreshAtRef.current = now;
      scheduleRefresh();
    };
    window.addEventListener('focus', handleFocus);

    const channel = supabase
      .channel(`sms_unread_changes_${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const next = payload.new as { is_read?: boolean } | null;
        if (next?.is_read) return;
        setUnreadSmsCount((prev) => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const previous = payload.old as { is_read?: boolean } | null;
        const next = payload.new as { is_read?: boolean } | null;
        if (previous?.is_read === next?.is_read) return;
        if (previous?.is_read === false && next?.is_read === true) {
          setUnreadSmsCount((prev) => Math.max(0, prev - 1));
          return;
        }
        if (previous?.is_read === true && next?.is_read === false) {
          setUnreadSmsCount((prev) => prev + 1);
          return;
        }
        scheduleRefresh();
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'sms_logs',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const previous = payload.old as { is_read?: boolean } | null;
        if (previous?.is_read === false) {
          setUnreadSmsCount((prev) => Math.max(0, prev - 1));
          return;
        }
        scheduleRefresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [user?.id, refreshUnreadCount, scheduleRefresh]);

  return (
    <MessagesContext.Provider value={{ unreadSmsCount, refreshUnreadCount, setUnreadSmsCount }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessagesCount = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessagesCount must be used within a MessagesProvider');
  }
  return context;
};
