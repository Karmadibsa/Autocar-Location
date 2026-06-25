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
type OptionItem = string | { code: string; quantite?: number };
type Params = {
  depart?: string | null;
  destination?: string | null;
  date_depart?: string | null;
  nb_passagers?: number | null;
  aller_retour?: boolean | null;
  options?: OptionItem[] | null;
  email?: string | null;
  nom?: string | null;
};
type Msg = { role: "agent" | "user"; content: string; devis?: Devis; escalade?: string };

const SUGGESTIONS = [
  "Lyon → Annecy, 50 personnes",
  "Sortie scolaire",
  "Séminaire 2 jours",
  "Aller / retour",
];

// Encart DEV : messages préécrits couvrant chaque cas de figure des livrables.
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

const OPTION_LABELS: Record<string, string> = {
  guide: "Guide",
  nuit_chauffeur: "Nuit chauffeur",
  peages: "Péages",
};

function cleanParams(p: Params | undefined): Params {
  const out: Params = {};
  if (!p) return out;
  for (const [k, v] of Object.entries(p)) {
    if (v !== null && v !== undefined && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

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
      <p className="px-4 py-2 text-[11px] text-[var(--ink-soft)]">Tarif sous réserve de disponibilité.</p>
    </div>
  );
}

// Panneau latéral : récap des infos clés extraites de la conversation.
function Recap({ p }: { p: Params }) {
  const opts = Array.isArray(p.options)
    ? p.options.map((o) => (typeof o === "string" ? o : o.code)).map((c) => OPTION_LABELS[c] ?? c)
    : [];
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2 last:border-0">
      <span className="text-xs text-[var(--ink-soft)]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[var(--ink)]">{value || "—"}</span>
    </div>
  );
  return (
    <aside className="h-fit rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold">Votre demande</h3>
      <p className="mb-2 text-xs text-[var(--ink-soft)]">Récapitulatif mis à jour en direct</p>
      <Row label="Départ" value={p.depart} />
      <Row label="Destination" value={p.destination} />
      <Row label="Date" value={p.date_depart} />
      <Row label="Passagers" value={p.nb_passagers != null ? `${p.nb_passagers}` : ""} />
      <Row label="Trajet" value={p.aller_retour == null ? "" : p.aller_retour ? "Aller-retour" : "Aller simple"} />
      <Row label="Options" value={opts.length ? opts.join(", ") : ""} />
    </aside>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "agent",
      content: "Bonjour 👋 Dites-moi votre besoin : départ, destination, dates et nombre de passagers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [devOpen, setDevOpen] = useState(false);
  const [recap, setRecap] = useState<Params>({});
  const isDev = process.env.NODE_ENV !== "production"; // aides de test masquées en prod
  const lockedDevisRef = useRef<Devis | null>(null); // fige le 1er prix calculé
  const shownDevisRef = useRef(false); // le devis a-t-il déjà été révélé ?
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

      // Récap latéral : on fusionne les infos extraites (sans écraser par du vide).
      if (data.params) setRecap((prev) => ({ ...prev, ...cleanParams(data.params) }));

      // On fige le 1er prix calculé, mais on ne RÉVÈLE le devis que lorsque l'agent
      // le présente (évite d'afficher le devis avant d'avoir tout demandé).
      if (data.devis && !lockedDevisRef.current) lockedDevisRef.current = data.devis;
      const reply: string = data.reply || "…";
      const presente =
        /e-?mail|courriel|adresse|disponible|s'affiche|consulter|ci-dessous|ci-dessus|votre devis/i.test(reply) ||
        !!data.params?.email;
      const showDevis =
        lockedDevisRef.current && presente && !shownDevisRef.current ? lockedDevisRef.current : undefined;
      if (showDevis) shownDevisRef.current = true;

      setMessages((m) => [
        ...m,
        { role: "agent", content: reply, devis: showDevis, escalade: data.escalade || undefined },
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
    <div className="grid w-full gap-4 text-left lg:grid-cols-[1fr_300px]">
      {/* Colonne conversation */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-3 shadow-sm sm:p-4">
        <div className="max-h-[46vh] min-h-[200px] space-y-3 overflow-y-auto px-1 py-1">
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
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--bg-muted)] px-4 py-2 text-[15px]"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--brand-soft)] px-4 py-2 text-[15px]"
                }
              >
                {m.content}
                {m.escalade && (
                  <div className="mt-2 rounded-xl border border-[#E08A1E] bg-[#FDF4E6] px-3 py-2 text-[13px] text-[#8A5A12]">
                    <b>Cas particulier.</b> {m.escalade} Un conseiller vous recontacte sous 24 h.
                  </div>
                )}
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
            aria-label="Votre message"
            className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-[15px] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
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
              className="rounded-full border border-[var(--border)] bg-[var(--brand-soft)] px-3 py-1.5 text-[13px] text-[var(--brand-dark)] transition hover:border-[var(--brand)] hover:bg-white"
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
              className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
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

      {/* Colonne récap (à droite sur desktop, dessous sur mobile) */}
      <Recap p={recap} />
    </div>
  );
}
