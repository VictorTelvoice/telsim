'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: { name?: string; image?: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      image: data.image,
    }
  });

  revalidatePath('/app/settings');
  return { success: true, user };
}

export async function updateSecurity(data: { currentPassword?: string; newPassword?: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true }
  });

  if (!user) throw new Error("User not found");

  // If user has a password, verify current one
  if (user.password && data.currentPassword) {
    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) throw new Error("Contraseña actual incorrecta");
  }

  if (data.newPassword) {
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    });
  }

  return { success: true };
}

export async function updateTelegramConfig(data: { token?: string; chatId?: string; enabled?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramToken: data.token,
      telegramChatId: data.chatId,
      telegramEnabled: data.enabled
    }
  });

  revalidatePath('/app/settings/telegram');
  return { success: true };
}

export async function updateWebhookConfig(data: { url?: string; active?: boolean }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      webhookUrl: data.url,
      webhookActive: data.active
    }
  });

  revalidatePath('/app/settings/webhooks');
  revalidatePath('/app/api');
  return { success: true };
}

export async function regenerateApiKey() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Generate a cryptographically secure 64-char hex key
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const newKey = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiSecretKey: newKey }
  });

  revalidatePath('/app/api');
  return { success: true, key: newKey };
}
