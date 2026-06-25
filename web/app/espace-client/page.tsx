"use client";

// Portail client (protégé) : devis, réponses, conversations, gestion du compte.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";
import Spinner from "@/app/components/Spinner";

type Devis = {
  id: string;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  devise: string | null;
  statut: string;
  created_at: string;
};
type Message = { role: string; contenu?: string; content?: string };
type Conversation = { id: string; messages: Message[] | null; updated_at: string };
type Profil = {
  prenom: string;
  nom: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
};
const PROFIL_VIDE: Profil = { prenom: "", nom: "", telephone: "", adresse: "", code_postal: "", ville: "" };

export default function EspaceClient() {
  const router = useRouter();
  const { loading, email, role, session } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profil, setProfil] = useState<Profil>(PROFIL_VIDE);
  const [profilMsg, setProfilMsg] = useState("");
  const [manqueAdresse, setManqueAdresse] = useState(false);

  useEffect(() => {
    if (!loading && !email) router.replace("/login");
  }, [loading, email, router]);

  const loadData = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    setDevis(d.devis ?? []);
    setConversations(d.conversations ?? []);
    if (d.profil) setProfil({ ...PROFIL_VIDE, ...cleanProfil(d.profil) });
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function repondre(id: string, reponse: "accepte" | "refuse") {
    if (!session) return;
    await fetch("/api/devis-reponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, reponse }),
    });
    // Pour une facture en bonne et due forme, on invite à compléter l'adresse.
    if (reponse === "accepte" && !profil.adresse) {
      setManqueAdresse(true);
      document.getElementById("mon-compte")?.scrollIntoView({ behavior: "smooth" });
    }
    loadData();
  }

  async function saveProfil(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setProfilMsg("Enregistrement…");
    const r = await fetch("/api/profil-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, ...profil }),
    });
    const j = await r.json();
    setProfilMsg(j.ok ? "✓ Coordonnées enregistrées." : "Erreur");
    if (j.ok && profil.adresse) setManqueAdresse(false);
  }

  async function downloadPdf(id: string) {
    if (!session) return;
    const res = await fetch("/api/devis-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token: session.access_token }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devis-autocar-location.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !email) {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  const champ = (k: keyof Profil) => ({
    value: profil[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setProfil((p) => ({ ...p, [k]: e.target.value })),
    className:
      "w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]",
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mon espace</h1>
          <p className="text-sm text-[var(--ink-soft)]">
            Bonjour {profil.prenom || email}, content de vous revoir.
          </p>
        </div>
        <a href="/" className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]">
          + Nouveau devis
        </a>
      </div>

      {role === "admin" && (
        <a
          href="/admin"
          className="mt-4 block rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)] transition hover:bg-white"
        >
          Vous êtes administrateur → accéder au <b>dashboard de pilotage</b>.
        </a>
      )}

      <h2 className="mt-6 text-lg font-semibold">Mes devis</h2>
      {devis.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">
          Aucun devis lié à cet email. Cliquez « Nouveau devis » et indiquez cet email.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          {devis.map((d) => (
            <div key={d.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--ink-soft)]">
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  <StatutBadge statut={d.statut} />
                </div>
                <span className="font-bold text-[var(--brand)]">
                  {d.prix_ttc?.toFixed(2)} {d.devise ?? "EUR"} TTC
                </span>
              </div>
              <div className="mt-2 text-[12px] text-[var(--ink-soft)]">
                <div className="flex justify-between">
                  <span>Prestation de transport</span>
                  <span>{d.prix_ht?.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA (10 %)</span>
                  <span>{d.tva?.toFixed(2)} €</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => downloadPdf(d.id)}
                  className="rounded-full border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--brand-soft)]"
                >
                  Télécharger le PDF
                </button>
                {d.statut === "envoye" && (
                  <>
                    <button
                      onClick={() => repondre(d.id, "accepte")}
                      className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      Accepter le devis
                    </button>
                    <button
                      onClick={() => repondre(d.id, "refuse")}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[#A12B2B] hover:text-[#A12B2B]"
                    >
                      Refuser
                    </button>
                  </>
                )}
                {d.statut === "accepte" && (
                  <span className="text-xs font-medium text-[var(--brand)]">✓ Devis accepté — merci !</span>
                )}
                {d.statut === "refuse" && (
                  <span className="text-xs text-[var(--ink-soft)]">Devis refusé.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mon compte */}
      <h2 id="mon-compte" className="mt-8 scroll-mt-20 text-lg font-semibold">Mon compte</h2>
      {manqueAdresse && (
        <div className="mt-2 rounded-xl border border-[#E08A1E] bg-[#FDF4E6] p-3 text-sm text-[#8A5A12]">
          Merci d'avoir accepté ! Complétez votre <b>adresse</b> ci-dessous pour une facture en bonne et due forme.
        </div>
      )}
      <form onSubmit={saveProfil} className="mt-2 rounded-xl border border-[var(--border)] bg-white p-4">
        <p className="text-xs text-[var(--ink-soft)]">Email : {email}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input placeholder="Prénom" aria-label="Prénom" {...champ("prenom")} />
          <input placeholder="Nom" aria-label="Nom" {...champ("nom")} />
          <input placeholder="Téléphone" aria-label="Téléphone" {...champ("telephone")} />
          <input placeholder="Adresse" aria-label="Adresse" {...champ("adresse")} />
          <input placeholder="Code postal" aria-label="Code postal" {...champ("code_postal")} />
          <input placeholder="Ville" aria-label="Ville" {...champ("ville")} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Enregistrer
          </button>
          {profilMsg && <span className="text-sm text-[var(--ink-soft)]">{profilMsg}</span>}
        </div>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Mes conversations</h2>
      {conversations.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">Aucune conversation.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {conversations.map((c) => (
            <details key={c.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <summary className="cursor-pointer text-sm text-[var(--ink-soft)]">
                Conversation du {new Date(c.updated_at).toLocaleDateString("fr-FR")}
              </summary>
              <div className="mt-2 space-y-1 text-sm">
                {(c.messages ?? []).map((m, i) => (
                  <p key={i}>
                    <span className="font-semibold">{m.role === "user" ? "Vous" : "Autocar Location"} :</span>{" "}
                    {m.contenu ?? m.content}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}

function cleanProfil(p: Record<string, unknown>): Partial<Profil> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) if (typeof v === "string") out[k] = v;
  return out as Partial<Profil>;
}
