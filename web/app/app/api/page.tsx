import React, { Suspense } from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ApiContent from './ApiContent';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'API & Webhooks | Telsim',
  description: 'Configura tu webhook endpoint, gestiona tu API secret key e integra Telsim con tus aplicaciones.',
};

export default async function ApiPage() {
  const session = await auth();

  let initialUser = null;

  if (session?.user?.id) {
    try {
      initialUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          webhookUrl: true,
          webhookActive: true,
          apiSecretKey: true,
        }
      });
    } catch {
      // graceful fallback if fields don't exist yet
    }
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={<ApiLoading />}>
        <ApiContent initialUser={initialUser} />
      </Suspense>
    </div>
  );
}

function ApiLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400 animate-pulse">
        Cargando configuración API...
      </p>
    </div>
  );
}
