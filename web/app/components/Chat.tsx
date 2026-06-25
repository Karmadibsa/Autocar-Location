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

function DevisCard({ devis }: { devis: Devis }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <div className="bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
        Votre devis — NeoTravel
      </div>
      <div className="px-4 py-3 font-mono text-[13px] text-[var(--ink-soft)]">
        {devis.lignes?.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 py-0.5">
            <span>{l.libelle}</span>
            <span className="whitespace-nowrap">{l.montant.toFixed(2)} €</span>
          </div>
        ))}
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
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--bg-muted)] px-4 py-2 text-[15px]"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--brand-soft)] px-4 py-2 text-[15px]"
              }
            >
              {m.content}
              {m.devis && <DevisCard devis={m.devis} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-[var(--brand-soft)] px-4 py-2 text-sm text-[var(--ink-soft)]">
              l&apos;agent rédige…
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
    </div>
  );
}
