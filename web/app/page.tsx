import Chat from "./components/Chat";
import Header from "./components/Header";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Header />

      {/* Hero conversationnel */}
      <section className="flex flex-col items-center bg-gradient-to-b from-white to-[var(--brand-soft)] px-4 pb-14 pt-10 sm:pt-16">
        <div className="w-full max-w-2xl text-center">
          <span className="inline-block rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">
            Transport de groupe en autocar · depuis 2010
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Où partez-vous en groupe ?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[var(--ink-soft)] sm:text-lg">
            Décrivez votre trajet, on s&apos;occupe du reste — un devis clair en
            quelques minutes, sans engagement.
          </p>
          <div className="mt-6">
            <Chat />
          </div>
          <p className="mt-4 text-sm text-[var(--ink-soft)]">
            ✓ Autocaristes qualifiés · ✓ Devis gratuit · ✓ Conseiller humain pour les cas complexes
          </p>
        </div>
      </section>

      {/* Bande confiance */}
      <section className="border-y border-[var(--border)] bg-white px-6 py-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            ["15 ans", "d'expérience"],
            ["Réseau", "d'autocaristes partenaires"],
            ["National", "couverture France & étranger"],
            ["< 24 h", "réponse à votre demande"],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="text-xl font-bold text-[var(--brand)]">{big}</div>
              <div className="text-sm text-[var(--ink-soft)]">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="bg-[var(--bg-muted)] px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold">Comment ça marche</h2>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            ["1", "Vous décrivez", "Votre besoin en langage naturel, dans la conversation."],
            ["2", "On qualifie & chiffre", "L'assistant structure la demande et calcule un devis fiable."],
            ["3", "Vous recevez votre devis", "Par email, avec le détail — et vous le suivez dans votre espace."],
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
