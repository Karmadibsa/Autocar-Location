import { Info } from "lucide-react";

export const metadata = { title: "Confidentialité & RGPD — Autocar Location" };

export default function Confidentialite() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="text-2xl font-bold">Confidentialité &amp; RGPD</h1>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)]">
        <Info className="mt-0.5 h-4 w-4 flex-none" />
        <span>
          <b>Projet étudiant Epitech</b> — application de démonstration. Les données
          saisies servent uniquement à illustrer le fonctionnement du prototype et ne font
          l'objet d'aucune exploitation commerciale.
        </span>
      </div>

      <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <div>
          <h2 className="font-semibold">Données collectées</h2>
          <p className="text-[var(--ink-soft)]">
            Lors d'une demande de devis : prénom, nom, email, éventuellement téléphone et
            adresse (pour la facturation), ainsi que les détails du trajet (villes, dates,
            nombre de passagers).
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Finalité</h2>
          <p className="text-[var(--ink-soft)]">
            Établir un devis de démonstration, permettre son suivi dans l'espace client et,
            le cas échéant, des relances automatiques. Aucune revente ni profilage publicitaire.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Conservation</h2>
          <p className="text-[var(--ink-soft)]">
            Les données de démonstration peuvent être réinitialisées à tout moment. Elles ne
            sont pas conservées au-delà des besoins du projet pédagogique.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Vos droits</h2>
          <p className="text-[var(--ink-soft)]">
            Conformément au RGPD : accès, rectification et suppression de vos données. Pour
            toute demande :{" "}
            <a className="text-[var(--brand)] underline hover:text-[var(--brand-dark)]" href="mailto:contact@am-creative.fr">
              contact@am-creative.fr
            </a>.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Sécurité</h2>
          <p className="text-[var(--ink-soft)]">
            Authentification par mot de passe, cloisonnement des données par utilisateur
            (Row Level Security), accès serveur protégés. Les secrets ne sont jamais exposés
            côté navigateur.
          </p>
        </div>
      </section>
    </main>
  );
}
