import { Info } from "lucide-react";

export const metadata = { title: "Conditions générales de vente — Autocar Location" };

export default function CGV() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <h1 className="text-2xl font-bold">Conditions générales de vente</h1>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)]">
        <Info className="mt-0.5 h-4 w-4 flex-none" />
        <span>
          <b>Projet étudiant Epitech.</b> Ces CGV sont fournies à titre de démonstration
          pédagogique et n'ont pas de valeur contractuelle réelle.
        </span>
      </div>

      <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
        <div>
          <h2 className="font-semibold">1. Objet</h2>
          <p className="text-[var(--ink-soft)]">
            Les présentes conditions régissent l'établissement et l'acceptation des devis de
            transport de groupe en autocar avec chauffeur proposés par Autocar Location, en
            qualité d'intermédiaire entre le client et des autocaristes partenaires.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">2. Devis et prix</h2>
          <p className="text-[var(--ink-soft)]">
            Chaque devis indique un prix HT, la TVA applicable (10 %) et le prix TTC. Le tarif
            est ferme pendant la durée de validité indiquée (30 jours), sous réserve de
            disponibilité des véhicules à la date demandée. Les prix tiennent compte de la
            distance, de la saison, de l'anticipation et de la capacité.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">3. Acceptation et signature</h2>
          <p className="text-[var(--ink-soft)]">
            L'acceptation s'effectue en ligne par signature électronique simple (saisie du nom,
            tracé de signature et horodatage), valant accord sur le montant et les présentes
            conditions. Un exemplaire signé du devis est mis à disposition du client.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">4. Paiement</h2>
          <p className="text-[var(--ink-soft)]">
            Les modalités de paiement (acompte, solde) sont précisées lors de la confirmation
            de la prestation par un conseiller.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">5. Annulation</h2>
          <p className="text-[var(--ink-soft)]">
            Toute annulation doit être signalée au plus tôt. Des frais peuvent s'appliquer
            selon le délai de prévenance et les conditions de l'autocariste partenaire.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">6. Responsabilité</h2>
          <p className="text-[var(--ink-soft)]">
            Autocar Location agit en tant qu'intermédiaire. L'exécution du transport relève de
            l'autocariste partenaire, soumis à la réglementation applicable au transport de
            personnes.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">7. Données personnelles</h2>
          <p className="text-[var(--ink-soft)]">
            Le traitement des données est décrit dans la page Confidentialité &amp; RGPD.
          </p>
        </div>
      </section>
    </main>
  );
}
