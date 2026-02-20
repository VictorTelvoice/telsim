import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface MessagesContextType {
  unreadSmsCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadSmsCount(0);
      return;
    };
    
    try {
      const { count, error } = await supabase
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) {
        setUnreadSmsCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('sms_unread_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sms_logs',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        refreshUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <MessagesContext.Provider value={{ unreadSmsCount, refreshUnreadCount }}>
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