// Distance routière réelle (gratuit, sans clé) : géocodage Nominatim + itinéraire OSRM.
// Renvoie les km arrondis, ou null si échec (l'appelant garde alors l'estimation).

type Coord = { lat: number; lon: number };

const UA = { "User-Agent": "AutocarLocation-demo/1.0 (contact@autocar-location.test)" };

async function geocode(ville: string): Promise<Coord | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(ville + ", France")}`;
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(j) || !j[0]) return null;
    return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) };
  } catch {
    return null;
  }
}

type NomResult = {
  lat: string;
  lon: string;
  class?: string;
  address?: { country_code?: string; postcode?: string; county?: string; state?: string };
};
export type GeoVille = { lat: number; lon: number; horsFrance: boolean; ambigue: boolean };

/**
 * Géocode une ville SANS forcer la France, pour détecter :
 * - **hors France** (country_code ≠ fr) → cas complexe (transfrontalier) ;
 * - **ambiguïté** : plusieurs communes françaises de même nom → demander le code postal.
 * Si l'utilisateur a déjà indiqué un code postal (5 chiffres), on ne signale pas l'ambiguïté.
 */
export async function geocodeVille(ville: string): Promise<GeoVille | null> {
  const aDejaCp = /\b\d{5}\b/.test(ville);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=fr&q=${encodeURIComponent(ville)}`;
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return null;
    const j = (await r.json()) as NomResult[];
    if (!Array.isArray(j) || !j[0]) return null;
    const best = j[0];
    const horsFrance = (best.address?.country_code ?? "fr") !== "fr";
    let ambigue = false;
    if (!aDejaCp && !horsFrance) {
      const communesFr = j.filter((x) => x.address?.country_code === "fr" && (x.class === "place" || x.class === "boundary"));
      const zones = new Set(communesFr.map((x) => x.address?.postcode || x.address?.county || x.address?.state || ""));
      ambigue = communesFr.length >= 2 && zones.size >= 2;
    }
    return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), horsFrance, ambigue };
  } catch {
    return null;
  }
}

/**
 * Analyse un trajet : distance routière + drapeaux « hors France » et « ville ambiguë ».
 * @returns `km` (ou null), `horsFrance` (un des deux points hors FR), `villesAmbigues` (noms à préciser par CP).
 */
export async function analyserTrajet(
  depart: string,
  destination: string,
): Promise<{ km: number | null; horsFrance: boolean; villesAmbigues: string[] }> {
  const [a, b] = await Promise.all([geocodeVille(depart), geocodeVille(destination)]);
  const horsFrance = !!a?.horsFrance || !!b?.horsFrance;
  const villesAmbigues: string[] = [];
  if (a?.ambigue) villesAmbigues.push(depart);
  if (b?.ambigue) villesAmbigues.push(destination);

  let km: number | null = null;
  if (a && b && !horsFrance) {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
    try {
      const r = await fetch(url);
      if (r.ok) km = parseOsrmDistance(await r.json());
    } catch {
      /* fallback : null */
    }
  }
  return { km, horsFrance, villesAmbigues };
}

export function metersToKm(meters: number): number {
  return Math.round(meters / 1000);
}

export function parseOsrmDistance(payload: unknown): number | null {
  const meters = (payload as { routes?: { distance?: number }[] })?.routes?.[0]?.distance;
  return typeof meters === "number" ? metersToKm(meters) : null;
}

/**
 * Distance routière réelle entre deux villes (km), via Nominatim (géocodage) + OSRM.
 * @returns Les km arrondis, ou `null` en cas d'échec (l'appelant garde alors l'estimation).
 */
export async function distanceKm(depart: string, destination: string): Promise<number | null> {
  if (!depart || !destination) return null;
  const [a, b] = await Promise.all([geocode(depart), geocode(destination)]);
  if (!a || !b) return null;
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return parseOsrmDistance(await r.json());
  } catch {
    return null;
  }
}
