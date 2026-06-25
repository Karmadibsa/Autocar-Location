// Génère et renvoie le PDF d'un devis. Accès : admin OU propriétaire du devis.
import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildDevisPdf, refDevis } from "@/lib/devisPdf";

export async function POST(request: Request) {
  const { id, token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !id || !token) return new Response("Requête invalide", { status: 400 });

  const { data: userData } = await sb.auth.getUser(token);
  const email = userData?.user?.email;
  const uid = userData?.user?.id;
  if (!email || !uid) return new Response("Non authentifié", { status: 401 });

  const { data: devis } = await sb.from("devis").select("*").eq("id", id).maybeSingle();
  if (!devis) return new Response("Devis introuvable", { status: 404 });

  // Autorisation : admin OU propriétaire (par email)
  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (profile?.role !== "admin") {
    const { data: client } = await sb.from("clients").select("id").eq("email", email).maybeSingle();
    if (!client || client.id !== devis.client_id) return new Response("Accès refusé", { status: 403 });
  }

  const { data: demande } = await sb.from("demandes").select("*").eq("id", devis.demande_id).maybeSingle();
  let nom: string | null = null;
  if (devis.client_id) {
    const { data: c } = await sb.from("clients").select("nom").eq("id", devis.client_id).maybeSingle();
    nom = c?.nom ?? null;
  }

  const pdf = await buildDevisPdf(
    { prix_ht: devis.prix_ht, tva: devis.tva, prix_ttc: devis.prix_ttc, devise: devis.devise, lignes: devis.lignes },
    {
      depart: demande?.depart,
      destination: demande?.destination,
      date_depart: demande?.date_depart,
      nb_passagers: demande?.nb_passagers,
      aller_retour: demande?.aller_retour,
      nom,
      ref: refDevis(devis.id),
    },
  );

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="devis-autocar-location.pdf"',
    },
  });
}
