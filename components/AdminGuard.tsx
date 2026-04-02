import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_UIDS = [
  '8e7bcada-3f7a-482f-93a7-9d0fd4828231',
  'd310eaf8-2c82-4c29-9ea8-6d64616774da',
];

/**
 * Solo permite renderizar las rutas hijas si user.id coincide con uno de los admins autorizados.
 * Si el ID no coincide, redirige a /dashboard sin excepciones.
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

  if (!user || !ADMIN_UIDS.includes(user.id)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
