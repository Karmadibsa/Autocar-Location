// Données du dashboard — réservées aux comptes admin (profiles.role = 'admin').
// Renvoie KPIs, catégories opérationnelles (à traiter / en attente / gagnés / perdus)
// et les demandes récentes avec le DÉTAIL COMPLET du devis (vue pro).
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token, from, to } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "no_config" }, { status: 401 });

  const { data: userData } = await sb.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });

  // Fenêtre temporelle (optionnelle) appliquée sur created_at.
  const fromISO = from ? new Date(from).toISOString() : null;
  const toISO = to ? new Date(to + "T23:59:59").toISOString() : null;
  type Q = { gte: (c: string, v: string) => Q; lte: (c: string, v: string) => Q };
  const range = <T extends Q>(q: T): T => {
    let r = q;
    if (fromISO) r = r.gte("created_at", fromISO) as T;
    if (toISO) r = r.lte("created_at", toISO) as T;
    return r;
  };

  const [demStatutsRes, devisRes, recentRes, refusRes] = await Promise.all([
    range(sb.from("demandes").select("statut, created_at")),
    range(sb.from("devis").select("statut, created_at")),
    range(
      sb
        .from("demandes")
        .select(
          "id, depart, destination, date_depart, aller_retour, distance_km, nb_passagers, urgence, commentaire, statut, created_at, clients(email, prenom, nom, telephone), devis(prix_ht, tva, prix_ttc, lignes, coefficients, statut, nb_relances, prochaine_relance, raison_refus)",
        ),
    )
      .order("created_at", { ascending: false })
      .limit(20),
    range(sb.from("devis").select("raison_refus, created_at").not("raison_refus", "is", null)),
  ]);

  const demStatuts = (demStatutsRes.data ?? []) as { statut: string; created_at: string }[];
  const devis = (devisRes.data ?? []) as { statut: string; created_at: string }[];

  // Motifs de refus (un devis peut en cocher plusieurs).
  const raisonsRefus: Record<string, number> = {};
  for (const row of (refusRes.data ?? []) as { raison_refus: string | null }[]) {
    for (const r of (row.raison_refus ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
      raisonsRefus[r] = (raisonsRefus[r] ?? 0) + 1;
    }
  }

  const leads = demStatuts.length;
  const envoyes = devis.filter((d) => d.statut === "envoye").length;
  const acceptes = devis.filter((d) => d.statut === "accepte").length;
  const conversion = devis.length ? Math.round((acceptes / devis.length) * 100) : 0;
  const statuts = demStatuts.map((s) => s.statut);
  const has = (...arr: string[]) => statuts.filter((s) => arr.includes(s)).length;

  // Série mensuelle (vision sur la période / l'année) : leads + devis acceptés par mois.
  const fin = toISO ? new Date(toISO) : new Date();
  const debut = fromISO ? new Date(fromISO) : new Date(fin.getFullYear(), fin.getMonth() - 11, 1);
  const mois: string[] = [];
  for (let c = new Date(debut.getFullYear(), debut.getMonth(), 1); c <= fin && mois.length < 60; c = new Date(c.getFullYear(), c.getMonth() + 1, 1)) {
    mois.push(`${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}`);
  }
  const idx = Object.fromEntries(mois.map((m, i) => [m, i]));
  const leadsMois = mois.map(() => 0);
  const acceptesMois = mois.map(() => 0);
  for (const d of demStatuts) {
    const m = (d.created_at ?? "").slice(0, 7);
    if (m in idx) leadsMois[idx[m]] += 1;
  }
  for (const v of devis) {
    if (v.statut !== "accepte") continue;
    const m = (v.created_at ?? "").slice(0, 7);
    if (m in idx) acceptesMois[idx[m]] += 1;
  }
  const parMois = mois.map((m, i) => ({ mois: m, leads: leadsMois[i], acceptes: acceptesMois[i] }));

  return Response.json({
    ok: true,
    leads,
    envoyes,
    acceptes,
    conversion,
    categories: {
      aTraiter: has("cas_complexe"),
      enAttente: has("devis_envoye", "relance_1", "relance_2"),
      gagnes: has("accepte"),
      perdus: has("refuse", "cloture"),
    },
    demandes: recentRes.data ?? [],
    raisonsRefus,
    parMois,
    periode: { from: from ?? null, to: to ?? null },
  });
}
