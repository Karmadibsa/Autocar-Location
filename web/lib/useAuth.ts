"use client";

// Hook d'authentification : expose la session, l'email et le rôle (admin/client).
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "client" | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (!active) return;
      setSession(s);
      if (s) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", s.user.id)
          .maybeSingle();
        if (active) setRole(p?.role === "admin" ? "admin" : "client");
      } else {
        setRole(null);
      }
      if (active) setLoading(false);
    }
    load();
    const sub = supabase?.auth.onAuthStateChange(() => {
      setLoading(true);
      load();
    });
    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, email: session?.user.email ?? null, role };
}
