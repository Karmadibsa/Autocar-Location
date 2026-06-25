import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#0b1f1a] px-6 py-6 text-sm text-white/70">
      <div className="mx-auto flex max-w-4xl flex-col justify-between gap-2 sm:flex-row">
        <span>© {new Date().getFullYear()} Autocar Location — Transport de groupe en autocar</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/mentions-legales" className="transition hover:text-white">Mentions légales</Link>
          <Link href="/confidentialite" className="transition hover:text-white">Confidentialité · RGPD</Link>
          <Link href="/contact" className="transition hover:text-white">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
