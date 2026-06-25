// Pastille de statut (commune admin + client), avec libellé FR et couleur.
const MAP: Record<string, [string, string, string]> = {
  // [libellé, fond, texte]
  nouveau_lead: ["Nouveau lead", "#EEF1F0", "#5C6B66"],
  incomplete: ["Incomplète", "#FDF1DE", "#8A5A12"],
  qualifiee: ["Qualifiée", "#E3EEFB", "#1E4E8C"],
  devis_envoye: ["Devis envoyé", "#D9F0EA", "#0A5346"],
  envoye: ["Envoyé", "#D9F0EA", "#0A5346"],
  relance_1: ["Relance 1", "#FDF1DE", "#8A5A12"],
  relance_2: ["Relance 2", "#FDF1DE", "#8A5A12"],
  accepte: ["Accepté", "#DDF3E4", "#1B7A43"],
  refuse: ["Refusé", "#FBE3E3", "#A12B2B"],
  cas_complexe: ["Cas complexe", "#EDE6FB", "#5B3FA0"],
  cloture: ["Clôturé", "#EEF1F0", "#5C6B66"],
  brouillon: ["Brouillon", "#EEF1F0", "#5C6B66"],
  expire: ["Expiré", "#EEF1F0", "#5C6B66"],
};

export default function StatutBadge({ statut }: { statut: string }) {
  const [label, bg, fg] = MAP[statut] ?? [statut, "#EEF1F0", "#5C6B66"];
  return (
    <span
      style={{ background: bg, color: fg }}
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
    >
      {label}
    </span>
  );
}
