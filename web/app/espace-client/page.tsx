"use client";

// Portail lead (bonus) : connexion par magic link (Supabase Auth).
// Une fois connecté, le client suit ses devis et conversations (RLS = ses données).
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function EspaceClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError("Configuration Supabase manquante (voir GUIDE_INSTALLATION.md).");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center p-8">
      <h1 className="text-2xl font-bold">Espace client</h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Connectez-vous pour suivre vos devis et vos échanges.
      </p>

      {sent ? (
        <p className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--brand-soft)] p-4">
          ✉️ Un lien de connexion vient de vous être envoyé. Vérifiez votre
          boîte mail.
        </p>
      ) : (
        <form onSubmit={login} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--brand)]"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]"
          >
            Recevoir mon lien de connexion
          </button>
          {error && <p className="text-sm text-[#d14343]">{error}</p>}
        </form>
      )}
    </main>
  );
}
