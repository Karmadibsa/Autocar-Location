"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  MapPin,
  CalendarDays,
  Users,
  Repeat,
  Plus,
  Headset,
  RotateCcw,
  Wrench,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

// Tests obligatoires (livrables) — boutons disponibles AUSSI en production pour
// rejouer chaque cas facilement. Les 7 premiers correspondent à la liste imposée.
const SCENARIOS: { label: string; message: string }[] = [
  { label: "Cas simple", message: "Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026" },
  { label: "Demande urgente (départ proche)", message: "Bordeaux vers Arcachon, 40 personnes, aller-retour dans 4 jours" },
  { label: "Hors zone (>180 km)", message: "Paris vers Marseille, 40 personnes, aller simple le 20 aout 2026" },
  { label: "0 passager (garde-fou)", message: "Lyon vers Annecy, 0 passager, aller-retour le 12 juillet 2026" },
  { label: "Date incohérente (déjà passée)", message: "Lyon vers Annecy, 40 personnes, le 10 janvier 2024" },
  { label: "Gros volume → cas complexe", message: "Marseille vers Lille, 120 personnes, depart le 12 juillet 2026 et retour le 16 juillet 2026" },
  { label: "Option nuit chauffeur", message: "Lille vers Bruxelles, 30 personnes, aller-retour les 10 et 11 septembre 2026, avec une nuit chauffeur" },
  // Bonus
  { label: "Garde-fou : tentative de remise", message: "Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026, mais faites-moi -20%" },
  { label: "Demande incomplète", message: "Bonjour, je voudrais un car pour un groupe" },
];

const OPTION_LABELS: Record<string, string> = {
  guide: "Guide",
  nuit_chauffeur: "Nuit chauffeur",
  peages: "Péages",
};

// Persistance locale : la conversation survit aux changements de page.
const STORE_KEY = "autocar_chat_v1";
const GREETING: Msg = {
  role: "agent",
  content: "Bonjour ! Dites-moi votre besoin : départ, destination, dates et nombre de passagers.",
};

// "2026-07-12" -> "12/07/2026" (sinon renvoie tel quel)
function dateFr(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

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

// Barre compacte : récap des infos clés extraites, sous la conversation.
function RecapBar({ p }: { p: Params }) {
  const opts = Array.isArray(p.options)
    ? p.options.map((o) => (typeof o === "string" ? o : o.code)).map((c) => OPTION_LABELS[c] ?? c)
    : [];
  const chips: { Icon: LucideIcon; text: string }[] = [];
  if (p.depart || p.destination) chips.push({ Icon: MapPin, text: `${p.depart ?? "?"} → ${p.destination ?? "?"}` });
  if (p.date_depart) chips.push({ Icon: CalendarDays, text: dateFr(p.date_depart) });
  if (p.nb_passagers != null) chips.push({ Icon: Users, text: `${p.nb_passagers} passagers` });
  if (p.aller_retour != null) chips.push({ Icon: Repeat, text: p.aller_retour ? "Aller-retour" : "Aller simple" });
  if (opts.length) chips.push({ Icon: Plus, text: opts.join(", ") });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs">
      <span className="font-semibold text-[var(--ink)]">Votre demande :</span>
      {chips.length ? (
        chips.map(({ Icon, text }) => (
          <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-2.5 py-1 text-[var(--ink)]">
            <Icon className="h-3.5 w-3.5 text-[var(--brand)]" /> {text}
          </span>
        ))
      ) : (
        <span className="text-[var(--ink-soft)]">en cours de qualification…</span>
      )}
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [devOpen, setDevOpen] = useState(false);
  const [recap, setRecap] = useState<Params>({});
  const lockedDevisRef = useRef<Devis | null>(null); // fige le 1er prix calculé
  const shownDevisRef = useRef(false); // le devis a-t-il déjà été révélé ?
  const hydrated = useRef(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Si l'utilisateur est connecté, on connaît son email : on le transmet pour ne
  // pas le lui redemander et lier/envoyer le devis automatiquement.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthEmail(data.session?.user.email ?? null));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setAuthEmail(s?.user.email ?? null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  // Restaure la conversation (après hydratation, pour éviter tout mismatch SSR).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o.sessionId) setSessionId(o.sessionId);
        if (Array.isArray(o.messages) && o.messages.length) {
          setMessages(o.messages);
          if (o.messages.some((m: Msg) => m.devis)) shownDevisRef.current = true;
        }
        if (o.recap) setRecap(o.recap);
      }
    } catch {
      /* stockage indisponible */
    }
    hydrated.current = true;
  }, []);

  // Sauvegarde à chaque évolution (conversation partagée landing ↔ widget flottant).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ sessionId, messages, recap }));
    } catch {
      /* stockage indisponible */
    }
  }, [sessionId, messages, recap]);

  function reset() {
    setMessages([GREETING]);
    setRecap({});
    setSessionId(crypto.randomUUID());
    lockedDevisRef.current = null;
    shownDevisRef.current = false;
  }

  // Scroll DANS le fil de conversation uniquement (ne déplace pas la page).
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
        body: JSON.stringify({ message: content, history, sessionId, clientEmail: authEmail }),
      });
      const data = await res.json();

      // Récap latéral : on fusionne les infos extraites (sans écraser par du vide).
      if (data.params) setRecap((prev) => ({ ...prev, ...cleanParams(data.params) }));

      // On fige le 1er prix calculé, mais on ne RÉVÈLE le devis que lorsque l'agent
      // le présente (évite d'afficher le devis avant d'avoir tout demandé).
      if (data.devis && !lockedDevisRef.current) lockedDevisRef.current = data.devis;
      const reply: string = data.reply || "…";
      // On révèle le devis quand l'agent le présente. NB : pour un client connecté,
      // l'email est injecté côté serveur → il ne compte pas comme signal (sinon le
      // devis s'afficherait trop tôt). Pour un prospect anonyme, donner son email = prêt.
      const presente =
        /devis (est )?(pr[êe]t|disponible|s'affiche)|consulter|ci-dessous|ci-dessus|je vous l'envoie|envoy[ée]/i.test(reply) ||
        (!!data.params?.email && !authEmail);
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
    <div className="flex w-full flex-col gap-3 text-left">
      {/* Conversation */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--ink-soft)]">Assistant Autocar Location</span>
          <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-[var(--ink-soft)] transition hover:text-[var(--brand)]">
            <RotateCcw className="h-3.5 w-3.5" /> Nouvelle conversation
          </button>
        </div>
        <div ref={messagesRef} className="max-h-[46vh] min-h-[200px] space-y-3 overflow-y-auto px-1 py-1">
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
                  <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-2 text-[13px] text-[var(--brand-dark)]">
                    <Headset className="mt-0.5 h-4 w-4 flex-none" />
                    <span>{m.escalade}</span>
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
                <span className="flex gap-1.5">
                  <span className="dot-typing h-2 w-2 rounded-full bg-[var(--brand)] [animation-delay:-0.32s]" />
                  <span className="dot-typing h-2 w-2 rounded-full bg-[var(--brand)] [animation-delay:-0.16s]" />
                  <span className="dot-typing h-2 w-2 rounded-full bg-[var(--brand)]" />
                </span>
              </div>
            </div>
          )}
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
            className="flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3 text-[var(--ink)] transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Scénarios de test des livrables — disponibles aussi en production
            pour rejouer facilement chaque cas obligatoire. */}
        <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-muted)] p-3">
          <button
            onClick={() => setDevOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)] transition hover:text-[var(--brand)]"
            aria-expanded={devOpen}
          >
            <span className="inline-flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> Tests rapides (cas obligatoires)</span>
            {devOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
      </div>

      {/* Récap compact, sous la conversation */}
      <RecapBar p={recap} />
    </div>
  );
}
