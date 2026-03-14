import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Si loading, muestra esqueleto mínimo para que Safari no deje la pantalla en blanco. No retorna null. */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!loading && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Validando...</div>
        </div>
        <nav className="h-16 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-around px-2" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;