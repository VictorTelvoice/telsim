'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncSkylineDevice } from "@/lib/skyline/client";

/**
 * Disparador manual de sincronización para un dispositivo Skyline.
 * Solo accesible para administradores.
 */
export async function triggerSkylineSync(deviceId: string) {
  const session = await auth();
  
  // 1. Verificación de permisos
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (user?.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  // 2. Ejecutar sincronización
  try {
    const results = await syncSkylineDevice(deviceId);
    
    // 3. Registrar actividad de admin
    await prisma.auditLog.create({
      data: {
        action: "SKYLINE_SYNC_MANUAL",
        userId: session.user.id,
        details: JSON.stringify({ deviceId, ...results })
      }
    });

    return { success: true, ...results };
  } catch (error: any) {
    console.error("[AdminAction] Sync failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Lista todos los dispositivos registrados para el dashboard de administración.
 */
export async function getSkylineDevices() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

  if (user?.role !== "ADMIN") throw new Error("Forbidden");

  return await prisma.skylineDevice.findMany({
    orderBy: { createdAt: 'desc' }
  });
}
