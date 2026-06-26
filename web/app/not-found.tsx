import Link from "next/link";
import { Bus } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center p-8 text-center">
      <Bus className="h-12 w-12 text-[var(--brand)]" />
      <h1 className="mt-2 text-6xl font-bold text-[var(--brand)]">404</h1>
      <p className="mt-3 font-medium">Vous vous êtes trompé d&apos;arrêt&nbsp;!</p>
      <p className="mt-1 text-[var(--ink-soft)]">Cette page n&apos;est pas sur notre ligne. Remontez à bord.</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[var(--accent)] px-5 py-2.5 font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-dark)]"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
