import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const IMPERSONATED_USER_ID_KEY = 'impersonated_user_id';

export type ImpersonationProfile = {
  id: string;
  nombre: string | null;
  email: string | null;
  avatar_url?: string | null;
  pais?: string | null;
  moneda?: string | null;
};

type ImpersonationContextType = {
  impersonatedUserId: string | null;
  impersonatedUser: ImpersonationProfile | null;
  isImpersonating: boolean;
  setImpersonation: (userId: string, nombre?: string | null) => void;
  clearImpersonation: () => void;
};

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(IMPERSONATED_USER_ID_KEY);
    } catch {
      return null;
    }
  });
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonationProfile | null>(null);

  useEffect(() => {
    if (!impersonatedUserId) {
      setImpersonatedUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nombre, email, avatar_url, pais, moneda')
        .eq('id', impersonatedUserId)
        .single();
      if (!cancelled && data) setImpersonatedUser(data as ImpersonationProfile);
      if (!cancelled && !data) setImpersonatedUser({ id: impersonatedUserId, nombre: null, email: null });
    })();
    return () => { cancelled = true; };
  }, [impersonatedUserId]);

  const setImpersonation = useCallback((userId: string, nombre?: string | null) => {
    try {
      localStorage.setItem(IMPERSONATED_USER_ID_KEY, userId);
    } catch (_) {}
    setImpersonatedUserId(userId);
    if (nombre != null) {
      setImpersonatedUser((prev) => (prev && prev.id === userId ? { ...prev, nombre } : { id: userId, nombre, email: null }));
    }
    navigate('/web', { replace: true });
  }, [navigate]);

  const clearImpersonation = useCallback(() => {
    try {
      localStorage.removeItem(IMPERSONATED_USER_ID_KEY);
    } catch (_) {}
    setImpersonatedUserId(null);
    setImpersonatedUser(null);
    navigate('/admin/overview', { replace: true });
  }, [navigate]);

  const value: ImpersonationContextType = {
    impersonatedUserId,
    impersonatedUser,
    isImpersonating: Boolean(impersonatedUserId),
    setImpersonation,
    clearImpersonation,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (ctx === undefined) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
};

/** Devuelve el usuario efectivo para la UI/datos: cuando estamos en /web y hay suplantación, el perfil suplantado (o mínimo { id } mientras carga); si no, null (el consumidor usará user de useAuth). */
export const useEffectiveUser = (authUser: { id: string; nombre?: string | null; email?: string | null; [k: string]: any } | null) => {
  const location = useLocation();
  const { impersonatedUserId, impersonatedUser } = useImpersonation();
  const isWeb = location.pathname === '/web' || (typeof window !== 'undefined' && window.location.hash.includes('/web'));
  if (isWeb && impersonatedUserId) {
    return impersonatedUser ?? { id: impersonatedUserId, nombre: null, email: null };
  }
  return authUser;
};
