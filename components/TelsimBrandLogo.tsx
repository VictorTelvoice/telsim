import React from 'react';

interface TelsimBrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  compact?: boolean;
}

const TelsimBrandLogo: React.FC<TelsimBrandLogoProps> = ({
  className = '',
  iconClassName = '',
  textClassName = '',
  compact = false,
}) => {
  return (
    <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3.5'} ${className}`.trim()}>
      <img
        src="/telsim-isotipo.png"
        alt="Telsim"
        className={`${compact ? 'h-10 w-10 rounded-xl' : 'h-14 w-14 rounded-2xl'} object-contain ${iconClassName}`.trim()}
      />
      <span
        className={`font-display font-black uppercase leading-none tracking-tight text-slate-950 dark:text-white ${compact ? 'text-[1.55rem]' : 'text-[1.95rem]'} ${textClassName}`.trim()}
      >
        TELSIM
      </span>
    </div>
  );
};

export default TelsimBrandLogo;
