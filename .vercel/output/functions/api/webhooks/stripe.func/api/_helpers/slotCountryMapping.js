/**
 * Mapeo onboarding → `public.slots.country` (columna real en producción).
 * Filtro con ILIKE por cada patrón (case-insensitive en Postgres).
 *
 * Valores deben alinearse con lo que guardáis en `slots.country` (ej. "Chile", no "CL").
 */
export const ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS = {
    CL: ['Chile'],
    AR: ['Argentina'],
    PE: ['Perú', 'Peru'],
    MX: ['México', 'Mexico'],
    CO: ['Colombia'],
    BR: ['Brasil', 'Brazil'],
    US: ['Estados Unidos', 'USA', 'United States', 'EE.UU.', 'EEUU'],
};
/** Código ISO desde el body (ya normalizado MAYÚSCULAS + trim en checkout). */
export function isSupportedOnboardingCountryCode(iso) {
    if (!iso)
        return true;
    return Boolean(ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS[iso]?.length);
}
/** Fragmento PostgREST seguro para OR de country.ilike (espacios/acentos entre comillas). */
function countryIlikeOrFragment(pattern) {
    const t = pattern.trim();
    const escaped = t.replace(/"/g, '');
    return `country.ilike."${escaped}"`;
}
/**
 * Aplica filtro OR country.ilike para todos los patrones del código ISO.
 * No valida si el código existe: usar isSupportedOnboardingCountryCode antes.
 */
export function applySlotCountryFilter(query, onboardingIsoUpper) {
    const patterns = ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS[onboardingIsoUpper];
    if (!onboardingIsoUpper || !patterns?.length) {
        return query;
    }
    const orExpr = patterns.map(countryIlikeOrFragment).join(',');
    return query.or(orExpr);
}
/**
 * Misma semántica que el filtro de checkout: el valor en BD `slots.country` debe coincidir
 * (tras trim + lower) con algún patrón del código ISO de onboarding (metadata.region, etc.).
 */
export function slotCountryMatchesOnboardingIso(slotCountryRaw, onboardingIsoUpper) {
    const iso = String(onboardingIsoUpper ?? '').trim().toUpperCase();
    if (!iso)
        return true;
    const patterns = ONBOARDING_ISO_TO_SLOT_COUNTRY_PATTERNS[iso];
    if (!patterns?.length)
        return false;
    const s = String(slotCountryRaw ?? '').trim().toLowerCase();
    if (!s)
        return false;
    return patterns.some((p) => s === p.trim().toLowerCase());
}
//# sourceMappingURL=slotCountryMapping.js.map