"use client";

import { useState } from "react";

export default function Contact() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, message }),
      });
      const j = await r.json();
      if (j.ok) {
        setEtat("ok");
        setNom("");
        setEmail("");
        setMessage("");
      } else setEtat("erreur");
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 p-6">
      <h1 className="text-2xl font-bold">Nous contacter</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Une question, un projet de groupe particulier ? Écrivez-nous, on revient vers vous vite.
      </p>

      {etat === "ok" ? (
        <div className="mt-6 rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-4 text-sm text-[var(--brand-dark)]">
          ✓ Message envoyé, merci ! Nous vous répondrons par email.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Votre nom"
            aria-label="Votre nom"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Votre email"
            aria-label="Votre email"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message"
            aria-label="Votre message"
            rows={6}
            className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
          />
          <button
            type="submit"
            disabled={etat === "envoi"}
            className="rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            {etat === "envoi" ? "Envoi…" : "Envoyer"}
          </button>
          {etat === "erreur" && <p className="text-sm text-[#d14343]">Échec de l'envoi. Réessayez plus tard.</p>}
        </form>
      )}
    </main>
  );
}
