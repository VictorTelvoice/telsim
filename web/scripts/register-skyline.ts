import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deviceName = "Skyline-DDNS-01";
  const ipAddress = "skytelvo1.ddns.net"; // Port 80 is default for HTTP

  const device = await prisma.skylineDevice.upsert({
    where: { 
      // Usamos el nombre como identificador único para este script
      // En una interfaz real usarías el ID de Mongo
      id: "662688888888888888888888" // Un ID fijo para pruebas si quieres o deja que Mongo lo cree
    },
    update: {
      ipAddress: ipAddress,
      name: deviceName,
      portCount: 64,
      status: "online"
    },
    create: {
      id: "662688888888888888888888",
      name: deviceName,
      ipAddress: ipAddress,
      portCount: 64,
      status: "online"
    }
  });

  console.log("✅ Dispositivo Skyline registrado/actualizado:");
  console.log(device);
}

main()
  .catch((e) => {
    console.error("❌ Error registrando el dispositivo:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
