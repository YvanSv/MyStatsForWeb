import { Suspense } from "react";
import ArtistesContent from "./content";
import { PulseSpinner } from "../../components/small_elements/CustomSpinner";

export default function ArtistesPage() {
  return (
    <main className="min-h-screen text-white relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto py-12 px-6">
        <Suspense fallback={<PulseSpinner/>}>
          <ArtistesContent />
        </Suspense>
      </div>
    </main>
  );
}