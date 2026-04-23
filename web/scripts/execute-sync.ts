import { syncSkylineDevice } from "../lib/skyline/client";
import { prisma } from "../lib/prisma";

async function main() {
  const deviceId = "662688888888888888888888";
  
  console.log(`🚀 Iniciando sincronización para el dispositivo: ${deviceId}...`);
  
  try {
    const results = await syncSkylineDevice(deviceId);
    
    console.log("✅ Sincronización completada con éxito!");
    console.log("-----------------------------------------");
    console.log(`Slots actualizados: ${results.updated}`);
    console.log(`Slots creados (nuevos): ${results.created}`);
    console.log(`Rotaciones detectadas: ${results.rotations}`);
    console.log(`Errores: ${results.errors}`);
    console.log("-----------------------------------------");
  } catch (error: any) {
    console.error("❌ Error durante la sincronización:");
    if (error.message.includes("fetch failed") || error.code === "ECONNREFUSED") {
      console.error("No se pudo conectar al Skyline. ¿Está el puerto 80 abierto y el DDNS activo?");
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
