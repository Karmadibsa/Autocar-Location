// Génère un PDF de devis NeoTravel (pdf-lib, pur JS).
// On évite les glyphes non WinAnsi (→, €) : on écrit "->" et "EUR".
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
};

const BRAND = rgb(0.054, 0.478, 0.4);
const INK = rgb(0.08, 0.125, 0.114);
const GREY = rgb(0.36, 0.42, 0.4);

export async function buildDevisPdf(devis: DevisPdf, params: ParamsPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595;
  const M = 50;
  let y = 790;

  const text = (s: string, x: number, yy: number, size = 11, f = font, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });
  const eur = (n?: number) => `${(n ?? 0).toFixed(2)} EUR`;

  // En-tête
  text("NeoTravel", M, y, 22, bold, BRAND);
  text("Transport de groupe en autocar", M, y - 16, 10, font, GREY);
  text("DEVIS", W - M - 70, y, 20, bold, BRAND);
  y -= 50;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: BRAND });
  y -= 30;

  // Infos client / trajet
  if (params.nom) {
    text("A l'attention de :", M, y, 10, bold);
    text(String(params.nom), M + 95, y, 10);
    y -= 18;
  }
  const trajet = `${params.depart ?? "?"} -> ${params.destination ?? "?"}`;
  text("Trajet :", M, y, 10, bold);
  text(trajet, M + 95, y, 10);
  y -= 18;
  text("Date :", M, y, 10, bold);
  text(`${params.date_depart ?? "-"}${params.aller_retour ? " (aller/retour)" : ""}`, M + 95, y, 10);
  y -= 18;
  text("Passagers :", M, y, 10, bold);
  text(String(params.nb_passagers ?? "-"), M + 95, y, 10);
  y -= 35;

  // Prestation (version client : pas de marge ni de coefficients)
  text("Prestation", M, y, 11, bold, BRAND);
  text("Montant", W - M - 80, y, 11, bold, BRAND);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: GREY });
  y -= 18;
  text("Transport de groupe en autocar avec chauffeur", M, y, 10);
  text(eur(devis.prix_ht), W - M - 80, y, 10);
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: GREY });
  y -= 22;
  text("Total HT", W - M - 200, y, 10, font, GREY);
  text(eur(devis.prix_ht), W - M - 80, y, 10);
  y -= 16;
  text("TVA (10%)", W - M - 200, y, 10, font, GREY);
  text(eur(devis.tva), W - M - 80, y, 10);
  y -= 24;

  // Total TTC mis en avant
  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 28, color: rgb(0.776, 0.949, 0.306) });
  text("TOTAL TTC", M + 10, y + 2, 13, bold, INK);
  text(eur(devis.prix_ttc), W - M - 110, y + 2, 13, bold, INK);
  y -= 60;

  // Mentions
  text("Tarif sous reserve de disponibilite. Devis genere automatiquement.", M, y, 9, font, GREY);
  text("NeoTravel - intermediation transport de groupe - depuis 2010", M, y - 14, 9, font, GREY);

  return doc.save();
}
