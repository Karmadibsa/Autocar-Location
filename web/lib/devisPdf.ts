// Génère un PDF de devis Autocar Location (pdf-lib, pur JS), aspect facture.
// On évite les glyphes non WinAnsi (→, €) : on écrit "->" et "EUR".
import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Ligne = { libelle: string; montant: number };
export type DevisPdf = {
  prix_ht?: number;
  tva?: number;
  prix_ttc?: number;
  devise?: string;
  lignes?: Ligne[];
};
export type ParamsPdf = {
  depart?: string | null;
  destination?: string | null;
  date_depart?: string | null;
  nb_passagers?: number | null;
  aller_retour?: boolean | null;
  nom?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  ref?: string | null; // référence stable du devis (dérivée de l'id)
  signature_image?: string | null; // data URL PNG du tracé (devis accepté)
  signe_par?: string | null;
  signe_le?: string | null;
};

/** Référence lisible et **stable** dérivée de l'id du devis (même devis ⇒ même réf.). */
export function refDevis(id?: string | null): string {
  if (!id) return "DV-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return "DV-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

const BRAND = rgb(0.054, 0.478, 0.4);
const INK = rgb(0.08, 0.125, 0.114);
const GREY = rgb(0.36, 0.42, 0.4);
const LIGHT = rgb(0.95, 0.97, 0.96);
const ACCENT = rgb(0.776, 0.949, 0.306);

/**
 * Génère le PDF d'un devis (vue client : prestation + TVA + TTC, jamais la marge),
 * avec logo, référence stable et adresse de facturation.
 * @returns Les octets du PDF (`Uint8Array`).
 */
export async function buildDevisPdf(devis: DevisPdf, params: ParamsPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595;
  const M = 50;
  let y = 800;

  const text = (s: string, x: number, yy: number, size = 11, f = font, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });
  const right = (s: string, xRight: number, yy: number, size = 11, f = font, color = INK) =>
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y: yy, size, font: f, color });
  const eur = (n?: number) => `${(n ?? 0).toFixed(2)} EUR`;

  // --- En-tête : logo + marque (gauche) / DEVIS + réf (droite) ---
  let logo: PDFImage | null = null;
  try {
    const buf = await readFile(path.join(process.cwd(), "public", "logo.png"));
    logo = await doc.embedPng(buf);
  } catch {
    /* logo best-effort */
  }
  let brandX = M;
  if (logo) {
    const h = 38;
    const w = (logo.width / logo.height) * h;
    page.drawImage(logo, { x: M, y: y - h + 4, width: w, height: h });
    brandX = M + w + 10;
  }
  text("Autocar Location", brandX, y - 8, 18, bold, BRAND);
  text("Transport de groupe en autocar avec chauffeur", brandX, y - 24, 9, font, GREY);

  const ref = params.ref ?? refDevis(null);
  right("DEVIS", W - M, y - 4, 20, bold, BRAND);
  right(`Réf. ${ref}`, W - M, y - 22, 9, font, GREY);
  right(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, W - M, y - 34, 9, font, GREY);

  y -= 56;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: BRAND });
  y -= 26;

  // --- À l'attention de (avec adresse de facturation si connue) ---
  if (params.nom || params.adresse) {
    text("A l'attention de", M, y, 9, bold, GREY);
    y -= 14;
    if (params.nom) {
      text(String(params.nom), M, y, 12, bold);
      y -= 14;
    }
    if (params.adresse) {
      text(String(params.adresse), M, y, 10, font, GREY);
      y -= 13;
    }
    if (params.code_postal || params.ville) {
      text(`${params.code_postal ?? ""} ${params.ville ?? ""}`.trim(), M, y, 10, font, GREY);
      y -= 13;
    }
    y -= 10;
  }

  // --- Résumé de la demande (encadré) ---
  const boxH = 84;
  page.drawRectangle({ x: M, y: y - boxH, width: W - 2 * M, height: boxH, color: LIGHT });
  text("RESUME DE LA DEMANDE", M + 12, y - 16, 9, bold, BRAND);
  const col1 = M + 12;
  const col2 = M + 270;
  const resume = (label: string, val: string, x: number, yy: number) => {
    text(label, x, yy, 8, font, GREY);
    text(val, x, yy - 13, 10, bold);
  };
  resume("Trajet", `${params.depart ?? "?"} -> ${params.destination ?? "?"}`, col1, y - 36);
  resume("Date de depart", params.date_depart ?? "-", col2, y - 36);
  resume("Type", params.aller_retour ? "Aller-retour" : "Aller simple", col1, y - 62);
  resume("Passagers", String(params.nb_passagers ?? "-"), col2, y - 62);
  y -= boxH + 30;

  // --- Prestation (version client : pas de marge ni de coefficients) ---
  text("PRESTATION", M, y, 10, bold, BRAND);
  right("MONTANT", W - M, y, 10, bold, BRAND);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: GREY });
  y -= 20;
  text("Transport de groupe en autocar avec chauffeur", M, y, 10);
  right(eur(devis.prix_ht), W - M, y, 10);
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: GREY });
  y -= 22;

  // --- Totaux ---
  text("Total HT", W - M - 200, y, 10, font, GREY);
  right(eur(devis.prix_ht), W - M, y, 10);
  y -= 16;
  text("TVA (10%)", W - M - 200, y, 10, font, GREY);
  right(eur(devis.tva), W - M, y, 10);
  y -= 26;

  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 30, color: ACCENT });
  text("TOTAL TTC", M + 12, y + 3, 13, bold, INK);
  right(eur(devis.prix_ttc), W - M - 12, y + 3, 13, bold, INK);
  y -= 60;

  // --- Signature électronique (si le devis a été accepté en ligne) ---
  if (params.signature_image && params.signe_par) {
    const sy = y - 6;
    page.drawLine({ start: { x: M, y: sy + 14 }, end: { x: W - M, y: sy + 14 }, thickness: 0.5, color: GREY });
    text("BON POUR ACCORD", M, sy, 9, bold, BRAND);
    text(`Signe par : ${params.signe_par}`, M, sy - 16, 10, bold);
    if (params.signe_le) text(`Le ${new Date(params.signe_le).toLocaleString("fr-FR")}`, M, sy - 30, 9, font, GREY);
    try {
      const b64 = params.signature_image.split(",")[1] ?? "";
      const png = await doc.embedPng(Buffer.from(b64, "base64"));
      const h = 46;
      const w = Math.min(190, (png.width / png.height) * h);
      page.drawImage(png, { x: W - M - w, y: sy - 36, width: w, height: h });
    } catch {
      /* signature best-effort */
    }
    y = sy - 48;
  }

  // --- Mentions ---
  text("Tarif sous reserve de disponibilite. Devis valable 30 jours.", M, y, 9, font, GREY);
  text("Autocar Location - intermediation transport de groupe - depuis 2010", M, y - 14, 9, font, GREY);
  if (params.signature_image)
    text("Signature electronique simple (eIDAS niveau simple) - horodatee.", M, y - 28, 8, font, GREY);

  return doc.save();
}
