import React from 'react';
import ProfileContent from './ProfileContent';

export const metadata = {
  title: 'Mi Perfil | Telsim',
};

export default function ProfilePage() {
  return (
    <div className="pt-4">
      <ProfileContent />
    </div>
  );
}
