import React from 'react';
import Image from 'next/image';

interface TelsimBrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
  forceLight?: boolean;
}

const TelsimBrandLogo: React.FC<TelsimBrandLogoProps> = ({
  className = '',
  iconClassName = '',
  textClassName = '',
  compact = false,
  forceLight = false,
}) => {
  const height = compact ? 52 : 64;

  // Renderizado específico para el Landing (Usamos Next.js Image para mayor robustez)
  if (forceLight) {
    return (
      <div className={`flex items-center ${className}`.trim()} style={{ height: `${height}px` }}>
        <img
          src="/logo-light.png"
          alt="Telsim"
          style={{ height: '100%', width: 'auto', display: 'block' }}
          className={`object-contain ${iconClassName}`}
        />
      </div>
    );
  }

  // Renderizado para el Dashboard
  return (
    <div className={`flex items-center ${className}`.trim()} style={{ height: `${height}px` }}>
      <img
        src="/logo-dark.png"
        alt="Telsim"
        className={`${iconClassName} object-contain hidden dark:block`}
        style={{ height: '100%', width: 'auto' }}
      />
      <img
        src="/logo-light.png"
        alt="Telsim"
        className={`${iconClassName} object-contain block dark:hidden`}
        style={{ height: '100%', width: 'auto' }}
      />
    </div>
  );
};

export default TelsimBrandLogo;
