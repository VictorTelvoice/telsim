import { supabase } from '../lib/supabase';

export const useDeviceSession = () => {
  const registerOrUpdateSession = async (userId: string) => {
    try {
      const SESSION_KEY = 'telsim_device_session_id';
      const storedSessionId = localStorage.getItem(SESSION_KEY);
      
      const userAgent = navigator.userAgent;
      const deviceName = userAgent.includes('iPhone') ? 'iPhone' : 
                         userAgent.includes('Android') ? 'Android Device' : 
                         userAgent.includes('Macintosh') ? 'MacBook' : 'Windows PC';
      
      const now = new Date().toISOString();

      // ESCENARIO A: Intentar actualizar sesión existente
      if (storedSessionId) {
        const { data: updatedData, error: updateError } = await supabase
          .from('device_sessions')
          .update({ 
            last_active: now,
            is_current: true 
          })
          .eq('id', storedSessionId)
          .eq('user_id', userId)
          .select();

        // Si se actualizó correctamente, terminamos
        if (!updateError && updatedData && updatedData.length > 0) {
          console.debug('Session updated:', storedSessionId);
          return;
        }
        
        // Si llegamos aquí, el ID del localStorage ya no existe en la DB
        console.warn('Stored session ID invalid or deleted. Creating new one.');
      }

      // ESCENARIO B: Crear nueva sesión (Nuevo dispositivo o ID caducado)
      const { data: newData, error: insertError } = await supabase
        .from('device_sessions')
        .insert([{
          user_id: userId,
          device_name: deviceName,
          location: 'Santiago, CL (Simulado)',
          is_current: true,
          last_active: now
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (newData) {
        localStorage.setItem(SESSION_KEY, newData.id);
        console.debug('New session registered:', newData.id);
      }

    } catch (err) {
      console.error('Critical error managing device session:', err);
    }
  };

  return { registerOrUpdateSession };
};