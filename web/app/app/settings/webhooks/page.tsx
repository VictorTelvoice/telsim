import React from 'react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import WebhooksContent from './WebhooksContent';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Webhooks & API | Telsim',
};

export default async function WebhooksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      webhookUrl: true,
      webhookActive: true,
      apiSecretKey: true
    }
  });

  return (
    <div className="pt-4">
      <WebhooksContent initialUser={user} />
    </div>
  );
}
