import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDeviceSession } from '../hooks/useDeviceSession';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  version: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileData = { avatar_url?: string | null; nombre?: string | null; pais?: string | null; moneda?: string | null } | null;

/** Construye el user enriquecido: avatar_url (y user_metadata.avatar_url) priorizan la tabla users. */
function enrichUser(sessionUser: any, profile: ProfileData) {
  const avatarFromDb = profile?.avatar_url ?? sessionUser?.user_metadata?.avatar_url;
  return {
    ...sessionUser,
    ...profile,
    user_metadata: {
      ...sessionUser?.user_metadata,
      avatar_url: avatarFromDb,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const { registerOrUpdateSession } = useDeviceSession();

  /** Siempre devuelve avatar_url (y resto) de la tabla users; en error retorna null. */
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
    // Throttle: no sincronizar más de una vez cada 10 minutos
    const syncKey = `telsim_sync_${currentUser.id}`;
    const lastSync = parseInt(localStorage.getItem(syncKey) || '0');
    if (Date.now() - lastSync < 10 * 60 * 1000) return;
    localStorage.setItem(syncKey, String(Date.now()));
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', currentUser.id)
        .maybeSingle();

      const raw = existing?.avatar_url != null ? String(existing.avatar_url).trim() : '';
      const hasSupabaseAvatar = raw !== '' && raw.includes('supabase.co');
      const metadataAvatar = currentUser.user_metadata?.avatar_url || currentUser.avatar_url || null;
      const isGoogleAvatar = typeof metadataAvatar === 'string' && (metadataAvatar.includes('google') || metadataAvatar.includes('googleusercontent'));

      // REGLA: Si en la DB ya hay URL de supabase.co y el metadata trae URL de Google, no sobrescribir.
      const avatarUrl = hasSupabaseAvatar && isGoogleAvatar
        ? (existing!.avatar_url as string)
        : hasSupabaseAvatar
          ? (existing!.avatar_url as string)
          : metadataAvatar;

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
      setUser((prev: any) => enrichUser(prev ?? currentUser, profile));
    } catch (err) {
      console.error('Error sincronización users:', err);
    }
  }, [getProfile, registerOrUpdateSession]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const profile = await getProfile(user.id);
    if (profile) {
      setUser((prev: any) => (prev ? enrichUser(prev, profile) : null));
      setVersion((v) => v + 1);
    }
  }, [user?.id, getProfile]);

  const getProfileRef = useRef(getProfile);
  const syncRef = useRef(syncUserToPublicTable);
  const refreshProfileRef = useRef(refreshProfile);
  const setVersionRef = useRef(setVersion);
  getProfileRef.current = getProfile;
  syncRef.current = syncUserToPublicTable;
  refreshProfileRef.current = refreshProfile;
  setVersionRef.current = setVersion;

  useEffect(() => {
    let cancelled = false;
    const subscriptionRef = { current: null as { unsubscribe: () => void } | null };

    const run = async () => {
      try {
        // Si hay ?code= sin hash → callback OAuth/PKCE.
        // Supabase lo procesa via detectSessionInUrl:true de forma automática.
        // Solo limpiamos la URL para evitar que el ?code= quede visible.
        if (
          typeof window !== 'undefined' &&
          window.location.search.includes('code=') &&
          window.location.hash === ''
        ) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        const { data: { session: sess } } = await (supabase.auth as any).getSession();
        if (cancelled) return;
        setSession(sess);
        if (sess?.user) {
          let profileData: ProfileData = null;
          try {
            profileData = await getProfileRef.current(sess.user.id);
          } catch {
            profileData = null;
          }
          setUser(enrichUser(sess.user, profileData));
          try {
            await syncRef.current(sess.user);
          } catch (err) {
            console.error('Auth sync error:', err);
          }
          if (!cancelled) setLoading(false);
        } else {
          if (!cancelled) setLoading(false);
        }
      } catch (err) {
        console.error('Auth getSession error:', err);
        if (!cancelled) setLoading(false);
      }
    };
    run();

    const failSafeTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 1500);

    const subscribeAuth = () => {
      subscriptionRef.current?.unsubscribe?.();
      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, sess: any) => {
        try {
          if (cancelled) return;
          const currentUser = sess?.user ?? null;
          console.log('[AUTH EVENT]', event, 'user:', currentUser?.email, 'hash:', window.location.hash, 'search:', window.location.search);
          setSession(sess);
          if (currentUser) {
            let profileData: ProfileData = null;
            try {
              profileData = await getProfileRef.current(currentUser.id);
            } catch {
              profileData = null;
            }
            setUser(enrichUser(currentUser, profileData));
          } else {
            setUser(null);
          }

          if (event === 'SIGNED_IN' && currentUser) {
            // Sync en background — el redirect lo maneja LandingOrDashboard
            syncRef.current(currentUser).catch(err => console.error('Auth sync on sign-in:', err));
          }
        } catch (err) {
          console.error('Auth onAuthStateChange error:', err);
        } finally {
          if (!cancelled) setLoading(false);
        }
      });
      subscriptionRef.current = subscription;
    };
    subscribeAuth();

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (cancelled) return;
      try {
        try {
          await (supabase.auth as any).stopAutoRefresh?.();
          await (supabase.auth as any).startAutoRefresh?.();
        } catch (_) {}
        const { data: { session: s } } = await (supabase.auth as any).getSession();
        if (cancelled) return;
        if (s) {
          setSession(s);
          await refreshProfileRef.current?.();
        }
        subscriptionRef.current?.unsubscribe?.();
        subscribeAuth();
      } catch (err) {
        console.error('Auth visibility wake error:', err);
        subscriptionRef.current?.unsubscribe?.();
        subscribeAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let swChannel: BroadcastChannel | null = null;
    try {
      swChannel = new BroadcastChannel('sw-messages');
      swChannel.onmessage = (e) => {
        if (e.data?.type === 'AUTH_REFRESH' && !cancelled) handleVisibilityChange();
      };
    } catch (_) {}

    return () => {
      cancelled = true;
      clearTimeout(failSafeTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try { swChannel?.close(); } catch (_) {}
      subscriptionRef.current?.unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    localStorage.removeItem('telsim_device_session_id');
    await (supabase.auth as any).signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider key={version} value={{ user, session, loading, version, signOut, refreshProfile }}>
      {children}
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
