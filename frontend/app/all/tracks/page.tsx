import { Suspense } from "react";
import MusiquesContent from "./content";
import { PulseSpinner } from "../../components/small_elements/CustomSpinner";

export default function MusiquesPage() {
  return (
    <main className="min-h-screen text-white font-jost relative overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto py-6 md:py-12 px-4 md:px-8">
        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><PulseSpinner/></div>}>
          <MusiquesContent />
        </Suspense>
      </div>
    </main>
  );
}