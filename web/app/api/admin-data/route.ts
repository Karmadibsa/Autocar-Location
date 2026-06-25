// Données du dashboard — réservées aux comptes admin (profiles.role = 'admin').
// Vérifie le token + le rôle, puis renvoie les KPI et les dernières demandes.
import { getAdminClient } from "@/lib/supabaseAdmin";

type DevisRow = { statut: string };
type DemandeRow = {
  id: string;
  depart: string | null;
  destination: string | null;
  nb_passagers: number | null;
  statut: string;
  created_at: string;
};

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "no_config" }, { status: 401 });

  const { data: userData } = await sb.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const [{ count: leads }, devisRes, demandesRes] = await Promise.all([
    sb.from("demandes").select("*", { count: "exact", head: true }),
    sb.from("devis").select("statut"),
    sb
      .from("demandes")
      .select("id, depart, destination, nb_passagers, statut, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const devis = (devisRes.data ?? []) as DevisRow[];
  const demandes = (demandesRes.data ?? []) as DemandeRow[];
  const envoyes = devis.filter((d) => d.statut === "envoye").length;
  const acceptes = devis.filter((d) => d.statut === "accepte").length;
  const conversion = devis.length ? Math.round((acceptes / devis.length) * 100) : 0;

  return Response.json({
    ok: true,
    leads: leads ?? 0,
    envoyes,
    acceptes,
    conversion,
    demandes,
  });
}
