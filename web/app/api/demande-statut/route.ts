// Action humaine (admin) sur une demande : marquer gagné / perdu / pris en charge.
// C'est le levier "intervention humaine" (HITL) du pilotage commercial.
import { getAdminClient } from "@/lib/supabaseAdmin";

const ALLOWED = ["accepte", "refuse", "qualifiee", "cloture"] as const;
type Statut = (typeof ALLOWED)[number];

export async function POST(request: Request) {
  const { token, id, statut } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token || !id) return Response.json({ ok: false, reason: "bad_request" }, { status: 401 });

  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user?.id) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const { data: p } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (p?.role !== "admin") return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  if (!ALLOWED.includes(statut as Statut))
    return Response.json({ ok: false, reason: "bad_statut" }, { status: 400 });

  await sb.from("demandes").update({ statut }).eq("id", id);
  // Le devis lié suit l'issue commerciale et on stoppe les relances.
  if (statut === "accepte" || statut === "refuse") {
    await sb.from("devis").update({ statut, prochaine_relance: null }).eq("demande_id", id);
  }
  return Response.json({ ok: true });
}
