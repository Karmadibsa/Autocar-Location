import { describe, it, expect } from "vitest";
import { devisEmailHtml } from "./emailDevis";

const devis = { prix_ht: 1957.3, tva: 195.73, prix_ttc: 2153.03, devise: "EUR" };
const params = {
  depart: "Lyon",
  destination: "Annecy",
  date_depart: "2026-07-12",
  nb_passagers: 50,
  aller_retour: true,
  nom: "Client Un",
};

describe("devisEmailHtml", () => {
  const html = devisEmailHtml(devis, params);

  it("affiche les totaux client (HT / TVA / TTC)", () => {
    expect(html).toContain("1957.30");
    expect(html).toContain("195.73");
    expect(html).toContain("2153.03");
  });

  it("inclut le résumé de la demande", () => {
    expect(html).toContain("Résumé de la demande");
    expect(html).toContain("Annecy");
    expect(html).toContain("Aller-retour");
    expect(html).toContain("50");
  });

  it("NE divulgue JAMAIS la marge ni les coefficients (vue client)", () => {
    expect(html).not.toMatch(/marge/i);
    expect(html).not.toMatch(/coefficient/i);
    expect(html).not.toMatch(/x2/i);
  });

  it("personnalise le titre/intro pour une relance", () => {
    const r = devisEmailHtml(devis, params, { titre: "Relance 1/2", intro: "Sauf erreur..." });
    expect(r).toContain("Relance 1/2");
    expect(r).toContain("Sauf erreur...");
  });
});
