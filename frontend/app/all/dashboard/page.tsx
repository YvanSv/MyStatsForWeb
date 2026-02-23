"use client";

export default function Dashboard() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-[#121212]">
      <div className="w-full max-w-4xl">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-white">Tableau de Bord</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#181818] p-6 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-[#1DB954]">Dernières Écoutes</h2>
            <p className="text-gray-400">La synchronisation arrive bientôt...</p>
          </div>

          <div className="bg-[#181818] p-6 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-[#1DB954]">Top Artistes</h2>
            <p className="text-gray-400">Analyse de tes goûts en cours.</p>
          </div>
        </div>
      </div>
    </main>
  );
}