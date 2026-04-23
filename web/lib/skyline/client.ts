import { prisma } from "../prisma";
import { getCountryFromPhone } from "../../utils/phoneUtils";

export interface SkylinePortInfo {
  port: string;
  msisdn: string;
  imsi?: string;
  status: string;
}

/**
 * Cliente para interactuar con hardware Skyline (MoIP64/512).
 * Especializado en la versión 7.5c que requiere scraping de HTML.
 */
export class SkylineClient {
  private ip: string;
  private user?: string;
  private pass?: string;
  private sessionCookie: string | null = null;

  constructor(ip: string, user?: string, pass?: string) {
    this.ip = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.user = user || process.env.SKYLINE_USER || "root";
    this.pass = pass || process.env.SKYLINE_PASS || "root";
  }

  /**
   * Realiza el login en el equipo para obtener una cookie de sesión.
   */
  private async login(): Promise<boolean> {
    try {
      const loginUrl = `http://${this.ip}/login_en.html`;
      const body = new URLSearchParams();
      body.append("username", this.user!);
      body.append("password", this.pass!);
      body.append("login_language_write", "en");

      const response = await fetch(loginUrl, {
        method: "POST",
        body: body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirect: "manual"
      });

      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        this.sessionCookie = setCookie.split(";")[0];
        console.log("[SkylineClient] Login exitoso, Cookie obtenida.");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[SkylineClient] Error en login:", err);
      return false;
    }
  }

  /**
   * Obtiene el estado actual de todos los puertos vía Scraping de HTML.
   */
  async fetchPorts(): Promise<SkylinePortInfo[]> {
    if (!this.sessionCookie) {
      await this.login();
    }

    try {
      const url = `http://${this.ip}/goip_locnum_en.html`;
      const response = await fetch(url, {
        headers: { 
          "Cookie": this.sessionCookie || "",
          "Accept": "text/html"
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      
      // Extraer la variable strLocNumList mediante Regex (evitando líneas comentadas)
      const regex = /^\s*var strLocNumList\s*=\s*'([^']+)';/m;
      const match = html.match(regex);

      if (!match) {
        console.error("[SkylineClient] No se encontró la variable strLocNumList en el HTML.");
        // Si falló, quizás la sesión expiró, reintentamos una vez
        if (this.sessionCookie) {
          this.sessionCookie = null;
          await this.login();
          return this.fetchPorts();
        }
        throw new Error("Could not find port data in hardware response");
      }

      let jsonData;
      try {
        jsonData = JSON.parse(match[1]);
      } catch (e) {
        console.error("[SkylineClient] Error parseando JSON del HTML:", e);
        throw e;
      }
      const ports: SkylinePortInfo[] = [];

      // Estructura de data en goip_locnum_en.html:
      // ["1.01", "A_Num", "B_Num", "C_Num", ...]
      // Usualmente el primer número poblado en los slots tras el index es el activo
      if (jsonData.data && Array.isArray(jsonData.data)) {
        jsonData.data.forEach((row: any[]) => {
          const portStr = row[0]; // Ej: "1.01" o "16.1"
          const portIdentifier = portStr.toString();
          
          // Buscamos el primer número que no sea vacío en el array tras el índice
          // saltando el índice y el primer campo vacío (como en el ejemplo del usuario)
          let activeMsisdn = "";
          for (let i = 1; i < row.length; i++) {
            if (row[i] && row[i].length > 5) {
              activeMsisdn = row[i];
              break;
            }
          }

          ports.push({
            port: portIdentifier,
            msisdn: activeMsisdn,
            status: activeMsisdn ? "online" : "offline"
          });
        });
      }

      return ports;

    } catch (error: any) {
      console.error(`[SkylineClient] Error scraping ports from ${this.ip}:`, error);
      throw error;
    }
  }
}

/**
 * Servicio de sincronización principal.
 */
export async function syncSkylineDevice(deviceId: string) {
  const device = await prisma.skylineDevice.findUnique({
    where: { id: deviceId }
  });

  if (!device) throw new Error("Device not found");

  const client = new SkylineClient(
    device.ipAddress, 
    device.apiUser || undefined, 
    device.apiPass || undefined
  );
  
  const hardwarePorts = await client.fetchPorts();
  const deviceName = device.name;

  let created = 0;
  let updated = 0;
  let rotations = 0;
  let errors = 0;

  for (const hPort of hardwarePorts) {
    const slotIdKey = `${deviceName}:${hPort.port}`;
    
    try {
      const existingSlot = await prisma.slot.findUnique({
        where: { slotId: slotIdKey }
      });

      if (!existingSlot) {
        await prisma.slot.create({
          data: {
            slotId: slotIdKey,
            deviceId: device.id,
            portNumber: hPort.port,
            phoneNumber: hPort.msisdn,
            country: getCountryFromPhone(hPort.msisdn),
            lastImsi: hPort.imsi || "",
            status: hPort.msisdn ? "libre" : "offline",
            lastSeenAt: new Date()
          }
        });
        created++;
      } else {
        // Detectar rotación
        if (existingSlot.phoneNumber !== hPort.msisdn && hPort.msisdn !== "") {
          await prisma.slotSyncLog.create({
            data: {
              slotId: existingSlot.id,
              slotIdString: slotIdKey,
              eventType: "rotation_detected",
              oldPhone: existingSlot.phoneNumber,
              newPhone: hPort.msisdn,
              source: "sync"
            }
          });
          rotations++;
        }

        await prisma.slot.update({
          where: { id: existingSlot.id },
          data: {
            phoneNumber: hPort.msisdn || existingSlot.phoneNumber,
            country: hPort.msisdn ? getCountryFromPhone(hPort.msisdn) : existingSlot.country,
            lastImsi: hPort.imsi || existingSlot.lastImsi,
            lastSeenAt: new Date(),
            // No cambiamos el status si el slot ya está 'ocupado' por un usuario
            status: existingSlot.status === "ocupado" ? "ocupado" : (hPort.msisdn ? "libre" : "offline")
          }
        });
        updated++;
      }
    } catch (err) {
      console.error(`Error syncing slot ${slotIdKey}:`, err);
      errors++;
    }
  }

  await prisma.skylineDevice.update({
    where: { id: device.id },
    data: { lastSyncAt: new Date(), status: "online" }
  });

  return { created, updated, rotations, errors };
}
