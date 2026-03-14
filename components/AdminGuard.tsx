import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** UID del único administrador con acceso total al Centro de Mando (/admin/*). */
const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

/**
 * Solo permite renderizar las rutas hijas si el user.id coincide con el UID del administrador.
 * El usuario con ADMIN_UID tiene acceso total; cualquier otro es redirigido a /dashboard.
 */
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-[11px] font-black uppercase tracking-widest text-slate-400">
          Validando...
        </div>
      </div>
    );
  }

  // Solo el admin con este UID tiene acceso total; el resto se redirige
  if (!user || user.id !== ADMIN_UID) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
