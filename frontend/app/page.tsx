"use client";
import { useEffect, useState } from "react";
import { GENERAL_STYLES, BASE_UI } from "./styles/general";
import { useApiAllDatas } from "./hooks/useApiAllDatas";

export default function HomePage() {
  const TECHNOS = ["Next.js", "FastAPI", "SQLModel", "PostgreSQL"];
  const [stats, setStats] = useState({
    users: 0,
    streams: 0,
    tracks: 0,
    albums: 0,
    artists: 0
  });
  const [loading, setLoading] = useState(true);
  const { getHomeData } = useApiAllDatas();

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {try { setStats(await getHomeData())} catch(e) {} finally {setLoading(false)}}
    loadData();
  }, [getHomeData]);

  const formatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});

  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        {/* LA COUCHE DE TEXTURE */}
        <div className={ACCUEIL_STYLES.HERO_NOISE}/>

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

        {/* SECTION STATISTIQUES GÉNÉRALES */}
        <section className={ACCUEIL_STYLES.STATS_SECTION}>
          <div className={ACCUEIL_STYLES.STATS_GRID}>
            <StatCard value={loading ? "..." : formatter.format(stats.streams)} label="Streams analysés"/>
            <StatCard value={loading ? "..." : formatter.format(stats.users)} label="Utilisateurs"/>
          </div>
          <div className={ACCUEIL_STYLES.STATS_GRID}>
            <StatCard value={loading ? "..." : formatter.format(stats.tracks)} label="Musiques"/>
            <StatCard value={loading ? "..." : formatter.format(stats.albums)} label="Albums"/>
            <StatCard value={loading ? "..." : formatter.format(stats.artists)} label="Artistes"/>
          </div>
        </section>
      </section>

      {/* SECTION TECHNIQUE */}
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

const StatCard = ({ value, label }: { value: string, label: string }) => (
  <div className={ACCUEIL_STYLES.STAT_ITEM}>
    <span className={`${ACCUEIL_STYLES.STAT_NUMBER}`}>
      {value}
    </span>
    <span className={ACCUEIL_STYLES.STAT_LABEL}>
      {label}
    </span>
  </div>
);

export const ACCUEIL_STYLES = {
  MAIN: `${GENERAL_STYLES.TEXT1} flex-1 flex flex-col min-h-screen selection:bg-vert/30 selection:text-vert overflow-x-hidden`,
  
  // Structure & Layouts
  HERO_SECTION: "relative flex flex-col items-center justify-center pt-24 pb-32 px-6 isolate",
  HERO_NOISE: "absolute inset-0 opacity-[0.03] pointer-events-none -z-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]",
  HERO_CONTENT: "relative z-10 text-center mt-12",
  HERO_BUTTON_GROUP: "flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0",

  TECH_SECTION: "py-24 px-6 bg-white/[0.02]",
  TECH_GRID: "flex flex-wrap justify-center gap-4 max-w-4xl mx-auto",
  
  // Reste du bloc
  HERO_H1: `${GENERAL_STYLES.TEXT1} text-5xl md:text-8xl ${BASE_UI.typo.hero} mb-8`,
  HERO_P: `${GENERAL_STYLES.TEXT3} text-lg md:text-xl max-w-xl mb-12 leading-relaxed mx-auto font-light`,
  TECH_H2: `${GENERAL_STYLES.TEXT3} text-sm ${BASE_UI.typo.wide} text-center mb-16`,
  TECH_BADGE: `px-6 py-3 border border-white/5 ${BASE_UI.rounded.badge} bg-white/5 font-mono text-sm hover:border-vert/30 transition-colors`,
  BTN_PRIMARY: `${GENERAL_STYLES.GREENBUTTON} px-10 py-5 text-lg`,
  BTN_SECONDARY: `${GENERAL_STYLES.GRAYBUTTON} px-8 py-5 text-lg`,

  STATS_SECTION: "mt-24 w-full max-w-6xl mx-auto px-6 py-8 border-t border-white/5",
  STATS_GRID: "flex justify-center gap-12 md:gap-24 pt-12",
  STAT_ITEM: "flex flex-col items-center md:items-start space-y-2",
  STAT_NUMBER: "text-4xl md:text-5xl font-black tracking-tighter text-white",
  STAT_LABEL: "text-xs uppercase tracking-[0.3em] text-gray-500 font-bold",
};