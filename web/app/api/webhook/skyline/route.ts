import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCountryFromPhone } from "@/utils/phoneUtils";

/**
 * Webhook for Skyline devices (MoIP64/512).
 * Processes incoming SMS and performs reactive port synchronization.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    console.log(`[Skyline Webhook] Incoming ${req.method} Request`);

    // 1. Try to get from Query Params
    const { searchParams } = new URL(req.url);
    let port = searchParams.get("port");
    let sender = searchParams.get("sender");
    let receiver = searchParams.get("receiver");
    let deviceName = searchParams.get("device") || "default";
    let content = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyParams = new URLSearchParams(rawBody);
      port = port || bodyParams.get("port");
      sender = sender || bodyParams.get("sender") || bodyParams.get("from");
      receiver = receiver || bodyParams.get("receiver") || bodyParams.get("to");
      content = bodyParams.get("msg") || bodyParams.get("text") || bodyParams.get("content") || rawBody;
    } else {
      // Try to parse as JSON
      try {
        const json = JSON.parse(rawBody);
        port = port || json.port;
        sender = sender || json.sender || json.from;
        receiver = receiver || json.receiver || json.to;
        content = json.msg || json.text || json.content || rawBody;
      } catch (e) {
        // Not JSON nor form-data, could be Skyline headers format
        if (rawBody.includes("Sender:") && rawBody.includes("\r\n\r\n")) {
          const parts = rawBody.split("\r\n\r\n");
          const headerSection = parts[0];
          content = parts.slice(1).join("\r\n\r\n").trim();

          const headerLines = headerSection.split("\r\n");
          headerLines.forEach(line => {
            if (line.startsWith("Sender:")) sender = sender || line.replace("Sender:", "").trim();
            if (line.startsWith("Receiver:")) {
               const val = line.replace("Receiver:", "").trim();
               const phoneMatch = val.match(/(\d{7,})/);
               if (phoneMatch) receiver = receiver || phoneMatch[0];
               const slotMatch = val.match(/"([^"]+)"/);
               if (slotMatch) port = port || slotMatch[1];
            }
            if (line.startsWith("Slot:")) port = port || line.replace("Slot:", "").replace(/"/g, "").trim();
          });
        } else {
          content = rawBody.trim();
        }
      }
    }

    if (!port || !receiver || !sender) {
      console.error("[Skyline Webhook] Missing parameters:", { port, sender, receiver });
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Identify Port/Slot
    let slotIdKey = `${deviceName}:${port}`;
    let slot = await prisma.slot.findUnique({
      where: { slotId: slotIdKey },
      include: { assignedToUser: true }
    });

    if (!slot && receiver) {
      const cleanReceiver = receiver.trim().replace("+", "");
      slot = await prisma.slot.findFirst({
        where: { 
          OR: [
            { phoneNumber: cleanReceiver },
            { phoneNumber: `+${cleanReceiver}` },
            { phoneNumber: { endsWith: cleanReceiver.slice(-8) } }
          ]
        },
        include: { assignedToUser: true }
      });
    }

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    }

    // 2. Reactive Sync
    const currentMsisdn = receiver.trim();
    if (slot.phoneNumber !== currentMsisdn) {
      await prisma.slot.update({
        where: { id: slot.id },
        data: { 
          phoneNumber: currentMsisdn,
          country: getCountryFromPhone(currentMsisdn),
          lastSeenAt: new Date()
        }
      });

      await prisma.slotSyncLog.create({
        data: {
          slotId: slot.id,
          slotIdString: slot.slotId,
          eventType: "rotation_reactive",
          oldPhone: slot.phoneNumber,
          newPhone: currentMsisdn,
          source: "webhook"
        }
      });
    }

    // 3. Process Message
    const analysis = analyzeSmsContent(content, sender);

    // 3.0 Credit Limit Check
    const activeSub = await prisma.subscription.findFirst({
      where: { slotId: slot.id, status: 'active' }
    });

    if (activeSub && activeSub.creditsUsed >= activeSub.monthlyLimit && !analysis.isSpam) {
      return NextResponse.json({ status: 'limit_reached', message: 'Monthly credit limit exceeded' });
    }

    // 3.1 Register SMS
    const smsLog = await prisma.smsLog.create({
      data: {
        sender,
        content,
        serviceName: analysis.serviceName,
        verificationCode: analysis.verificationCode,
        isSpam: analysis.isSpam,
        userId: slot.assignedTo,
        slotId: slot.id,
        receivedAt: new Date()
      }
    });

    // 3.2 Notification
    if (!analysis.isSpam && slot.assignedTo) {
      await prisma.notification.create({
        data: {
          userId: slot.assignedTo,
          title: `New SMS: ${analysis.serviceName || sender}`,
          message: analysis.verificationCode 
            ? `Code received: ${analysis.verificationCode}`
            : `You have received a new message from ${sender}`,
          type: 'sms',
          link: `/app/messages`
        }
      });
    }

    // 3.3 Token Consumption
    if (!analysis.isSpam && activeSub) {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { creditsUsed: { increment: 1 } }
      });
    }

    // 4. External Webhook
    if (slot.assignedToUser?.webhookActive && slot.assignedToUser?.webhookUrl) {
      triggerExternalWebhook(slot.assignedToUser.webhookUrl, {
        smsId: smsLog.id,
        sender,
        receiver: currentMsisdn,
        content,
        serviceName: analysis.serviceName,
        verificationCode: analysis.verificationCode,
        isSpam: analysis.isSpam,
        timestamp: smsLog.receivedAt
      }, slot.assignedToUser.apiSecretKey);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Skyline Webhook] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function analyzeSmsContent(content: string, sender: string) {
  const lowerContent = content.toLowerCase();
  let serviceName: string | null = null;
  let verificationCode: string | null = null;
  let isSpam = false;

  const services = ["google", "whatsapp", "facebook", "instagram", "tiktok", "netflix", "apple", "microsoft", "telegram", "uber", "did", "pedidosya", "rappi"];
  for (const s of services) {
    if (sender.toLowerCase().includes(s) || lowerContent.includes(s)) {
      serviceName = s.charAt(0).toUpperCase() + s.slice(1);
      break;
    }
  }

  const otpMatch = content.match(/\b(\d{4,8})\b/);
  if (otpMatch && (lowerContent.includes("code") || lowerContent.includes("verific") || lowerContent.includes("otp"))) {
    verificationCode = otpMatch[1];
  }

  // 3. Deteccion de Spam Basica / Mensajes de Operador
  const spamKeywords = ["ganaste", "premio", "felicidades", "haz clic", "oferta exclusiva", "urgente", "bit.ly", "t.co", "bienvenido a movistar", "configuraciones que optimizaran"];
  for (const kw of spamKeywords) {
    if (lowerContent.includes(kw)) {
      isSpam = true;
      break;
    }
  }

  // Si el remitente es una operadora y no hay un servicio claro detectado, marcar como spam
  // EXCEPTO si contiene palabras clave importantes (IMEI, bloqueado, etc.)
  const importantKeywords = ["bloqueado", "inscriba", "imei", "multibanda", "bloqueo", "urgente"];
  const isImportant = importantKeywords.some(kw => lowerContent.includes(kw));

  if (sender.toLowerCase().includes('movistar') && !serviceName && !isImportant) {
    isSpam = true;
  }

  return { serviceName, verificationCode, isSpam };
}

async function triggerExternalWebhook(url: string, payload: any, secret: string | null) {
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "Authorization": `Bearer ${secret}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`[Webhook] Failed to forward SMS to ${url}:`, err);
  }
}
