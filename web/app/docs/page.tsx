"use client";

// Explorateur d'API interactif (Swagger UI) alimenté par /openapi.yaml.
// Swagger UI est chargé depuis un CDN pour éviter d'alourdir le bundle.
import { useEffect } from "react";

const VERSION = "5.17.14";

export default function ApiDocs() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/swagger-ui-dist@${VERSION}/swagger-ui.css`;
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = `https://unpkg.com/swagger-ui-dist@${VERSION}/swagger-ui-bundle.js`;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      // @ts-expect-error — SwaggerUIBundle est injecté par le script CDN
      window.SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#swagger", deepLinking: true });
    };
    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return (
    <main className="flex-1">
      <div className="border-b border-[var(--border)] bg-[var(--bg-muted)] px-6 py-4">
        <h1 className="text-xl font-bold">Documentation de l&apos;API</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Explorateur interactif des routes serveur (généré depuis <code>openapi.yaml</code>).
        </p>
      </div>
      <div id="swagger" />
    </main>
  );
}
