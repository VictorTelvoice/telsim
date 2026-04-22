import React from 'react';
import SettingsContent from './SettingsContent';

export const metadata = {
  title: 'Ajustes | Telsim',
  description: 'Configura tu perfil, seguridad e integraciones en Telsim.',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen pt-4">
      <SettingsContent />
    </div>
  );
}
