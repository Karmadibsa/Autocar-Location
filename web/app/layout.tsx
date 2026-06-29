import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autocar Location — Votre devis autocar, en conversation",
  description:
    "Décrivez votre trajet de groupe, on s'occupe du reste. Devis autocar rapide, clair et sans engagement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Accessibilité : lien d'évitement vers le contenu principal (clavier/lecteur d'écran) */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--brand)] focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          Aller au contenu
        </a>
        <Header />
        <div id="contenu" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <Footer />
        <ChatWidget />
      </body>
    </html>
  );
}
