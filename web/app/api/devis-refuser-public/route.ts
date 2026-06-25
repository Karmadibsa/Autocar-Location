// Refus d'un devis SANS compte, via le token unique reçu par email (capability).
// Le token (UUID non devinable) tient lieu d'autorisation. N'accepte jamais ici :
// accepter exige un compte (traçabilité), refuser doit rester sans friction.
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const { data: d } = await sb
    .from("devis")
    .select("id, demande_id, statut")
    .eq("token", token)
    .maybeSingle();
  if (!d) return Response.json({ ok: false, reason: "introuvable" }, { status: 404 });

  // Idempotent : si déjà refusé, on renvoie ok ; sinon on n'agit que sur un devis actif.
  if (d.statut === "refuse") return Response.json({ ok: true, deja: true });
  if (d.statut !== "envoye") return Response.json({ ok: false, reason: "non_modifiable" }, { status: 409 });

  await sb.from("devis").update({ statut: "refuse", prochaine_relance: null }).eq("id", d.id);
  await sb.from("demandes").update({ statut: "refuse" }).eq("id", d.demande_id);
  return Response.json({ ok: true });
}
