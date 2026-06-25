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
  const { data: client } = await sb.from("clients").select("nom").eq("email", email).maybeSingle();

  return Response.json({ email, role: profile?.role ?? "client", nom: client?.nom ?? null });
}
