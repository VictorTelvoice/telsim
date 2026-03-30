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
  invalidateProfile: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function enrichUser(sessionUser: any, profile: ProfileData) {
  const avatar_url =
    profile?.avatar_url ??
    sessionUser?.user_metadata?.avatar_url ??
    sessionUser?.user_metadata?.picture ??
    null;

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

const PROFILE_CACHE_PREFIX = 'telsim_profile_v1_';
const PROFILE_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos

function profileCacheKey(userId: string) {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

function readProfileCache(userId: string): ProfileData | undefined {
  try {
    if (typeof window === 'undefined') return undefined;

    const key = profileCacheKey(userId);

    const rawFromSession = window.sessionStorage.getItem(key);
    const raw = rawFromSession ?? window.localStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as { profile?: ProfileData; cachedAt?: number } | null;
    if (!parsed || !Object.prototype.hasOwnProperty.call(parsed, 'profile')) return undefined;

    const cachedAt = parsed.cachedAt;
    if (typeof cachedAt === 'number' && Date.now() - cachedAt > PROFILE_CACHE_TTL_MS) {
      return undefined;
    }

    return parsed.profile ?? null;
  } catch {
    return undefined;
  }
}

function writeProfileCache(userId: string, profile: ProfileData) {
  try {
    if (typeof window === 'undefined') return;

    const key = profileCacheKey(userId);
    const payload = JSON.stringify({ profile, cachedAt: Date.now() });

    window.sessionStorage.setItem(key, payload);
    window.localStorage.setItem(key, payload);
  } catch {
    // non-critical
  }
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

  const getProfile = useCallback(async (userId: string): Promise<ProfileData | undefined> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url, nombre, pais, moneda')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] getProfile public.users', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return undefined;
      }

      // Sin fila => null real "no perfil"
      return (data as ProfileData) ?? null;
    } catch {
      return undefined;
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
        const { data: existing, error: existingErr } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', currentUser.id)
          .maybeSingle();
        if (existingErr) {
          console.error('[AuthContext] syncUserToPublicTable read avatar', {
            code: existingErr.code,
            message: existingErr.message,
          });
        }

        const raw = existing?.avatar_url != null ? String(existing.avatar_url).trim() : '';
        const hasSupabaseAvatar = raw !== '' && raw.includes('supabase.co');

        const metadataAvatar =
          currentUser.user_metadata?.avatar_url ||
          currentUser.user_metadata?.picture ||
          currentUser.avatar_url ||
          null;

        const isGoogleAvatar =
          typeof metadataAvatar === 'string' &&
          (metadataAvatar.includes('google') || metadataAvatar.includes('googleusercontent'));

        // REGLA: Si en la DB ya hay URL de supabase.co y el metadata trae URL de Google, no sobrescribir.
        const avatarUrl =
          metadataAvatar == null
            ? (existing?.avatar_url as string | null)
            : hasSupabaseAvatar && isGoogleAvatar
              ? (existing!.avatar_url as string)
              : hasSupabaseAvatar
                ? (existing!.avatar_url as string)
                : metadataAvatar;

        const { error: upErr } = await supabase
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
        if (upErr) {
          console.error('[AuthContext] syncUserToPublicTable upsert', {
            code: upErr.code,
            message: upErr.message,
            details: upErr.details,
          });
        }

        await registerOrUpdateSession(currentUser.id);
      } catch (err) {
        console.error('Error sincronización users:', err);
      }
    },
    [registerOrUpdateSession]
  );

  // Evita carreras en carga de profile cuando cambie el usuario rápidamente
  const profileReqIdRef = useRef(0);
  const lastProfileErrorAtRef = useRef<number | null>(null);
  const lastProfileRefreshAtRef = useRef(0);
  const PROFILE_ERROR_BACKOFF_MS = 60 * 1000;
  const PROFILE_REFRESH_MIN_MS = 60 * 1000;
  // Dedupe: evita múltiples fetch concurrentes para el mismo userId
  const profileFetchInFlightUserIdRef = useRef<string | null>(null);
  // Marca el último userId cuyo perfil ya quedó resuelto (null real o objeto)
  const lastProfileLoadedUserIdRef = useRef<string | null>(null);

  // Hydration gate (TEMP): evita re-ejecutar runBackgroundWork para el mismo userId
  // cuando ocurre null transitorio en la sesión.
  const lastHydratedAuthUserIdRef = useRef<string | null>(null);
  const resetHydrationGate = useCallback(() => {
    lastHydratedAuthUserIdRef.current = null;
  }, []);

  const clearProfileViewState = useCallback(() => {
    profileReqIdRef.current += 1; // invalida requests en vuelo (vista)
    setProfile(null);
    setProfileLoading(false);
  }, []);

  const resetProfileFetchGuards = useCallback(() => {
    // Dedupe/guard anti-loop (fetch layer)
    profileFetchInFlightUserIdRef.current = null;
    lastProfileLoadedUserIdRef.current = null;
    lastProfileErrorAtRef.current = null;
  }, []);

  const invalidateProfile = useCallback(() => {
    const userId = user?.id;
    if (userId) {
      try {
        window.sessionStorage.removeItem(profileCacheKey(userId));
      } catch {
        // non-critical
      }

      try {
        window.localStorage.removeItem(profileCacheKey(userId));
      } catch {
        // non-critical
      }
    }

    // Recalcula el user enriquecido desde la user original de la sesión (sin profile)
    if (session?.user) {
      setUser(enrichUser(session.user, null));
    }

    resetProfileFetchGuards();
    resetHydrationGate();
    clearProfileViewState();
  }, [clearProfileViewState, resetHydrationGate, resetProfileFetchGuards, session?.user, user?.id]);

  const setBaseAuthState = useCallback(
    (sess: any) => {
      setSession(sess ?? null);
      const sessUser = sess?.user ?? null;
      if (!sessUser) {
        setUser(null);
        return;
      }

      const cached = readProfileCache(sessUser.id);
      if (cached !== undefined) {
        setProfile(cached);
        setProfileLoading(false);
        setUser(enrichUser(sessUser, cached));
        return;
      }

      setUser(enrichUser(sessUser, profileRef.current));
    },
    []
  );

  const loadProfileInBackground = useCallback(
    async (sessUser: any) => {
      const reqId = ++profileReqIdRef.current;
      const userId = sessUser.id;

      // 1) Intentar cache primero
      const cached = readProfileCache(userId);
      if (reqId !== profileReqIdRef.current) return;

      if (cached !== undefined) {
        lastProfileErrorAtRef.current = null;
        // Pintamos cache primero para velocidad, pero seguimos revalidando en DB.
        setProfile(cached);
        setUser(enrichUser(sessUser, cached));
        setProfileLoading(false);
      }

      // 2) Si no existe cache => consultar DB
      const lastErrAt = lastProfileErrorAtRef.current;
      if (lastErrAt != null && Date.now() - lastErrAt < PROFILE_ERROR_BACKOFF_MS) {
        return;
      }

      // Si ya hay fetch de perfil en vuelo para este userId, no iniciamos otro
      if (profileFetchInFlightUserIdRef.current === userId) return;

      // Si ya resolvimos el perfil para este userId (memoria/cache ya válidos), no consultamos DB
      if (lastProfileLoadedUserIdRef.current === userId) return;

      setProfileLoading(true);
      profileFetchInFlightUserIdRef.current = userId;
      try {
        const p = await getProfile(userId);
        if (reqId !== profileReqIdRef.current) return;

        // undefined => error/atraso de fetch; no tocar cache ni sobreescribir profile
        if (p === undefined) {
          lastProfileErrorAtRef.current = Date.now();
          return;
        }

        lastProfileErrorAtRef.current = null;
        lastProfileLoadedUserIdRef.current = userId;

        // null u objeto => actualizar estado y cache
        setProfile(p);
        setUser(enrichUser(sessUser, p));
        // Hydration aplicada al estado: marca gate luego de setProfile/setUser
        lastHydratedAuthUserIdRef.current = userId;
        writeProfileCache(userId, p);
      } finally {
        if (profileFetchInFlightUserIdRef.current === userId) {
          profileFetchInFlightUserIdRef.current = null;
        }
        if (reqId === profileReqIdRef.current) setProfileLoading(false);
      }
    },
    [getProfile]
  );

  const runBackgroundWork = useCallback(
    (sessUser: any) => {
      const userId = sessUser?.id;
      if (!userId) return;
      // Si ya está hidratado para este userId, evita runBackgroundWork repetido
      if (lastHydratedAuthUserIdRef.current === userId) return;

      void (async () => {
        await loadProfileInBackground(sessUser);
        await syncUserToPublicTable(sessUser);
      })().catch((err) => console.error('Auth background work error:', err));
    },
    [loadProfileInBackground, syncUserToPublicTable]
  );

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const now = Date.now();
    const lastErrAt = lastProfileErrorAtRef.current;
    if (lastErrAt != null && Date.now() - lastErrAt < PROFILE_ERROR_BACKOFF_MS) {
      return;
    }
    if (now - lastProfileRefreshAtRef.current < PROFILE_REFRESH_MIN_MS) {
      return;
    }

    const reqId = ++profileReqIdRef.current;
    setProfileLoading(true);
    try {
      const userId = user.id;
      const p = await getProfile(userId);
      if (reqId !== profileReqIdRef.current) return;

      // undefined => error/fallo fetch; no tocar estado ni cache
      if (p === undefined) {
        lastProfileErrorAtRef.current = Date.now();
        return;
      }

      lastProfileErrorAtRef.current = null;
      lastProfileLoadedUserIdRef.current = userId;
      lastProfileRefreshAtRef.current = Date.now();

      setProfile(p);
      setUser((prev: any) => (prev ? enrichUser(prev, p) : null));
      writeProfileCache(userId, p);
      setVersion((v) => v + 1);
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
          const userId = sess.user.id;
          if (lastHydratedAuthUserIdRef.current !== userId) runBackgroundWork(sess.user);
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

        if (event === 'SIGNED_OUT') {
          clearProfileViewState();
          resetProfileFetchGuards();
          resetHydrationGate();
          return;
        }

        const sessUser = sess?.user ?? null;
        if (!sessUser) return;

        if (event === 'SIGNED_IN') {
          const userId = sessUser.id;
          const lastErrAt = lastProfileErrorAtRef.current;
          if (
            lastHydratedAuthUserIdRef.current === userId ||
            lastProfileLoadedUserIdRef.current === userId ||
            profileFetchInFlightUserIdRef.current === userId ||
            (lastErrAt != null && Date.now() - lastErrAt < PROFILE_ERROR_BACKOFF_MS)
          ) {
            return;
          }
          runBackgroundWork(sessUser);
        }
        // SIGNED_OUT se maneja explícitamente arriba (clearProfileViewState + resetProfileFetchGuards)
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
  }, [runBackgroundWork, setBaseAuthState, clearProfileViewState, resetHydrationGate, resetProfileFetchGuards]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return;

    const syncVisibleProfile = () => {
      if (document.visibilityState === 'visible') {
        void refreshProfile().catch((err) => console.error('Auth visibility refresh error:', err));
      }
    };

    const syncFocusedProfile = () => {
      void refreshProfile().catch((err) => console.error('Auth focus refresh error:', err));
    };

    window.addEventListener('focus', syncFocusedProfile);
    document.addEventListener('visibilitychange', syncVisibleProfile);

    return () => {
      window.removeEventListener('focus', syncFocusedProfile);
      document.removeEventListener('visibilitychange', syncVisibleProfile);
    };
  }, [refreshProfile, user?.id]);

  const signOut = useCallback(async () => {
    const userId = user?.id;

    localStorage.removeItem('telsim_device_session_id');
    
    // Limpieza optimista local: aunque el logout remoto falle (503), el usuario no debe quedar atascado.
    setSession(null);
    setUser(null);
    setAuthLoading(false);
    clearProfileViewState();
    resetProfileFetchGuards();
    resetHydrationGate();

    const signOutFn = (supabase.auth as any).signOut.bind(supabase.auth);

    try {
      const res = await signOutFn({ scope: 'global' });
      if (res?.error) throw res.error;
    } catch {
      try {
        const res = await signOutFn({ scope: 'local' });
        if (res?.error) throw res.error;
      } catch {
        // Si también falla el logout local, el estado local ya quedó limpio.
      }
    }
    // onAuthStateChange actualizará session/user/profile (si el backend responde)
  }, [user?.id, clearProfileViewState, resetHydrationGate, resetProfileFetchGuards]);

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
        invalidateProfile,
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
