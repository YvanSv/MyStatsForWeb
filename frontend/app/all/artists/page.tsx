import { Suspense } from "react";
import ArtistesContent from "./content";
import { PulseSpinner } from "../../components/small_elements/CustomSpinner";

export default function ArtistesPage() {
  return (
    <main className="min-h-screen text-white font-jost relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto py-12 px-6">
        {/* Le Suspense permet à Next.js de comprendre que cette partie dépend du client (URL) et ne doit pas bloquer le build statique.*/}
        <Suspense fallback={<PulseSpinner/>}>
          <ArtistesContent />
        </Suspense>
      </div>
    </main>
  );
}