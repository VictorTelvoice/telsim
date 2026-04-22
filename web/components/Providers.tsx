"use client";

import { ReactNode, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SessionProvider } from "next-auth/react";

// Suppress the React 19 warning about script tags injected by next-themes
// This is a known false positive issue in React 19 / Next.js 15+
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    origError.apply(console, args);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
