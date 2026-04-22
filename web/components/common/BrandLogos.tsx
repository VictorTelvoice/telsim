import React from 'react';

interface BrandLogoProps {
  brand: string;
  size?: number;
}

const BrandLogos: React.FC<BrandLogoProps> = ({ brand, size = 18 }) => {
  const b = brand.toLowerCase();
  
  if (b === 'whatsapp') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path fill="#25D366" d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.393A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
      <path fill="white" d="M16.75 14.45c-.25-.12-1.47-.72-1.7-.8-.23-.08-.4-.12-.57.12-.17.24-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.1-.5.12-.12.25-.31.38-.46.12-.16.16-.27.25-.45.08-.17.04-.33-.02-.46-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.24-.87.85-.87 2.07 0 1.22.9 2.4 1.02 2.57.13.17 1.76 2.69 4.26 3.77.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28z" />
    </svg>
  );
  
  if (b === 'google') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
  
  if (b === 'facebook') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect width="24" height="24" rx="4" fill="#1877F2" />
      <path fill="white" d="M16.5 7.5h-2c-.55 0-1 .45-1 1v1.5h3l-.5 3h-2.5V21h-3v-8H9v-3h1.5V8.5C10.5 6.57 12.07 5 14 5h2.5v2.5z" />
    </svg>
  );
  
  if (b === 'instagram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <defs>
        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#igGrad)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  );
  
  if (b === 'telegram') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path fill="white" d="M5.5 11.5l12-5-4 13-3-4-5 3 1.5-7zM9.5 13l.8 3 1.2-2.8L9.5 13z" />
    </svg>
  );
  
  if (b === 'amazon') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect width="24" height="24" rx="4" fill="#FF9900" />
      <text x="5" y="16" fontSize="12" fontWeight="bold" fill="white" fontFamily="Arial">a</text>
      <path fill="white" d="M4 17c3 2 11 2 16-1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  
  if (b === 'apple') return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75.8.01 1.75-.75 3.32-.61 2.3.2 3.41 1.48 3.96 2.5a5.5 5.5 0 0 0-2.4 4.54c.04 2.1 1.15 3.75 3.03 4.79-.32.96-.86 1.84-1.54 2.54M12.03 7.25c-.02-2.23 1.76-4.07 3.92-4.14.07 2.33-2.04 4.31-3.92 4.14z" />
    </svg>
  );

  if (b === 'microsoft') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );

  if (b === 'netflix') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect width="24" height="24" fill="#141414" />
      <text x="4" y="19" fontSize="18" fontWeight="900" fill="#E50914" fontFamily="Arial">N</text>
    </svg>
  );

  if (b === 'spotify') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path fill="white" d="M16.7 10.7c-2.6-1.5-6.8-1.7-9.3-.9-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 2.8-.9 7.5-.7 10.5 1.1.4.2.5.7.3 1.1-.2.3-.7.4-1.1.1zM16.4 13c-.2.3-.6.4-1 .2-2.2-1.3-5.5-1.7-8.1-.9-.3.1-.7-.1-.8-.4-.1-.3.1-.7.4-.8 2.9-.9 6.6-.5 9.1 1 .4.2.5.7.4 1.1v-.2zm-1.1 2.2c-.2.3-.5.3-.8.2-1.9-1.1-4.3-1.4-7.1-.8-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3-.7 5.7-.4 7.8.9.3.2.4.5.4.8z" />
    </svg>
  );

  if (b === 'discord') return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect width="24" height="24" rx="5" fill="#5865F2" />
      <path fill="white" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.01.06.02.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
    </svg>
  );

  return null;
};

export default BrandLogos;
