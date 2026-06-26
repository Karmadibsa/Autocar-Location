// Préparation de l'acceptation d'un devis depuis l'email : à partir du token du
// devis, renvoie l'email + nom/prénom du client et indique si un compte existe déjà.
// Permet à la page /devis/accepter de rediriger vers connexion ou inscription pré-remplie.
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false }, { status: 400 });

  const { data: d } = await sb.from("devis").select("client_id").eq("token", token).maybeSingle();
  if (!d) return Response.json({ ok: false, reason: "introuvable" }, { status: 404 });

  let email: string | null = null;
  let prenom: string | null = null;
  let nom: string | null = null;
  if (d.client_id) {
    const { data: c } = await sb.from("clients").select("email, prenom, nom").eq("id", d.client_id).maybeSingle();
    email = c?.email ?? null;
    prenom = c?.prenom ?? null;
    nom = c?.nom ?? null;
  }

  // Un compte Auth existe-t-il déjà pour cet email ?
  let hasAccount = false;
  if (email) {
    const { data: list } = await sb.auth.admin.listUsers();
    hasAccount = !!list?.users?.some((u) => u.email?.toLowerCase() === email!.toLowerCase());
  }

  return Response.json({ ok: true, email, prenom, nom, hasAccount });
}
