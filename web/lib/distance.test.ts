import { describe, it, expect, vi } from "vitest";
import { metersToKm, parseOsrmDistance, distanceKm } from "./distance";

describe("distance (OSRM / Nominatim)", () => {
  it("metersToKm arrondit au km", () => {
    expect(metersToKm(140500)).toBe(141);
    expect(metersToKm(150000)).toBe(150);
  });

  it("parseOsrmDistance lit routes[0].distance", () => {
    expect(parseOsrmDistance({ routes: [{ distance: 150000 }] })).toBe(150);
    expect(parseOsrmDistance({})).toBeNull();
    expect(parseOsrmDistance(null)).toBeNull();
  });

  it("distanceKm — null si le géocodage ne renvoie rien", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
    expect(await distanceKm("X", "Y")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("distanceKm — calcule via Nominatim + OSRM (mocké)", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("nominatim")
        ? { ok: true, json: async () => [{ lat: "45.76", lon: "4.84" }] }
        : { ok: true, json: async () => ({ routes: [{ distance: 150000 }] }) },
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    expect(await distanceKm("Lyon", "Annecy")).toBe(150);
    vi.unstubAllGlobals();
  });
});
