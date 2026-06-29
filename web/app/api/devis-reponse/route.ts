// Réponse du CLIENT à son propre devis : accepter ou refuser.
// Le client envoie son token ; on vérifie qu'il est bien propriétaire du devis
// et que celui-ci est encore en attente. Met à jour devis + demande, stoppe les relances.
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token, id, reponse, raisons, signature, signePar, cgv } = await request.json().catch(() => ({}));
  const raisonRefus = Array.isArray(raisons) ? raisons.filter((r) => typeof r === "string").join(", ") : null;
  const sb = getAdminClient();
  if (!sb || !token || !id) return Response.json({ ok: false, reason: "bad_request" }, { status: 401 });
  if (reponse !== "accepte" && reponse !== "refuse")
    return Response.json({ ok: false, reason: "bad_reponse" }, { status: 400 });

  // Acceptation = signature électronique simple : nom + tracé + CGV obligatoires.
  const sig = typeof signature === "string" && signature.startsWith("data:image") ? signature : null;
  const nomSignataire = typeof signePar === "string" ? signePar.trim() : "";
  if (reponse === "accepte" && (!cgv || !sig || !nomSignataire)) {
    return Response.json({ ok: false, reason: "signature_requise" }, { status: 400 });
  }

  const { data: u } = await sb.auth.getUser(token);
  const email = u?.user?.email;
  if (!email) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const { data: client } = await sb.from("clients").select("id").eq("email", email).maybeSingle();
  if (!client) return Response.json({ ok: false, reason: "no_client" }, { status: 403 });

  // Le devis doit appartenir au client connecté ET être encore en attente.
  const { data: d } = await sb
    .from("devis")
    .select("id, demande_id, statut, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!d || d.client_id !== client.id) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  if (d.statut !== "envoye") return Response.json({ ok: false, reason: "deja_traite" }, { status: 409 });

  await sb
    .from("devis")
    .update({
      statut: reponse,
      prochaine_relance: null,
      ...(reponse === "refuse" ? { raison_refus: raisonRefus } : {}),
      ...(reponse === "accepte"
        ? { signature_image: sig, signe_par: nomSignataire, signe_le: new Date().toISOString(), cgv_acceptees: true }
        : {}),
    })
    .eq("id", id);
  await sb.from("demandes").update({ statut: reponse }).eq("id", d.demande_id);
  return Response.json({ ok: true, statut: reponse });
}
