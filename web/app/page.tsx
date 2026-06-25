import Chat from "./components/Chat";

const STATS: [string, string][] = [
  ["15 ans", "d'expérience"],
  ["+500", "groupes transportés / an"],
  ["France & UE", "couverture nationale"],
  ["< 24 h", "réponse garantie"],
];

const STEPS: [string, string, string][] = [
  ["1", "Vous décrivez", "Votre trajet en langage naturel, dans la conversation — comme un SMS."],
  ["2", "On qualifie & chiffre", "L'assistant structure la demande et calcule un devis fiable et transparent."],
  ["3", "Vous recevez votre devis", "Par email avec le PDF, et vous le suivez dans votre espace client."],
];

const FEATURES: [string, string, string][] = [
  ["💶", "Tarif transparent", "Un prix calculé sur des règles claires (distance, saison, capacité), jamais au hasard."],
  ["⚡", "Réponse immédiate", "Plus besoin d'attendre un rappel : votre estimation arrive dans la conversation."],
  ["🧑‍✈️", "Conseiller humain", "Les cas complexes (grands groupes, sur-mesure) sont pris en charge par un expert."],
  ["🔒", "Données protégées", "Vos informations restent confidentielles (RGPD), utilisées uniquement pour votre devis."],
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--brand-soft)] via-white to-white">
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[var(--brand)]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-12 text-center sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-white/70 px-4 py-1.5 text-xs font-semibold text-[var(--brand-dark)] backdrop-blur">
            ★ Spécialiste de l'autocar de groupe · depuis 2010
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Votre devis autocar,{" "}
            <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] bg-clip-text text-transparent">
              en quelques minutes
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[var(--ink-soft)] sm:text-lg">
            Décrivez votre trajet de groupe, notre assistant le qualifie et vous chiffre
            un devis clair, sans engagement.
          </p>

          {/* Widget de conversation (cœur de l'app) */}
          <div id="devis" className="mt-8 scroll-mt-20">
            <Chat />
          </div>

          <p className="mt-5 text-sm text-[var(--ink-soft)]">
            ✓ Autocaristes qualifiés &nbsp;·&nbsp; ✓ Devis gratuit &nbsp;·&nbsp; ✓ Conseiller humain pour les cas complexes
          </p>
        </div>
      </section>

      {/* ---------- BANDE STATS ---------- */}
      <section className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-6 py-10 text-center sm:grid-cols-4">
          {STATS.map(([big, small]) => (
            <div key={small}>
              <div className="text-2xl font-bold text-[var(--brand)] sm:text-3xl">{big}</div>
              <div className="mt-1 text-sm text-[var(--ink-soft)]">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- COMMENT ÇA MARCHE ---------- */}
      <section id="comment" className="bg-[var(--bg-muted)] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Comment ça marche</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-[var(--ink-soft)]">
            Trois étapes, zéro paperasse.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([n, t, d]) => (
              <div
                key={n}
                className="relative rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-lg font-bold text-white">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- POURQUOI NOUS ---------- */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Pourquoi Autocar Location</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(([icon, t, d]) => (
              <div
                key={t}
                className="rounded-2xl border border-[var(--border)] bg-white p-6 transition hover:border-[var(--brand)] hover:shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-2xl">
                  {icon}
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-[var(--brand)] px-8 py-12 text-center text-white shadow-lg">
          <h2 className="text-2xl font-bold sm:text-3xl">Prêt à organiser votre voyage ?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Obtenez votre estimation maintenant — c'est gratuit et sans engagement.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#devis"
              className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]"
            >
              Composer mon devis
            </a>
            <a
              href="/espace-client"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Accéder à mon espace
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
