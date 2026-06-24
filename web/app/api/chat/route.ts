// Route handler du chat : relaie le message vers le webhook de l'agent n8n.
// Tant que N8N_WEBHOOK_URL n'est pas configuré, renvoie une réponse "stub".
// Logge la cause exacte des erreurs (visible dans logs/front.log).

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const webhook = process.env.N8N_WEBHOOK_URL;

  if (!webhook) {
    return Response.json({
      reply:
        "👋 Merci ! L'agent IA n'est pas encore connecté (N8N_WEBHOOK_URL absent de .env.local).",
      stub: true,
    });
  }

  console.log("[chat] -> appel webhook n8n :", webhook);

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();

    if (!res.ok) {
      console.error(`[chat] n8n a répondu ${res.status} :`, text.slice(0, 500));
      return Response.json({
        reply: `L'agent a renvoyé une erreur ${res.status}. Le workflow n8n est-il bien ACTIVÉ ? (détail dans logs/front.log)`,
        error: true,
        status: res.status,
      });
    }

    // n8n peut renvoyer du JSON ({reply, devis}) ou du texte brut.
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { reply: text };
    }
    return Response.json(data);
  } catch (e) {
    const cause = (e as { cause?: unknown })?.cause;
    const detail =
      e instanceof Error
        ? `${e.message}${cause ? " — " + String(cause) : ""}`
        : String(e);
    console.error("[chat] webhook injoignable :", detail);
    return Response.json({
      reply:
        "Agent injoignable. Vérifie : (1) n8n lancé, (2) workflow ACTIVÉ, (3) URL du webhook. " +
        "Détail : " +
        detail,
      error: true,
      detail,
    });
  }
}
