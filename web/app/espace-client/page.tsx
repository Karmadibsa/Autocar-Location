"use client";

// Onglet "Mes devis" : liste des devis (télécharger, accepter / refuser + motifs).
// La garde d'accès, l'en-tête et les onglets sont gérés par le layout.
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { MessageCircle, PenLine } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import StatutBadge from "@/app/components/StatutBadge";

type Message = { role: string; content: string; ts?: string };
type Devis = {
  id: string;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  devise: string | null;
  statut: string;
  created_at: string;
  demandes?: { msg_non_lu_client?: boolean } | null;
};
const RAISONS_REFUS = [
  "Prix trop élevé",
  "Délai / disponibilité",
  "Meilleure offre ailleurs",
  "Projet annulé ou reporté",
  "Autre",
];

export default function MesDevis() {
  const { session } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [aAdresse, setAAdresse] = useState(true);
  const [refusId, setRefusId] = useState<string | null>(null);
  const [raisons, setRaisons] = useState<string[]>([]);
  const [adresseAlerte, setAdresseAlerte] = useState(false);
  const [msgOpen, setMsgOpen] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);
  // Signature électronique (modale d'acceptation)
  const [signId, setSignId] = useState<string | null>(null);
  const [signNom, setSignNom] = useState("");
  const [cgvOk, setCgvOk] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [nomDefaut, setNomDefaut] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const loadData = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    setDevis(d.devis ?? []);
    setAAdresse(!!d.profil?.adresse);
    setNomDefaut([d.profil?.prenom, d.profil?.nom].filter(Boolean).join(" "));
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function repondre(
    id: string,
    reponse: "accepte" | "refuse",
    motifs?: string[],
    extra?: { signature: string; signePar: string; cgv: boolean },
  ) {
    if (!session) return;
    await fetch("/api/devis-reponse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, reponse, raisons: motifs, ...extra }),
    });
    if (reponse === "accepte" && !aAdresse) setAdresseAlerte(true);
    loadData();
  }

  // --- Pad de signature (canvas) ---
  function ouvrirSignature(id: string) {
    setSignId(id);
    setSignNom(nomDefaut);
    setCgvOk(false);
    setHasDrawn(false);
  }
  function sigPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function sigDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;
    c.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = sigPos(e);
  }
  function sigMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const l = lastRef.current;
    if (!ctx || !l) return;
    const p = sigPos(e);
    ctx.strokeStyle = "#14201d";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(l.x, l.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    setHasDrawn(true);
  }
  function sigUp() {
    drawingRef.current = false;
    lastRef.current = null;
  }
  function effacerSignature() {
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasDrawn(false);
  }
  async function confirmerSignature() {
    const c = canvasRef.current;
    if (!c || !signId || !hasDrawn || !cgvOk || !signNom.trim()) return;
    await repondre(signId, "accepte", undefined, {
      signature: c.toDataURL("image/png"),
      signePar: signNom.trim(),
      cgv: true,
    });
    setSignId(null);
  }

  function toggleRaison(r: string) {
    setRaisons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  const openMessages = useCallback(
    async (id: string) => {
      if (!session) return;
      if (msgOpen === id) {
        setMsgOpen(null);
        return;
      }
      setMsgOpen(id);
      setThread([]);
      setMsgInput("");
      setMsgLoading(true);
      const r = await fetch("/api/devis-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.access_token, id }),
      });
      const j = await r.json();
      setThread(j.messages ?? []);
      setMsgLoading(false);
      loadData(); // le drapeau "non lu" a été remis à zéro côté serveur
    },
    [session, msgOpen, loadData],
  );

  async function sendMessage(id: string) {
    if (!session || !msgInput.trim()) return;
    const r = await fetch("/api/devis-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token, id, message: msgInput.trim() }),
    });
    const j = await r.json();
    setThread(j.messages ?? []);
    setMsgInput("");
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

  const nbEnAttente = devis.filter((d) => d.statut === "envoye").length;
  const nbAcceptes = devis.filter((d) => d.statut === "accepte").length;

  return (
    <>
      {/* Résumé client (mini-dashboard) */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Devis", devis.length],
          ["En attente", nbEnAttente],
          ["Acceptés", nbAcceptes],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-white p-4 text-center">
            <div className="text-2xl font-bold text-[var(--brand)]">{val}</div>
            <div className="text-xs text-[var(--ink-soft)]">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 text-lg font-semibold">Mes devis</h2>

      {adresseAlerte && (
        <div className="mt-2 rounded-xl border border-[#E08A1E] bg-[#FDF4E6] p-3 text-sm text-[#8A5A12]">
          Merci d&apos;avoir accepté ! Pour une facture en bonne et due forme,{" "}
          <Link href="/espace-client/compte" className="font-semibold underline">
            complétez votre adresse
          </Link>
          .
        </div>
      )}

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
                      onClick={() => ouvrirSignature(d.id)}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      <PenLine className="h-3.5 w-3.5" /> Accepter et signer
                    </button>
                    <button
                      onClick={() => {
                        setRefusId(d.id);
                        setRaisons([]);
                      }}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)] transition hover:border-[#A12B2B] hover:text-[#A12B2B]"
                    >
                      Refuser
                    </button>
                  </>
                )}
                {d.statut === "accepte" && (
                  <span className="text-xs font-medium text-[var(--brand)]">Devis accepté — merci !</span>
                )}
                {d.statut === "refuse" && (
                  <span className="text-xs text-[var(--ink-soft)]">Devis refusé.</span>
                )}
              </div>
              {refusId === d.id && (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-xs">
                  <p className="font-medium text-[var(--ink)]">Pour nous aider à progresser, pourquoi refusez-vous ?</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {RAISONS_REFUS.map((r) => (
                      <label key={r} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={raisons.includes(r)}
                          onChange={() => toggleRaison(r)}
                          className="h-3.5 w-3.5 accent-[var(--brand)]"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        repondre(d.id, "refuse", raisons);
                        setRefusId(null);
                      }}
                      className="rounded-full bg-[#A12B2B] px-3 py-1.5 font-medium text-white transition hover:opacity-90"
                    >
                      Confirmer le refus
                    </button>
                    <button
                      onClick={() => setRefusId(null)}
                      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[var(--ink-soft)] transition hover:bg-white"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Messagerie HITL : fil de discussion par devis (client <-> conseiller) */}
              <div className="mt-3 border-t border-[var(--border)] pt-2">
                <button
                  onClick={() => openMessages(d.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] transition hover:text-[var(--brand-dark)]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {msgOpen === d.id ? "Masquer les messages" : "Messages / précisions"}
                  {d.demandes?.msg_non_lu_client && (
                    <span
                      className="ml-1 inline-block h-2 w-2 rounded-full bg-[#A12B2B]"
                      aria-label="Nouvelle réponse du conseiller"
                    />
                  )}
                </button>
                {msgOpen === d.id && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-3">
                    {msgLoading ? (
                      <p className="text-xs text-[var(--ink-soft)]">Chargement…</p>
                    ) : thread.length === 0 ? (
                      <p className="text-xs text-[var(--ink-soft)]">
                        Aucun message. Posez une question ou ajoutez une précision sur ce devis.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {thread.map((m, i) => {
                          const moi = m.role === "user";
                          return (
                            <li key={i} className={`flex ${moi ? "justify-end" : "justify-start"}`}>
                              <span
                                className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                                  moi
                                    ? "bg-[var(--brand)] text-white"
                                    : "border border-[var(--border)] bg-white text-[var(--ink)]"
                                }`}
                              >
                                {!moi && (
                                  <span className="mb-0.5 block text-[10px] font-semibold opacity-70">
                                    {m.role === "admin" ? "Conseiller" : "Assistant"}
                                  </span>
                                )}
                                {m.content}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="mt-2 flex gap-2">
                      <input
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage(d.id)}
                        placeholder="Votre message…"
                        className="flex-1 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs outline-none focus:border-[var(--brand)]"
                      />
                      <button
                        onClick={() => sendMessage(d.id)}
                        disabled={!msgInput.trim()}
                        className="rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-40"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale de signature électronique (acceptation) */}
      {signId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Signature du devis">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <PenLine className="h-5 w-5 text-[var(--brand)]" /> Accepter et signer le devis
            </h3>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Signez ci-dessous, indiquez votre nom et acceptez les conditions pour valider votre accord.
            </p>

            <label className="mt-3 block text-xs font-medium text-[var(--ink)]">Nom du signataire</label>
            <input
              value={signNom}
              onChange={(e) => setSignNom(e.target.value)}
              placeholder="Prénom NOM"
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />

            <div className="mt-3 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--ink)]">Votre signature</label>
              <button onClick={effacerSignature} className="text-xs text-[var(--brand)] underline hover:text-[var(--brand-dark)]">
                Effacer
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={420}
              height={150}
              onPointerDown={sigDown}
              onPointerMove={sigMove}
              onPointerUp={sigUp}
              onPointerLeave={sigUp}
              className="mt-1 w-full touch-none rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-muted)]"
            />

            <label className="mt-3 flex items-start gap-2 text-xs text-[var(--ink)]">
              <input type="checkbox" checked={cgvOk} onChange={(e) => setCgvOk(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
              <span>
                J&apos;accepte le devis et les{" "}
                <Link href="/cgv" target="_blank" className="text-[var(--brand)] underline hover:text-[var(--brand-dark)]">
                  conditions générales de vente
                </Link>
                .
              </span>
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSignId(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:bg-[var(--bg-muted)]"
              >
                Annuler
              </button>
              <button
                onClick={confirmerSignature}
                disabled={!hasDrawn || !cgvOk || !signNom.trim()}
                className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-40"
              >
                Valider ma signature
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
