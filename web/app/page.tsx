import Chat from "./components/Chat";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* En-tête */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-6 py-3 backdrop-blur">
        <span className="text-lg font-bold text-[var(--brand)]">NeoTravel</span>
        <nav className="hidden gap-6 text-sm text-[var(--ink-soft)] sm:flex">
          <a href="#comment">Comment ça marche</a>
          <a href="#avis">Avis</a>
        </nav>
        <a
          href="/admin"
          className="rounded-full border border-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand)]"
        >
          Espace pro
        </a>
      </header>

      {/* Hero conversationnel */}
      <section className="flex flex-1 flex-col items-center bg-gradient-to-b from-white to-[var(--brand-soft)] px-4 py-10 sm:py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Où partez-vous en groupe ?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[var(--ink-soft)] sm:text-lg">
            Décrivez votre trajet, on s&apos;occupe du reste — réponse en
            quelques minutes.
          </p>
          <div className="mt-6">
            <Chat />
          </div>
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            ✓ Depuis 2010 · ✓ Autocaristes qualifiés · ✓ Devis gratuit &amp;
            sans engagement
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="bg-[var(--bg-muted)] px-6 py-12">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            ["1", "Vous décrivez", "Votre besoin en langage naturel, dans la conversation."],
            ["2", "On qualifie & chiffre", "L'assistant structure la demande et calcule un devis fiable."],
            ["3", "Vous recevez votre devis", "Par email, avec le détail — clair et sans engagement."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-xl border border-[var(--border)] bg-white p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] font-bold text-white">
                {n}
              </div>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b1f1a] px-6 py-8 text-sm text-white/70">
        <div className="mx-auto flex max-w-4xl flex-col justify-between gap-2 sm:flex-row">
          <span>© {new Date().getFullYear()} NeoTravel — Transport de groupe</span>
          <span>Mentions légales · RGPD · Contact</span>
        </div>
      </footer>
    </div>
  );
}
