"use client";

// Portail client (protégé) : redirige vers /login si non connecté.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";
import Spinner from "@/app/components/Spinner";

type Devis = {
  id: string;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  devise: string | null;
  statut: string;
  created_at: string;
};
type Message = { role: string; contenu?: string; content?: string };
type Conversation = { id: string; messages: Message[] | null; updated_at: string };

export default function EspaceClient() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [prenom, setPrenom] = useState<string | null>(null);

  // Garde de route : pas connecté -> /login
  useEffect(() => {
    if (!loading && !email) router.replace("/login");
  }, [loading, email, router]);

  // Charge les données du client
  const loadData = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    setDevis(d.devis ?? []);
    setConversations(d.conversations ?? []);
    setPrenom(d.prenom ?? d.nom ?? null);
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Réponse du client à un devis (accepter / refuser)
  async function repondre(id: string, reponse: "accepte" | "refuse") {
    if (!session) return;
    await fetch("/api/devis-reponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, reponse }),
    });
    loadData();
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

  if (loading || !email) {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mon espace</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Bonjour {prenom ?? email}, content de vous revoir.
          </p>
        </div>
        <a href="/" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
          + Nouveau devis
        </a>
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
                  className="rounded-full border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)]"
                >
                  Télécharger le PDF
                </button>
                {d.statut === "envoye" && (
                  <>
                    <button
                      onClick={() => repondre(d.id, "accepte")}
                      className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Accepter le devis
                    </button>
                    <button
                      onClick={() => repondre(d.id, "refuse")}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)]"
                    >
                      Refuser
                    </button>
                  </>
                )}
                {d.statut === "accepte" && (
                  <span className="text-xs font-medium text-[var(--brand)]">✓ Devis accepté — merci !</span>
                )}
                {d.statut === "refuse" && (
                  <span className="text-xs text-[var(--ink-soft)]">Devis refusé.</span>
                )}
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
                    <span className="font-semibold">{m.role === "user" ? "Vous" : "Autocar Location"} :</span>{" "}
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
