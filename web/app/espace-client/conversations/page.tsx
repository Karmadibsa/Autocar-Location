"use client";

// Onglet "Mes conversations" : historique des échanges avec l'assistant.
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";

type Message = { role: string; contenu?: string; content?: string };
type Conversation = { id: string; messages: Message[] | null; updated_at: string };

export default function MesConversations() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    if (!session) return;
    const r = await fetch("/api/my-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });
    const d = await r.json();
    setConversations(d.conversations ?? []);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <h2 className="text-lg font-semibold">Mes conversations</h2>
      {conversations.length === 0 ? (
        <p className="mt-2 text-[var(--ink-soft)]">Aucune conversation pour le moment.</p>
      ) : (
        <div className="mt-2 space-y-3">
          {conversations.map((c) => (
            <details key={c.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <summary className="cursor-pointer text-sm text-[var(--ink-soft)]">
                Conversation du {new Date(c.updated_at).toLocaleDateString("fr-FR")}
              </summary>
              <div className="mt-2 space-y-1 text-sm">
                {(c.messages ?? []).map((m, i) => (
                  <p key={i}>
                    <span className="font-semibold">{m.role === "user" ? "Vous" : "Autocar Location"} :</span>{" "}
                    {m.contenu ?? m.content}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
