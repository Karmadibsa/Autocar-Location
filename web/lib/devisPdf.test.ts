import { describe, it, expect } from "vitest";
import { buildDevisPdf } from "./devisPdf";

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
