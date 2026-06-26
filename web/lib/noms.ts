// Mise en forme des noms : prénom en Title Case, nom de famille en MAJUSCULES.

/** "jean-paul" -> "Jean-Paul" (gère accents, espaces, tirets et apostrophes). */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep, c) => sep + c.toUpperCase());
}

/**
 * Nom complet présentable.
 * - prénom + nom connus : `Prénom NOM` (ex. "Lucas BERNARD").
 * - une seule chaîne (nom non séparé) : Title Case (on ne devine pas le nom de famille).
 */
export function formatNomComplet(prenom?: string | null, nom?: string | null): string | null {
  const p = prenom?.trim();
  const n = nom?.trim();
  if (p && n) return `${titleCase(p)} ${n.toUpperCase()}`;
  if (n) return titleCase(n);
  if (p) return titleCase(p);
  return null;
}
