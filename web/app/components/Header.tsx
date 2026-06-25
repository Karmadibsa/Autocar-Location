"use client";

// En-tête commun : affiche les liens selon l'état de connexion + le rôle.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!active) return;
      setEmail(s?.user.email ?? null);
      if (s) {
        const r = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: s.access_token }),
        });
        const me = await r.json().catch(() => ({}));
        if (!active) return;
        setIsAdmin(me.role === "admin");
        setName(me.prenom ?? me.nom ?? null);
      } else if (active) {
        setIsAdmin(false);
        setName(null);
      }
    }
    load();
    const sub = supabase?.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const display = isAdmin ? "Admin" : name ?? email?.split("@")[0] ?? "";

  const link = "rounded-full px-4 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand-soft)]";
  const linkBox = "rounded-full border border-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-6 py-3 backdrop-blur">
      <a href="/" className="flex items-center gap-2 transition hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Autocar Location" width={232} height={162} className="h-8 w-auto" />
        <span className="text-lg font-bold text-[var(--brand)]">Autocar Location</span>
      </a>
      <div className="flex items-center gap-1">
        {email && (
          <span className="mr-1 hidden text-sm text-[var(--ink-soft)] sm:inline">
            Bonjour, <b className="text-[var(--ink)]">{display}</b>
          </span>
        )}
        {!email && <a href="/login" className={linkBox}>Connexion</a>}
        {email && isAdmin && <a href="/admin" className={linkBox}>Dashboard</a>}
        {email && !isAdmin && <a href="/espace-client" className={link}>Mon espace</a>}
        {email && (
          <button
            onClick={() => supabase?.auth.signOut()}
            className="rounded-full px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:underline"
          >
            Déconnexion
          </button>
        )}
      </div>
    </header>
  );
}
