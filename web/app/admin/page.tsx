"use client";

// Dashboard (protégé) : connexion requise + rôle admin, sinon redirection.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";

type DemandeRow = {
  id: string;
  depart: string | null;
  destination: string | null;
  nb_passagers: number | null;
  statut: string;
  created_at: string;
  devis?: { prix_ttc: number | null }[];
};
type Data = {
  ok: boolean;
  leads?: number;
  envoyes?: number;
  acceptes?: number;
  conversion?: number;
  demandes?: DemandeRow[];
};

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="text-2xl font-bold text-[var(--brand)]">{value}</div>
      <div className="text-sm text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [data, setData] = useState<Data | null>(null);

  // Gardes de route
  useEffect(() => {
    if (loading) return;
    if (!email) router.replace("/login");
    else if (role !== "admin") router.replace("/espace-client");
  }, [loading, email, role, router]);

  // Données du dashboard
  useEffect(() => {
    if (!session || role !== "admin") return;
    fetch("/api/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    })
      .then((r) => r.json())
      .then(setData);
  }, [session, role]);

  if (loading || role !== "admin") {
    return <main className="mx-auto max-w-md p-8 text-[var(--ink-soft)]">Chargement…</main>;
  }

  const demandes = data?.demandes ?? [];
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pilotage commercial</h1>
        <button onClick={() => supabase?.auth.signOut()} className="text-sm text-[var(--ink-soft)] underline">
          Déconnexion
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Leads reçus" value={data?.leads ?? 0} />
        <Kpi label="Devis envoyés" value={data?.envoyes ?? 0} />
        <Kpi label="Devis acceptés" value={data?.acceptes ?? 0} />
        <Kpi label="Taux de conversion" value={`${data?.conversion ?? 0} %`} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Dernières demandes</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-muted)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-3 py-2">Trajet</th>
              <th className="px-3 py-2">Pax</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => (
              <tr key={d.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-medium">
                  {d.depart ?? "?"} → {d.destination ?? "?"}
                </td>
                <td className="px-3 py-2">{d.nb_passagers ?? "—"}</td>
                <td className="px-3 py-2 font-semibold text-[var(--brand)]">
                  {d.devis?.[0]?.prix_ttc != null ? `${d.devis[0].prix_ttc.toFixed(2)} €` : "—"}
                </td>
                <td className="px-3 py-2">
                  <StatutBadge statut={d.statut} />
                </td>
                <td className="px-3 py-2 text-[var(--ink-soft)]">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {demandes.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-[var(--ink-soft)]" colSpan={5}>
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
