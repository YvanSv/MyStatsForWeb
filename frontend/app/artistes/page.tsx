import { Suspense } from "react";
import ArtistesContent from "./content";
import { PulseSpinner } from "../components/CustomSpinner";

export default function ArtistesPage() {
  return (
    <main className="min-h-screen text-white font-jost relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
      </div>
      <div className="max-w-[1400px] mx-auto py-12 px-6">
        {/* Le Suspense permet à Next.js de comprendre que cette partie dépend du client (URL) et ne doit pas bloquer le build statique.*/}
        <Suspense fallback={<PulseSpinner/>}>
          <ArtistesContent />
        </Suspense>
      </div>
    </main>
  );
}