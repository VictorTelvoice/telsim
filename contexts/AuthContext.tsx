import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

type ProfileData = { avatar_url?: string | null; nombre?: string | null; pais?: string | null; moneda?: string | null } | null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { registerOrUpdateSession } = useDeviceSession();

  const getProfile = useCallback(async (userId: string): Promise<ProfileData> => {
    try {
      const { data } = await supabase
        .from('users')
        .select('avatar_url, nombre, pais, moneda')
        .eq('id', userId)
        .single();
      return data as ProfileData;
    } catch {
      return null;
    }
  }, []);

  const syncUserToPublicTable = useCallback(async (currentUser: any) => {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', currentUser.id)
        .maybeSingle();

      const existingAvatar = existing?.avatar_url && String(existing.avatar_url).trim() !== '';
      const avatarUrl = existingAvatar
        ? existing!.avatar_url
        : (currentUser.user_metadata?.avatar_url || currentUser.avatar_url || null);

      await supabase
        .from('users')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          nombre: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
          avatar_url: avatarUrl,
        }, { onConflict: 'id', ignoreDuplicates: false });

      await registerOrUpdateSession(currentUser.id);

      const profile = await getProfile(currentUser.id);
      setUser((prev: any) => (prev ? { ...prev, ...profile } : { ...currentUser, ...profile }));
    } catch (err) {
      console.error('Error sincronización users:', err);
    }
  }, [getProfile, registerOrUpdateSession]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const profile = await getProfile(user.id);
    if (profile) setUser((prev: any) => (prev ? { ...prev, ...profile } : null));
  }, [user?.id, getProfile]);

  const getProfileRef = useRef(getProfile);
  const syncRef = useRef(syncUserToPublicTable);
  getProfileRef.current = getProfile;
  syncRef.current = syncUserToPublicTable;

  useEffect(() => {
    let cancelled = false;

    (supabase.auth as any).getSession().then(async ({ data: { session: sess } }: any) => {
      try {
        if (cancelled) return;
        setSession(sess);
        if (sess?.user) {
          const profileData = await getProfileRef.current(sess.user.id);
          setUser({ ...sess.user, ...(profileData || {}) });
          await syncRef.current(sess.user);
        }
      } catch (err) {
        console.error('Auth getSession error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, sess: any) => {
      try {
        if (cancelled) return;
        setSession(sess);
        const currentUser = sess?.user ?? null;
        if (currentUser) {
          const profileData = await getProfileRef.current(currentUser.id);
          setUser({ ...currentUser, ...(profileData || {}) });
        } else {
          setUser(null);
        }

        if (event === 'SIGNED_IN' && currentUser) {
          await syncRef.current(currentUser);
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
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem('telsim_device_session_id');
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
