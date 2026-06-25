"use client";

// Dashboard (protégé admin) : KPIs + vue opérationnelle (à traiter / en attente /
// gagnés / perdus) + table avec le détail COMPLET du devis (vue pro).
import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";
import Spinner from "@/app/components/Spinner";

type DevisFull = {
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  lignes: { libelle: string; montant: number }[] | null;
  coefficients: { libelle: string; valeur: number }[] | null;
  statut: string;
  nb_relances: number | null;
  prochaine_relance: string | null;
};
type DemandeRow = {
  id: string;
  depart: string | null;
  destination: string | null;
  nb_passagers: number | null;
  statut: string;
  created_at: string;
  devis: DevisFull[];
};
type Data = {
  ok: boolean;
  leads?: number;
  envoyes?: number;
  acceptes?: number;
  conversion?: number;
  categories?: { aTraiter: number; enAttente: number; gagnes: number; perdus: number };
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

function Cat({ label, value, note, accent }: { label: string; value: number; note: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${accent && value > 0 ? "border-[#E08A1E] bg-[#FDF4E6]" : "border-[var(--border)] bg-white"}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-[var(--ink-soft)]">{note}</div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [relanceMsg, setRelanceMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!email) router.replace("/login");
    else if (role !== "admin") router.replace("/espace-client");
  }, [loading, email, role, router]);

  const loadData = useCallback(async () => {
    if (!session || role !== "admin") return;
    const r = await fetch("/api/admin-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    setData(await r.json());
  }, [session, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function lancerRelances() {
    if (!session) return;
    setRelanceMsg("Traitement…");
    const r = await fetch("/api/relances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const j = await r.json();
    setRelanceMsg(
      j.ok ? `${j.envoyees} relance(s) envoyée(s) · ${j.cloturees} clôturée(s).` : "Erreur",
    );
    loadData();
  }

  if (loading || role !== "admin") {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  const demandes = data?.demandes ?? [];
  const cat = data?.categories;
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Pilotage commercial</h1>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Leads reçus" value={data?.leads ?? 0} />
        <Kpi label="Devis envoyés" value={data?.envoyes ?? 0} />
        <Kpi label="Devis acceptés" value={data?.acceptes ?? 0} />
        <Kpi label="Taux de conversion" value={`${data?.conversion ?? 0} %`} />
      </div>

      {/* Vue opérationnelle */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Vue opérationnelle</h2>
        <div className="flex items-center gap-2 text-sm">
          {relanceMsg && <span className="text-[var(--ink-soft)]">{relanceMsg}</span>}
          <button
            onClick={lancerRelances}
            className="rounded-full border border-[var(--brand)] px-3 py-1.5 font-medium text-[var(--brand)]"
          >
            Lancer les relances dues
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cat label="À traiter" value={cat?.aTraiter ?? 0} note="Intervention humaine (cas complexes)" accent />
        <Cat label="En attente" value={cat?.enAttente ?? 0} note="Relances automatiques en cours" />
        <Cat label="Gagnés" value={cat?.gagnes ?? 0} note="Devis acceptés" />
        <Cat label="Perdus" value={cat?.perdus ?? 0} note="Refusés / clôturés" />
      </div>

      {/* Table détaillée */}
      <h2 className="mt-8 text-lg font-semibold">Demandes</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-muted)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-3 py-2">Trajet</th>
              <th className="px-3 py-2">Pax</th>
              <th className="px-3 py-2">Montant TTC</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Relances</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => {
              const dv = d.devis?.[0];
              return (
                <Fragment key={d.id}>
                  <tr className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">
                      {d.depart ?? "?"} → {d.destination ?? "?"}
                    </td>
                    <td className="px-3 py-2">{d.nb_passagers ?? "—"}</td>
                    <td className="px-3 py-2 font-semibold text-[var(--brand)]">
                      {dv?.prix_ttc != null ? `${dv.prix_ttc.toFixed(2)} €` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatutBadge statut={d.statut} />
                    </td>
                    <td className="px-3 py-2">{dv ? `${dv.nb_relances ?? 0}/2` : "—"}</td>
                    <td className="px-3 py-2 text-[var(--ink-soft)]">
                      {new Date(d.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      {dv && (
                        <button
                          onClick={() => setOpen(open === d.id ? null : d.id)}
                          className="text-xs text-[var(--brand)] underline"
                        >
                          {open === d.id ? "Masquer" : "Détail"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === d.id && dv && (
                    <tr className="bg-[var(--bg-muted)]">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="font-semibold">Détail interne (vue pro)</div>
                        <div className="mt-1 font-mono text-xs text-[var(--ink-soft)]">
                          {(dv.lignes ?? []).map((l, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{l.libelle}</span>
                              <span>{l.montant.toFixed(2)} €</span>
                            </div>
                          ))}
                          <div className="mt-1 flex justify-between font-bold text-[var(--ink)]">
                            <span>Total TTC</span>
                            <span>{dv.prix_ttc?.toFixed(2)} €</span>
                          </div>
                        </div>
                        {dv.coefficients && dv.coefficients.length > 0 && (
                          <div className="mt-2 text-xs text-[var(--ink-soft)]">
                            Coefficients : {dv.coefficients.map((c) => `${c.libelle} (${c.valeur > 0 ? "+" : ""}${Math.round(c.valeur * 100)}%)`).join(" · ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {demandes.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-[var(--ink-soft)]" colSpan={7}>
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
