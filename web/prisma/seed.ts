import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seeding de Slots de prueba...');
  
  const regions = [
    { id: 'TEST-CL-01', phone: '+56930001111', country: 'Chile' },
    { id: 'TEST-CL-02', phone: '+56930002222', country: 'CL' },
    { id: 'TEST-AR-01', phone: '+5491130001111', country: 'Argentina' },
  ];

  for (const reg of regions) {
    const slot = await prisma.slot.upsert({
      where: { slotId: reg.id },
      update: { 
        status: 'libre', 
        assignedTo: null,
        reservationToken: null,
        reservationExpires: null,
        reservationUserId: null,
        planType: null
      },
      create: {
        slotId: reg.id,
        phoneNumber: reg.phone,
        status: 'libre',
        country: reg.country,
        label: `Pruebas ${reg.country}`,
      },
    })
    console.log(`✅ Slot [${reg.country}] listo: ${slot.phoneNumber}`);
  }

  // 4. Crear mensajes de prueba para el Dashboard
  console.log('✉️ Creando mensajes de prueba...');
  const testUser = await prisma.user.findFirst({ where: { email: 'xrasminx@gmail.com' } });
  
  if (testUser) {
    const messages = [
      { sender: 'WhatsApp', content: 'Tu código de verificación de WhatsApp es 482-192' },
      { sender: 'Instagram', content: '921 482 es tu código de seguridad de Instagram. #ayuda' },
      { sender: 'Google', content: 'G-948212 es tu código de verificación de Google.' },
    ];

    for (const m of messages) {
      await prisma.smsLog.create({
        data: {
          userId: testUser.id,
          slotId: '69e7fba47e5f1463dc11b1c3', // El ID del primer slot de prueba
          sender: m.sender,
          content: m.content,
        }
      });
    }
    console.log('✅ Mensajes de prueba creados.');
  }

  console.log('🚀 Seeding completado.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
