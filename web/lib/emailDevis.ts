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
const dateFrEmail = (s?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (s ?? "—");
};

/**
 * Email de **courtoisie** envoyé quand le client refuse un devis : on remercie,
 * on reste positif et on invite à revenir. (Scénario « Devis refusé » du brief.)
 */
export function devisRefusCourtoisieHtml(params: EmailParams): string {
  const trajet = `${params.depart ?? "?"} &rarr; ${params.destination ?? "?"}`;
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#14201d;max-width:560px;margin:auto;background:#ffffff">
    <div style="padding:18px 22px;border:1px solid #e3e8e6;border-bottom:3px solid ${BRAND};border-radius:12px 12px 0 0">
      <img src="${base}/logo.png" alt="" width="42" height="29" style="vertical-align:middle;margin-right:8px" />
      <span style="font-size:18px;font-weight:bold;color:${BRAND};vertical-align:middle">Autocar Location</span>
    </div>
    <div style="border:1px solid #e3e8e6;border-top:none;border-radius:0 0 12px 12px;padding:22px">
      <h2 style="margin:0 0 6px;color:${BRAND};font-size:18px">Merci pour votre intérêt</h2>
      <p style="margin:0 0 14px;font-size:14px">
        ${params.nom ? `Bonjour ${params.nom},<br/>` : ""}
        Nous avons bien noté que notre proposition pour le trajet <b>${trajet}</b> ne vous convient pas cette fois-ci.
        Nous vous remercions sincèrement d'avoir pensé à nous.
      </p>
      <p style="margin:0 0 14px;font-size:14px">
        Votre projet reste le bienvenu : n'hésitez pas à revenir vers nous, ce sera avec grand plaisir.
        Nous adaptons volontiers nos offres (dates, options, capacité) pour mieux coller à vos besoins.
      </p>
      <div style="text-align:center;margin-top:20px">
        <a href="${base}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;font-size:14px">
          Demander un nouveau devis
        </a>
      </div>
      <p style="color:#8a958f;font-size:11px;margin-top:18px">
        À très bientôt — l'équipe Autocar Location.
      </p>
    </div>
  </div>`;
}

function ligneResume(label: string, valeur: string) {
  return `<tr>
    <td style="padding:3px 0;color:#5c6b66;font-size:13px">${label}</td>
    <td style="padding:3px 0;text-align:right;font-size:13px;color:#14201d">${valeur}</td>
  </tr>`;
}

/**
 * Construit le HTML de l'email de devis (vue client : résumé + HT/TVA/TTC + boutons).
 * @param opts.refuseToken - Si fourni, ajoute le lien « refuser sans compte ».
 */
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
  <div style="font-family:Arial,Helvetica,sans-serif;color:#14201d;max-width:560px;margin:auto;background:#ffffff">
    <div style="padding:18px 22px;border:1px solid #e3e8e6;border-bottom:3px solid ${BRAND};border-radius:12px 12px 0 0">
      <img src="${base}/logo.png" alt="" width="42" height="29" style="vertical-align:middle;margin-right:8px" />
      <span style="font-size:18px;font-weight:bold;color:${BRAND};vertical-align:middle">Autocar Location</span>
      <div style="font-size:12px;color:#8a958f;margin-top:6px">Transport de groupe en autocar avec chauffeur</div>
    </div>
    <div style="border:1px solid #e3e8e6;border-top:none;border-radius:0 0 12px 12px;padding:22px">
      <h2 style="margin:0 0 6px;color:${BRAND};font-size:18px">${titre}</h2>
      <p style="margin:0 0 16px;font-size:14px">${params.nom ? `Bonjour ${params.nom},<br/>` : ""}${intro}</p>

      <div style="background:#f4f7f6;border-radius:10px;padding:12px 14px;margin-bottom:16px">
        <div style="font-weight:bold;font-size:13px;margin-bottom:6px">Résumé de la demande</div>
        <table style="width:100%;border-collapse:collapse">
          ${ligneResume("Trajet", trajet)}
          ${ligneResume("Date de départ", dateFrEmail(params.date_depart))}
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

      <div style="text-align:center;margin-top:22px">
        <a href="${base}/devis/accepter?token=${opts.refuseToken ?? ""}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;font-size:14px;margin:4px">
          Accepter le devis
        </a>
        ${
          opts.refuseToken
            ? `<a href="${base}/devis/refuser?token=${opts.refuseToken}" style="display:inline-block;background:#ffffff;color:#A12B2B;text-decoration:none;padding:11px 20px;border-radius:999px;font-weight:bold;font-size:14px;border:1px solid #A12B2B;margin:4px">
                 Refuser le devis
               </a>`
            : ""
        }
        <p style="color:#8a958f;font-size:11px;margin-top:10px">« Accepter » vous connecte (ou crée votre compte). « Refuser » se fait en un clic, sans compte.</p>
      </div>

      <p style="color:#8a958f;font-size:11px;margin-top:18px">
        Tarif sous réserve de disponibilité. Le devis détaillé est en pièce jointe (PDF).<br/>
        Autocar Location — intermédiation transport de groupe.
      </p>
    </div>
  </div>`;
}
