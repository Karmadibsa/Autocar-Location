// Profil léger de l'utilisateur connecté : email, rôle, nom (pour le « Bonjour … »).
// Lecture via service role (la RLS masque le nom des comptes de démo liés par email).
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({});

  const { data: u } = await sb.auth.getUser(token);
  const email = u?.user?.email;
  const uid = u?.user?.id;
  if (!email || !uid) return Response.json({});

  const { data: profile } = await sb.from("profiles").select("role").eq("id", uid).maybeSingle();
  const role = profile?.role ?? "client";
  const meta = (u?.user?.user_metadata ?? {}) as { prenom?: string; nom?: string };

  let client: { id: string; prenom: string | null; nom: string | null } | null = null;
  const { data: found } = await sb
    .from("clients")
    .select("id, prenom, nom")
    .eq("email", email)
    .maybeSingle();
  client = found ?? null;

  if (!client && role !== "admin") {
    // Première connexion d'un compte inscrit : on crée sa fiche depuis les métadonnées.
    const { data: created } = await sb
      .from("clients")
      .insert({ email, prenom: meta.prenom || null, nom: meta.nom || null, type_client: "particulier", consentement: true })
      .select("id, prenom, nom")
      .single();
    client = created ?? null;
  } else if (client && (!client.prenom || !client.nom) && (meta.prenom || meta.nom)) {
    // Fiche créée via le chat (sans prénom/nom) : on complète avec les métadonnées.
    const prenom = client.prenom || meta.prenom || null;
    const nom = client.nom || meta.nom || null;
    await sb.from("clients").update({ prenom, nom }).eq("id", client.id);
    client = { ...client, prenom, nom };
  }

  return Response.json({ email, role, prenom: client?.prenom ?? null, nom: client?.nom ?? null });
}
