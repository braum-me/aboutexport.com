// @ts-check
/**
 * Optionale Umami-Einbindung (Reichweitenmessung). Standard: aus.
 * Aktiv nur, wenn UMAMI_SCRIPT_URL und UMAMI_WEBSITE_ID zur BUILD-Zeit gesetzt sind
 * (die Seiten werden statisch gerendert).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Gemessen wird nur auf der Produktiv-Domain; Staging und lokale Tests senden nichts. */
const DEFAULT_DOMAINS = 'aboutexport.com,www.aboutexport.com';

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {{ scriptUrl: string; origin: string; websiteId: string; domains: string } | null}
 */
export function readUmami(env = process.env) {
  const rawUrl = (env.UMAMI_SCRIPT_URL ?? '').trim();
  const websiteId = (env.UMAMI_WEBSITE_ID ?? '').trim();
  if (!rawUrl && !websiteId) return null;
  if (!rawUrl || !websiteId) {
    throw new Error('Umami: UMAMI_SCRIPT_URL und UMAMI_WEBSITE_ID müssen gemeinsam gesetzt sein.');
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Umami: UMAMI_SCRIPT_URL ist keine gültige URL: ${rawUrl}`);
  }
  if (url.protocol !== 'https:') throw new Error('Umami: UMAMI_SCRIPT_URL muss https:// verwenden.');
  if (!UUID.test(websiteId)) throw new Error('Umami: UMAMI_WEBSITE_ID muss eine UUID sein.');
  const domains = (env.UMAMI_DOMAINS ?? '').trim() || DEFAULT_DOMAINS;
  return { scriptUrl: url.toString(), origin: url.origin, websiteId, domains };
}
