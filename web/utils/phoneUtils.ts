/**
 * Utility for phone number analysis and country detection
 */

export const COUNTRY_PREFIX_MAP: Record<string, { name: string, iso: string }> = {
  "56": { name: "Chile", iso: "CL" },
  "54": { name: "Argentina", iso: "AR" },
  "51": { name: "Perú", iso: "PE" },
  "52": { name: "México", iso: "MX" },
  "57": { name: "Colombia", iso: "CO" },
  "55": { name: "Brasil", iso: "BR" },
  "1": { name: "USA", iso: "US" },
  "34": { name: "España", iso: "ES" },
};

/**
 * Detects the country ISO code based on the phone number prefix
 */
export function getCountryFromPhone(phone: string): string {
  if (!phone) return "Desconocido";
  
  const cleanPhone = phone.replace(/\D/g, "");
  const prefixes = Object.keys(COUNTRY_PREFIX_MAP).sort((a, b) => b.length - a.length);
  
  for (const prefix of prefixes) {
    if (cleanPhone.startsWith(prefix)) {
      return COUNTRY_PREFIX_MAP[prefix].iso;
    }
  }
  
  return "??";
}

/**
 * Gets the full name of a country from its ISO code or name
 */
export function getCountryName(isoOrName: string): string {
  if (!isoOrName) return "Desconocido";
  
  const entry = Object.values(COUNTRY_PREFIX_MAP).find(
    c => c.iso.toLowerCase() === isoOrName.toLowerCase() || c.name.toLowerCase() === isoOrName.toLowerCase()
  );
  
  return entry?.name || isoOrName;
}

/**
 * Gets the ISO 3166-1 alpha-2 code for a country name or ISO code
 */
export function getIsoCodeFromCountry(countryNameOrIso: string): string {
  if (!countryNameOrIso) return "CL";
  
  const entry = Object.values(COUNTRY_PREFIX_MAP).find(
    c => c.name.toLowerCase() === countryNameOrIso.toLowerCase() || c.iso.toLowerCase() === countryNameOrIso.toLowerCase()
  );
  
  return entry?.iso || "CL";
}
