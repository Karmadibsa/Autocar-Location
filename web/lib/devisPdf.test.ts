import { describe, it, expect } from "vitest";
import { buildDevisPdf, refDevis } from "./devisPdf";

describe("refDevis", () => {
  it("est stable et dérivée de l'id (même id => même réf.)", () => {
    const id = "e1000000-0000-0000-0000-000000000001";
    expect(refDevis(id)).toBe(refDevis(id));
    expect(refDevis(id)).toBe("DV-E1000000");
  });
  it("fallback daté si pas d'id", () => {
    expect(refDevis(null)).toMatch(/^DV-\d{8}$/);
  });
});

describe("buildDevisPdf", () => {
  it("génère un vrai PDF non vide", async () => {
    const pdf = await buildDevisPdf(
      { prix_ht: 100, tva: 10, prix_ttc: 110, devise: "EUR", lignes: [{ libelle: "Forfait", montant: 100 }] },
      { depart: "Lyon", destination: "Annecy", date_depart: "2026-07-12", nb_passagers: 50, aller_retour: true, nom: "MOMPER Axel" },
    );
    expect(pdf.length).toBeGreaterThan(500);
    // En-tête de fichier PDF
    expect(Buffer.from(pdf.slice(0, 4)).toString("ascii")).toBe("%PDF");
  });
});
