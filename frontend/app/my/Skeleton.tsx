export default function MyContentSkeleton() {
  // On simule les 3 colonnes
  const skeletonCards = [1, 2, 3];

  return (
    <main className="flex flex-col md:flex-row flex-1 w-full min-h-screen md:h-full overflow-hidden animate-pulse">
      {skeletonCards.map((id) => (
        <div
          key={id}
          className="relative flex flex-1 flex-col items-center justify-center border-b md:border-b-0 md:border-x border-gray-900 bg-gray-800/20"
        >
          {/* Simulation du fond flou (Placeholder sombre) */}
          <div className="absolute inset-0 z-0 bg-gray-900/50" />

          {/* Overlay gradient statique */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

          {/* Contenu Central du Skeleton */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Icône Skeleton (Cercle ou carré arrondi) */}
            <div className="mb-4 h-12 w-12 rounded-full bg-gray-700/50" />

            {/* Titre Skeleton (Barre rectangulaire) */}
            <div className="h-8 w-40 rounded bg-gray-700/50 md:h-10 md:w-48" />

            {/* Barre de soulignement (Optionnel dans un skeleton) */}
            <div className="mt-4 h-1 w-24 bg-gray-700/30" />
          </div>

          {/* Label du bas Skeleton */}
          <div className="absolute bottom-12 h-3 w-32 rounded bg-gray-700/30" />
        </div>
      ))}
    </main>
  );
}