"use client";

// Page de connexion unique. Après connexion -> redirection selon le rôle.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";

export default function Login() {
  const router = useRouter();
  const { loading, email: connected, role } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!loading && connected) {
      router.replace(role === "admin" ? "/admin" : "/espace-client");
    }
  }, [loading, connected, role, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!supabase) return setError("Configuration Supabase manquante.");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { prenom: prenom.trim(), nom: nom.trim() } },
      });
      if (error) setError(error.message);
      else setInfo("Compte créé. Vous pouvez vous connecter.");
    }
  }

  async function quickLogin(e: string, p: string) {
    setError("");
    if (!supabase) return setError("Configuration Supabase manquante.");
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) setError(error.message);
  }

  return (
    <main className="flex flex-1">
      {/* Panneau marque (desktop) */}
      <div className="hidden w-1/2 flex-col justify-center bg-[var(--brand)] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Autocar Location" className="h-12 w-auto rounded-lg bg-white/90 p-1" />
          <h2 className="text-3xl font-bold">Autocar Location</h2>
        </div>
        <p className="mt-3 max-w-sm text-white/80">
          Suivez vos devis et vos échanges, ou pilotez l&apos;activité commerciale.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-white/85">
          <li>✓ Vos devis en temps réel</li>
          <li>✓ Historique de vos conversations</li>
          <li>✓ PDF téléchargeable</li>
        </ul>
      </div>

      {/* Formulaire */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h1>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Prénom"
                  aria-label="Prénom"
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--brand)]"
                />
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Nom"
                  aria-label="Nom"
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--brand)]"
                />
              </div>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              aria-label="Adresse email"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--brand)]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (min. 6 caractères)"
              className="w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--brand)]"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]"
            >
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
            {error && <p className="text-sm text-[#d14343]">{error}</p>}
            {info && <p className="text-sm text-[var(--brand)]">{info}</p>}
          </form>

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
              setInfo("");
            }}
            className="mt-4 text-sm text-[var(--ink-soft)] underline"
          >
            {mode === "login" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
          </button>

          {/* Module démo : connexion rapide */}
          <div className="mt-8 rounded-xl border border-dashed border-[var(--border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Connexion rapide (démo)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => quickLogin("admin@neotravel.fr", "123456")}
                className="rounded-full border border-[var(--brand)] px-3 py-1.5 text-sm text-[var(--brand)]"
              >
                Admin
              </button>
              <button
                onClick={() => quickLogin("client1@email.fr", "client")}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Client 1 (avec devis)
              </button>
              <button
                onClick={() => quickLogin("client2@email.fr", "client")}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Client 2 (sans devis)
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
