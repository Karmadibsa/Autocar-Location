// Messagerie CÔTÉ CLIENT : consulter / ajouter un message sur le fil d'un devis.
// Le client envoie son token ; on vérifie qu'il est propriétaire du devis. Un envoi
// marque le fil « non lu » pour l'admin (HITL) ; une simple consultation marque les
// messages comme lus côté client.
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getConversation, appendMessage } from "@/lib/conversation";

export async function POST(request: Request) {
  const { token, id, message } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token || !id) return Response.json({ ok: false, reason: "bad_request" }, { status: 401 });

  const { data: u } = await sb.auth.getUser(token);
  const email = u?.user?.email;
  if (!email) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const { data: client } = await sb.from("clients").select("id").eq("email", email).maybeSingle();
  if (!client) return Response.json({ ok: false, reason: "no_client" }, { status: 403 });

  // Le devis doit appartenir au client connecté.
  const { data: d } = await sb.from("devis").select("id, demande_id, client_id").eq("id", id).maybeSingle();
  if (!d || d.client_id !== client.id) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const conv = await getConversation(sb, d.demande_id, client.id);
  const txt = typeof message === "string" ? message.trim() : "";

  if (txt) {
    conv.messages = await appendMessage(sb, conv, "user", txt);
    await sb.from("demandes").update({ msg_non_lu_admin: true, msg_non_lu_client: false }).eq("id", d.demande_id);
  } else {
    // Consultation seule : le client a vu les éventuelles réponses de l'admin.
    await sb.from("demandes").update({ msg_non_lu_client: false }).eq("id", d.demande_id);
  }

  return Response.json({ ok: true, messages: conv.messages });
}
