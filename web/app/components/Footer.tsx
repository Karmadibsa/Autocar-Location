export default function Footer() {
  return (
    <footer className="mt-auto bg-[#0b1f1a] px-6 py-6 text-sm text-white/70">
      <div className="mx-auto flex max-w-4xl flex-col justify-between gap-2 sm:flex-row">
        <span>© {new Date().getFullYear()} NeoTravel — Transport de groupe en autocar</span>
        <span>Mentions légales · RGPD · Contact</span>
      </div>
    </footer>
  );
}
