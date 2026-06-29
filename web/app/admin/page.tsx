"use client";

// Dashboard (protégé admin) : KPIs + vue opérationnelle (à traiter / en attente /
// gagnés / perdus) + table avec le détail COMPLET du devis (vue pro).
import { useEffect, useState, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";
import Spinner from "@/app/components/Spinner";
import { AlertTriangle, Download } from "lucide-react";

type DevisFull = {
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  lignes: { libelle: string; montant: number }[] | null;
  coefficients: { libelle: string; valeur: number }[] | null;
  statut: string;
  nb_relances: number | null;
  prochaine_relance: string | null;
  raison_refus: string | null;
};
type DemandeRow = {
  id: string;
  depart: string | null;
  destination: string | null;
  date_depart: string | null;
  aller_retour: boolean | null;
  distance_km: number | null;
  nb_passagers: number | null;
  urgence: string | null;
  commentaire: string | null;
  statut: string;
  created_at: string;
  clients: { email: string | null; prenom: string | null; nom: string | null; telephone: string | null } | null;
  devis: DevisFull[];
};

// Regroupement statut -> catégorie opérationnelle (sert aussi au filtre).
const GROUPES: Record<string, string[]> = {
  aTraiter: ["cas_complexe"],
  enAttente: ["devis_envoye", "relance_1", "relance_2"],
  gagnes: ["accepte"],
  perdus: ["refuse", "cloture"],
};

// Valeur d'une demande selon la clé de tri (texte ou nombre).
function sortValue(d: DemandeRow, key: string): string | number {
  switch (key) {
    case "trajet": return d.depart ?? "";
    case "client": return d.clients?.nom ?? d.clients?.email ?? "";
    case "date_depart": return d.date_depart ?? "";
    case "nb_passagers": return d.nb_passagers ?? 0;
    case "montant": return d.devis?.[0]?.prix_ttc ?? 0;
    case "statut": return d.statut;
    case "relances": return d.devis?.[0]?.nb_relances ?? 0;
    default: return d.created_at;
  }
}
function compareDemandes(a: DemandeRow, b: DemandeRow, key: string): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  return String(va).localeCompare(String(vb), "fr");
}

// En-tête de colonne triable (cliquer pour trier asc/desc).
function SortTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
}) {
  return (
    <th className="px-3 py-2">
      <button
        onClick={() => onSort(k)}
        className="flex items-center gap-1 font-medium text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
      >
        {label}
        <span aria-hidden className="text-[10px]">{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}
type Data = {
  ok: boolean;
  leads?: number;
  envoyes?: number;
  acceptes?: number;
  conversion?: number;
  categories?: { aTraiter: number; enAttente: number; gagnes: number; perdus: number };
  demandes?: DemandeRow[];
  raisonsRefus?: Record<string, number>;
  parMois?: { mois: string; leads: number; acceptes: number }[];
  periode?: { from: string | null; to: string | null };
};

// Courbe (SVG) des leads et devis acceptés par mois.
function LineChart({ data }: { data: { mois: string; leads: number; acceptes: number }[] }) {
  if (!data.length) return <p className="text-sm text-[var(--ink-soft)]">Pas de données sur la période.</p>;
  const W = 640;
  const H = 200;
  const P = 30;
  const max = Math.max(1, ...data.map((d) => Math.max(d.leads, d.acceptes)));
  const x = (i: number) => P + (i / Math.max(1, data.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = (key: "leads" | "acceptes") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution mensuelle des leads et devis acceptés">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--border)" />
        <path d={path("leads")} fill="none" stroke="var(--brand)" strokeWidth={2.5} />
        <path d={path("acceptes")} fill="none" stroke="#E08A1E" strokeWidth={2.5} />
        {data.map((d, i) => (
          <g key={d.mois}>
            <circle cx={x(i)} cy={y(d.leads)} r={2.5} fill="var(--brand)" />
            <circle cx={x(i)} cy={y(d.acceptes)} r={2.5} fill="#E08A1E" />
            <text x={x(i)} y={H - 10} fontSize={9} textAnchor="middle" fill="var(--ink-soft)">
              {d.mois.slice(5)}/{d.mois.slice(2, 4)}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand)]" /> Leads</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#E08A1E" }} /> Devis acceptés</span>
      </div>
    </div>
  );
}

// Camembert SVG (sans dépendance) pour les motifs de refus.
const PIE_COLORS = ["#0e7a66", "#c6f24e", "#E08A1E", "#A12B2B", "#5B3FA0", "#1E4E8C"];
function PieChart({ data }: { data: [string, number][] }) {
  const total = data.reduce((s, [, n]) => s + n, 0);
  if (!total) return <p className="text-sm text-[var(--ink-soft)]">Aucun refus pour le moment.</p>;
  const R = 80;
  const C = 100;
  const slices = data.map(([label, n], i) => {
    const before = data.slice(0, i).reduce((s, [, v]) => s + v, 0);
    const start = (before / total) * 2 * Math.PI;
    const end = ((before + n) / total) * 2 * Math.PI;
    const x1 = C + R * Math.sin(start);
    const y1 = C - R * Math.cos(start);
    const x2 = C + R * Math.sin(end);
    const y2 = C - R * Math.cos(end);
    const large = end - start > Math.PI ? 1 : 0;
    const d = `M${C},${C} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
    return { d, color: PIE_COLORS[i % PIE_COLORS.length], label, n };
  });
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 200 200" className="h-40 w-40 flex-none" role="img" aria-label="Répartition des motifs de refus">
        {data.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={PIE_COLORS[0]} />
        ) : (
          slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)
        )}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 flex-none rounded-sm" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="text-[var(--ink-soft)]">— {s.n} ({Math.round((s.n / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <div className="text-2xl font-bold text-[var(--brand)]">{value}</div>
      <div className="text-sm text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}

function Cat({
  label,
  value,
  note,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  note: string;
  accent?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const base = accent && value > 0 ? "border-[#E08A1E] bg-[#FDF4E6]" : "border-[var(--border)] bg-white";
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition hover:border-[var(--brand)] ${active ? "ring-2 ring-[var(--brand)]" : ""} ${base}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-[var(--ink-soft)]">{note}</div>
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [relanceMsg, setRelanceMsg] = useState("");
  const [filtre, setFiltre] = useState<string | null>(null);
  const [prixManuel, setPrixManuel] = useState("");
  const [manuelMsg, setManuelMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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
      body: JSON.stringify({ token: session.access_token, from: from || undefined, to: to || undefined }),
    });
    setData(await r.json());
  }, [session, role, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Export PDF des statistiques de la période
  async function exporterPdf() {
    if (!session || !data) return;
    const r = await fetch("/api/admin-export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, data }),
    });
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statistiques-autocar-location.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Devis sur-mesure pour un cas complexe (étude commerciale humaine)
  async function devisManuel(demande_id: string) {
    if (!session) return;
    const prix = Number(prixManuel.replace(",", "."));
    if (!Number.isFinite(prix) || prix <= 0) {
      setManuelMsg("Saisis un prix HT valide.");
      return;
    }
    setManuelMsg("Envoi…");
    const r = await fetch("/api/devis-manuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, demande_id, prix_ht: prix }),
    });
    const j = await r.json();
    setManuelMsg(j.ok ? `Devis créé (${j.prix_ttc} € TTC) et envoyé.` : "Erreur");
    setPrixManuel("");
    loadData();
  }

  // Action humaine sur une demande (gagné / perdu / pris en charge)
  async function agir(id: string, statut: string) {
    if (!session) return;
    await fetch("/api/demande-statut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, statut }),
    });
    loadData();
  }

  async function lancerRelances() {
    if (!session) return;
    setRelanceMsg("Traitement…");
    const r = await fetch("/api/relances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const j = await r.json();
    if (!j.ok) setRelanceMsg("Erreur lors du traitement.");
    else if ((j.envoyees ?? 0) + (j.cloturees ?? 0) + (j.expirees ?? 0) === 0)
      setRelanceMsg("Aucune relance à envoyer pour le moment.");
    else
      setRelanceMsg(`${j.envoyees} relance(s) · ${j.cloturees} clôturée(s) · ${j.expirees ?? 0} expirée(s).`);
    loadData();
  }

  if (loading || role !== "admin") {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  const toutes = data?.demandes ?? [];
  const cat = data?.categories;
  const toggleFiltre = (k: string) => setFiltre((f) => (f === k ? null : k));
  const q = search.trim().toLowerCase();
  const demandes = [...toutes]
    .filter((d) => !filtre || GROUPES[filtre]?.includes(d.statut))
    .filter((d) => {
      if (!q) return true;
      const hay = [d.depart, d.destination, d.clients?.prenom, d.clients?.nom, d.clients?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const cmp = compareDemandes(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });

  function trier(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "trajet" || key === "client" || key === "statut" ? "asc" : "desc");
    }
  }
  const th = (label: string, k: string) => (
    <SortTh label={label} k={k} sortKey={sortKey} sortDir={sortDir} onSort={trier} />
  );
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pilotage commercial</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Suivi des leads, devis et relances — interventions humaines mises en avant.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col text-xs text-[var(--ink-soft)]">
            Du
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm" />
          </label>
          <label className="flex flex-col text-xs text-[var(--ink-soft)]">
            Au
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm" />
          </label>
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} className="rounded-full px-2 py-1 text-xs text-[var(--brand)] underline">
              réinitialiser
            </button>
          )}
          <button
            onClick={exporterPdf}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--brand-dark)]"
          >
            <Download className="h-4 w-4" /> Exporter en PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Leads reçus" value={data?.leads ?? 0} />
        <Kpi label="Devis envoyés" value={data?.envoyes ?? 0} />
        <Kpi label="Devis acceptés" value={data?.acceptes ?? 0} />
        <Kpi label="Taux de conversion" value={`${data?.conversion ?? 0} %`} />
      </div>

      {/* Évolution mensuelle */}
      <h2 className="mt-8 text-lg font-semibold">Évolution sur la période</h2>
      <div className="mt-2 rounded-xl border border-[var(--border)] bg-white p-5">
        <LineChart data={data?.parMois ?? []} />
      </div>

      {/* Vue opérationnelle */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Vue opérationnelle</h2>
        <div className="flex items-center gap-2 text-sm">
          {relanceMsg && <span className="text-[var(--ink-soft)]">{relanceMsg}</span>}
          <button
            onClick={lancerRelances}
            className="rounded-full border border-[var(--brand)] px-3 py-1.5 font-medium text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Lancer les relances dues
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cat label="À traiter" value={cat?.aTraiter ?? 0} note="Intervention humaine (cas complexes)" accent active={filtre === "aTraiter"} onClick={() => toggleFiltre("aTraiter")} />
        <Cat label="En attente" value={cat?.enAttente ?? 0} note="Relances automatiques en cours" active={filtre === "enAttente"} onClick={() => toggleFiltre("enAttente")} />
        <Cat label="Gagnés" value={cat?.gagnes ?? 0} note="Devis acceptés" active={filtre === "gagnes"} onClick={() => toggleFiltre("gagnes")} />
        <Cat label="Perdus" value={cat?.perdus ?? 0} note="Refusés / clôturés" active={filtre === "perdus"} onClick={() => toggleFiltre("perdus")} />
      </div>

      {/* Motifs de refus (camembert) */}
      <h2 className="mt-8 text-lg font-semibold">Motifs de refus</h2>
      <p className="text-sm text-[var(--ink-soft)]">Pourquoi les devis sont refusés — pour ajuster l&apos;offre.</p>
      <div className="mt-3 rounded-xl border border-[var(--border)] bg-white p-5">
        <PieChart data={Object.entries(data?.raisonsRefus ?? {}).sort((a, b) => b[1] - a[1])} />
      </div>

      {/* Table détaillée */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Demandes</h2>
          <span className="text-xs text-[var(--ink-soft)]">{demandes.length} résultat(s)</span>
          {filtre && (
            <button onClick={() => setFiltre(null)} className="text-xs text-[var(--brand)] underline hover:text-[var(--brand-dark)]">
              Filtre actif — tout afficher
            </button>
          )}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (client, ville…)"
          aria-label="Rechercher une demande"
          className="w-full max-w-xs rounded-full border border-[var(--border)] px-4 py-1.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
        />
      </div>
      <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-muted)] text-left text-[var(--ink-soft)]">
            <tr>
              {th("Trajet", "trajet")}
              {th("Client", "client")}
              {th("Départ", "date_depart")}
              {th("Pax", "nb_passagers")}
              {th("Montant TTC", "montant")}
              {th("Statut", "statut")}
              {th("Relances", "relances")}
              {th("Reçu le", "created_at")}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {demandes.map((d) => {
              const dv = d.devis?.[0];
              return (
                <Fragment key={d.id}>
                  <tr className="border-t border-[var(--border)] transition hover:bg-[var(--bg-muted)]">
                    <td className="px-3 py-2 font-medium">
                      {d.depart ?? "?"} → {d.destination ?? "?"}
                    </td>
                    <td className="px-3 py-2 text-[var(--ink-soft)]">
                      {[d.clients?.prenom, d.clients?.nom].filter(Boolean).join(" ") || d.clients?.email || "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--ink-soft)]">
                      {d.date_depart ? new Date(d.date_depart).toLocaleDateString("fr-FR") : "—"}
                      {d.aller_retour ? " · A/R" : ""}
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
                      <button
                        onClick={() => setOpen(open === d.id ? null : d.id)}
                        className="rounded-full px-2 py-1 text-xs font-medium text-[var(--brand)] underline transition hover:bg-[var(--brand-soft)] hover:no-underline"
                      >
                        {open === d.id ? "Masquer" : "Détail"}
                      </button>
                    </td>
                  </tr>
                  {open === d.id && (
                    <tr className="bg-[var(--bg-muted)]">
                      <td colSpan={9} className="px-4 py-3">
                        {/* Résumé de la demande (toujours) */}
                        <div className="font-semibold">Résumé de la demande</div>
                        <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--ink-soft)] sm:grid-cols-3">
                          <span>Trajet : {d.depart ?? "?"} → {d.destination ?? "?"}</span>
                          <span>Date de départ : {d.date_depart ? new Date(d.date_depart).toLocaleDateString("fr-FR") : "—"}</span>
                          <span>Trajet : {d.aller_retour ? "aller-retour" : "aller simple"}</span>
                          <span>Passagers : {d.nb_passagers ?? "—"}</span>
                          <span>Distance : {d.distance_km != null ? `${d.distance_km} km` : "—"}</span>
                          <span>Urgence : {d.urgence ?? "—"}</span>
                        </div>

                        {/* Cas complexe : motif d'escalade + flux d'étude commerciale */}
                        {d.statut === "cas_complexe" && (
                          <div className="mt-3 rounded-lg border border-[#E08A1E] bg-[#FDF4E6] p-3 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-[#8A5A12]">
                              <AlertTriangle className="h-4 w-4" /> Intervention humaine requise
                            </div>
                            <p className="mt-1 text-[#8A5A12]">
                              {d.commentaire ?? "Cas atypique : à étudier par un conseiller."}
                            </p>
                            <p className="mt-2 text-[#8A5A12]">
                              <b>Contact :</b>{" "}
                              {d.clients?.email ? (
                                <>
                                  {d.clients.email}
                                  {d.clients.telephone ? ` · ${d.clients.telephone}` : ""}
                                </>
                              ) : (
                                <span className="text-[#A12B2B]">aucune coordonnée laissée par le prospect</span>
                              )}
                            </p>
                            <div className="mt-3 rounded-lg border border-[var(--border)] bg-white p-3">
                              <div className="font-semibold text-[var(--ink)]">Établir un devis sur-mesure</div>
                              <p className="mt-0.5 text-[var(--ink-soft)]">
                                Après étude (capacité, sous-traitance…), saisis le prix HT négocié. Le devis part au client et rejoint le pipeline.
                              </p>
                              {(() => {
                                const ht = Number(prixManuel.replace(",", "."));
                                const valide = Number.isFinite(ht) && ht > 0;
                                const tva = valide ? Math.round(ht * 0.1 * 100) / 100 : 0;
                                const ttc = valide ? Math.round((ht + tva) * 100) / 100 : 0;
                                return (
                                  <>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <label className="text-[var(--ink-soft)]">Prix HT</label>
                                      <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={prixManuel}
                                        onChange={(e) => setPrixManuel(e.target.value)}
                                        placeholder="0.00"
                                        aria-label="Prix HT sur-mesure"
                                        className="w-28 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs outline-none focus:border-[var(--brand)]"
                                      />
                                      <span className="text-[var(--ink-soft)]">€</span>
                                      {valide && (
                                        <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-1 text-[var(--ink)]">
                                          TVA {tva.toFixed(2)} € · <b>TTC {ttc.toFixed(2)} €</b>
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <button
                                        onClick={() => devisManuel(d.id)}
                                        disabled={!valide}
                                        className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
                                      >
                                        Créer et envoyer le devis
                                      </button>
                                      {manuelMsg && <span className="text-[var(--ink-soft)]">{manuelMsg}</span>}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Détail interne du devis (vue pro) */}
                        {dv && (
                          <>
                            <div className="mt-3 font-semibold">Détail interne (vue pro)</div>
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
                            {dv.raison_refus && (
                              <div className="mt-2 rounded-lg border border-[#FBE3E3] bg-[#FDF1F1] p-2 text-xs text-[#A12B2B]">
                                <b>Motif de refus :</b> {dv.raison_refus}
                              </div>
                            )}
                          </>
                        )}

                        {/* Gestion : abandon d'un cas complexe */}
                        {d.statut === "cas_complexe" && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[var(--ink-soft)]">Sinon :</span>
                            <button onClick={() => agir(d.id, "refuse")} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs transition hover:border-[#A12B2B] hover:text-[#A12B2B]">
                              Abandonner (sans suite)
                            </button>
                          </div>
                        )}

                        {/* Gestion : issue commerciale d'un devis en cours */}
                        {["devis_envoye", "relance_1", "relance_2", "qualifiee"].includes(d.statut) && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-[var(--ink-soft)]">Marquer :</span>
                            <button onClick={() => agir(d.id, "accepte")} className="rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-medium text-white transition hover:bg-[var(--brand-dark)]">
                              Gagné
                            </button>
                            <button onClick={() => agir(d.id, "refuse")} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs transition hover:border-[#A12B2B] hover:text-[#A12B2B]">
                              Perdu
                            </button>
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
                <td className="px-3 py-4 text-[var(--ink-soft)]" colSpan={9}>
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
