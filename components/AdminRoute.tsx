import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_UID = '8e7bcada-3f7a-482f-93a7-9d0fd4828231';

/**
 * Solo permite el acceso si el usuario autenticado es el admin (UID de Supabase).
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

  if (!user || (user.id || '').toLowerCase() !== ADMIN_UID.toLowerCase()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
