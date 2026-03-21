const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
);

const PROFILE_EDIT_STYLES = {
  MAIN: "min-h-screen pb-20 bg-bg1",
  // Banner Section
  BANNER_WRAPPER: "relative h-[250px] w-full group cursor-pointer overflow-hidden bg-bg2",
  BANNER_GRADIENT: "absolute inset-0 bg-gradient-to-t from-bg1 to-transparent",
  // Profile Header
  CONTAINER: "max-w-5xl mx-auto px-6 -mt-20 relative z-10",
  HEADER_FLEX: "flex flex-col md:flex-row items-center md:items-end gap-6",
  TEXT_GROUP: "flex-1 text-center md:text-left mb-4",
  // Avatar Edit
  AVATAR_WRAPPER: "relative w-40 h-40 group cursor-pointer mx-auto md:mx-0",
  // Form
  FORM_CARD: "bg-bg2/30 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 mt-12",
  FIELD_GROUP: "mb-6",
  // Footer Actions
  FOOTER: "flex items-center justify-end gap-4 mt-10",
};

export function ProfileEditSkeleton() {
  return (
    <main className={PROFILE_EDIT_STYLES.MAIN}>
      {/* --- SKELETON BANNIÈRE --- */}
      <div className={PROFILE_EDIT_STYLES.BANNER_WRAPPER}>
        <div className={`w-full h-full bg-white/5 animate-pulse`} />
        <div className={PROFILE_EDIT_STYLES.BANNER_GRADIENT} />
      </div>

      <div className={PROFILE_EDIT_STYLES.CONTAINER}>
        {/* --- SKELETON HEADER --- */}
        <div className={PROFILE_EDIT_STYLES.HEADER_FLEX}>
          <div className={PROFILE_EDIT_STYLES.AVATAR_WRAPPER}>
            <div className="w-full h-full rounded-4xl bg-white/10 animate-pulse" />
          </div>
          
          <div className={PROFILE_EDIT_STYLES.TEXT_GROUP}>
            <SkeletonPulse className="h-8 w-48 mb-2" />
            <SkeletonPulse className="h-4 w-64" />
          </div>
        </div>

        {/* --- SKELETON FORMULAIRE --- */}
        <div className={PROFILE_EDIT_STYLES.FORM_CARD}>
          {/* Nom d'affichage */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <SkeletonPulse className="h-4 w-24 mb-3" />
            <SkeletonPulse className="h-12 w-full" />
          </div>

          {/* Bio */}
          <div className={PROFILE_EDIT_STYLES.FIELD_GROUP}>
            <div className="flex justify-between mb-3">
              <SkeletonPulse className="h-4 w-20" />
              <SkeletonPulse className="h-3 w-12" />
            </div>
            <SkeletonPulse className="h-32 w-full" />
          </div>

          {/* Permissions */}
          <div className="flex flex-col justify-center mt-4">
            <SkeletonPulse className="h-4 w-32 mb-4" />
            <div className="flex flex-col gap-8 p-4 border border-white/5 bg-white/5 rounded-2xl w-full">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex flex-col gap-2">
                    <SkeletonPulse className="h-4 w-32" />
                    <SkeletonPulse className="h-3 w-64" />
                  </div>
                  <SkeletonPulse className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={PROFILE_EDIT_STYLES.FOOTER}>
            <SkeletonPulse className="h-10 w-24" />
            <SkeletonPulse className="h-10 w-48" />
          </div>
        </div>
      </div>
    </main>
  );
}