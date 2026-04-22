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
        className={`${compact ? 'h-9 w-28' : 'h-[3rem] w-[9rem]'} object-contain ${iconClassName}`.trim()}
      />
    </div>
  );
};

export default TelsimBrandLogo;
