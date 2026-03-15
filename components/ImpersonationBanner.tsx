import React from 'react';
import { LogOut } from 'lucide-react';
import { useImpersonation } from '../contexts/ImpersonationContext';

/**
 * Barra roja fija en la parte superior cuando hay suplantación activa.
 * Solo visible si impersonated_user_id está en localStorage.
 */
const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedUser, clearImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  const displayName = impersonatedUser?.nombre?.trim() || impersonatedUser?.email || impersonatedUser?.id || 'Usuario';

  return (
    <div className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between gap-4 px-4 py-2 bg-red-600 text-white shadow-md">
      <span className="text-sm font-semibold truncate">
        ⚠️ MODO SOPORTE: Viendo la cuenta de {displayName}
      </span>
      <button
        type="button"
        onClick={clearImpersonation}
        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
      >
        <LogOut size={16} />
        SALIR
      </button>
    </div>
  );
};

/** Espacio superior para que el contenido no quede bajo la barra fija de suplantación. */
export const ImpersonationBannerSpacer: React.FC = () => {
  const { isImpersonating } = useImpersonation();
  if (!isImpersonating) return null;
  return <div className="h-12 flex-shrink-0" aria-hidden />;
};

export default ImpersonationBanner;
