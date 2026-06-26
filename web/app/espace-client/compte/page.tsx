"use client";

// Onglet "Mon compte" : coordonnées + adresse de facturation (modifiables).
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";

type Profil = {
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
};
const VIDE: Profil = { prenom: "", nom: "", telephone: "", adresse: "", code_postal: "", ville: "" };

export default function MonCompte() {
  const { email, session } = useAuth();
  const [profil, setProfil] = useState<Profil>(VIDE);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    if (d.profil) {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.profil)) if (typeof v === "string") clean[k] = v;
      setProfil({ ...VIDE, ...(clean as Partial<Profil>) });
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setMsg("Enregistrement…");
    const r = await fetch("/api/profil-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, ...profil }),
    });
    const j = await r.json();
    setMsg(j.ok ? "Coordonnées enregistrées." : "Erreur");
  }

  const champ = (k: keyof Profil) => ({
    value: profil[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setProfil((p) => ({ ...p, [k]: e.target.value })),
    className:
      "w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]",
  });

  return (
    <>
      <h2 className="text-lg font-semibold">Mes informations</h2>
      <p className="text-sm text-[var(--ink-soft)]">
        Ces coordonnées servent à établir vos devis et factures.
      </p>

      <form onSubmit={save} className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4">
        <p className="text-xs text-[var(--ink-soft)]">Email : {email}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Prénom" aria-label="Prénom" {...champ("prenom")} />
          <input placeholder="Nom" aria-label="Nom" {...champ("nom")} />
          <input placeholder="Téléphone" aria-label="Téléphone" {...champ("telephone")} />
          <input placeholder="Adresse" aria-label="Adresse" {...champ("adresse")} />
          <input placeholder="Code postal" aria-label="Code postal" {...champ("code_postal")} />
          <input placeholder="Ville" aria-label="Ville" {...champ("ville")} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Enregistrer
          </button>
          {msg && <span className="text-sm text-[var(--ink-soft)]">{msg}</span>}
        </div>
      </form>
    </>
  );
}
