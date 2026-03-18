import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useDeviceSession } from '../hooks/useDeviceSession';

type ProfileData =
  | {
      avatar_url?: string | null;
      nombre?: string | null;
      pais?: string | null;
      moneda?: string | null;
    }
  | null;

interface AuthContextType {
  user: any | null;
  session: any | null;

  // Compat: loading === authLoading
  loading: boolean;

  // Nuevos (opcionales para no romper consumidores TS existentes)
  authLoading?: boolean;
  profile?: ProfileData;
  profileLoading?: boolean;

  version: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichUser(sessionUser: any, profile: ProfileData) {
  const avatarFromMeta = sessionUser?.user_metadata?.avatar_url ?? null;
  const avatarFromProfile = profile?.avatar_url ?? null;
  const avatar_url = avatarFromMeta ?? avatarFromProfile;

  return {
    ...sessionUser,
    ...profile,
    avatar_url,
    user_metadata: {
      ...sessionUser?.user_metadata,
      avatar_url,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileData>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileRef = useRef<ProfileData>(null);

  const [version, setVersion] = useState(0);

  const { registerOrUpdateSession } = useDeviceSession();

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

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

  const syncUserToPublicTable = useCallback(
    async (currentUser: any) => {
      // Throttle: no sincronizar más de una vez cada 10 minutos
      const syncKey = `telsim_sync_${currentUser.id}`;
      const lastSync = parseInt(localStorage.getItem(syncKey) || '0', 10);
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

        const metadataAvatar =
          currentUser.user_metadata?.avatar_url || currentUser.avatar_url || null;

        const isGoogleAvatar =
          typeof metadataAvatar === 'string' &&
          (metadataAvatar.includes('google') || metadataAvatar.includes('googleusercontent'));

        // REGLA: Si en la DB ya hay URL de supabase.co y el metadata trae URL de Google, no sobrescribir.
        const avatarUrl =
          hasSupabaseAvatar && isGoogleAvatar
            ? (existing!.avatar_url as string)
            : hasSupabaseAvatar
              ? (existing!.avatar_url as string)
              : metadataAvatar;

        await supabase
          .from('users')
          .upsert(
            {
              id: currentUser.id,
              email: currentUser.email,
              nombre:
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                currentUser.email?.split('@')[0],
              avatar_url: avatarUrl,
            },
            { onConflict: 'id', ignoreDuplicates: false }
          );

        await registerOrUpdateSession(currentUser.id);
      } catch (err) {
        console.error('Error sincronización users:', err);
      }
    },
    [registerOrUpdateSession]
  );

  // Evita carreras en carga de profile cuando cambie el usuario rápidamente
  const profileReqIdRef = useRef(0);

  const clearProfileState = useCallback(() => {
    profileReqIdRef.current += 1; // invalida requests en vuelo
    setProfile(null);
    setProfileLoading(false);
  }, []);

  const setBaseAuthState = useCallback(
    (sess: any) => {
      setSession(sess ?? null);
      const sessUser = sess?.user ?? null;
      setUser(sessUser ? enrichUser(sessUser, profileRef.current) : null);
      if (!sessUser) clearProfileState();
    },
    [clearProfileState]
  );

  const loadProfileInBackground = useCallback(
    async (sessUser: any) => {
      const reqId = ++profileReqIdRef.current;
      setProfileLoading(true);
      try {
        const p = await getProfile(sessUser.id);
        if (reqId !== profileReqIdRef.current) return;
        setProfile(p);
        setUser(enrichUser(sessUser, p));
      } finally {
        if (reqId === profileReqIdRef.current) setProfileLoading(false);
      }
    },
    [getProfile]
  );

  const runBackgroundWork = useCallback(
    (sessUser: any) => {
      syncUserToPublicTable(sessUser).catch((err) => console.error('Auth sync error:', err));
      loadProfileInBackground(sessUser).catch(() => {});
    },
    [loadProfileInBackground, syncUserToPublicTable]
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const reqId = ++profileReqIdRef.current;
    setProfileLoading(true);
    try {
      const p = await getProfile(user.id);
      if (reqId !== profileReqIdRef.current) return;
      setProfile(p);
      if (p) {
        setUser((prev: any) => (prev ? enrichUser(prev, p) : null));
        setVersion((v) => v + 1);
      }
    } finally {
      if (reqId === profileReqIdRef.current) setProfileLoading(false);
    }
  }, [getProfile, user?.id]);

  useEffect(() => {
    let cancelled = false;

    // 1) Inicialización única: getSession()
    (async () => {
      try {
        const {
          data: { session: sess },
        } = await (supabase.auth as any).getSession();
        if (cancelled) return;

        setBaseAuthState(sess);
        if (sess?.user) {
          runBackgroundWork(sess.user);
        }
      } catch (err) {
        console.error('Auth getSession error:', err);
        if (!cancelled) setBaseAuthState(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    // 2) Suscripción única: onAuthStateChange()
    const { data } = (supabase.auth as any).onAuthStateChange(
      (event: string, sess: any) => {
        if (cancelled) return;

        // Actualizar session/user inmediatamente
        setBaseAuthState(sess);

        // INITIAL_SESSION puede llegar después del mount; bajar loading igual
        setAuthLoading(false);

        const sessUser = sess?.user ?? null;
        if (!sessUser) return;

        if (event === 'SIGNED_IN') {
          runBackgroundWork(sessUser);
        }
        // SIGNED_OUT queda cubierto por setBaseAuthState(null) + clearProfileState()
      }
    );

    return () => {
      cancelled = true;
      try {
        data?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [runBackgroundWork, setBaseAuthState]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('telsim_device_session_id');
    await (supabase.auth as any).signOut();
    // onAuthStateChange actualizará session/user/profile
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading: authLoading, // alias compat
        authLoading,
        profile,
        profileLoading,
        version,
        signOut,
        refreshProfile,
      }}
    >
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
