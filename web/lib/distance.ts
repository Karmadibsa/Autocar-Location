// Distance routière réelle (gratuit, sans clé) : géocodage Nominatim + itinéraire OSRM.
// Renvoie les km arrondis, ou null si échec (l'appelant garde alors l'estimation).

type Coord = { lat: number; lon: number };

async function geocode(ville: string): Promise<Coord | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(ville + ", France")}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "AutocarLocation-demo/1.0 (contact@autocar-location.test)" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(j) || !j[0]) return null;
    return { lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon) };
  } catch {
    return null;
  }
}

export function metersToKm(meters: number): number {
  return Math.round(meters / 1000);
}

export function parseOsrmDistance(payload: unknown): number | null {
  const meters = (payload as { routes?: { distance?: number }[] })?.routes?.[0]?.distance;
  return typeof meters === "number" ? metersToKm(meters) : null;
}

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
