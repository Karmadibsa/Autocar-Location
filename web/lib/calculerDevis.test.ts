import { describe, it, expect } from "vitest";
import { calculerDevis, type Devis } from "./calculerDevis";

const base = { nb_passagers: 40, distance_km: 50, date_demande: "2026-08-01", date_depart: "2026-09-15" };
const ok = (r: unknown) => r as Devis;

describe("calculerDevis (port TS du moteur déterministe)", () => {
  it("cas simple — valeurs exactes", () => {
    const d = ok(calculerDevis(base));
    expect(d.prix_ht).toBe(382.38);
    expect(d.tva).toBe(38.24);
    expect(d.prix_ttc).toBe(420.62);
  });

  it("demande urgente (<7 j) — DD_PRIORITAIRE +10%", () => {
    const d = ok(calculerDevis({ ...base, date_demande: "2026-07-01", date_depart: "2026-07-05" }));
    expect(d.meta.code_date).toBe("DD_PRIORITAIRE");
    expect(d.coefficients.some((c) => c.valeur === 0.1)).toBe(true);
  });

  it("hors zone (>180 km) — formule km×2×2,5", () => {
    const d = ok(calculerDevis({ ...base, distance_km: 300 }));
    expect(d.meta.base).toBe(1500);
    expect(d.prix_ht).toBe(1638.75);
  });

  it("aller/retour — base doublée", () => {
    const d = ok(calculerDevis({ ...base, aller_retour: true }));
    expect(d.meta.base).toBe(700);
    expect(d.prix_ht).toBe(764.75);
  });

  it("0 passager — erreur", () => {
    const d = calculerDevis({ ...base, nb_passagers: 0 });
    expect("erreur" in d && d.erreur).toBe(true);
  });

  it("date incohérente — erreur", () => {
    const d = calculerDevis({ ...base, date_demande: "2026-09-15", date_depart: "2026-08-01" });
    expect("erreur" in d && d.erreur).toBe(true);
  });

  it("> 85 passagers — escalade", () => {
    const d = calculerDevis({ ...base, nb_passagers: 90 });
    expect("escalade" in d && d.escalade).toBe(true);
  });

  it("option nuit chauffeur — augmente le prix", () => {
    const sans = ok(calculerDevis(base));
    const avec = ok(calculerDevis({ ...base, options: [{ code: "nuit_chauffeur", quantite: 2 }] }));
    expect(avec.prix_ht).toBeGreaterThan(sans.prix_ht);
  });

  it("déterminisme", () => {
    expect(calculerDevis(base)).toEqual(calculerDevis(base));
  });
});
