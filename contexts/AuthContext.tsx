
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDeviceSession } from '../hooks/useDeviceSession';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { registerOrUpdateSession } = useDeviceSession();

  const getProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('avatar_url, nombre, pais, moneda')
        .eq('id', userId)
        .single();
      return data as { avatar_url?: string | null; nombre?: string | null; pais?: string | null; moneda?: string | null } | null;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const profile = await getProfile(user.id);
    if (profile) setUser((prev: any) => (prev ? { ...prev, ...profile } : null));
  }, [user?.id, getProfile]);

  const syncUserToPublicTable = useCallback(async (currentUser: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          nombre: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
          avatar_url: currentUser.user_metadata?.avatar_url || currentUser.avatar_url || null,
        }, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error("Error sincronizando usuario en tabla pública:", error.message);
      }

      await registerOrUpdateSession(currentUser.id);

      const profile = await getProfile(currentUser.id);
      if (profile) {
        setUser((prev: any) => (prev ? { ...prev, ...profile } : { ...currentUser, ...profile }));
      }
    } catch (err) {
      console.error("Error crítico de sincronización:", err);
    }
  }, [getProfile, registerOrUpdateSession]);

  useEffect(() => {
    (supabase.auth as any).getSession().then(async ({ data: { session } }: any) => {
      try {
        setSession(session);
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          const enrichedUser = profile ? { ...session.user, ...profile } : session.user;
          setUser(enrichedUser);
          syncUserToPublicTable(session.user);
        }
      } catch (err) {
        console.error('Auth getSession error:', err);
      } finally {
        setLoading(false);
      }
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
      try {
        setSession(session);
        const currentUser = session?.user ?? null;
        if (currentUser) {
          const profile = await getProfile(currentUser.id);
          const enrichedUser = profile ? { ...currentUser, ...profile } : currentUser;
          setUser(enrichedUser);
        } else {
          setUser(null);
        }

        if (event === 'SIGNED_IN' && currentUser) {
          syncUserToPublicTable(currentUser);

          const redirect = localStorage.getItem('post_login_redirect');
          if (redirect) {
            localStorage.removeItem('post_login_redirect');
            const plan = localStorage.getItem('selected_plan') || 'pro';
            const billing = localStorage.getItem('selected_billing') || 'monthly';
            localStorage.setItem('selected_plan_annual', billing === 'annual' ? 'true' : 'false');
            setTimeout(() => {
              window.location.hash = `${redirect}?plan=${plan}&billing=${billing}`;
            }, 100);
          }
        }
      } catch (err) {
        console.error('Auth onAuthStateChange error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Limpiar ID de sesión local al cerrar sesión
    localStorage.removeItem('telsim_device_session_id');
    // Cast supabase.auth to any to bypass SupabaseAuthClient type missing signOut
    await (supabase.auth as any).signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshProfile }}>
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
