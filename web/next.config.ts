import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le repo contient aussi des outils Node à la racine (génération des livrables) :
  // on fixe explicitement la racine Turbopack sur le dossier web pour éviter
  // l'ambiguïté de double lockfile.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
