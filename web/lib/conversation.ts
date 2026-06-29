// Helper de messagerie : retrouve (ou crée) le fil de discussion d'une demande.
// Le fil vit dans la table `conversations` (colonne messages jsonb). Selon l'origine,
// la conversation est reliée par `demande_id` (seed) OU partage l'`id` de la demande
// (flux chat temps réel) — on gère les deux cas.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Message = { role: string; content: string; ts?: string };

export type Conversation = { id: string; messages: Message[] };

/** Retrouve le fil d'une demande, ou le crée (vide) si aucun n'existe encore. */
export async function getConversation(
  sb: SupabaseClient,
  demandeId: string,
  clientId?: string | null,
): Promise<Conversation> {
  // 1) par demande_id (cas seed / lien explicite). limit(1) = robuste aux doublons.
  let row = (await sb.from("conversations").select("id, messages").eq("demande_id", demandeId).limit(1)).data?.[0];
  // 2) sinon par id (flux chat : conversation.id == demande.id)
  if (!row) row = (await sb.from("conversations").select("id, messages").eq("id", demandeId).limit(1)).data?.[0];
  if (row) return { id: row.id as string, messages: (row.messages ?? []) as Message[] };

  // 3) création (id == demande_id pour rester cohérent avec le flux chat)
  const { data: created } = await sb
    .from("conversations")
    .insert({ id: demandeId, demande_id: demandeId, client_id: clientId ?? null, messages: [] })
    .select("id, messages")
    .single();
  return { id: (created?.id ?? demandeId) as string, messages: (created?.messages ?? []) as Message[] };
}

/** Ajoute un message au fil et renvoie le tableau de messages mis à jour. */
export async function appendMessage(
  sb: SupabaseClient,
  conv: Conversation,
  role: "user" | "admin",
  content: string,
): Promise<Message[]> {
  const messages = [...conv.messages, { role, content: content.slice(0, 2000), ts: new Date().toISOString() }];
  await sb.from("conversations").update({ messages, updated_at: new Date().toISOString() }).eq("id", conv.id);
  return messages;
}
