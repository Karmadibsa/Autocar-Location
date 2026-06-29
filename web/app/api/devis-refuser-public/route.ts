// Refus d'un devis SANS compte, via le token unique reçu par email (capability).
// Le token (UUID non devinable) tient lieu d'autorisation. N'accepte jamais ici :
// accepter exige un compte (traçabilité), refuser doit rester sans friction.
import { getAdminClient } from "@/lib/supabaseAdmin";
import { devisRefusCourtoisieHtml } from "@/lib/emailDevis";
import { envoyerEmail } from "@/lib/mailer";
import { formatNomComplet } from "@/lib/noms";

export async function POST(request: Request) {
  const { token, raisons } = await request.json().catch(() => ({}));
  const raisonRefus = Array.isArray(raisons) ? raisons.filter((r) => typeof r === "string").join(", ") : null;
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const { data: d } = await sb
    .from("devis")
    .select("id, demande_id, statut, client_id")
    .eq("token", token)
    .maybeSingle();
  if (!d) return Response.json({ ok: false, reason: "introuvable" }, { status: 404 });

  // Idempotent : si déjà refusé, on renvoie ok ; sinon on n'agit que sur un devis actif.
  if (d.statut === "refuse") return Response.json({ ok: true, deja: true });
  if (d.statut !== "envoye") return Response.json({ ok: false, reason: "non_modifiable" }, { status: 409 });

  await sb.from("devis").update({ statut: "refuse", prochaine_relance: null, raison_refus: raisonRefus }).eq("id", d.id);
  await sb.from("demandes").update({ statut: "refuse" }).eq("id", d.demande_id);

  // Email de courtoisie (best-effort) si on connaît le client.
  if (d.client_id) {
    const [{ data: dem }, { data: c }] = await Promise.all([
      sb.from("demandes").select("depart, destination, date_depart, nb_passagers, aller_retour").eq("id", d.demande_id).maybeSingle(),
      sb.from("clients").select("email, prenom, nom").eq("id", d.client_id).maybeSingle(),
    ]);
    if (c?.email) {
      await envoyerEmail(
        c.email,
        "Merci pour votre intérêt — Autocar Location",
        devisRefusCourtoisieHtml({
          depart: dem?.depart,
          destination: dem?.destination,
          date_depart: dem?.date_depart,
          nb_passagers: dem?.nb_passagers,
          aller_retour: dem?.aller_retour,
          nom: formatNomComplet(c.prenom, c.nom),
        }),
      );
    }
  }
  return Response.json({ ok: true });
}
