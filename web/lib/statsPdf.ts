// PDF d'export des statistiques du dashboard (pdf-lib). Glyphes WinAnsi-safe (EUR, ->).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BRAND = rgb(0.054, 0.478, 0.4);
const INK = rgb(0.08, 0.125, 0.114);
const GREY = rgb(0.36, 0.42, 0.4);

export type Stats = {
  leads?: number;
  envoyes?: number;
  acceptes?: number;
  conversion?: number;
  categories?: { aTraiter: number; enAttente: number; gagnes: number; perdus: number };
  raisonsRefus?: Record<string, number>;
  parMois?: { mois: string; leads: number; acceptes: number }[];
  periode?: { from: string | null; to: string | null };
};

export async function buildStatsPdf(s: Stats): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595;
  const M = 50;
  let y = 790;
  const text = (t: string, x: number, yy: number, size = 10, f = font, c = INK) =>
    page.drawText(t, { x, y: yy, size, font: f, color: c });

  text("Autocar Location", M, y, 18, bold, BRAND);
  text("Statistiques commerciales", M, y - 18, 11, font, GREY);
  const periode = s.periode?.from || s.periode?.to ? `Periode : ${s.periode?.from ?? "..."} -> ${s.periode?.to ?? "..."}` : "Periode : 12 derniers mois";
  text(periode, M, y - 32, 9, font, GREY);
  text(`Edite le ${new Date().toLocaleDateString("fr-FR")}`, W - M - 120, y, 9, font, GREY);
  y -= 52;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: BRAND });
  y -= 26;

  // KPIs
  text("INDICATEURS", M, y, 11, bold, BRAND);
  y -= 18;
  const kpis: [string, string][] = [
    ["Leads recus", String(s.leads ?? 0)],
    ["Devis envoyes", String(s.envoyes ?? 0)],
    ["Devis acceptes", String(s.acceptes ?? 0)],
    ["Taux de conversion", `${s.conversion ?? 0} %`],
  ];
  for (const [k, v] of kpis) {
    text(k, M, y, 10, font, GREY);
    text(v, M + 200, y, 10, bold);
    y -= 16;
  }
  y -= 10;

  // Catégories opérationnelles
  if (s.categories) {
    text("VUE OPERATIONNELLE", M, y, 11, bold, BRAND);
    y -= 18;
    const cats: [string, number][] = [
      ["A traiter (cas complexes)", s.categories.aTraiter],
      ["En attente (relances)", s.categories.enAttente],
      ["Gagnes", s.categories.gagnes],
      ["Perdus", s.categories.perdus],
    ];
    for (const [k, v] of cats) {
      text(k, M, y, 10, font, GREY);
      text(String(v), M + 200, y, 10, bold);
      y -= 16;
    }
    y -= 10;
  }

  // Évolution mensuelle (table)
  if (s.parMois?.length) {
    text("EVOLUTION MENSUELLE", M, y, 11, bold, BRAND);
    y -= 16;
    text("Mois", M, y, 9, bold, GREY);
    text("Leads", M + 180, y, 9, bold, GREY);
    text("Acceptes", M + 260, y, 9, bold, GREY);
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: GREY });
    y -= 14;
    for (const m of s.parMois) {
      if (y < 70) break;
      text(m.mois, M, y, 9);
      text(String(m.leads), M + 180, y, 9);
      text(String(m.acceptes), M + 260, y, 9);
      y -= 14;
    }
    y -= 10;
  }

  // Motifs de refus
  const refus = Object.entries(s.raisonsRefus ?? {}).sort((a, b) => b[1] - a[1]);
  if (refus.length && y > 90) {
    text("MOTIFS DE REFUS", M, y, 11, bold, BRAND);
    y -= 18;
    for (const [r, n] of refus) {
      text(r, M, y, 10, font, GREY);
      text(String(n), M + 250, y, 10, bold);
      y -= 16;
    }
  }

  return doc.save();
}
