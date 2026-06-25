// Devis SUR-MESURE saisi par un commercial (cas complexe étudié à la main).
// Crée le devis pour la demande, la fait rejoindre le pipeline (devis_envoye),
// envoie l'email au client si son adresse est connue, et programme les relances.
import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildDevisPdf, refDevis } from "@/lib/devisPdf";
import { devisEmailHtml } from "@/lib/emailDevis";
import { estUrgent, prochaineRelance } from "@/lib/relances";

export async function POST(request: Request) {
  const { token, demande_id, prix_ht } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token || !demande_id) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const ht = Number(prix_ht);
  if (!Number.isFinite(ht) || ht <= 0) return Response.json({ ok: false, reason: "prix_invalide" }, { status: 400 });

  // Autorisation admin
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user?.id) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const { data: p } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (p?.role !== "admin") return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const { data: demande } = await sb.from("demandes").select("*").eq("id", demande_id).maybeSingle();
  if (!demande) return Response.json({ ok: false, reason: "demande_introuvable" }, { status: 404 });

  const tva = Math.round(ht * 0.1 * 100) / 100;
  const ttc = Math.round((ht + tva) * 100) / 100;
  const urgent = demande.urgence === "urgent" || estUrgent(demande.date_depart);

  // Crée (ou remplace) le devis pour cette demande
  const devisRow = {
    id: demande_id,
    demande_id,
    client_id: demande.client_id,
    prix_ht: ht,
    tva,
    prix_ttc: ttc,
    devise: "EUR",
    lignes: [{ libelle: "Devis sur-mesure (étude commerciale)", montant: ht }],
    coefficients: [],
    statut: "envoye",
    date_envoi: new Date().toISOString(),
    prochaine_relance: prochaineRelance(urgent, 0),
    nb_relances: 0,
  };
  await sb.from("devis").upsert(devisRow);
  await sb.from("demandes").update({ statut: "devis_envoye" }).eq("id", demande_id);

  // Email au client si on connaît son adresse
  if (demande.client_id) {
    const { data: c } = await sb.from("clients").select("email, prenom, nom").eq("id", demande.client_id).maybeSingle();
    if (c?.email && process.env.RESEND_API_KEY) {
      const params = {
        depart: demande.depart,
        destination: demande.destination,
        date_depart: demande.date_depart,
        nb_passagers: demande.nb_passagers,
        aller_retour: demande.aller_retour,
        nom: [c.prenom, c.nom].filter(Boolean).join(" ") || null,
        ref: refDevis(demande_id),
      };
      const html = devisEmailHtml(devisRow, params, {
        titre: "Votre devis sur-mesure",
        intro: "Après étude de votre demande par un conseiller, voici votre devis personnalisé.",
      });
      let attachments;
      try {
        const pdf = await buildDevisPdf(devisRow, params);
        attachments = [{ filename: "devis-autocar-location.pdf", content: Buffer.from(pdf).toString("base64") }];
      } catch {
        /* PDF best-effort */
      }
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: c.email,
            subject: "Votre devis sur-mesure Autocar Location",
            html,
            attachments,
          }),
        });
      } catch {
        /* email best-effort */
      }
    }
  }

  return Response.json({ ok: true, prix_ttc: ttc });
}
