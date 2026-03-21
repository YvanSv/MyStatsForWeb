"use client";
import { useEffect, useState } from "react";
import { BASE_UI } from "./styles/general";
import { useApiAllDatas } from "./hooks/useApiAllDatas";
import { PrimaryButton, SecondaryButton } from "./components/Atomic/Buttons";
import { useAuth } from "./context/authContext";
import { useApiMyDatas } from "./hooks/useApiMyDatas";
import { Play } from "lucide-react";
import { useLanguage } from "./context/languageContext";

const TECHNOS = ["Next.js", "FastAPI", "SQLModel", "PostgreSQL"];
const formatter = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 0});
const INITIALS_STATS = {
  users: 0,
  streams: 0,
  tracks: 0,
  albums: 0,
  artists: 0
};

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { refreshUserData, getTodayStats } = useApiMyDatas();
  const [userStats, setUserStats] = useState({nb_streams: '...', nb_minutes: "..."});
  const [stats, setStats] = useState(INITIALS_STATS);
  const [loading, setLoading] = useState(true);
  const { getHomeData } = useApiAllDatas();

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {try { setStats(await getHomeData())} catch(e) {} finally {setLoading(false)}}
    loadData();
  }, [getHomeData]);

  useEffect(() => {
    if (!user?.is_logged_in) return;
    setLoading(true);

    const loadData = async () => {
      try {
        await refreshUserData();
        setUserStats(await getTodayStats());
      } catch(e) {} finally {setLoading(false)}
    }
    loadData();
  }, [user]);

  return (
    <main className={ACCUEIL_STYLES.MAIN}>
      {user?.is_logged_in && (
        <section className="pt-12 flex justify-center gap-48 md:px-24">
          <section className=" animate-in fade-in slide-in-from-top-4 duration-1000 md:max-w-xl">
            <p className={ACCUEIL_STYLES.TECH_H2}>{t.home.titre}</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Carte Streams */}
              <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-3 md:p-6 transition-all hover:bg-white/10 hover:border-purple-500/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                    <Play/>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white leading-none">
                      {userStats.nb_streams.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-tight">Streams</p>
                  </div>
                </div>
                {/* Effet de brillance en arrière-plan */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-colors"></div>
              </div>

              {/* Carte Minutes */}
              <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-3 md:p-6 transition-all hover:bg-white/10 hover:border-blue-500/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white leading-none">
                      {userStats.nb_minutes.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-tight">Minutes</p>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-colors"></div>
              </div>
            </div>
          </section>
        </section>
      )}
      <section className={ACCUEIL_STYLES.HERO_SECTION}>
        {/* TEXTES DU HERO */}
        <h1 className={ACCUEIL_STYLES.HERO_H1}>
          {t.home.hero1},<br/>
          <span className="text2">{t.home.hero2}.</span>
        </h1>
        <p className={ACCUEIL_STYLES.HERO_P}>
          {t.home.herop1}<br/>{t.home.herop2}
        </p>
        
        {/* BOUTONS D'ACTION */}
        <div className={ACCUEIL_STYLES.HERO_BUTTON_GROUP}>
          <PrimaryButton additional="px-10 py-5 text-lg">{t.home.btn1}</PrimaryButton>
          <SecondaryButton additional="group px-8 py-5 text-lg">
            {t.home.learnMore} <span className="group-hover:translate-x-1 transition-transform">→</span>
          </SecondaryButton>
        </div>
      </section>

      {/* SECTION STATISTIQUES GÉNÉRALES */}
      <section className={ACCUEIL_STYLES.STATS_SECTION}>
        <div className={ACCUEIL_STYLES.STATS_GRID}>
          <StatCard value={loading ? "..." : formatter.format(stats.streams)} label={t.home.stats1}/>
          <StatCard value={loading ? "..." : formatter.format(stats.users)} label={t.home.stats2}/>
        </div>
        <div className={ACCUEIL_STYLES.STATS_GRID}>
          <StatCard value={loading ? "..." : formatter.format(stats.tracks)} label={t.home.stats3}/>
          <StatCard value={loading ? "..." : formatter.format(stats.albums)} label={t.home.stats4}/>
          <StatCard value={loading ? "..." : formatter.format(stats.artists)} label={t.home.stats5}/>
        </div>
      </section>

      {/* SECTION TECHNIQUE */}
      <section className={ACCUEIL_STYLES.STATS_SECTION}>
        <h2 className={ACCUEIL_STYLES.TECH_H2}>{t.home.techtitre}</h2>
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
  MAIN: `text1 flex-1 flex flex-col min-h-screen overflow-x-hidden`,
  
  // Structure & Layouts
  HERO_SECTION: "flex flex-col relative text-center px-6 mt-18 z-10",
  HERO_BUTTON_GROUP: "flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center px-6 sm:px-0",
  
  // Reste du bloc
  HERO_H1: `text1 text-5xl md:text-8xl ${BASE_UI.typo.hero} mb-8`,
  HERO_P: `text3 text-lg md:text-xl max-w-xl mb-12 leading-relaxed mx-auto font-light`,
  TECH_H2: `text3 text-sm ${BASE_UI.typo.wide} text-center mb-8`,
  TECH_BADGE: `px-6 py-3 border border-white/5 ${BASE_UI.rounded.badge} bg-white/5 font-mono text-sm hover:border-vert/30 transition-colors`,

  STATS_SECTION: "mt-24 w-full max-w-6xl mx-auto px-6 pt-8 border-t border-white/5",
  STATS_GRID: "flex justify-center gap-12 md:gap-24 pt-12",
  STAT_ITEM: "flex flex-col items-center md:items-start space-y-2",
  STAT_NUMBER: "text-2xl md:text-4xl md:text-5xl font-black tracking-tighter text-white",
  STAT_LABEL: "text-[10px] md:text-xs uppercase tracking-[0.3em] text-gray-500 font-bold",

  TECH_GRID: "grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto justify-items-center my-12",
};