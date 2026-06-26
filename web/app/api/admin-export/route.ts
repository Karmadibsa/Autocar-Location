// Export PDF des statistiques du dashboard (admin uniquement).
import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildStatsPdf, type Stats } from "@/lib/statsPdf";

export async function POST(request: Request) {
  const { token, data } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return new Response("Requête invalide", { status: 400 });

  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user?.id) return new Response("Non authentifié", { status: 401 });
  const { data: p } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  if (p?.role !== "admin") return new Response("Accès refusé", { status: 403 });

  const pdf = await buildStatsPdf((data ?? {}) as Stats);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="statistiques-autocar-location.pdf"',
    },
  });
}
