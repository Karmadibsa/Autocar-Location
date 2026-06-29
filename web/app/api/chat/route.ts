// Route du chat : relaie vers l'agent n8n, puis (best-effort) persiste dans
// Supabase et envoie le devis par email. La persistance ne bloque jamais la réponse.
import { getAdminClient } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDevisPdf, refDevis } from "@/lib/devisPdf";
import { calculerDevis } from "@/lib/calculerDevis";
import { analyserTrajet } from "@/lib/distance";
import { estUrgent, prochaineRelance } from "@/lib/relances";
import { devisEmailHtml } from "@/lib/emailDevis";
import { estEmailDemo } from "@/lib/emailGuard";

type Devis = {
  prix_ht?: number;
  tva?: number;
  prix_ttc?: number;
  devise?: string;
  lignes?: { libelle: string; montant: number }[];
  coefficients?: unknown;
};
type Params = {
  nb_passagers?: number;
  date_depart?: string;
  date_retour?: string;
  aller_retour?: boolean;
  distance_km?: number;
  options?: unknown;
  depart?: string;
  destination?: string;
  email?: string;
  nom?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const webhook = process.env.N8N_WEBHOOK_URL;
  const sessionId: string | undefined = body?.sessionId;
  const history = body?.history;
  const clientEmail: string | undefined = body?.clientEmail || undefined; // si connecté

  if (!webhook) {
    return Response.json({
      reply: "👋 L'agent IA n'est pas encore connecté (N8N_WEBHOOK_URL absent).",
      stub: true,
    });
  }

  let data: { reply?: string; devis?: Devis | null; escalade?: string | null; params?: Params } = {};
  try {
    const res = await fetch(webhook, {
      method: "POST",
      // ngrok-skip-browser-warning : évite la page interstitielle d'ngrok (tunnel gratuit)
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[chat] n8n ${res.status}:`, text.slice(0, 400));
      return Response.json({
        reply: `L'agent a renvoyé une erreur ${res.status}. Workflow n8n activé ?`,
        error: true,
      });
    }
    try {
      data = JSON.parse(text);
    } catch {
      data = { reply: text };
    }
  } catch (e) {
    const cause = (e as { cause?: unknown })?.cause;
    const detail = e instanceof Error ? `${e.message}${cause ? " — " + String(cause) : ""}` : String(e);
    console.error("[chat] webhook injoignable:", detail);
    return Response.json({ reply: "Agent injoignable. " + detail, error: true });
  }

  // Garde-fou : Gemma "fuit" parfois son raisonnement interne (puces *, méta en
  // anglais). On ne garde que la réponse finale destinée au client.
  data.reply = nettoyerReply(data.reply);

  // Client connecté : on connaît déjà son email → on l'injecte pour lier/envoyer
  // le devis automatiquement (l'agent n'a pas besoin de le redemander).
  if (clientEmail) data.params = { ...(data.params ?? {}), email: clientEmail };

  // --- Cohérence des dates : un retour AVANT le départ est invalide ---
  const dDep = data.params?.date_depart;
  const dRet = data.params?.date_retour;
  if (dDep && dRet && dRet < dDep) {
    const fr = (s: string) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
    };
    return Response.json({
      reply: `La date de retour (${fr(dRet)}) est antérieure à la date de départ (${fr(dDep)}). Pouvez-vous corriger les dates ?`,
      devis: null,
      escalade: null,
      params: data.params,
    });
  }

  // --- Vérifs géographiques + distance routière réelle ---
  // hors France -> cas complexe (transfrontalier) ; ville ambiguë -> on demande le CP.
  const p = data.params ?? {};
  if (p.depart && p.destination) {
    const geo = await analyserTrajet(p.depart, p.destination);
    if (geo.horsFrance) {
      data.escalade = data.escalade ?? `Trajet hors France (${p.depart} -> ${p.destination}) : etude sur-mesure transfrontaliere.`;
      data.devis = null;
    } else if (geo.villesAmbigues.length) {
      // Pas encore de prix : on lève l'ambiguïté avant de chiffrer.
      return Response.json({
        reply: `Plusieurs communes portent ce nom (${geo.villesAmbigues.join(", ")}). Pouvez-vous m'indiquer le code postal pour que je cible la bonne ville ?`,
        devis: null,
        escalade: null,
        params: data.params,
      });
    } else if (geo.km) {
      const recalc = await devisAvecOSRM(data.params, data.devis, geo.km);
      if (recalc) data.devis = recalc;
    }
  }

  // --- Persistance + email ---
  // IMPORTANT : on AWAIT (en serverless, le travail non attendu après la réponse
  // n'est pas garanti de s'exécuter → l'email ne partirait jamais). On a le budget
  // de temps depuis qu'il n'y a qu'un seul appel LLM.
  try {
    await persist(sessionId, history, data);
  } catch (e) {
    console.error("[chat] persistance échouée:", e);
  }

  // Cas complexe (escalade) : on reste DISCRET côté client (jamais la raison interne
  // ni le seuil), et on RÉCLAME les coordonnées pour pouvoir recontacter.
  // La vraie raison reste en base (commentaire) pour l'admin — persist l'a déjà utilisée.
  let escaladeClient: string | null = null;
  if (data.escalade) {
    const emailConnu = clientEmail || data.params?.email;
    escaladeClient = "Demande prise en charge par un conseiller — réponse sous 24 h.";
    data.reply = emailConnu
      ? "Votre groupe nécessite une étude personnalisée : un conseiller vous établit un devis sur-mesure et vous recontacte sous 24 h. Merci !"
      : "Votre groupe nécessite une étude personnalisée par un conseiller. Laissez-moi votre email (et votre nom) pour qu'il vous recontacte sous 24 h.";
  }

  return Response.json({ reply: data.reply, devis: data.devis, escalade: escaladeClient, params: data.params });
}

// Supprime un éventuel raisonnement interne du modèle (Gemma) et ne garde que la
// réponse destinée au client (puces "*", méta anglaise = signaux de fuite).
function nettoyerReply(s?: string): string {
  const txt = (s ?? "").trim();
  if (!txt) return "";
  const fuite = /(\bCurrent State\b|\bSystem Status\b|\bAssistant's\b|\bClient's last\b|\bConstraint:|\bGoal:|^\s*\*\s)/im.test(txt);
  if (!fuite) return txt;
  const phrases = txt
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((p) => p.replace(/^[*\-\s]+/, "").trim())
    .filter(Boolean)
    .filter(
      (p) =>
        /vous|votre|devis|bonjour|merci|monsieur|madame|disposition|consulter/i.test(p) &&
        !/[*{}]/.test(p) &&
        !/(Current State|System Status|Assistant|Client's|Constraint|Goal|I need to|previous message|The (quote|user|customer|email|system))/i.test(p),
    );
  const out = phrases.slice(-2).join(" ").trim();
  return out || "Votre devis est disponible ci-dessous. Je vous l'ai envoyé par email — je reste à votre disposition.";
}

// Recalcule le devis avec la distance OSRM réelle. Fallback = le devis de n8n.
async function devisAvecOSRM(
  params: Params | undefined,
  fallback: Devis | null | undefined,
  km: number,
): Promise<Devis | null | undefined> {
  if (!params?.depart || !params?.destination || !params?.date_depart) return fallback;
  const nb = Number(params.nb_passagers);
  if (!Number.isFinite(nb) || nb <= 0) return fallback;
  if (!km) return fallback;

  // Corrige une éventuelle année passée (extraction LLM)
  let dd = String(params.date_depart).slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (dd < today) {
    const parts = dd.split("-");
    const y = new Date().getUTCFullYear();
    const cand = `${y}-${parts[1]}-${parts[2]}`;
    dd = cand < today ? `${y + 1}-${parts[1]}-${parts[2]}` : cand;
  }

  const r = calculerDevis({
    nb_passagers: nb,
    date_depart: dd,
    date_demande: today,
    distance_km: km,
    aller_retour: !!params.aller_retour,
    options: Array.isArray(params.options)
      ? (params.options as (string | { code: string; quantite?: number })[])
      : [],
  });
  if ("erreur" in r || "escalade" in r) return fallback;
  return r as unknown as Devis;
}

async function persist(
  sessionId: string | undefined,
  history: unknown,
  data: { devis?: Devis | null; escalade?: string | null; params?: Params },
) {
  const sb = getAdminClient();
  if (!sb || !sessionId) return;

  // 1) Conversation (une ligne par session)
  await sb.from("conversations").upsert({
    id: sessionId,
    messages: history ?? [],
    updated_at: new Date().toISOString(),
  });

  const params = data.params ?? {};
  const email = params.email?.trim();
  const devis = data.devis;

  // 2) Client (par email) — seulement si l'email est connu
  let clientId: string | null = null;
  if (email) {
    clientId = await getOrCreateClient(sb, email, params.nom);
    if (clientId) await sb.from("conversations").update({ client_id: clientId }).eq("id", sessionId);
  }

  // 3) Cas complexe (escalade > 55 pax / atypique / hors France) : pas de devis auto, mais on
  // enregistre la demande pour le suivi humain (HITL) → visible dans "À traiter".
  if (!devis) {
    if (data.escalade && (params.depart || params.destination || params.nb_passagers)) {
      await sb.from("demandes").upsert({
        id: sessionId,
        client_id: clientId,
        depart: params.depart ?? null,
        destination: params.destination ?? null,
        date_depart: params.date_depart ?? null,
        aller_retour: !!params.aller_retour,
        nb_passagers: params.nb_passagers ?? null,
        distance_km: params.distance_km ?? null,
        statut: "cas_complexe",
        commentaire: data.escalade,
      });
    }
    return;
  }

  // 4) Demande + devis. Le PREMIER devis fait foi : on ne réécrit pas le prix ensuite.

  const { data: existing } = await sb.from("devis").select("id, client_id, token").eq("id", sessionId).maybeSingle();
  const devisExistait = !!existing;
  const emailAjouteApres = !!clientId && devisExistait && !existing?.client_id;
  const tokenDevis = (existing?.token as string | undefined) ?? crypto.randomUUID();

  if (!devisExistait) {
    // Première fois : on crée la demande + le devis (avec le prix figé) et on
    // programme la 1re relance (J+2 urgent / J+3 standard).
    const urgent = estUrgent(params.date_depart ?? null);
    await sb.from("demandes").upsert({
      id: sessionId,
      client_id: clientId,
      depart: params.depart ?? null,
      destination: params.destination ?? null,
      date_depart: params.date_depart ?? null,
      aller_retour: !!params.aller_retour,
      nb_passagers: params.nb_passagers ?? null,
      distance_km: params.distance_km ?? null,
      urgence: urgent ? "urgent" : "normal",
      statut: "devis_envoye",
    });
    await sb.from("devis").insert({
      id: sessionId,
      demande_id: sessionId,
      client_id: clientId,
      prix_ht: devis.prix_ht,
      tva: devis.tva,
      prix_ttc: devis.prix_ttc,
      devise: devis.devise ?? "EUR",
      lignes: devis.lignes ?? [],
      coefficients: devis.coefficients ?? [],
      statut: "envoye",
      date_envoi: new Date().toISOString(),
      prochaine_relance: prochaineRelance(urgent, 0),
      token: tokenDevis,
    });
  } else if (emailAjouteApres) {
    // Le devis existait sans client : on relie le client SANS toucher au prix
    await sb.from("demandes").update({ client_id: clientId }).eq("id", sessionId);
    await sb.from("devis").update({ client_id: clientId }).eq("id", sessionId);
  }

  // Email : à la création avec email connu, ou quand l'email est ajouté ensuite
  if (email && (!devisExistait || emailAjouteApres)) await sendDevisEmail(email, devis, params, sessionId, tokenDevis);
}

async function getOrCreateClient(
  sb: SupabaseClient,
  email: string,
  nom?: string,
): Promise<string | null> {
  const { data: found } = await sb.from("clients").select("id").eq("email", email).maybeSingle();
  if (found) return found.id;
  const { data: created } = await sb
    .from("clients")
    .insert({ email, nom: nom ?? null, type_client: "particulier", consentement: true })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function sendDevisEmail(to: string, devis: Devis, params: Params, id?: string, token?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) return;
  // Adresse de démo : on ne déclenche pas d'envoi réel (logique déjà persistée).
  if (estEmailDemo(to)) return;
  const html = devisEmailHtml(devis, params, { refuseToken: token });
  let attachments: { filename: string; content: string }[] | undefined;
  try {
    const pdf = await buildDevisPdf(devis, { ...params, ref: refDevis(id) });
    attachments = [{ filename: "devis-autocar-location.pdf", content: Buffer.from(pdf).toString("base64") }];
  } catch (e) {
    console.error("[pdf] génération échouée:", e);
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "Votre devis Autocar Location", html, attachments }),
    });
    if (!r.ok) console.error("[email] Resend:", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("[email] échec:", e);
  }
}
