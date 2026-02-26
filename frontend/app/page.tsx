/*"use client";

import { useEffect, useState } from "react";
import { useApiMyDatas } from "./hooks/useApiMyDatas";

export default function HomePage() {
  const router = useRouter();
  const [randomStats, setRandomStats] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        const userData = await getMe();
        if (!isMounted) return;
        if (userData.is_logged_in) {
          setIsLoggedIn(true);
          const stats = await getOverview();
          setRandomStats(stats);
        } else {setIsLoggedIn(false);}
      } catch (error) {if (isMounted) setIsLoggedIn(false);}
      finally {if (isMounted) setLoading(false);}
    };
    initApp();
    return () => { isMounted = false; };
  }, [getMe, getOverview]);
}*/
"use client";

import { useRouter } from "next/navigation";
import { FRONT_ROUTES } from "./config";
import { useAuth } from "./hooks/useAuth";
import { GENERAL_STYLES } from "./styles/general";

const ACCUEIL_STYLES = {
  MAIN: `${GENERAL_STYLES.TEXT1} flex-1 flex flex-col min-h-screen selection:bg-vert/30 selection:text-vert overflow-x-hidden`,
  // HERO SECTION
  HERO_SECTION: "relative flex flex-col items-center justify-center pt-24 pb-32 px-6 isolate",
  HERO_NOISE: "absolute inset-0 opacity-[0.03] pointer-events-none -z-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",

  // PREVIEW STATS
  PREVIEW_CONTAINER: "relative z-20 mb-20 w-full max-w-6xl animate-in fade-in zoom-in-95 duration-1000",
  PREVIEW_TITLE: `${GENERAL_STYLES.TEXT3} text-sm uppercase tracking-[0.3em] text-center mb-12 font-medium`,
  PREVIEW_GRID: (isLoggedIn: boolean) => `
    grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-1000 ease-in-out
    ${!isLoggedIn ? 'blur-xl scale-95 pointer-events-none select-none opacity-40' : 'opacity-100 scale-100'}
  `,
  PREVIEW_ITEM: "w-full",

  // LOCK CARD
  LOCK_OVERLAY: "absolute inset-0 flex items-center justify-center z-30 px-4",
  LOCK_CARD: "bg-[#0A0A0A]/60 backdrop-blur-md border border-white/5 p-8 md:p-12 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] text-center",
  LOCK_TEXT: `${GENERAL_STYLES.TEXT1} text-lg md:text-xl flex flex-col items-center gap-2`,
  LOCK_ICON: "text-vert text-3xl md:text-4xl mb-1",
  
  // HERO CONTENT
  HERO_CONTENT: "relative z-10 text-center mt-12",
  HERO_H1: `${GENERAL_STYLES.TEXT1} text-5xl md:text-8xl font-bold tracking-tight leading-[0.9] mb-8`,
  HERO_P: `${GENERAL_STYLES.TEXT3} text-lg md:text-xl max-w-xl mb-12 leading-relaxed mx-auto font-light`,
  HERO_BUTTON_GROUP: "flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0",
  
  // BUTTONS
  BTN_PRIMARY: `px-10 py-5 text-lg ${GENERAL_STYLES.GREENBUTTON}`,
  BTN_SECONDARY: `px-8 py-5 text-lg ${GENERAL_STYLES.GRAYBUTTON}`,

  // SECTIONS & GRIDS
  FEATURE_GRID: "grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl px-6 py-32 mx-auto",
  TECH_SECTION: "py-24 px-6 bg-white/[0.02]",
  TECH_H2: `${GENERAL_STYLES.TEXT3} text-sm uppercase tracking-[0.3em] text-center mb-16`,
  TECH_GRID: "flex flex-wrap justify-center gap-4 max-w-4xl mx-auto",
  TECH_BADGE: "px-6 py-3 border border-white/5 rounded-full bg-white/5 font-mono text-sm hover:border-vert/30 transition-colors"
};

export default function HomePage() {
  const router = useRouter();
  const { loading, isLoggedIn } = useAuth();
  
  const STATS = [
    { title: "Top Titre", value: "Blinding Lights", detail: "The Weeknd • 452 écoutes" },
    { title: "Genre Préféré", value: "Synthwave", detail: "80% de votre mix 2024" },
    { title: "Artiste du Moment", value: "Daft Punk", detail: "12h d'écoute cette semaine" }
  ];
  const TECHNOS = ["Next.js", "FastAPI", "SQLModel", "PostgreSQL"];

  if (loading) return <AccueilSkeleton />;

  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        {/* LA COUCHE DE TEXTURE */}
        <div className={ACCUEIL_STYLES.HERO_NOISE} />

        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          <p className={ACCUEIL_STYLES.PREVIEW_TITLE}>Preview de votre univers</p>
          
          <div className="relative"> 
            <div className={ACCUEIL_STYLES.PREVIEW_GRID(isLoggedIn)}>
              {STATS.map((s, index) => (
                <div key={index}><StatPreviewCard {...s}/></div>
              ))}
            </div>

            {!isLoggedIn && (
              <div className={ACCUEIL_STYLES.LOCK_OVERLAY}>
                <div className={ACCUEIL_STYLES.LOCK_CARD}>
                   <div className="w-16 h-16 bg-vert/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">🔒</span>
                   </div>
                   <h2 className="text-2xl font-bold mb-2">Statistiques privées</h2>
                   <p className={`${GENERAL_STYLES.TEXT3} mb-8`}>Connectez votre compte Spotify pour débloquer votre tableau de bord.</p>
                   <button 
                    onClick={() => router.push(`${FRONT_ROUTES.AUTH}`)}
                    className={ACCUEIL_STYLES.BTN_PRIMARY}
                   >
                     Se connecter avec Spotify
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <h1 className={ACCUEIL_STYLES.HERO_H1}>
            Votre musique,<br/>
            <span className={`${GENERAL_STYLES.TEXT2}`}>décryptée.</span>
          </h1>
          <p className={ACCUEIL_STYLES.HERO_P}>
            Analysez vos habitudes d'écoute avec une précision chirurgicale. 
            Découvrez ce qui fait vibrer votre algorithme.
          </p>
          
          <div className={ACCUEIL_STYLES.HERO_BUTTON_GROUP}>
            <button className={ACCUEIL_STYLES.BTN_PRIMARY}>
              Analyser mon profil
            </button>
            <button className={ACCUEIL_STYLES.BTN_SECONDARY}>
              En savoir plus <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>
      
      {/* Grille des fonctionnalités */}
      <section className={ACCUEIL_STYLES.FEATURE_GRID}> 
        <FeatureCard title="Top Musiques" description="Visualisez vos morceaux les plus écoutés." icon="🎵" />
        <FeatureCard title="Artistes Favoris" description="Le classement de vos artistes préférés." icon="👨‍🎤" />
        <FeatureCard title="Historique Local" description="Gardez une trace de vos écoutes." icon="💾" />
      </section>

      {/* Section Technique */}
      <section className={ACCUEIL_STYLES.TECH_SECTION}>
        <h2 className={ACCUEIL_STYLES.TECH_H2}>Le Projet MyStats</h2>
        <div className={ACCUEIL_STYLES.TECH_GRID}>
          {TECHNOS.map(tech => <div key={tech} className={ACCUEIL_STYLES.TECH_BADGE}>{tech}</div>)}
        </div>
      </section>
    </main>
  );
}

/* --- SOUS-COMPOSANTS --- */

const ACCUEIL_FEATURE_STYLES = {
  ICON: `text-5xl mb-8 block group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-500 ease-out`,
  TITLE: `${GENERAL_STYLES.TEXT1} text-2xl font-bold mb-4 group-hover:text-vert transition-colors duration-300 tracking-tight`,
  DESCRIPTION: `${GENERAL_STYLES.TEXT3} leading-relaxed font-light text-base opacity-80 group-hover:opacity-100 transition-opacity duration-300`,
};

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className={ACCUEIL_STATS_STYLES.WRAPPER}>
      {/* Halo de lumière interne visible uniquement au survol */}
      <div className="absolute -inset-px bg-gradient-to-br from-vert/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative z-10">
        <div className={ACCUEIL_FEATURE_STYLES.ICON}>
          {icon}
        </div>
        
        <h3 className={ACCUEIL_FEATURE_STYLES.TITLE}>
          {title}
        </h3>
        
        <p className={ACCUEIL_FEATURE_STYLES.DESCRIPTION}>
          {description}
        </p>
      </div>

      <div className={ACCUEIL_STATS_STYLES.INDICATOR_WRAPPER}>
         <div className={ACCUEIL_STATS_STYLES.INDICATOR_BAR} />
      </div>
    </div>
  );
}

const ACCUEIL_STATS_STYLES = {
  // Ajout d'une bordure "interne" lumineuse (ring)
  WRAPPER: `relative group overflow-hidden bg-gradient-to-b from-white/[0.05] to-transparent 
    border border-white/10 rounded-[24px] p-8 transition-all duration-500 
    hover:border-vert/30 hover:-translate-y-2`,
  
  LABEL: `${GENERAL_STYLES.TEXT2} text-[11px] font-black uppercase tracking-[0.25em] mb-6 group-hover:text-vert group-hover:tracking-[0.3em] transition-all duration-500`,
  VALUE: `${GENERAL_STYLES.TEXT1}  text-2xl md:text-3xl font-bold mb-2 tracking-tight`,
  DETAIL: `${GENERAL_STYLES.TEXT3} text-sm font-medium group-hover:text-gray-300 transition-colors`,
  
  // Barre de progression élégante
  INDICATOR_WRAPPER: "mt-8 h-[2px] w-full bg-white/5 rounded-full overflow-hidden",
  INDICATOR_BAR: "h-full w-0 group-hover:w-full bg-vert transition-all duration-1000 ease-out shadow-[0_0_15px_#1ed760]",
};

function StatPreviewCard({ title, value, detail }: { title: string, value: string, detail: string }) {
  return (
    <div className={ACCUEIL_STATS_STYLES.WRAPPER}>
      <div className="absolute -inset-px bg-gradient-to-br from-vert/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
      <div>
        <p className={ACCUEIL_STATS_STYLES.LABEL}>{title}</p>
        <h3 className={ACCUEIL_STATS_STYLES.VALUE}>{value}</h3>
        <p className={ACCUEIL_STATS_STYLES.DETAIL}>{detail}</p>
      </div>
      <div className={ACCUEIL_STATS_STYLES.INDICATOR_WRAPPER}>
         <div className={ACCUEIL_STATS_STYLES.INDICATOR_BAR}/>
      </div>
    </div>
  );
}

const SKELETON_ACCUEIL = {
  PULSE: "animate-pulse bg-white/[0.05]",
  CARD: "bg-white/[0.03] border border-white/5 rounded-[32px] p-8 relative overflow-hidden",
  H1: "h-16 md:h-24 w-3/4 rounded-2xl mb-4",
  P: "h-4 w-full md:w-2/3 rounded-lg mb-2",
  BADGE: "h-10 w-28 rounded-full",
  BTN: "h-16 w-48 rounded-full",
};

function AccueilSkeleton() {
  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        <div className={ACCUEIL_STYLES.HERO_NOISE} />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-vert/5 blur-[140px] rounded-full -z-10" />

        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          <div className={`${SKELETON_ACCUEIL.PULSE} h-4 w-40 mx-auto rounded mb-12`} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={SKELETON_ACCUEIL.CARD}>
                <div className={`${SKELETON_ACCUEIL.PULSE} h-3 w-16 mb-6 rounded`} />
                <div className={`${SKELETON_ACCUEIL.PULSE} h-8 w-40 mb-3 rounded-lg`} />
                <div className={`${SKELETON_ACCUEIL.PULSE} h-4 w-24 rounded`} />
                <div className="mt-8 h-[2px] w-full bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <div className="flex flex-col items-center">
            <div className={`${SKELETON_ACCUEIL.H1} ${SKELETON_ACCUEIL.PULSE}`} />
            <div className={`${SKELETON_ACCUEIL.H1} w-1/2 ${SKELETON_ACCUEIL.PULSE}`} />
            
            <div className="mt-8 w-full flex flex-col items-center">
              <div className={`${SKELETON_ACCUEIL.P} ${SKELETON_ACCUEIL.PULSE}`} />
              <div className={`${SKELETON_ACCUEIL.P} w-5/6 ${SKELETON_ACCUEIL.PULSE}`} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full justify-center">
              <div className={`${SKELETON_ACCUEIL.BTN} ${SKELETON_ACCUEIL.PULSE}`} />
              <div className={`${SKELETON_ACCUEIL.BTN} w-32 ${SKELETON_ACCUEIL.PULSE}`} />
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SKELETON --- */}
      <section className={ACCUEIL_STYLES.FEATURE_GRID}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={SKELETON_ACCUEIL.CARD}>
             <div className="h-14 w-14 rounded-2xl bg-white/[0.05] animate-pulse mb-8" />
             <div className="h-7 w-40 bg-white/[0.08] animate-pulse rounded-lg mb-4" />
             <div className="space-y-2">
                <div className="h-4 w-full bg-white/[0.04] animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-white/[0.04] animate-pulse rounded" />
             </div>
          </div>
        ))}
      </section>

      {/* --- TECH SKELETON --- */}
      <section className={ACCUEIL_STYLES.TECH_SECTION}>
        <div className="h-4 w-48 bg-white/[0.05] animate-pulse rounded mx-auto mb-16" />
        <div className={ACCUEIL_STYLES.TECH_GRID}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${SKELETON_ACCUEIL.BADGE} ${SKELETON_ACCUEIL.PULSE}`} />
          ))}
        </div>
      </section>
    </main>
  );
}