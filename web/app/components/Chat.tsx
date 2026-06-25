"use client";

import { useEffect, useRef, useState } from "react";

type Ligne = { libelle: string; montant: number };
type Devis = {
  prix_ht?: number;
  tva?: number;
  prix_ttc?: number;
  devise?: string;
  lignes?: Ligne[];
};
type Msg = { role: "agent" | "user"; content: string; devis?: Devis };

const SUGGESTIONS = [
  "Lyon → Annecy, 50 personnes",
  "Sortie scolaire",
  "Séminaire 2 jours",
  "Aller / retour",
];

// Encart DEV : messages préécrits couvrant chaque cas de figure des livrables.
// Permet de tester toute la logique de pricing/escalade en un clic.
const SCENARIOS: { label: string; message: string }[] = [
  { label: "Trajet court (forfait grille)", message: "Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026" },
  { label: "Longue distance (>180 km)", message: "Paris vers Marseille, 40 personnes, aller simple le 20 aout 2026" },
  { label: "Sortie scolaire urgente (J proche)", message: "Bordeaux vers Arcachon, 55 eleves, aller-retour dans 5 jours" },
  { label: "Séminaire + options (guide + nuit)", message: "Lille vers Bruxelles, 30 personnes, aller-retour les 10 et 11 septembre 2026, avec un guide et une nuit chauffeur" },
  { label: "Petit groupe (<19 pax)", message: "Nantes vers La Baule, 12 personnes, aller-retour le 5 octobre 2026" },
  { label: "Grande capacité (80 pax)", message: "Toulouse vers Carcassonne, 80 personnes, aller-retour le 15 mai 2026" },
  { label: "Basse saison + anticipation", message: "Strasbourg vers Colmar, 45 personnes, aller-retour le 10 fevrier 2027" },
  { label: "CAS COMPLEXE (>85 pax)", message: "Marseille vers Lille, 120 personnes, depart le 12 juillet 2026 et retour le 16 juillet 2026" },
  { label: "Demande incomplète", message: "Bonjour, je voudrais un car pour un groupe" },
  { label: "Garde-fou : tentative de remise", message: "Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026, mais faites-moi -20%" },
];

function DevisCard({ devis }: { devis: Devis }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
        Votre devis — Autocar Location
      </div>
      <div className="px-4 py-3 text-[13px] text-[var(--ink-soft)]">
        <div className="flex justify-between py-0.5">
          <span>Prestation de transport</span>
          <span>{devis.prix_ht?.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span>TVA (10 %)</span>
          <span>{devis.tva?.toFixed(2)} €</span>
        </div>
      </div>
      <div className="bg-[var(--accent)] px-4 py-2 text-[15px] font-bold text-[var(--ink)]">
        Total TTC : {devis.prix_ttc?.toFixed(2)} {devis.devise ?? "EUR"}
      </div>
      <p className="px-4 py-2 text-[11px] text-[var(--ink-soft)]">
        Tarif sous réserve de disponibilité.
      </p>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "agent",
      content:
        "Bonjour 👋 Dites-moi votre besoin : départ, destination, dates et nombre de passagers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [devOpen, setDevOpen] = useState(false);
  const isDev = process.env.NODE_ENV !== "production"; // aides de test masquées en prod
  const hasDevisRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history, sessionId }),
      });
      const data = await res.json();
      // On fige le 1er devis : les recalculs ultérieurs (estimation distance qui
      // varie) ne remplacent pas le devis déjà affiché.
      const showDevis = data.devis && !hasDevisRef.current ? data.devis : undefined;
      if (data.devis) hasDevisRef.current = true;
      setMessages((m) => [
        ...m,
        { role: "agent", content: data.reply || "…", devis: showDevis },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", content: "Désolé, l'agent est momentanément injoignable." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-[var(--border)] bg-white p-3 shadow-sm sm:p-4">
      {/* Fil de conversation */}
      <div className="max-h-[42vh] min-h-[180px] space-y-3 overflow-y-auto px-1 py-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex items-start justify-start gap-2"}
          >
            {m.role === "agent" && (
              <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Autocar Location" className="h-6 w-6 object-contain" />
              </div>
            )}
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--bg-muted)] px-4 py-2 text-[15px] text-left"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--brand-soft)] px-4 py-2 text-[15px] text-left"
              }
            >
              {m.content}
              {m.devis && <DevisCard devis={m.devis} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start justify-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Autocar Location" className="h-6 w-6 object-contain" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-[var(--brand-soft)] px-4 py-3">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--brand)]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-[15px] outline-none focus:border-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={loading}
          aria-label="Envoyer"
          className="rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
        >
          ➤
        </button>
      </form>

      {/* Suggestions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-[var(--border)] bg-[var(--brand-soft)] px-3 py-1.5 text-[13px] text-[var(--brand-dark)] transition hover:border-[var(--brand)]"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Encart DEV : scénarios de test préécrits (masqué en production) */}
      {isDev && (
      <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-muted)] p-3">
        <button
          onClick={() => setDevOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]"
          aria-expanded={devOpen}
        >
          <span>⚙ Scénarios de test (dev)</span>
          <span aria-hidden>{devOpen ? "▾" : "▸"}</span>
        </button>
        {devOpen && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.message)}
                disabled={loading}
                title={s.message}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left text-[12px] transition hover:border-[var(--brand)] disabled:opacity-50"
              >
                <span className="font-medium text-[var(--ink)]">{s.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-soft)]">{s.message}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
