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
    <div className={`flex items-center ${compact ? 'gap-[0.2rem]' : 'gap-1'} ${className}`.trim()}>
      <img
        src="/telsim-isotipo.png"
        alt="Telsim"
        className={`${compact ? 'h-9 w-9 rounded-[0.9rem]' : 'h-[3.15rem] w-[3.15rem] rounded-[1.15rem]'} object-contain ${iconClassName}`.trim()}
      />
      <span
        className={`font-display leading-none tracking-tight text-slate-900 dark:text-white ${compact ? 'text-[1.4rem]' : 'text-[1.75rem]'} ${textClassName}`.trim()}
        style={{ fontWeight: 950 }}
      >
        telsim
      </span>
    </div>
  );
};

export default TelsimBrandLogo;
