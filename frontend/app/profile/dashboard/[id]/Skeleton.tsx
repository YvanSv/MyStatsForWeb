export default function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-bg1 text-white pt-8 pb-16 px-3 animate-pulse">
      <div className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto">
        
        {/* --- SKELETON BARRE DE NAV --- */}
        <div className="flex flex-row gap-12 mb-6 justify-between items-center">
          <div className="flex flex-row gap-12 items-center">
            {/* Bouton Retour */}
            <div className="h-6 w-20 bg-white/10 rounded-lg"></div>
            {/* Header */}
            <div>
              <div className="h-10 w-64 bg-white/10 rounded-xl mb-2"></div>
              <div className="h-4 w-48 bg-white/5 rounded-lg"></div>
            </div>
          </div>

          {/* Sélecteur Intervalle & Date */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-[450px] bg-white/5 rounded-xl"></div>
            <div className="h-10 w-64 bg-white/5 rounded-xl"></div>
          </div>
        </div>

        {/* --- SKELETON ACCORDÉON --- */}
        <div className="flex flex-col lg:flex-row min-h-[400px] w-full items-stretch gap-0 border border-white/5 rounded-[32px] overflow-hidden">
          
          {/* Section Ouverte */}
          <div className="flex-[3] bg-white/[0.04] p-8 border-r border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
              <div className="h-8 w-32 bg-white/10 rounded-lg"></div>
            </div>
            
            {/* Grille de cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="px-5 py-6 rounded-2xl bg-white/5 border border-white/5 flex gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                    <div className="h-6 w-32 bg-white/10 rounded"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Graphique Placeholder */}
            <div className="mt-12 h-64 bg-white/[0.02] border border-white/5 border-dashed rounded-[32px]"></div>
          </div>

          {/* Section Fermée 1 (Bibliothèque) */}
          <div className="flex-[0.18] bg-white/[0.02] border-r border-white/5 flex items-center justify-center">
             <div className="h-32 w-4 bg-white/10 rounded-full"></div>
          </div>

          {/* Section Fermée 2 (Habitudes) */}
          <div className="flex-[0.18] bg-white/[0.02] flex items-center justify-center">
             <div className="h-32 w-4 bg-white/10 rounded-full"></div>
          </div>

        </div>
      </div>
    </main>
  );
}