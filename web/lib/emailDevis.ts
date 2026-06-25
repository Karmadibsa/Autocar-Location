// Gabarit HTML d'email pour les devis (envoi initial + relances).
// Vue CLIENT uniquement : prestation + TVA + TTC, jamais la marge/les coefficients.
const BRAND = "#0e7a66";
const ACCENT = "#c6f24e";

type EmailDevis = { prix_ht?: number | null; tva?: number | null; prix_ttc?: number | null; devise?: string | null };
type EmailParams = {
  depart?: string | null;
  destination?: string | null;
  date_depart?: string | null;
  nb_passagers?: number | null;
  aller_retour?: boolean | null;
  nom?: string | null;
};

const eur = (n?: number | null) => `${(n ?? 0).toFixed(2)} €`;

function ligneResume(label: string, valeur: string) {
  return `<tr>
    <td style="padding:3px 0;color:#5c6b66;font-size:13px">${label}</td>
    <td style="padding:3px 0;text-align:right;font-size:13px;color:#14201d">${valeur}</td>
  </tr>`;
}

export function devisEmailHtml(
  devis: EmailDevis,
  params: EmailParams,
  opts: { titre?: string; intro?: string; refuseToken?: string } = {},
): string {
  const titre = opts.titre ?? "Votre devis";
  const intro = opts.intro ?? "Voici le récapitulatif de votre demande de transport de groupe.";
  const trajet = `${params.depart ?? "?"} &rarr; ${params.destination ?? "?"}`;
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#14201d;max-width:560px;margin:auto">
    <div style="background:${BRAND};color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
      <div style="font-size:18px;font-weight:bold">Autocar Location</div>
      <div style="font-size:12px;opacity:.85">Transport de groupe en autocar avec chauffeur</div>
    </div>
    <div style="border:1px solid #e3e8e6;border-top:none;border-radius:0 0 12px 12px;padding:22px">
      <h2 style="margin:0 0 6px;color:${BRAND};font-size:18px">${titre}</h2>
      <p style="margin:0 0 16px;font-size:14px">${params.nom ? `Bonjour ${params.nom},<br/>` : ""}${intro}</p>

      <div style="background:#f4f7f6;border-radius:10px;padding:12px 14px;margin-bottom:16px">
        <div style="font-weight:bold;font-size:13px;margin-bottom:6px">Résumé de la demande</div>
        <table style="width:100%;border-collapse:collapse">
          ${ligneResume("Trajet", trajet)}
          ${ligneResume("Date de départ", params.date_depart ?? "—")}
          ${ligneResume("Type", params.aller_retour ? "Aller-retour" : "Aller simple")}
          ${ligneResume("Passagers", String(params.nb_passagers ?? "—"))}
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0">Transport de groupe en autocar avec chauffeur</td><td style="padding:6px 0;text-align:right">${eur(devis.prix_ht)}</td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #eee">Total HT</td><td style="padding:6px 0;text-align:right;border-top:1px solid #eee">${eur(devis.prix_ht)}</td></tr>
        <tr><td style="padding:6px 0">TVA (10 %)</td><td style="padding:6px 0;text-align:right">${eur(devis.tva)}</td></tr>
      </table>

      <div style="background:${ACCENT};border-radius:10px;padding:12px 14px;margin-top:12px;font-weight:bold;display:flex;justify-content:space-between">
        <span>TOTAL TTC</span><span>${(devis.prix_ttc ?? 0).toFixed(2)} ${devis.devise ?? "EUR"}</span>
      </div>

      <div style="text-align:center;margin-top:20px">
        <a href="${base}/espace-client" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:14px">
          Créer mon compte / Accepter le devis
        </a>
        <p style="color:#8a958f;font-size:11px;margin-top:8px">Créez un compte (ou connectez-vous) avec cet email pour accepter votre devis.</p>
        ${
          opts.refuseToken
            ? `<p style="margin-top:14px;font-size:13px">Pas intéressé ?
                 <a href="${base}/devis/refuser?token=${opts.refuseToken}" style="color:#A12B2B;text-decoration:underline">Refuser ce devis</a>
                 (sans créer de compte).</p>`
            : ""
        }
      </div>

      <p style="color:#8a958f;font-size:11px;margin-top:18px">
        Tarif sous réserve de disponibilité. Le devis détaillé est en pièce jointe (PDF).<br/>
        Autocar Location — intermédiation transport de groupe.
      </p>
    </div>
  </div>`;
}
