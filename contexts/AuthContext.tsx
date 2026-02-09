import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useDeviceSession } from '../hooks/useDeviceSession';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  checkSubscriptionStatus: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const { registerOrUpdateSession } = useDeviceSession();

  const checkSubscriptionStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      
      const isActive = !!data;
      setHasActiveSubscription(isActive);
      return isActive;
    } catch (err) {
      console.error("Error checking subscription status:", err);
      return false;
    }
  };

  const syncUserToPublicTable = async (currentUser: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          nombre: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
          avatar_url: currentUser.user_metadata?.avatar_url || null,
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("Error sincronizando usuario en tabla pública:", error.message);
      }
      
      await checkSubscriptionStatus(currentUser.id);
      await registerOrUpdateSession(currentUser.id);
      
    } catch (err) {
      console.error("Error crítico de sincronización:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        syncUserToPublicTable(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' && currentUser) {
        syncUserToPublicTable(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setHasActiveSubscription(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('telsim_device_session_id');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setHasActiveSubscription(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      hasActiveSubscription, 
      checkSubscriptionStatus: () => user ? checkSubscriptionStatus(user.id) : Promise.resolve(false),
      signOut 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};