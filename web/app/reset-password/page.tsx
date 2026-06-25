"use client";

// Page d'atterrissage du lien de réinitialisation (Supabase ouvre une session
// de récupération). L'utilisateur définit un nouveau mot de passe.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [pret, setPret] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  // Une session de récupération est ouverte par le lien de l'email.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setPret(!!data.session));
    const sub = supabase.auth.onAuthStateChange((_e, session) => setPret(!!session));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!supabase) return setError("Configuration Supabase manquante.");
    if (password.length < 6) return setError("Mot de passe trop court (min. 6 caractères).");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setError(error.message);
    setOk(true);
    setTimeout(() => router.replace("/espace-client"), 1500);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-8">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
        {ok ? (
          <p className="mt-3 text-sm text-[var(--brand)]">✓ Mot de passe mis à jour. Redirection…</p>
        ) : !pret ? (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Ouvrez cette page via le lien reçu par email pour réinitialiser votre mot de passe.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              aria-label="Nouveau mot de passe"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirmer le mot de passe"
              aria-label="Confirmer le mot de passe"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Mettre à jour
            </button>
            {error && <p className="text-sm text-[#d14343]">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
