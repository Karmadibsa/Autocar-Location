// Renvoie les devis + conversations de l'utilisateur connecté (par son email).
// Le client envoie son access_token ; on le vérifie côté serveur, puis on lit
// les données via la service role key (en se restreignant à l'email du user).
import { getAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({ token: null }));
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ devis: [], conversations: [] });

  const { data: userData } = await sb.auth.getUser(token);
  const email = userData?.user?.email;
  if (!email) return Response.json({ devis: [], conversations: [] });

  const { data: client } = await sb.from("clients").select("id, nom").eq("email", email).maybeSingle();
  if (!client) return Response.json({ devis: [], conversations: [], email, nom: null });

  const [{ data: devis }, { data: conversations }] = await Promise.all([
    sb.from("devis").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
    sb.from("conversations").select("*").eq("client_id", client.id).order("updated_at", { ascending: false }),
  ]);

  return Response.json({ devis: devis ?? [], conversations: conversations ?? [], email, nom: client.nom ?? null });
}
