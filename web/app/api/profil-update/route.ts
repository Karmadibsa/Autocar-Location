// Mise à jour des coordonnées du client connecté (adresse de facturation, etc.).
// Vérifie le token, puis met à jour la fiche du client correspondant à son email.
import { getAdminClient } from "@/lib/supabaseAdmin";

const CHAMPS = ["prenom", "nom", "telephone", "adresse", "code_postal", "ville"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token;
  const sb = getAdminClient();
  if (!sb || !token) return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const { data: u } = await sb.auth.getUser(token);
  const email = u?.user?.email;
  if (!email) return Response.json({ ok: false, reason: "not_authenticated" }, { status: 401 });

  const patch: Record<string, string> = {};
  for (const c of CHAMPS) if (typeof body[c] === "string") patch[c] = body[c].trim();

  // Crée la fiche si elle n'existe pas encore, sinon met à jour.
  const { data: existing } = await sb.from("clients").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await sb.from("clients").update(patch).eq("id", existing.id);
  } else {
    await sb.from("clients").insert({ email, type_client: "particulier", consentement: true, ...patch });
  }
  return Response.json({ ok: true });
}
