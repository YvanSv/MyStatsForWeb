"use client";
import { useRouter } from 'next/navigation';
import { Music2, Disc, Mic2 } from 'lucide-react';
import { FRONT_ROUTES } from '../constants/routes';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import MyContentSkeleton from './Skeleton';
import { useLanguage } from '../context/languageContext';

function MyContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const dict = t.rankingcategories;

  const categories = [
    { 
      id: 'tracks', 
      title: dict.tracks, 
      icon: <Music2 size={48} className="mb-4 text-vert" />, 
      path: `/tracks`,
      background: 'from-green-500/40 to-emerald-900/40'
    },
    { 
      id: 'albums', 
      title: dict.albums, 
      icon: <Disc size={48} className="mb-4 text-blue-400" />, 
      path: `/albums`,
      background: 'from-blue-500/40 to-indigo-900/40'
    },
    { 
      id: 'artists', 
      title: dict.artists, 
      icon: <Mic2 size={48} className="mb-4 text-purple-400" />, 
      path: `/artists`,
      background: 'from-purple-500/40 to-fuchsia-900/40'
    },
  ];

  return (
    <main className="flex flex-col md:flex-row flex-1 w-full overflow-hidden">
      {categories.map((cat) => (
        <button
          type="button"
          key={cat.id}
          onClick={() => router.push(`${FRONT_ROUTES.MY_RANKINGS}${cat.path}`)}
          className="group relative flex flex-1 flex-col items-center justify-center border-x border-gray-900 transition-all duration-500 hover:bg-white/[0.03] cursor-pointer active:scale-95 focus-visible:bg-white/[0.06] outline-none"
        >
          <div
            className={`absolute inset-0 z-0 bg-gradient-to-br ${cat.background} transition-opacity duration-700 ease-in-out opacity-60 group-hover:opacity-90`}
          />
          {/* Effet de brillance au survol */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/20 to-black/80 transition-opacity duration-500 group-hover:opacity-40" />
          
          {/* Contenu Central */}
          <div className="relative z-10 flex flex-col items-center transition-transform duration-500 group-hover:scale-110">
            {cat.icon}
            <span className="text-3xl font-black uppercase tracking-[0.2em] text-white/50 transition-colors group-hover:text-white">
              {cat.title}
            </span>
            
            {/* Barre de soulignement animée */}
            <div className="mt-4 h-1 w-0 bg-current transition-all duration-500 group-hover:w-full opacity-50" />
          </div>

          {/* Label discret en bas */}
          <span
            className="absolute bottom-12 text-[10px] uppercase tracking-widest text-white/80 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-10px]"
          >{dict.viewRanking}</span>
        </button>
      ))}
    </main>
  );
}

export default function MyPage() {
  return (
    <ProtectedRoute skeleton={<MyContentSkeleton/>}>
      <MyContent/>
    </ProtectedRoute>
  );
}