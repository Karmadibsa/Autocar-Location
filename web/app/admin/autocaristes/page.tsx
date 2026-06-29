"use client";

// Annuaire des autocaristes partenaires (réservé admin). Données mock.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import Spinner from "@/app/components/Spinner";
import { Bus, Star, ArrowLeft } from "lucide-react";

type Autocariste = {
  id: string;
  nom: string;
  ville: string | null;
  departement: string | null;
  nb_vehicules: number | null;
  capacite_max: number | null;
  contact_email: string | null;
  contact_tel: string | null;
  note: number | null;
  specialites: string | null;
  actif: boolean;
};

export default function AnnuaireAutocaristes() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [items, setItems] = useState<Autocariste[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!email) router.replace("/login");
    else if (role !== "admin") router.replace("/espace-client");
  }, [loading, email, role, router]);

  const load = useCallback(async () => {
    if (!session || role !== "admin") return;
    const r = await fetch("/api/autocaristes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const j = await r.json();
    setItems(j.autocaristes ?? []);
  }, [session, role]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || role !== "admin") {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  const search = q.trim().toLowerCase();
  const list = items.filter(
    (a) =>
      !search ||
      [a.nom, a.ville, a.departement, a.specialites].filter(Boolean).join(" ").toLowerCase().includes(search),
  );
  const actifs = items.filter((a) => a.actif).length;
  const flotte = items.reduce((s, a) => s + (a.nb_vehicules ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:text-[var(--brand-dark)]">
        <ArrowLeft className="h-4 w-4" /> Retour au pilotage
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
        <Bus className="h-6 w-6 text-[var(--brand)]" /> Autocaristes partenaires
      </h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Avec qui on travaille : flotte, capacité, zone et contact. {actifs} partenaires actifs ·{" "}
        {flotte} véhicules cumulés.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher (nom, ville, spécialité)…"
        className="mt-4 w-full max-w-sm rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
      />

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-muted)] text-left text-[var(--ink-soft)]">
            <tr>
              <th className="px-3 py-2">Autocariste</th>
              <th className="px-3 py-2">Zone</th>
              <th className="px-3 py-2">Flotte</th>
              <th className="px-3 py-2">Capacité max</th>
              <th className="px-3 py-2">Spécialités</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-muted)]">
                <td className="px-3 py-2 font-medium">{a.nom}</td>
                <td className="px-3 py-2 text-[var(--ink-soft)]">
                  {a.ville}
                  {a.departement ? ` · ${a.departement}` : ""}
                </td>
                <td className="px-3 py-2">{a.nb_vehicules ?? "—"}</td>
                <td className="px-3 py-2">{a.capacite_max ? `${a.capacite_max} pl.` : "—"}</td>
                <td className="px-3 py-2 text-[var(--ink-soft)]">{a.specialites ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-0.5 font-medium">
                    <Star className="h-3.5 w-3.5 fill-[#E8B500] text-[#E8B500]" />
                    {a.note != null ? a.note.toFixed(1) : "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-[var(--ink-soft)]">
                  {a.contact_email && <div>{a.contact_email}</div>}
                  {a.contact_tel && <div>{a.contact_tel}</div>}
                </td>
                <td className="px-3 py-2">
                  {a.actif ? (
                    <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--brand-dark)]">Actif</span>
                  ) : (
                    <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-xs text-[var(--ink-soft)]">Inactif</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[var(--ink-soft)]">
                  Aucun autocariste. Charge les données via supabase/seed-autocaristes.sql.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
