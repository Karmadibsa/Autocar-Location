"use client";

// Layout de l'espace client : garde d'accès + en-tête (greeting) + onglets.
// Les sous-pages (devis, compte) se contentent d'afficher leur contenu.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import Spinner from "@/app/components/Spinner";
import { Plus } from "lucide-react";

const ONGLETS: [string, string][] = [
  ["/espace-client", "Mes devis"],
  ["/espace-client/compte", "Mon compte"],
];

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, email, role, session } = useAuth();
  const [prenom, setPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !email) router.replace("/login");
  }, [loading, email, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    })
      .then((r) => r.json())
      .then((me) => setPrenom(me.prenom ?? null));
  }, [session]);

  if (loading || !email) {
    return (
      <main className="mx-auto max-w-md flex-1 p-8">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mon espace</h1>
          <p className="text-sm text-[var(--ink-soft)]">Bonjour {prenom || email}, content de vous revoir.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]"
        >
          <Plus className="h-4 w-4" /> Nouveau devis
        </Link>
      </div>

      {role === "admin" && (
        <Link
          href="/admin"
          className="mt-4 block rounded-xl border border-[var(--brand)] bg-[var(--brand-soft)] p-3 text-sm text-[var(--brand-dark)] transition hover:bg-white"
        >
          Vous êtes administrateur → accéder au <b>dashboard de pilotage</b>.
        </Link>
      )}

      {/* Onglets */}
      <nav className="mt-6 flex gap-2 border-b border-[var(--border)]">
        {ONGLETS.map(([href, label]) => {
          const actif = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition ${
                actif
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </main>
  );
}
