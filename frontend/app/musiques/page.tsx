import { Suspense } from "react";
import MusiquesContent from "./content";

export default function MusiquesPage() {
  return (
    <>
      {/* Le Suspense permet à Next.js de comprendre que cette partie dépend du client (URL) et ne doit pas bloquer le build statique.*/}
      <Suspense fallback={<div className="text-white">Chargement des filtres...</div>}>
        <MusiquesContent />
      </Suspense>
    </>
  );
}