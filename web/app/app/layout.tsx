'use client';

import React, { ReactNode, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden transition-colors duration-400">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20 lg:pb-8">
          <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
            {children}
          </div>
        </main>

        {/* Global Floating Elements (optional) */}
        <div className="fixed bottom-8 right-8 z-20 pointer-events-none">
          {/* Aquí podríamos poner un chat de soporte flotante o similar */}
        </div>
      </div>
    </div>
  );
}
