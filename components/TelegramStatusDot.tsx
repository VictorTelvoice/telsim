import React from 'react';

export type TelegramBotStatus = 'online' | 'error' | 'idle';

/**
 * Indicador de estado del Bot de Telegram (8px).
 * - Verde: conexión exitosa.
 * - Rojo: error de configuración / token inválido.
 * - Gris: no configurado o verificando.
 */
const TelegramStatusDot: React.FC<{ status: TelegramBotStatus; className?: string }> = ({ status, className = '' }) => {
  const color =
    status === 'online'
      ? 'bg-emerald-500'
      : status === 'error'
        ? 'bg-red-500'
        : 'bg-slate-400 dark:bg-slate-500';

  return (
    <span
      className={`inline-block size-2 rounded-full flex-shrink-0 ${color} ${className}`}
      title={
        status === 'online'
          ? 'Bot conectado'
          : status === 'error'
            ? 'Error de configuración'
            : 'Verificando o no configurado'
      }
      aria-hidden
    />
  );
};

export default TelegramStatusDot;
