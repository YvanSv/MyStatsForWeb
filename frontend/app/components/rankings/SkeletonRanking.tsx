const SKELETON_STYLES = {
  PULSE: "animate-pulse bg-white/5 rounded-2xl",
  TEXT_SM: "h-3 bg-white/5 rounded animate-pulse",
};

export default function SkeletonRanking({ viewMode = 'grid' }: { viewMode?: 'list' | 'grid' | 'grid_sm' }) {
  return (
    <div className="flex min-h-screen bg-bg1">
      {/* 1. SIDEBAR FILTERS SKELETON */}
      <div className="hidden lg:block w-72 border-r border-white/5 p-6 space-y-8">
        <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className={`w-16 ${SKELETON_STYLES.TEXT_SM}`} />
              <div className="h-10 w-full bg-white/5 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. MAIN CONTENT SECTION */}
      <section className="flex-1 p-6 md:p-10 space-y-10">
        
        {/* HEADER CONTROLS SKELETON */}
        <div className="flex flex-col-reverse md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-3">
            {/* Bouton Filtres */}
            <div className="h-12 w-28 bg-white/10 rounded-2xl animate-pulse" />
            {/* Sélecteur Tri */}
            <div className="h-12 w-48 bg-white/5 rounded-2xl animate-pulse" />
            {/* Bouton Direction */}
            <div className="h-12 w-12 bg-white/5 rounded-2xl animate-pulse" />
          </div>
          {/* Titre de la page */}
          <div className="h-12 w-64 bg-white/10 rounded-2xl animate-pulse self-start md:self-auto" />
        </div>

        {/* 3. ITEMS CONTAINER SKELETON */}
        <div className={`
          ${viewMode === 'list' ? 'space-y-3' : 
            viewMode === 'grid_sm' ? 'grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4' : 
            'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6'}
        `}>
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`
              ${viewMode === 'list' 
                ? 'flex items-center gap-4 p-3 bg-white/[0.02] rounded-2xl h-20' 
                : 'flex flex-col gap-3'}
            `}>
              {/* Image / Cover */}
              <div className={`
                ${viewMode === 'list' ? 'w-14 h-14' : 'aspect-square w-full'}
                bg-white/10 rounded-2xl animate-pulse
              `} />
              
              {/* Textes (Nom & Stats) */}
              <div className={`flex-1 space-y-2 ${viewMode !== 'list' ? 'mt-1' : ''}`}>
                <div className={`h-4 bg-white/10 rounded-lg animate-pulse ${viewMode === 'list' ? 'w-1/3' : 'w-full'}`} />
                <div className={`h-3 bg-white/5 rounded-lg animate-pulse ${viewMode === 'list' ? 'w-1/4' : 'w-2/3'}`} />
              </div>

              {/* Badges de droite (uniquement en liste) */}
              {viewMode === 'list' && (
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-white/5 rounded-xl animate-pulse" />
                  <div className="h-8 w-8 bg-white/5 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 4. LOAD MORE SKELETON */}
        <div className="flex justify-center pt-10">
          <div className="h-14 w-40 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </section>
    </div>
  );
}