const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

const PROFILE_STYLES = {
  MAIN_WRAPPER: "min-h-screen pb-20 bg-bg1",
  
  // BANNER
  BANNER_WRAPPER: "relative h-[300px] w-full overflow-hidden",
  GRADIENT_OVERLAY: "absolute inset-0 bg-gradient-to-t from-bg1 via-bg1/20 to-transparent",

  // CONTAINER & HEADER
  CONTAINER: "max-w-7xl mx-auto px-6 -mt-24 relative z-10",

  // GRIDS & CARDS
  STATS_GRID: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full mb-4",
  RECENT_CONTAINER: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8",
};

export function ProfileSkeleton() {
  return (
    <div className={PROFILE_STYLES.MAIN_WRAPPER}>
      {/* --- BANNIÈRE SKELETON --- */}
      <div className={PROFILE_STYLES.BANNER_WRAPPER}>
        <div className="w-full h-full bg-white/5 animate-pulse" />
        <div className={PROFILE_STYLES.GRADIENT_OVERLAY} />
      </div>

      <div className={PROFILE_STYLES.CONTAINER}>
        {/* HEADER PROFIL SKELETON */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12 relative -mt-16 md:-mt-20">
          {/* Avatar circle */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-4xl border-4 border-bg1 bg-white/10 animate-pulse shadow-2xl" />
          
          <div className="flex-1 flex flex-col items-center md:items-start gap-3">
             <SkeletonPulse className="h-10 w-48 md:w-64" />
             <div className="flex gap-2">
                <SkeletonPulse className="h-10 w-32 rounded-full" />
                <SkeletonPulse className="h-10 w-10 rounded-full" />
             </div>
          </div>
        </div>

        {/* BIO SKELETON */}
        <div className="mb-12 px-6 space-y-3">
          <SkeletonPulse className="h-4 w-full opacity-60" />
          <SkeletonPulse className="h-4 w-[90%] opacity-40" />
          <SkeletonPulse className="h-4 w-[40%] opacity-20" />
        </div>

        {/* STATS GRID SKELETON */}
        <div className={PROFILE_STYLES.STATS_GRID}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-bg2/40 border border-white/5 p-5 rounded-3xl h-32 flex flex-col justify-between">
               <SkeletonPulse className="h-3 w-20" />
               <SkeletonPulse className="h-8 w-32" />
               <SkeletonPulse className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* SECTIONS TOP 50 SKELETON */}
        <div className="mt-8 space-y-20">
          {[1, 2].map((section) => (
            <div key={section} className="flex flex-col gap-6">
              <div className="flex justify-between items-end px-2">
                <SkeletonPulse className="h-6 w-40" />
                <SkeletonPulse className="h-4 w-16" />
              </div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="flex-shrink-0 w-[100px] md:w-[120px]">
                    <SkeletonPulse className="aspect-square w-full rounded-xl mb-3" />
                    <SkeletonPulse className="h-4 w-full mb-2" />
                    <SkeletonPulse className="h-3 w-2/3 opacity-50" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ÉCOUTES RÉCENTES SKELETON */}
        <div className={PROFILE_STYLES.RECENT_CONTAINER + " mt-20"}>
          <SkeletonPulse className="h-6 w-48 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <SkeletonPulse className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <SkeletonPulse className="h-4 w-1/3" />
                  <SkeletonPulse className="h-3 w-1/4 opacity-50" />
                </div>
                <SkeletonPulse className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}