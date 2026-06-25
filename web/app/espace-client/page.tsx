"use client";

// Portail client (protégé) : redirige vers /login si non connecté.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

type Ligne = { libelle: string; montant: number };
type Devis = {
  id: string;
  prix_ttc: number | null;
  devise: string | null;
  statut: string;
  lignes: Ligne[] | null;
  created_at: string;
};
type Message = { role: string; contenu?: string; content?: string };
type Conversation = { id: string; messages: Message[] | null; updated_at: string };

export default function EspaceClient() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Garde de route : pas connecté -> /login
  useEffect(() => {
    if (!loading && !email) router.replace("/login");
  }, [loading, email, router]);

  // Charge les données du client
  useEffect(() => {
    if (!session) return;
    fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    })
      .then((r) => r.json())
      .then((d) => {
        setDevis(d.devis ?? []);
        setConversations(d.conversations ?? []);
      });
  }, [session]);

  if (loading || !email) {
    return <main className="mx-auto max-w-md flex-1 p-8 text-[var(--ink-soft)]">Chargement…</main>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Mon espace</h1>
        <div className="flex items-center gap-3 text-sm">
          <a href="/" className="rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--ink)]">
            + Nouveau devis
          </a>
          <button onClick={() => supabase?.auth.signOut()} className="text-[var(--ink-soft)] underline">
            Déconnexion ({email})
          </button>
        </div>
      </div>

      {role === "admin" && (
        <a
          href="/admin"
          className="mt-4 block rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)]"
        >
          Vous êtes administrateur → accéder au <b>dashboard de pilotage</b>.
        </a>
      )}

      <h2 className="mt-6 text-lg font-semibold">Mes devis</h2>
      {devis.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">
          Aucun devis lié à cet email. Cliquez « Nouveau devis » et indiquez cet email.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {devis.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--ink-soft)]">
                  {new Date(d.created_at).toLocaleDateString("fr-FR")} · {d.statut}
                </span>
                <span className="font-bold text-[var(--brand)]">
                  {d.prix_ttc?.toFixed(2)} {d.devise ?? "EUR"} TTC
                </span>
              </div>
              <div className="mt-2 font-mono text-[12px] text-[var(--ink-soft)]">
                {(d.lignes ?? []).map((l, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{l.libelle}</span>
                    <span>{l.montant.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Mes conversations</h2>
      {conversations.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">Aucune conversation.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {conversations.map((c) => (
            <details key={c.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <summary className="cursor-pointer text-sm text-[var(--ink-soft)]">
                Conversation du {new Date(c.updated_at).toLocaleDateString("fr-FR")}
              </summary>
              <div className="mt-2 space-y-1 text-sm">
                {(c.messages ?? []).map((m, i) => (
                  <p key={i}>
                    <span className="font-semibold">{m.role === "user" ? "Vous" : "NeoTravel"} :</span>{" "}
                    {m.contenu ?? m.content}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
