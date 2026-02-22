"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ENDPOINTS } from "./config";
import { useApi } from "./hooks/useApi";
import { PulseSpinner } from "./components/CustomSpinner";


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
    <main className="min-h-screen text-white font-jost overflow-x-hidden">
      {/* --- ANIMATION DE FOND --- */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
      </div>

      <section className="relative flex flex-col items-center justify-center pt-12 md:pt-20 pb-16 md:pb-24 px-4 md:px-6 text-center">
        
        {/* --- SECTION STATS AVANT-GOÛT --- */}
        <div className="relative z-20 mb-12 w-full max-w-5xl animate-in fade-in slide-in-from-top-4 duration-1000">
          <h2 className="text-xl md:text-ss-titre font-hias mb-6 md:mb-10 opacity-80">
            Un avant-goût de vos stats...
          </h2>
          
          <div className="relative"> 
            {/* Grille responsive : 1 col mobile, 2 col tablette, 3 col desktop */}
            <div className={`flex flex-wrap justify-center gap-4 md:gap-6 transition-all duration-700 ${!isLoggedIn ? 'blur-md pointer-events-none select-none opacity-50' : ''}`}>
              {isLoggedIn && randomStats.length === 0 ? (
                <>
                  <div className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]">
                    <StatCardSkeleton />
                  </div>
                  <div className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]">
                    <StatCardSkeleton />
                  </div>
                  <div className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]">
                    <StatCardSkeleton />
                  </div>
                </>
              ) : (
                (randomStats.length > 0 ? randomStats : [
                  {title: "Top Titre", value: "Blinding Lights", detail: "The Weeknd"},
                  {title: "Genre Préféré", value: "Synthwave", detail: "80% de vos écoutes"},
                  {title: "Artiste du Moment", value: "Daft Punk", detail: "12h d'écoute"}
                ]).map((s, index) => (
                  <div 
                    key={index} 
                    className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]"
                  >
                    <StatPreviewCard 
                      title={s.title} 
                      value={s.value} 
                      detail={s.detail}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Overlay d'incitation (Adaptation de la taille de la boîte) */}
            {!loading && !isLoggedIn && (
              <div className="absolute inset-0 flex items-center justify-center z-30 px-4">
                <div className="bg-bg1/80 backdrop-blur-2xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl w-full max-w-md">
                  <p className="text-lg md:text-ss-titre font-hias text-white flex flex-col items-center gap-2">
                    <span className="text-vert text-3xl md:text-4xl mb-1">🔒</span>
                    <span className="text-center">Connectez-vous pour voir vos vraies stats</span>
                  </p>
                  <button 
                    onClick={() => window.location.href = ENDPOINTS.LOGIN}
                    className="mt-6 w-full bg-vert text-black py-3 md:py-4 rounded-full font-bold text-base md:text-lg hover:scale-105 transition-transform shadow-lg cursor-pointer"
                  >Se connecter avec Spotify</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CONTENU HERO --- */}
        <div className="relative z-10 mt-8">
          {/* Taille de police fluide pour le titre */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-titre font-hias leading-tight md:leading-none tracking-tighter mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Vos statistiques <br className="hidden sm:block" />
            <span className="text-vert">Spotify</span> en temps réel.
          </h1>
          <p className="text-sm md:text-ss-titre max-w-2xl text-gray-400 mb-10 leading-relaxed mx-auto px-2">
            Découvrez vos habitudes d'écoute, explorez vos artistes favoris et 
            plongez dans l'historique détaillé de votre bibliothèque musicale.
          </p>
          
          {/* Boutons empilés sur mobile, côte à côte sur desktop */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0">
            <button 
              onClick={() => router.push("/musiques")}
              className="bg-vert text-black px-8 py-4 rounded-full font-bold text-base md:text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Commencer l'expérience
            </button>
            <button 
              className="border border-gray-700 px-8 py-4 rounded-full font-bold text-base md:text-lg hover:bg-white/5 transition-colors backdrop-blur-sm"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>

      {/* Grille des fonctionnalités */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-6xl px-6 py-16 md:py-24 mx-auto"> 
        <FeatureCard title="Top Musiques" description="..." icon="🎵" />
        <FeatureCard title="Artistes Favoris" description="..." icon="👨‍🎤" />
        <FeatureCard title="Historique Local" description="..." icon="💾" />
      </section>

      {/* Section Technique / "About" */}
      <section className="py-6 md:py-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-s-titre font-hias mb-8 md:mb-12">Le Projet MyStats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm opacity-70">
            {["Next.js", "FastAPI", "SQLModel", "PostgreSQL"].map((tech) => (
              <div key={tech} className="p-3 md:p-4 border border-white/10 rounded-xl bg-white/5">{tech}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className="bg-bg2 p-6 md:p-8 rounded-2xl border border-white/5 hover:border-vert/30 transition-all group h-full">
      <div className="text-3xl md:text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{icon}</div>
      <h3 className="text-lg md:text-ss-titre font-hias mb-2 md:mb-3 text-white">{title}</h3>
      <p className="text-sm md:text-base text-gray-400 leading-snug font-light">{description}</p>
    </div>
  );
}

function StatPreviewCard({ title, value, detail }: { title: string, value: string, detail: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 md:p-6 rounded-2xl md:rounded-3xl text-left hover:border-vert/40 transition-all hover:scale-[1.02] cursor-default group h-full flex flex-col justify-between">
      <div>
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-vert mb-3 md:mb-4">{title}</p>
        <h3 className="text-lg md:text-xl font-hias mb-1 group-hover:text-vert transition-colors break-words">{value}</h3>
        <p className="text-xs md:text-sm text-gray-400 font-light leading-relaxed">{detail}</p>
      </div>
      <div className="flex justify-end mt-4 md:mt-2 opacity-100 md:opacity-20 md:group-hover:opacity-100 md:transition-opacity">
         <div className="h-1 w-8 md:w-12 bg-vert rounded-full"/>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/5 p-5 md:p-6 rounded-2xl md:rounded-3xl flex flex-col justify-center items-center">
      <PulseSpinner/><p className="mt-4 text-xs text-gray-500 animate-pulse">Chargement des stats...</p>
    </div>
  );
}