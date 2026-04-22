import React from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import TelegramContent from './TelegramContent';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Configuración Telegram | Telsim',
};

export default async function TelegramPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramToken: true,
      telegramChatId: true,
      telegramEnabled: true
    }
  });

  return (
    <div className="pt-4">
      <TelegramContent initialUser={user} />
    </div>
  );
}
