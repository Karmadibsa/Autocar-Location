// Messagerie CÔTÉ ADMIN : consulter / répondre sur le fil d'une demande (HITL).
// Réservé aux comptes admin (profiles.role = 'admin'). Une réponse marque le fil
// « non lu » pour le client ; une simple consultation marque les messages comme lus
// côté admin (retire le badge du dashboard).
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getConversation, appendMessage } from "@/lib/conversation";

export async function POST(request: Request) {
  const { token, demandeId, message } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token || !demandeId) return Response.json({ ok: false, reason: "bad_request" }, { status: 401 });

  const { data: u } = await sb.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const { data: dem } = await sb.from("demandes").select("id, client_id").eq("id", demandeId).maybeSingle();
  if (!dem) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });

  const conv = await getConversation(sb, demandeId, dem.client_id);
  const txt = typeof message === "string" ? message.trim() : "";

  if (txt) {
    conv.messages = await appendMessage(sb, conv, "admin", txt);
    await sb.from("demandes").update({ msg_non_lu_client: true, msg_non_lu_admin: false }).eq("id", demandeId);
  } else {
    // Consultation seule : l'admin a vu les messages du client (retire le badge).
    await sb.from("demandes").update({ msg_non_lu_admin: false }).eq("id", demandeId);
  }

  return Response.json({ ok: true, messages: conv.messages });
}
