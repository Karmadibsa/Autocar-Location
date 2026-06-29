// Garde-fou d'envoi d'email pour les DONNÉES DE DÉMO.
// Les adresses du seed utilisent un domaine fictif (ex: @demo.autocar-location.fr).
// On veut traiter toute la logique métier (création/relance de devis, changement de
// statut, génération PDF…) SANS envoyer de vrai email à ces adresses (elles
// rebondiraient et consommeraient le quota Resend).
//
// Configurable via la variable d'env EMAIL_DEMO_DOMAINS (liste séparée par des
// virgules). À défaut, on utilise la liste ci-dessous.

const DEFAUT_DOMAINES_DEMO = ["demo.autocar-location.fr", "example.com", "demo.invalid"];

/** Domaines considérés comme « démo » (aucun email réel n'y est envoyé). */
export function domainesDemo(): string[] {
  const env = (process.env.EMAIL_DEMO_DOMAINS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return env.length ? env : DEFAUT_DOMAINES_DEMO;
}

/** Vrai si l'adresse appartient à un domaine de démo → on n'envoie pas l'email. */
export function estEmailDemo(email?: string | null): boolean {
  if (!email) return false;
  const dom = email.split("@")[1]?.toLowerCase();
  return !!dom && domainesDemo().includes(dom);
}
