// Données du dashboard — réservées aux comptes admin (profiles.role = 'admin').
// Renvoie KPIs, catégories opérationnelles (à traiter / en attente / gagnés / perdus)
// et les demandes récentes avec le DÉTAIL COMPLET du devis (vue pro).
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "no_config" }, { status: 401 });

  const { data: userData } = await sb.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });

  const [{ count: leads }, devisRes, recentRes, statutsRes] = await Promise.all([
    sb.from("demandes").select("*", { count: "exact", head: true }),
    sb.from("devis").select("statut"),
    sb
      .from("demandes")
      .select(
        "id, depart, destination, date_depart, aller_retour, distance_km, nb_passagers, urgence, commentaire, statut, created_at, clients(email, prenom, nom), devis(prix_ht, tva, prix_ttc, lignes, coefficients, statut, nb_relances, prochaine_relance)",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    sb.from("demandes").select("statut"),
  ]);

  const devis = (devisRes.data ?? []) as { statut: string }[];
  const envoyes = devis.filter((d) => d.statut === "envoye").length;
  const acceptes = devis.filter((d) => d.statut === "accepte").length;
  const conversion = devis.length ? Math.round((acceptes / devis.length) * 100) : 0;

  const statuts = (statutsRes.data ?? []).map((s: { statut: string }) => s.statut);
  const has = (...arr: string[]) => statuts.filter((s) => arr.includes(s)).length;

  return Response.json({
    ok: true,
    leads: leads ?? 0,
    envoyes,
    acceptes,
    conversion,
    categories: {
      aTraiter: has("cas_complexe"), // intervention humaine (HITL)
      enAttente: has("devis_envoye", "relance_1", "relance_2"), // automatisé : relances en cours
      gagnes: has("accepte"),
      perdus: has("refuse", "cloture"),
    },
    demandes: recentRes.data ?? [],
  });
}
