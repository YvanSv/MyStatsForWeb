import { Suspense } from "react";
import AlbumsContent from './content';

export default function AlbumsPage() {
  return (
    <>
      {/* Le Suspense permet à Next.js de comprendre que cette partie dépend du client (URL) et ne doit pas bloquer le build statique.*/}
      <Suspense fallback={<div className="text-white">Chargement des filtres...</div>}>
        <AlbumsContent />
      </Suspense>
    </>
  );
}