import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useDeviceSession } from '../hooks/useDeviceSession';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { registerOrUpdateSession } = useDeviceSession();

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
      
      // Registrar o actualizar la sesión del dispositivo de forma persistente
      await registerOrUpdateSession(currentUser.id);
      
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
    // Limpiar ID de sesión local al cerrar sesión
    localStorage.removeItem('telsim_device_session_id');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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