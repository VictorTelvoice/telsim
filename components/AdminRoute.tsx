import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_UIDS = [
  '8e7bcada-3f7a-482f-93a7-9d0fd4828231',
  'd310eaf8-2c82-4c29-9ea8-6d64616774da',
];

/**
 * Solo permite el acceso si el usuario autenticado está dentro de la lista de admins.
 * Si no, redirige a /dashboard.
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="animate-pulse text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Validando...
        </div>
      </div>
    );
  }

  if (!user || !ADMIN_UIDS.some((adminUid) => adminUid.toLowerCase() === String(user.id || '').toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
