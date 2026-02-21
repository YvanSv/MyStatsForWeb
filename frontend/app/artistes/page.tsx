import { Suspense } from "react";
import ArtistesContent from "./content";

export default function ArtistesPage() {
  return (
    <>
      {/* Le Suspense permet à Next.js de comprendre que cette partie dépend du client (URL) et ne doit pas bloquer le build statique.*/}
      <Suspense fallback={<div className="text-white">Chargement des filtres...</div>}>
        <ArtistesContent />
      </Suspense>
    </>
  );
}