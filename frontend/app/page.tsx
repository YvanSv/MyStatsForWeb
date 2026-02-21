"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ENDPOINTS } from "./config";
import { useApi } from "./hooks/useApi";


export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [randomStats, setRandomStats] = useState<any[]>([]);
  const { getMe, getOverview } = useApi();

  useEffect(() => {
    const initApp = async () => {
      try {
        const userData = await getMe();
        if (userData.is_logged_in) {
          setIsLoggedIn(true);
          setRandomStats(await getOverview());
        } else { setIsLoggedIn(false); }
      } catch (error) {
        console.error("Erreur d'initialisation:", error);
        setIsLoggedIn(false);
      } finally { setLoading(false); }
    };
    initApp();
  }, [getMe]);

  return (
    <main className="min-h-screen text-white font-jost">
      {/* --- ANIMATION DE FOND --- */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[30%] left-[15%] h-80 w-80 animate-blob rounded-full bg-vert opacity-20 blur-[120px] filter"></div>
        <div className="absolute top-[45%] right-[15%] h-80 w-80 animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-20 blur-[120px] filter"></div>
      </div>

      <section className="relative flex flex-col items-center justify-center pt-20 pb-24 px-6 text-center overflow-hidden">
        {/* --- SECTION STATS AVANT-GOÛT --- */}
        <div className="relative z-20 mb-12 w-full max-w-5xl animate-in fade-in slide-in-from-top-4 duration-1000 pb-20">
          <h2 className="text-ss-titre font-hias mb-6 opacity-80 pb-10">Un avant-goût de vos stats...</h2>
          <div className="relative"> 
            {/* La Grille (flou ici si non connecté) */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-700 ${!isLoggedIn ? 'blur-md pointer-events-none select-none opacity-50' : ''}`}>
              {/* SI CONNECTÉ MAIS PAS ENCORE DE DATA : Afficher 3 Skeletons */}
              {isLoggedIn && randomStats.length === 0 ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                (randomStats.length > 0 ? randomStats : [
                  {title: "Top Titre", value: "Blinding Lights", detail: "The Weeknd"},
                  {title: "Genre Préféré", value: "Synthwave", detail: "80% de vos écoutes"},
                  {title: "Artiste du Moment", value: "Daft Punk", detail: "12h d'écoute"}
                ]).map((s, index) => (
                  <StatPreviewCard 
                    key={index}
                    title={s.title} 
                    value={s.value} 
                    detail={s.detail}
                  />
                ))
              )}
            </div>

            {/* L'Overlay d'incitation */}
            {loading ? (<header className="h-20 bg-background" />) : !isLoggedIn && (
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="bg-bg1/60 backdrop-blur-xl border border-white/10 px-10 py-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5">
                  <p className="text-ss-titre font-hias text-white flex flex-col items-center gap-3">
                    <span className="text-vert text-4xl mb-2">🔒</span>
                    Connectez-vous pour voir vos vraies stats
                  </p>
                  <button 
                    onClick={() => window.location.href = ENDPOINTS.LOGIN}
                    className="mt-6 w-full bg-vert text-black py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(29,208,93,0.4)] cursor-pointer"
                  >Se connecter avec Spotify</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CONTENU HERO --- */}
        <div className="relative z-10">
          <h1 className="text-titre font-hias leading-none tracking-tighter mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Vos statistiques <br />
            <span className="text-vert">Spotify</span> en temps réel.
          </h1>
          <p className="text-ss-titre max-w-2xl text-gray-400 mb-10 leading-relaxed mx-auto">
            Découvrez vos habitudes d'écoute, explorez vos artistes favoris et 
            plongez dans l'historique détaillé de votre bibliothèque musicale.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => router.push("/musiques")}
              className="bg-vert text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform cursor-pointer shadow-[0_0_20px_rgba(29,208,93,0.3)]"
            >
              Commencer l'expérience
            </button>
            <button 
              className="border border-gray-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-white/5 transition-colors cursor-pointer backdrop-blur-sm"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>

      {/* Grille des fonctionnalités */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          title="Top Musiques" 
          description="Analysez les titres qui tournent en boucle dans vos oreilles ce mois-ci."
          icon="🎵"
        />
        <FeatureCard 
          title="Artistes Favoris" 
          description="Le classement de ceux qui définissent votre univers musical."
          icon="👨‍🎤"
        />
        <FeatureCard 
          title="Historique Local" 
          description="Une base de données PostgreSQL dédiée pour ne jamais oublier un morceau."
          icon="💾"
        />
      </section>

      {/* Section Technique / "About" */}
      <section className="bg-bg2 py-5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-s-titre font-hias mb-8">Le Projet MyStats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm opacity-70">
            <div className="p-4 border border-white/10 rounded-lg">Next.js</div>
            <div className="p-4 border border-white/10 rounded-lg">FastAPI</div>
            <div className="p-4 border border-white/10 rounded-lg">SQLModel</div>
            <div className="p-4 border border-white/10 rounded-lg">PostgreSQL</div>
          </div>
          <p className="mt-10 text-gray-400 leading-relaxed italic">
            Tous droits réservés.
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className="bg-bg2 p-8 rounded-2xl border border-white/5 hover:border-vert/30 transition-colors group">
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">
        {icon}
      </div>
      <h3 className="text-ss-titre font-hias mb-3">{title}</h3>
      <p className="text-gray-400 leading-snug font-light">
        {description}
      </p>
    </div>
  );
}

function StatPreviewCard({ title, value, detail }: { title: string, value: string, detail: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-left hover:border-vert/40 transition-all hover:scale-[1.02] cursor-default group">
      <p className="text-xs font-bold uppercase tracking-widest text-vert mb-4">{title}</p>
      <h3 className="text-xl font-hias mb-1 group-hover:text-vert transition-colors">{value}</h3>
      <p className="text-sm text-gray-400 font-light">{detail}</p>
      
      {/* Déco subtile en bas à droite */}
      <div className="flex justify-end mt-2 opacity-20 group-hover:opacity-100 transition-opacity">
         <div className="h-1 w-12 bg-vert rounded-full"></div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/5 p-6 rounded-3xl h-[160px] flex flex-col justify-center items-center">
      <div className="w-8 h-8 border-4 border-vert/20 border-t-vert rounded-full animate-spin"></div>
      <p className="mt-4 text-xs text-gray-500 animate-pulse">Chargement des stats...</p>
    </div>
  );
}