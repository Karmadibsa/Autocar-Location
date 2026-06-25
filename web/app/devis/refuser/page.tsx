"use client";

// Page publique de refus de devis (lien tokenisé reçu par email, sans compte).
// On lit le token via window.location pour éviter une contrainte Suspense.
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const RAISONS_REFUS = [
  "Prix trop élevé",
  "Délai / disponibilité",
  "Meilleure offre ailleurs",
  "Projet annulé ou reporté",
  "Autre",
];

export default function RefuserDevis() {
  const [token, setToken] = useState<string | null>(null);
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");
  const [raisons, setRaisons] = useState<string[]>([]);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  function toggleRaison(r: string) {
    setRaisons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function refuser() {
    if (!token) return;
    setEtat("envoi");
    try {
      const r = await fetch("/api/devis-refuser-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, raisons }),
      });
      const j = await r.json();
      setEtat(j.ok ? "ok" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-8 text-center">
      {etat === "ok" ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--brand)]" />
          <h1 className="mt-3 text-xl font-bold">Devis refusé</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            C'est noté, votre devis a bien été refusé. Merci de nous avoir prévenus — et au
            plaisir pour un prochain voyage&nbsp;!
          </p>
          <a href="/" className="mt-5 inline-block rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]">
            Retour à l'accueil
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Refuser ce devis ?</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Vous pouvez refuser sans créer de compte. Dites-nous pourquoi (optionnel), ça
            nous aide à nous améliorer.
          </p>
          <div className="mt-4 grid gap-1.5 text-left text-sm">
            {RAISONS_REFUS.map((r) => (
              <label key={r} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={raisons.includes(r)}
                  onChange={() => toggleRaison(r)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {r}
              </label>
            ))}
          </div>
          <button
            onClick={refuser}
            disabled={!token || etat === "envoi"}
            className="mt-5 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            {etat === "envoi" ? "Traitement…" : "Confirmer le refus"}
          </button>
          {!token && <p className="mt-3 text-xs text-[#d14343]">Lien invalide (token manquant).</p>}
          {etat === "erreur" && (
            <p className="mt-3 text-xs text-[#d14343]">Ce devis n'est plus modifiable ou le lien est invalide.</p>
          )}
        </div>
      )}
    </main>
  );
}
