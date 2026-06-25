// Logique de relances (testable) : J+2 si urgent, J+3 puis J+7 sinon, max 2 puis clôture.

export function estUrgent(
  dateDepart: string | null | undefined,
  dateDemande: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (!dateDepart) return false;
  const dd = new Date(dateDepart + "T00:00:00Z").getTime();
  const dq = new Date(dateDemande + "T00:00:00Z").getTime();
  if (isNaN(dd) || isNaN(dq)) return false;
  const jours = Math.round((dd - dq) / 86400000);
  return jours >= 0 && jours < 7; // départ dans moins de 7 jours = urgent
}

/**
 * Date ISO de la prochaine relance, ou null si on a atteint le maximum (clôture).
 * @param urgent              demande urgente ?
 * @param nbRelancesEffectuees nombre de relances déjà envoyées (0 = aucune)
 * @param from                point de départ du calcul (défaut : maintenant)
 */
export function prochaineRelance(
  urgent: boolean,
  nbRelancesEffectuees: number,
  from: Date = new Date(),
): string | null {
  if (nbRelancesEffectuees >= 2) return null; // max 2 relances -> clôture
  const plus = (jours: number) => new Date(from.getTime() + jours * 86400000).toISOString();
  if (urgent) return plus(2); // urgent : J+2, puis J+2
  return nbRelancesEffectuees === 0 ? plus(3) : plus(4); // standard : J+3 (création) puis J+7
}

// Type de relance pour la table relances (J2 / J3 / J7).
export function typeRelance(urgent: boolean, numero: number): "J2" | "J3" | "J7" {
  if (urgent) return "J2";
  return numero === 1 ? "J3" : "J7";
}
