"use client";

// Atterrissage du bouton "Accepter le devis" (email). Selon que le client a déjà
// un compte ou non, redirige vers la connexion ou l'inscription PRÉ-REMPLIE.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/app/components/Spinner";

export default function AccepterDevis() {
  const router = useRouter();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch("/api/devis-acces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok || !j.email) {
          router.replace("/login");
          return;
        }
        const q = new URLSearchParams({ email: j.email, next: "/espace-client" });
        if (!j.hasAccount) {
          q.set("mode", "signup");
          if (j.prenom) q.set("prenom", j.prenom);
          if (j.nom) q.set("nom", j.nom);
        }
        router.replace("/login?" + q.toString());
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-8">
      <Spinner />
      <p className="mt-3 text-sm text-[var(--ink-soft)]">Redirection…</p>
    </main>
  );
}
