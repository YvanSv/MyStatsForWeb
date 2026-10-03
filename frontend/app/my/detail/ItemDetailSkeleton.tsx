import { useLanguage } from "@/app/context/languageContext";

/** Squelette de la page de détail (chargement initial). */
export default function ItemDetailSkeleton() {
  const { t } = useLanguage();
  return (
    <main role="status" aria-busy="true" aria-label={t.itemDetail.loading} className="min-h-screen mx-auto p-4 lg:p-8 animate-pulse">
      <div className="h-4 w-40 rounded bg-gray-700/40 mb-6" />
      <div className="flex items-end gap-4 mb-8">
        <div className="h-24 w-24 lg:h-40 lg:w-40 rounded-2xl bg-gray-700/40" />
        <div className="flex flex-col gap-3">
          <div className="h-3 w-16 rounded bg-gray-700/30" />
          <div className="h-8 w-56 lg:h-12 lg:w-96 rounded bg-gray-700/40" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-700/30" />)}
      </div>
      <div className="h-72 rounded-2xl bg-gray-700/30" />
    </main>
  );
}
