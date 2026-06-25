// Route du chat : relaie vers l'agent n8n, puis (best-effort) persiste dans
// Supabase et envoie le devis par email. La persistance ne bloque jamais la réponse.
import { getAdminClient } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDevisPdf, refDevis } from "@/lib/devisPdf";
import { calculerDevis } from "@/lib/calculerDevis";
import { distanceKm } from "@/lib/distance";
import { estUrgent, prochaineRelance } from "@/lib/relances";
import { devisEmailHtml } from "@/lib/emailDevis";

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
      headers: { "Content-Type": "application/json" },
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

  // --- Distance routière réelle (OSRM) : recalcule le devis si possible ---
  const recalc = await devisAvecOSRM(data.params, data.devis);
  if (recalc) data.devis = recalc;

  // --- Persistance + email (best-effort) ---
  persist(sessionId, history, data).catch((e) =>
    console.error("[chat] persistance échouée:", e),
  );

  return Response.json({ reply: data.reply, devis: data.devis, escalade: data.escalade });
}

// Recalcule le devis avec la distance OSRM réelle. Fallback = le devis de n8n.
async function devisAvecOSRM(
  params: Params | undefined,
  fallback: Devis | null | undefined,
): Promise<Devis | null | undefined> {
  if (!params?.depart || !params?.destination || !params?.date_depart) return fallback;
  const nb = Number(params.nb_passagers);
  if (!Number.isFinite(nb) || nb <= 0) return fallback;

  const km = await distanceKm(params.depart, params.destination);
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

  // 3) Cas complexe (escalade > 85 pax / atypique) : pas de devis auto, mais on
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

  const { data: existing } = await sb.from("devis").select("id, client_id").eq("id", sessionId).maybeSingle();
  const devisExistait = !!existing;
  const emailAjouteApres = !!clientId && devisExistait && !existing?.client_id;

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
    });
  } else if (emailAjouteApres) {
    // Le devis existait sans client : on relie le client SANS toucher au prix
    await sb.from("demandes").update({ client_id: clientId }).eq("id", sessionId);
    await sb.from("devis").update({ client_id: clientId }).eq("id", sessionId);
  }

  // Email : à la création avec email connu, ou quand l'email est ajouté ensuite
  if (email && (!devisExistait || emailAjouteApres)) await sendDevisEmail(email, devis, params, sessionId);
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

async function sendDevisEmail(to: string, devis: Devis, params: Params, id?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) return;
  const html = devisEmailHtml(devis, params);
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
