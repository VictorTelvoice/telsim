import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

const SESSION_KEY = 'telsim_device_session_id';

const getDeviceName = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Macintosh')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows PC';
  return 'Navegador';
};

export const useDeviceSession = () => {
  const registerOrUpdateSession = useCallback(async (userId: string) => {
    try {
      const storedId = localStorage.getItem(SESSION_KEY);
      const now = new Date().toISOString();

      if (storedId) {
        const { data } = await supabase
          .from('device_sessions')
          .update({ last_active: now, is_current: true })
          .eq('id', storedId)
          .eq('user_id', userId)
          .select('id')
          .single();

        if (data) return; // Actualizado correctamente
      }

      // Crear nueva sesión
      const { data: newSession } = await supabase
        .from('device_sessions')
        .insert([{
          user_id: userId,
          device_name: getDeviceName(),
          is_current: true,
          last_active: now,
        }])
        .select('id')
        .single();

      if (newSession) localStorage.setItem(SESSION_KEY, newSession.id);
    } catch (err) {
      // No crítico — no bloquear el flujo de login
      console.warn('Device session error (non-critical):', err);
    }
  }, []);

  return { registerOrUpdateSession };
};