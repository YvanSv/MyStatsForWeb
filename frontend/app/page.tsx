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
import { GENERAL_STYLES } from "./styles/general";
import { ACCUEIL_FEATURE_STYLES, ACCUEIL_STATS_STYLES, ACCUEIL_STYLES } from "./styles/accueil";
import { PulseSpinner } from "./components/small_elements/CustomSpinner";
import { useAuth } from "./hooks/useAuth";


export default function HomePage() {
  const router = useRouter();
  const { loading, isLoggedIn } = useAuth();
  
  // --- MOCK DATA ---
  const STATS = [
    { title: "Top Titre", value: "Blinding Lights", detail: "The Weeknd • 452 écoutes" },
    { title: "Genre Préféré", value: "Synthwave", detail: "80% de votre mix 2024" },
    { title: "Artiste du Moment", value: "Daft Punk", detail: "12h d'écoute cette semaine" }
  ];
  const TECHNOS = ["Next.js", "FastAPI", "SQLModel", "PostgreSQL"];

  if (loading) return <AccueilSkeleton/>;

  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        {/* --- SECTION STATS AVANT-GOÛT --- */}
        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          <p className={ACCUEIL_STYLES.PREVIEW_TITLE}>Un avant-goût de vos stats...</p>
          
          <div className="relative"> 
            <div className={ACCUEIL_STYLES.PREVIEW_GRID(isLoggedIn)}>
              {STATS.map((s, index) => <div key={index} className={ACCUEIL_STYLES.PREVIEW_ITEM}><StatPreviewCard {...s}/></div>)}
            </div>

            {!isLoggedIn && (
              <div className={ACCUEIL_STYLES.LOCK_OVERLAY}>
                <div className={ACCUEIL_STYLES.LOCK_CARD}>
                  <p className={ACCUEIL_STYLES.LOCK_TEXT}>
                    <span className={ACCUEIL_STYLES.LOCK_ICON}>🔒</span>
                    <span className="text-center font-semibold">Connectez-vous pour voir vos statistiques</span>
                  </p>
                  <button onClick={() => router.push(`${FRONT_ROUTES.AUTH}`)}
                    className={`${GENERAL_STYLES.GREENBUTTON} ${GENERAL_STYLES.TITRES_NOIR} rounded-full mt-6 w-full py-3 md:text-[20px] shadow-lg`}
                  >Se connecter</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- CONTENU HERO --- */}
        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <h1 className={ACCUEIL_STYLES.HERO_H1}>
            Vos statistiques <br className="hidden sm:block"/>
            <span className="text-vert">Spotify</span> en temps réel.
          </h1>
          <p className={ACCUEIL_STYLES.HERO_P}>
            Découvrez vos habitudes d'écoute, explorez vos artistes favoris et 
            plongez dans l'historique détaillé de votre bibliothèque musicale.
          </p>
          
          <div className={ACCUEIL_STYLES.HERO_BUTTON_GROUP}>
            <button className={`${GENERAL_STYLES.GREENBUTTON} rounded-full px-8 py-4 lg:text-lg shadow-lg`}>Commencer l'expérience</button>
            <button className={ACCUEIL_STYLES.BTN_SECONDARY}>En savoir plus</button>
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

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className={ACCUEIL_STATS_STYLES.WRAPPER}>
      <div>
        <div className={ACCUEIL_FEATURE_STYLES.ICON}>{icon}</div>
        <h3 className={ACCUEIL_FEATURE_STYLES.TITLE}>{title}</h3>
        <p className={ACCUEIL_FEATURE_STYLES.DESCRIPTION}>{description}</p>
      </div>
    </div>
  );
}

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
  PULSE: "animate-pulse bg-white/5",
  CARD: "bg-bg2/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden",
  // Hero
  H1: "h-12 w-3/4 md:w-1/2 rounded-2xl mb-6",
  P: "h-4 w-full md:w-2/3 rounded-lg mb-2",
  // Badges & Buttons
  BTN: "h-14 w-48 rounded-full",
  BADGE: "h-8 w-24 rounded-full",
};

function AccueilSkeleton({ isLoggedIn = true }) {
  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        
        {/* --- SKELETON STATS PREVIEW --- */}
        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          <div className={`${SKELETON_ACCUEIL.PULSE} h-5 w-48 rounded mb-6`} />
          
          <div className="relative">
            <div className={ACCUEIL_STYLES.PREVIEW_GRID(isLoggedIn)}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={SKELETON_ACCUEIL.CARD}>
                  <div className={`${SKELETON_ACCUEIL.PULSE} h-3 w-20 mb-4 rounded`} />
                  <div className={`${SKELETON_ACCUEIL.PULSE} h-10 w-32 mb-2 rounded-xl`} />
                  <div className={`${SKELETON_ACCUEIL.PULSE} h-3 w-24 rounded`} />
                  <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`${SKELETON_ACCUEIL.PULSE} h-full w-1/3 bg-vert/20`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- SKELETON HERO CONTENT --- */}
        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <div className={`${SKELETON_ACCUEIL.H1} ${SKELETON_ACCUEIL.PULSE}`} />
          <div className={`${SKELETON_ACCUEIL.H1} w-1/2 ${SKELETON_ACCUEIL.PULSE} -mt-4`} />
          
          <div className="mt-8 space-y-3">
            <div className={`${SKELETON_ACCUEIL.P} ${SKELETON_ACCUEIL.PULSE}`} />
            <div className={`${SKELETON_ACCUEIL.P} w-5/6 ${SKELETON_ACCUEIL.PULSE}`} />
          </div>
          
          <div className={`${ACCUEIL_STYLES.HERO_BUTTON_GROUP} mt-10`}>
            <div className={`${SKELETON_ACCUEIL.BTN} ${SKELETON_ACCUEIL.PULSE}`} />
            <div className={`${SKELETON_ACCUEIL.BTN} w-32 ${SKELETON_ACCUEIL.PULSE} bg-white/5`} />
          </div>
        </div>
      </section>

      {/* --- SKELETON FEATURES --- */}
      <section className={ACCUEIL_STYLES.FEATURE_GRID}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={SKELETON_ACCUEIL.CARD}>
             <div className="h-12 w-12 rounded-2xl bg-white/5 animate-pulse mb-6" />
             <div className="h-6 w-32 bg-white/10 animate-pulse rounded-lg mb-3" />
             <div className="h-4 w-full bg-white/5 animate-pulse rounded-lg mb-2" />
             <div className="h-4 w-2/3 bg-white/5 animate-pulse rounded-lg" />
          </div>
        ))}
      </section>

      {/* --- SKELETON TECH SECTION --- */}
      <section className={ACCUEIL_STYLES.TECH_SECTION}>
        <div className="h-8 w-64 bg-white/5 animate-pulse rounded-xl mx-auto mb-10" />
        <div className={ACCUEIL_STYLES.TECH_GRID}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${SKELETON_ACCUEIL.BADGE} ${SKELETON_ACCUEIL.PULSE}`} />
          ))}
        </div>
      </section>
    </main>
  );
}