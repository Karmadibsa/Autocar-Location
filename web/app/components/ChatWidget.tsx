"use client";

// Chatbot flottant présent sur les pages internes (hors landing, où le chat est
// déjà au centre, et hors pages d'auth). La conversation est partagée avec la
// landing via localStorage (cf. Chat) : elle survit aux changements de page.
import { useState } from "react";
import { usePathname } from "next/navigation";
import Chat from "./Chat";

const MASQUE = ["/", "/login", "/reset-password"];

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (MASQUE.includes(pathname) || pathname.startsWith("/devis")) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-40 max-h-[75vh] w-[92vw] max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] p-2 shadow-2xl">
          <Chat />
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-2xl text-white shadow-lg transition hover:bg-[var(--brand-dark)]"
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
