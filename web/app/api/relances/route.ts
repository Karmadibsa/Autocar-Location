// Traite les relances DUES : devis 'envoye' dont prochaine_relance <= maintenant
// et nb_relances < 2. Envoie l'email, met à jour les statuts, planifie la suivante
// ou clôture. Appelable par : un admin (token) OU un planificateur (secret n8n).
import { getAdminClient } from "@/lib/supabaseAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prochaineRelance, estUrgent, typeRelance, VALIDITE_JOURS } from "@/lib/relances";
import { buildDevisPdf, refDevis } from "@/lib/devisPdf";
import { devisEmailHtml } from "@/lib/emailDevis";
import { formatNomComplet } from "@/lib/noms";
import { estEmailDemo } from "@/lib/emailGuard";

type DevisDu = {
  id: string;
  demande_id: string;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  devise: string | null;
  lignes: { libelle: string; montant: number }[] | null;
  nb_relances: number | null;
  token: string | null;
  demandes: {
    depart: string | null;
    destination: string | null;
    date_depart: string | null;
    nb_passagers: number | null;
    urgence: string | null;
  } | null;
  clients: { email: string | null; prenom: string | null; nom: string | null } | null;
};

const SELECT_DU =
  "id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, nb_relances, token, demandes(depart, destination, date_depart, nb_passagers, urgence), clients(email, prenom, nom)";

export async function POST(request: Request) {
  const { token, secret, devisId } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb) return Response.json({ ok: false, reason: "no_config" }, { status: 500 });

  // --- Autorisation : secret de planification OU admin connecté ---
  let allowed = false;
  if (secret && process.env.CRON_SECRET && secret === process.env.CRON_SECRET) allowed = true;
  if (!allowed && token) {
    const { data: u } = await sb.auth.getUser(token);
    if (u?.user?.id) {
      const { data: p } = await sb.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
      allowed = p?.role === "admin";
    }
  }
  if (!allowed) return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });

  const now = new Date().toISOString();

  // Relance INDIVIDUELLE (déclenchée par l'admin sur une ligne) : on force l'envoi
  // immédiat pour ce devis, même si la prochaine relance n'est pas encore due.
  if (devisId) {
    const { data: d } = await sb.from("devis").select(SELECT_DU).eq("id", devisId).maybeSingle();
    const dv = d as unknown as DevisDu | null;
    if (!dv) return Response.json({ ok: false, reason: "not_found" }, { status: 404 });
    if ((dv.nb_relances ?? 0) >= 2)
      return Response.json({ ok: false, reason: "max_atteint" }, { status: 409 });
    const { cloture } = await appliquerRelance(sb, dv, now);
    return Response.json({ ok: true, envoyees: 1, cloturees: cloture ? 1 : 0, expirees: 0, restantes: 0 });
  }

  // 0) Expiration EN MASSE : un devis envoyé depuis plus de 30 jours expire (demande
  // clôturée). On le fait en 2 requêtes (pas une boucle) pour rester rapide même
  // avec des centaines de devis anciens.
  let expirees = 0;
  const cutoff = new Date(Date.now() - VALIDITE_JOURS * 86400000).toISOString();
  const { data: exp } = await sb
    .from("devis")
    .update({ statut: "expire", prochaine_relance: null })
    .eq("statut", "envoye")
    .lt("date_envoi", cutoff)
    .select("demande_id");
  if (exp && exp.length) {
    await sb.from("demandes").update({ statut: "cloture" }).in("id", exp.map((e) => e.demande_id));
    expirees = exp.length;
  }

  // 1) Relances dues, traitées PAR LOTS (chaque relance = email + PDF, donc coûteux).
  // Un lot borné garantit qu'on ne dépasse jamais le timeout de la fonction serverless.
  // S'il en reste, l'admin relance le traitement (on renvoie `restantes`).
  const BATCH = 30;
  const { data: dus } = await sb
    .from("devis")
    .select(SELECT_DU)
    .eq("statut", "envoye")
    .lte("prochaine_relance", now)
    .lt("nb_relances", 2)
    .order("prochaine_relance", { ascending: true })
    .limit(BATCH);

  let envoyees = 0;
  let cloturees = 0;
  for (const d of (dus ?? []) as unknown as DevisDu[]) {
    const { cloture } = await appliquerRelance(sb, d, now);
    envoyees++;
    if (cloture) cloturees++;
  }

  // Combien de relances restent dues après ce lot (pour informer l'admin) ?
  const { count: restantes } = await sb
    .from("devis")
    .select("id", { count: "exact", head: true })
    .eq("statut", "envoye")
    .lte("prochaine_relance", new Date().toISOString())
    .lt("nb_relances", 2);

  return Response.json({ ok: true, envoyees, cloturees, expirees, restantes: restantes ?? 0 });
}

// Applique une relance à un devis : envoie l'email, met à jour devis + demande,
// programme la suivante ou clôture. Renvoie `cloture` (2e relance atteinte).
async function appliquerRelance(sb: SupabaseClient, d: DevisDu, now: string): Promise<{ cloture: boolean }> {
  const dem = d.demandes;
  const urgent = dem?.urgence === "urgent" || dem?.urgence === "prioritaire" || estUrgent(dem?.date_depart);
  const nb = (d.nb_relances ?? 0) + 1;
  const next = prochaineRelance(urgent, nb);

  if (d.clients?.email) await sendRelanceEmail(d.clients.email, d, nb);

  await sb
    .from("devis")
    .update({ nb_relances: nb, prochaine_relance: next, statut: next ? "envoye" : "expire" })
    .eq("id", d.id);
  await sb
    .from("demandes")
    .update({ statut: next ? (nb === 1 ? "relance_1" : "relance_2") : "cloture" })
    .eq("id", d.demande_id);

  // Trace + idempotence (best-effort : un doublon de clé est simplement ignoré)
  await sb.from("relances").insert({
    devis_id: d.id,
    type: typeRelance(urgent, nb),
    date_planifiee: now,
    statut: "envoyee",
    date_envoi: now,
    cle_idempotence: `${d.id}-relance-${nb}`,
  });

  return { cloture: !next };
}

async function sendRelanceEmail(to: string, d: DevisDu, numero: number) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) return;
  // Adresse de démo : on traite la relance (statut, trace) sans envoi réel.
  if (estEmailDemo(to)) return;
  const html = devisEmailHtml(
    { prix_ht: d.prix_ht, tva: d.tva, prix_ttc: d.prix_ttc, devise: d.devise },
    {
      depart: d.demandes?.depart,
      destination: d.demandes?.destination,
      date_depart: d.demandes?.date_depart,
      nb_passagers: d.demandes?.nb_passagers,
      nom: formatNomComplet(d.clients?.prenom, d.clients?.nom),
    },
    {
      titre: `Votre devis vous attend (relance ${numero}/2)`,
      intro:
        "Sauf erreur, nous n'avons pas encore reçu votre retour. Nous restons à votre disposition pour toute question.",
      refuseToken: d.token ?? undefined,
    },
  );
  let attachments: { filename: string; content: string }[] | undefined;
  try {
    const pdf = await buildDevisPdf(
      { prix_ht: d.prix_ht ?? undefined, tva: d.tva ?? undefined, prix_ttc: d.prix_ttc ?? undefined, devise: d.devise ?? "EUR", lignes: d.lignes ?? [] },
      {
        depart: d.demandes?.depart,
        destination: d.demandes?.destination,
        date_depart: d.demandes?.date_depart,
        nb_passagers: d.demandes?.nb_passagers,
        nom: d.clients?.nom,
        ref: refDevis(d.id),
      },
    );
    attachments = [{ filename: "devis-autocar-location.pdf", content: Buffer.from(pdf).toString("base64") }];
  } catch {
    /* PDF best-effort */
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `Relance — votre devis Autocar Location`, html, attachments }),
    });
  } catch {
    /* email best-effort */
  }
}
