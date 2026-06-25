import { describe, it, expect } from "vitest";
import { estUrgent, prochaineRelance, typeRelance, estExpire } from "./relances";

describe("relances", () => {
  it("estUrgent : départ < 7 jours", () => {
    expect(estUrgent("2026-06-28", "2026-06-25")).toBe(true); // 3 j
    expect(estUrgent("2026-07-20", "2026-06-25")).toBe(false); // 25 j
    expect(estUrgent(null)).toBe(false);
  });

  it("prochaineRelance standard : J+3 puis J+7 puis null", () => {
    const from = new Date("2026-06-25T00:00:00Z");
    expect(prochaineRelance(false, 0, from)).toBe(new Date("2026-06-28T00:00:00Z").toISOString()); // +3
    // après la 1re relance (effectuée à J+3), +4 = J+7
    const j3 = new Date("2026-06-28T00:00:00Z");
    expect(prochaineRelance(false, 1, j3)).toBe(new Date("2026-07-02T00:00:00Z").toISOString());
    expect(prochaineRelance(false, 2, from)).toBeNull(); // clôture
  });

  it("prochaineRelance urgent : J+2", () => {
    const from = new Date("2026-06-25T00:00:00Z");
    expect(prochaineRelance(true, 0, from)).toBe(new Date("2026-06-27T00:00:00Z").toISOString());
    expect(prochaineRelance(true, 2, from)).toBeNull();
  });

  it("typeRelance", () => {
    expect(typeRelance(true, 1)).toBe("J2");
    expect(typeRelance(false, 1)).toBe("J3");
    expect(typeRelance(false, 2)).toBe("J7");
  });

  it("estExpire : > 30 jours après l'envoi", () => {
    const now = new Date("2026-06-25T12:00:00Z");
    expect(estExpire("2026-05-01T00:00:00Z", 30, now)).toBe(true); // 55 j
    expect(estExpire("2026-06-10T00:00:00Z", 30, now)).toBe(false); // 15 j
    expect(estExpire(null, 30, now)).toBe(false);
  });
});
