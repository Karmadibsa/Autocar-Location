"use client";

// Onglet "Mes devis" : liste des devis (télécharger, accepter / refuser + motifs).
// La garde d'accès, l'en-tête et les onglets sont gérés par le layout.
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";

type Devis = {
  id: string;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  devise: string | null;
  statut: string;
  created_at: string;
};
const RAISONS_REFUS = [
  "Prix trop élevé",
  "Délai / disponibilité",
  "Meilleure offre ailleurs",
  "Projet annulé ou reporté",
  "Autre",
];

export default function MesDevis() {
  const { session } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [aAdresse, setAAdresse] = useState(true);
  const [refusId, setRefusId] = useState<string | null>(null);
  const [raisons, setRaisons] = useState<string[]>([]);
  const [adresseAlerte, setAdresseAlerte] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    setDevis(d.devis ?? []);
    setAAdresse(!!d.profil?.adresse);
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function repondre(id: string, reponse: "accepte" | "refuse", motifs?: string[]) {
    if (!session) return;
    await fetch("/api/devis-reponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, reponse, raisons: motifs }),
    });
    if (reponse === "accepte" && !aAdresse) setAdresseAlerte(true);
    loadData();
  }

  function toggleRaison(r: string) {
    setRaisons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function downloadPdf(id: string) {
    if (!session) return;
    const res = await fetch("/api/devis-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token: session.access_token }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devis-autocar-location.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h2 className="text-lg font-semibold">Mes devis</h2>

      {adresseAlerte && (
        <div className="mt-2 rounded-xl border border-[#E08A1E] bg-[#FDF4E6] p-3 text-sm text-[#8A5A12]">
          Merci d&apos;avoir accepté ! Pour une facture en bonne et due forme,{" "}
          <Link href="/espace-client/compte" className="font-semibold underline">
            complétez votre adresse
          </Link>
          .
        </div>
      )}

      {devis.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">
          Aucun devis lié à cet email. Cliquez « Nouveau devis » et indiquez cet email.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {devis.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--ink-soft)]">
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <StatutBadge statut={d.statut} />
                </div>
                <span className="font-bold text-[var(--brand)]">
                  {d.prix_ttc?.toFixed(2)} {d.devise ?? "EUR"} TTC
                </span>
              </div>
              <div className="mt-2 text-[12px] text-[var(--ink-soft)]">
                <div className="flex justify-between">
                  <span>Prestation de transport</span>
                  <span>{d.prix_ht?.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (10 %)</span>
                  <span>{d.tva?.toFixed(2)} €</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => downloadPdf(d.id)}
                  className="rounded-full border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
                >
                  Télécharger le PDF
                </button>
                {d.statut === "envoye" && (
                  <>
                    <button
                      onClick={() => repondre(d.id, "accepte")}
                      className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      Accepter le devis
                    </button>
                    <button
                      onClick={() => {
                        setRefusId(d.id);
                        setRaisons([]);
                      }}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[#A12B2B] hover:text-[#A12B2B]"
                    >
                      Refuser
                    </button>
                  </>
                )}
                {d.statut === "accepte" && (
                  <span className="text-xs font-medium text-[var(--brand)]">Devis accepté — merci !</span>
                )}
                {d.statut === "refuse" && (
                  <span className="text-xs text-[var(--ink-soft)]">Devis refusé.</span>
                )}
              </div>
              {refusId === d.id && (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-xs">
                  <p className="font-medium text-[var(--ink)]">Pour nous aider à progresser, pourquoi refusez-vous ?</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {RAISONS_REFUS.map((r) => (
                      <label key={r} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={raisons.includes(r)}
                          onChange={() => toggleRaison(r)}
                          className="h-3.5 w-3.5 accent-[var(--brand)]"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        repondre(d.id, "refuse", raisons);
                        setRefusId(null);
                      }}
                      className="rounded-full bg-[#A12B2B] px-3 py-1.5 font-medium text-white transition hover:opacity-90"
                    >
                      Confirmer le refus
                    </button>
                    <button
                      onClick={() => setRefusId(null)}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[var(--ink-soft)] transition hover:bg-white"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
