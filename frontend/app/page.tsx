/*
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
import { GENERAL_STYLES, BASE_UI } from "./styles/general";

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
        {/* LA COUCHE DE TEXTURE - Gérée par BASE_UI via HERO_NOISE */}
        <div className={ACCUEIL_STYLES.HERO_NOISE} />

        {/* CONTAINER DE PREVIEW DES STATS */}
        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          <p className={ACCUEIL_STYLES.PREVIEW_TITLE}>Preview de votre univers</p>
          
          <div className="relative"> 
            {/* Grille avec flou dynamique si non connecté */}
            <div className={ACCUEIL_STYLES.PREVIEW_GRID(isLoggedIn)}>
              {STATS.map((s, index) => (
                <div key={index}><StatPreviewCard {...s}/></div>
              ))}
            </div>

            {/* OVERLAY DE VERROUILLAGE */}
            {!isLoggedIn && (
              <div className={ACCUEIL_STYLES.LOCK_OVERLAY}>
                <div className={ACCUEIL_STYLES.LOCK_CARD}>
                  <div className="w-16 h-16 bg-vert/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">🔒</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Statistiques privées</h2>
                  <p className={`${GENERAL_STYLES.TEXT3} mb-8`}>
                    Connectez votre compte Spotify pour débloquer votre tableau de bord.
                  </p>
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

        {/* TEXTES DU HERO */}
        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <h1 className={ACCUEIL_STYLES.HERO_H1}>
            Votre musique,<br/>
            <span className={GENERAL_STYLES.TEXT2}>décryptée.</span>
          </h1>
          <p className={ACCUEIL_STYLES.HERO_P}>
            Analysez vos habitudes d'écoute avec une précision chirurgicale. 
            Découvrez ce qui fait vibrer votre algorithme.
          </p>
          
          {/* BOUTONS D'ACTION */}
          <div className={ACCUEIL_STYLES.HERO_BUTTON_GROUP}>
            <button className={ACCUEIL_STYLES.BTN_PRIMARY}>
              Analyser mon profil
            </button>
            <button className={`${ACCUEIL_STYLES.BTN_SECONDARY} group`}>
              En savoir plus 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>
      
      {/* GRILLE DES FONCTIONNALITÉS */}
      <section className={ACCUEIL_STYLES.FEATURE_GRID}> 
        <FeatureCard title="Top Musiques" description="Visualisez vos morceaux les plus écoutés." icon="🎵" />
        <FeatureCard title="Artistes Favoris" description="Le classement de vos artistes préférés." icon="👨‍🎤" />
        <FeatureCard title="Historique Local" description="Gardez une trace de vos écoutes." icon="💾" />
      </section>

      {/* SECTION TECHNIQUE (STACK) */}
      <section className={ACCUEIL_STYLES.TECH_SECTION}>
        <h2 className={ACCUEIL_STYLES.TECH_H2}>Le Projet MyStats</h2>
        <div className={ACCUEIL_STYLES.TECH_GRID}>
          {TECHNOS.map(tech => (
            <div key={tech} className={ACCUEIL_STYLES.TECH_BADGE}>
              {tech}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/* --- SOUS-COMPOSANTS --- */

function FeatureCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <div className={ACCUEIL_STATS_STYLES.WRAPPER}>
      {/* Halo de lumière interne visible uniquement au survol */}
      <div className="absolute -inset-px bg-gradient-to-br from-vert/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative z-10">
        <div className={ACCUEIL_FEATURE_STYLES.ICON}>{icon}</div>
        <h3 className={ACCUEIL_FEATURE_STYLES.TITLE}>{title}</h3>
        <p className={ACCUEIL_FEATURE_STYLES.DESCRIPTION}>{description}</p>
      </div>

      <div className={ACCUEIL_STATS_STYLES.INDICATOR_WRAPPER}>
         <div className={ACCUEIL_STATS_STYLES.INDICATOR_BAR} />
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

function AccueilSkeleton() {
  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        <div className={ACCUEIL_STYLES.HERO_NOISE} />
        {/* Glow de fond conservé en inline car très spécifique au design de l'accueil */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-vert/5 blur-[140px] rounded-full -z-10" />

        <div className={ACCUEIL_STYLES.PREVIEW_CONTAINER}>
          {/* Titre de preview pulsant */}
          <div className={`${SKELETON_ACCUEIL.PULSE} h-4 w-40 mx-auto rounded mb-12`} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={SKELETON_ACCUEIL.CARD}>
                <div className={`${SKELETON_ACCUEIL.PULSE} h-3 w-16 mb-6 rounded`} />
                <div className={`${SKELETON_ACCUEIL.PULSE} h-8 w-40 mb-3 ${BASE_UI.rounded.input}`} />
                <div className={`${SKELETON_ACCUEIL.PULSE} h-4 w-24 rounded`} />
                {/* On utilise INDICATOR_WRAPPER ici pour la cohérence visuelle */}
                <div className={ACCUEIL_STATS_STYLES.INDICATOR_WRAPPER} />
              </div>
            ))}
          </div>
        </div>

        <div className={ACCUEIL_STYLES.HERO_CONTENT}>
          <div className="flex flex-col items-center">
            {/* Lignes du H1 */}
            <div className={`${SKELETON_ACCUEIL.H1} ${SKELETON_ACCUEIL.PULSE}`} />
            <div className={`${SKELETON_ACCUEIL.H1} w-1/2 ${SKELETON_ACCUEIL.PULSE}`} />
            
            {/* Lignes du Paragraphe P */}
            <div className="mt-8 w-full flex flex-col items-center">
              <div className={`${SKELETON_ACCUEIL.P} ${SKELETON_ACCUEIL.PULSE}`} />
              <div className={`${SKELETON_ACCUEIL.P} w-5/6 ${SKELETON_ACCUEIL.PULSE}`} />
            </div>
            
            {/* Groupe de boutons - Utilise HERO_BUTTON_GROUP pour le layout */}
            <div className={`${ACCUEIL_STYLES.HERO_BUTTON_GROUP} mt-12 w-full`}>
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
             {/* Icône Feature */}
             <div className={`h-14 w-14 ${BASE_UI.rounded.input} ${SKELETON_ACCUEIL.PULSE} mb-8`} />
             {/* Titre Feature */}
             <div className={`h-7 w-40 ${SKELETON_ACCUEIL.PULSE} rounded-lg mb-4`} />
             {/* Description Feature */}
             <div className="space-y-2">
                <div className={`h-4 w-full ${SKELETON_ACCUEIL.PULSE} rounded`} />
                <div className={`h-4 w-2/3 ${SKELETON_ACCUEIL.PULSE} rounded`} />
             </div>
          </div>
        ))}
      </section>

      {/* --- TECH SKELETON --- */}
      <section className={ACCUEIL_STYLES.TECH_SECTION}>
        <div className={`h-4 w-48 ${SKELETON_ACCUEIL.PULSE} rounded mx-auto mb-16`} />
        <div className={ACCUEIL_STYLES.TECH_GRID}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`${SKELETON_ACCUEIL.BADGE} ${SKELETON_ACCUEIL.PULSE}`} />
          ))}
        </div>
      </section>
    </main>
  );
}

export const SKELETON_ACCUEIL = {
  PULSE: `animate-pulse bg-white/[0.05]`,
  CARD: `bg-white/[0.03] border border-white/5 ${BASE_UI.rounded.card} p-8 relative overflow-hidden`,
  H1: `h-16 md:h-24 w-3/4 ${BASE_UI.rounded.input} mb-4`,
  P: "h-4 w-full md:w-2/3 rounded-lg mb-2",
  BADGE: `h-10 w-28 ${BASE_UI.rounded.badge}`,
  BTN: `h-16 w-48 ${BASE_UI.rounded.badge}`,
};

export const ACCUEIL_STATS_STYLES = {
  WRAPPER: `relative group overflow-hidden bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 rounded-[24px] p-8 ${BASE_UI.anim.slow} ${BASE_UI.anim.hoverLift}`,
  LABEL: `${GENERAL_STYLES.TEXT2} text-[11px] font-black ${BASE_UI.typo.wide} mb-6 group-hover:tracking-[0.3em] ${BASE_UI.anim.slow}`,
  VALUE: `${GENERAL_STYLES.TEXT1} text-2xl md:text-3xl font-bold mb-2 tracking-tight`,
  INDICATOR_WRAPPER: `mt-8 h-[2px] w-full bg-white/5 ${BASE_UI.rounded.badge} overflow-hidden`,
  INDICATOR_BAR: "h-full w-0 group-hover:w-full bg-vert transition-all duration-1000 ease-out shadow-[0_0_15px_#1ed760]",
  DETAIL: `${GENERAL_STYLES.TEXT3} text-sm font-medium group-hover:text-gray-300 transition-colors`,
};

export const ACCUEIL_STYLES = {
  MAIN: `${GENERAL_STYLES.TEXT1} flex-1 flex flex-col min-h-screen selection:bg-vert/30 selection:text-vert overflow-x-hidden`,
  
  // Structure & Layouts (Rétablis)
  HERO_SECTION: "relative flex flex-col items-center justify-center pt-24 pb-32 px-6 isolate",
  HERO_NOISE: "absolute inset-0 opacity-[0.03] pointer-events-none -z-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",
  HERO_CONTENT: "relative z-10 text-center mt-12",
  HERO_BUTTON_GROUP: "flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0",
  
  PREVIEW_CONTAINER: "relative z-20 mb-20 w-full max-w-6xl animate-in fade-in zoom-in-95 duration-1000",
  PREVIEW_TITLE: `${GENERAL_STYLES.TEXT3} text-sm ${BASE_UI.typo.wide} text-center mb-12 font-medium`,
  FEATURE_GRID: "grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl px-6 py-32 mx-auto",
  TECH_SECTION: "py-24 px-6 bg-white/[0.02]",
  TECH_GRID: "flex flex-wrap justify-center gap-4 max-w-4xl mx-auto",
  
  // Reste du bloc
  PREVIEW_GRID: (isLoggedIn: boolean) => `grid grid-cols-1 md:grid-cols-3 gap-6 ${BASE_UI.anim.slow} duration-1000 ${!isLoggedIn ? 'blur-xl scale-95 pointer-events-none opacity-40' : ''}`,
  LOCK_OVERLAY: "absolute inset-0 flex items-center justify-center z-30 px-4",
  LOCK_CARD: `${BASE_UI.common.glass} p-8 md:p-12 ${BASE_UI.rounded.card} shadow-2xl text-center`,
  HERO_H1: `${GENERAL_STYLES.TEXT1} text-5xl md:text-8xl ${BASE_UI.typo.hero} mb-8`,
  HERO_P: `${GENERAL_STYLES.TEXT3} text-lg md:text-xl max-w-xl mb-12 leading-relaxed mx-auto font-light`,
  TECH_H2: `${GENERAL_STYLES.TEXT3} text-sm ${BASE_UI.typo.wide} text-center mb-16`,
  TECH_BADGE: `px-6 py-3 border border-white/5 ${BASE_UI.rounded.badge} bg-white/5 font-mono text-sm hover:border-vert/30 transition-colors`,
  BTN_PRIMARY: `${GENERAL_STYLES.GREENBUTTON} px-10 py-5 text-lg`,
  BTN_SECONDARY: `${GENERAL_STYLES.GRAYBUTTON} px-8 py-5 text-lg`,
};

export const ACCUEIL_FEATURE_STYLES = {
  // L'icône qui s'anime au hover sur la carte
  ICON: `text-5xl mb-8 block group-hover:scale-110 group-hover:-translate-y-2 ${BASE_UI.anim.slow}`,
  
  // Le titre de la feature qui passe au vert
  TITLE: `${GENERAL_STYLES.TEXT1} text-2xl font-bold mb-4 group-hover:text-vert transition-colors duration-300 ${BASE_UI.typo.tight}`,
  
  // La description avec un léger effet d'opacité
  DESCRIPTION: `${GENERAL_STYLES.TEXT3} leading-relaxed font-light text-base opacity-80 group-hover:opacity-100 transition-opacity duration-300`,
};