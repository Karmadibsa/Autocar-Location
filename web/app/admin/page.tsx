// Dashboard de pilotage (protégé en pratique par l'auth admin / RLS).
// Lit Supabase côté serveur via la service role key.
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type DevisRow = { statut: string; prix_ttc: number | null };
type DemandeRow = {
  id: string;
  depart: string | null;
  destination: string | null;
  nb_passagers: number | null;
  statut: string;
  created_at: string;
};

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="text-2xl font-bold text-[var(--brand)]">{value}</div>
      <div className="text-sm text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}

export default async function AdminPage() {
  const sb = getAdminClient();

  if (!sb) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Dashboard — configuration requise</h1>
        <p className="mt-3 text-[var(--ink-soft)]">
          Renseigne <code>NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> dans <code>web/.env.local</code>{" "}
          (voir <code>GUIDE_INSTALLATION.md</code>), puis recharge.
        </p>
      </main>
    );
  }

  const [{ count: leads }, devisRes, demandesRes] = await Promise.all([
    sb.from("demandes").select("*", { count: "exact", head: true }),
    sb.from("devis").select("statut, prix_ttc"),
    sb
      .from("demandes")
      .select("id, depart, destination, nb_passagers, statut, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const devis = (devisRes.data ?? []) as DevisRow[];
  const demandes = (demandesRes.data ?? []) as DemandeRow[];
  const envoyes = devis.filter((d) => d.statut === "envoye").length;
  const acceptes = devis.filter((d) => d.statut === "accepte").length;
  const conversion = devis.length
    ? Math.round((acceptes / devis.length) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Pilotage commercial</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Leads reçus" value={leads ?? 0} />
        <Kpi label="Devis envoyés" value={envoyes} />
        <Kpi label="Devis acceptés" value={acceptes} />
        <Kpi label="Taux de conversion" value={`${conversion} %`} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Dernières demandes</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-muted)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-3 py-2">Trajet</th>
              <th className="px-3 py-2">Pax</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  {d.depart ?? "?"} → {d.destination ?? "?"}
                </td>
                <td className="px-3 py-2">{d.nb_passagers ?? "—"}</td>
                <td className="px-3 py-2">{d.statut}</td>
                <td className="px-3 py-2">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {demandes.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-[var(--ink-soft)]" colSpan={4}>
                  Aucune demande pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
