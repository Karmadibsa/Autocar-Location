import { describe, it, expect } from "vitest";
import { titleCase, formatNomComplet } from "./noms";

describe("noms", () => {
  it("titleCase gère accents, tirets et apostrophes", () => {
    expect(titleCase("axel")).toBe("Axel");
    expect(titleCase("jean-paul")).toBe("Jean-Paul");
    expect(titleCase("hélène")).toBe("Hélène");
  });

  it("formatNomComplet : prénom Title + nom MAJUSCULES", () => {
    expect(formatNomComplet("lucas", "bernard")).toBe("Lucas BERNARD");
    expect(formatNomComplet("Marie", "Dubois")).toBe("Marie DUBOIS");
  });

  it("formatNomComplet : une seule chaîne -> Title Case (pas de devinette)", () => {
    expect(formatNomComplet(null, "momper axel")).toBe("Momper Axel");
    expect(formatNomComplet("", "")).toBeNull();
  });
});
