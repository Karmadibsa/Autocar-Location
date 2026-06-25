// Formulaire de contact : envoie un email à contact@am-creative.fr (via Resend).
const DEST = "contact@am-creative.fr";

export async function POST(request: Request) {
  const { nom, email, message } = await request.json().catch(() => ({}));
  if (!nom || !email || !message) return Response.json({ ok: false, reason: "champs_manquants" }, { status: 400 });
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return Response.json({ ok: false, reason: "email_invalide" }, { status: 400 });

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ ok: false, reason: "email_non_configure" }, { status: 500 });

  const html = `
    <div style="font-family:Arial,sans-serif;color:#14201d">
      <h2 style="color:#0e7a66">Nouveau message — site Autocar Location</h2>
      <p><b>Nom :</b> ${String(nom).slice(0, 120)}</p>
      <p><b>Email :</b> ${String(email).slice(0, 160)}</p>
      <p><b>Message :</b></p>
      <p style="white-space:pre-wrap">${String(message).slice(0, 4000)}</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: DEST,
        reply_to: email,
        subject: `Contact site — ${String(nom).slice(0, 80)}`,
        html,
      }),
    });
    if (!r.ok) {
      console.error("[contact] Resend:", r.status, (await r.text()).slice(0, 200));
      return Response.json({ ok: false, reason: "envoi_echoue" }, { status: 502 });
    }
  } catch (e) {
    console.error("[contact] échec:", e);
    return Response.json({ ok: false, reason: "envoi_echoue" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
