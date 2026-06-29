// Envoi d'email transactionnel (Resend), best-effort et non bloquant.
// Respecte le garde-fou démo : aucun envoi réel vers un domaine de démonstration.
import { estEmailDemo } from "./emailGuard";

export async function envoyerEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key || !to || estEmailDemo(to)) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!r.ok) console.error("[email] Resend:", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("[email] échec:", e);
  }
}
