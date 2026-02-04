import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  devLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para sincronizar datos con la tabla public.users
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
    } catch (err) {
      console.error("Error crítico de sincronización:", err);
    }
  };

  useEffect(() => {
    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        syncUserToPublicTable(session.user);
      }
      setLoading(false);
    });

    // Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' && currentUser) {
        syncUserToPublicTable(currentUser);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const devLogin = () => {
    const mockUser: any = {
      id: 'dev-user-id',
      email: 'dev@telsim.pro',
      user_metadata: {
        full_name: 'Dev User',
        avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev'
      }
    };
    setUser(mockUser);
    setSession({ user: mockUser, access_token: 'mock', refresh_token: 'mock', expires_in: 3600, token_type: 'bearer' } as any);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, devLogin }}>
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