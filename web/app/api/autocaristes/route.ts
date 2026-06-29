// Annuaire des autocaristes partenaires — réservé aux comptes admin.
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "no_config" }, { status: 401 });

  const { data: u } = await sb.auth.getUser(token);
  const uid = u?.user?.id;
  if (!uid) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const { data } = await sb
    .from("autocaristes")
    .select("*")
    .order("actif", { ascending: false })
    .order("note", { ascending: false });

  return Response.json({ ok: true, autocaristes: data ?? [] });
}
