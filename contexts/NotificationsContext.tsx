import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Notification } from '../types';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const lastErrorAtRef = useRef(0);

  const MIN_FETCH_MS = 2500;
  const ERROR_BACKOFF_MS = 10000;

  const fetchNotifications = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastFetchAtRef.current < MIN_FETCH_MS) return;
    if (now - lastErrorAtRef.current < ERROR_BACKOFF_MS) return;

    inFlightRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, created_at, type, is_read, link, details')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setNotifications(data || []);
      lastFetchAtRef.current = Date.now();
    } catch (err) {
      console.error('Error fetching notifications:', err);
      // Backoff ante 5xx / network-ish errors (evita spam)
      lastErrorAtRef.current = Date.now();
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    fetchNotifications();

    // Direct state updates from payload — no refetch on every event (scales for 1000+ users)
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev =>
          prev.map(n => n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== (payload.old as Notification).id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const addNotification = async (notif: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          ...notif,
          user_id: user.id,
          is_read: false
        }]);
      if (error) throw error;
    } catch (err) {
      console.error("Error adding notification:", err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const clearAll = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      setNotifications([]);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationsContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading,
      addNotification, 
      markAsRead, 
      markAllAsRead,
      clearAll 
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
