"use client";

// En-tête commun : affiche les liens selon l'état de connexion + le rôle.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!active) return;
      setEmail(s?.user.email ?? null);
      if (s) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", s.user.id)
          .maybeSingle();
        if (active) setIsAdmin(p?.role === "admin");
      } else if (active) setIsAdmin(false);
    }
    load();
    const sub = supabase?.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const link = "rounded-full px-4 py-1.5 text-sm font-medium text-[var(--brand)] hover:underline";
  const linkBox = "rounded-full border border-[var(--brand)] px-4 py-1.5 text-sm font-medium text-[var(--brand)]";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-6 py-3 backdrop-blur">
      <a href="/" className="text-lg font-bold text-[var(--brand)]">NeoTravel</a>
      <div className="flex items-center gap-1">
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
