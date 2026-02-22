import { Suspense } from "react";
import MusiquesContent from "./content";
import { PulseSpinner } from "../components/CustomSpinner";

export default function MusiquesPage() {
  return (
    <main className="min-h-screen text-white font-jost relative overflow-x-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] md:top-[20%] left-[-20%] md:left-[-5%] h-[300px] w-[300px] md:h-[600px] md:w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[80px] md:blur-[120px]" />
        <div className="absolute bottom-[5%] md:bottom-[10%] right-[-20%] md:right-[-5%] h-[300px] w-[300px] md:h-[600px] md:w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[80px] md:blur-[120px]" />
      </div>

      <div className="max-w-[1400px] mx-auto py-6 md:py-12 px-4 md:px-8">
        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><PulseSpinner/></div>}>
          <MusiquesContent />
        </Suspense>
      </div>
    </main>
  );
}