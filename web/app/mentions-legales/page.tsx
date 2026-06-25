export const metadata = { title: "Mentions légales — Autocar Location" };

export default function MentionsLegales() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="text-2xl font-bold">Mentions légales</h1>

      <div className="mt-3 rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)]">
        ⚠️ <b>Projet étudiant Epitech.</b> « Autocar Location » est une application de
        démonstration réalisée dans un cadre pédagogique (MBA Epitech). Ce n'est <b>pas</b>
        une société réelle et aucune prestation de transport n'est réellement vendue.
      </div>

      <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <div>
          <h2 className="font-semibold">Éditeur</h2>
          <p className="text-[var(--ink-soft)]">
            Projet académique étudiant (Epitech). Aucune immatriculation commerciale.
            Contact : <a className="text-[var(--brand)] underline hover:text-[var(--brand-dark)]" href="mailto:contact@am-creative.fr">contact@am-creative.fr</a>.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Hébergement</h2>
          <p className="text-[var(--ink-soft)]">
            Front hébergé sur Vercel ; base de données et authentification sur Supabase.
            Données stockées dans l'Union européenne.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Propriété intellectuelle</h2>
          <p className="text-[var(--ink-soft)]">
            Le logo et les contenus sont utilisés à des fins de démonstration pédagogique
            uniquement.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Données personnelles</h2>
          <p className="text-[var(--ink-soft)]">
            Voir la page{" "}
            <a className="text-[var(--brand)] underline hover:text-[var(--brand-dark)]" href="/confidentialite">
              Confidentialité &amp; RGPD
            </a>.
          </p>
        </div>
      </section>
    </main>
  );
}
