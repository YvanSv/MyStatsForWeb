"use client";
import { useRouter } from 'next/navigation';
import { Music2, Disc, Mic2 } from 'lucide-react';
import { FRONT_ROUTES } from '../constants/routes';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import MyContentSkeleton from './Skeleton';

function MyContent() {
  const router = useRouter();

  const categories = [
    { 
      id: 'tracks', 
      title: 'Tracks', 
      icon: <Music2 size={48} className="mb-4 text-vert" />, 
      path: `/tracks`,
      image: 'https://images.pexels.com/photos/3971983/pexels-photo-3971983.jpeg'
    },
    { 
      id: 'albums', 
      title: 'Albums', 
      icon: <Disc size={48} className="mb-4 text-blue-400" />, 
      path: `/albums`,
      image: 'https://images.pexels.com/photos/5003397/pexels-photo-5003397.jpeg'
    },
    { 
      id: 'artists', 
      title: 'Artistes', 
      icon: <Mic2 size={48} className="mb-4 text-purple-400" />, 
      path: `/artists`,
      image: 'https://images.pexels.com/photos/5648355/pexels-photo-5648355.jpeg'
    },
  ];

  return (
    <main className="flex flex-col md:flex-row flex-1 w-full overflow-hidden">
      {categories.map((cat) => (
        <div
          key={cat.id}
          onClick={() => router.push(`${FRONT_ROUTES.MY_RANKINGS}${cat.path}`)}
          className="group relative flex flex-1 flex-col items-center justify-center border-x border-gray-900 transition-all duration-500 hover:bg-white/[0.03] cursor-pointer active:scale-95"
        >
          <div 
            className="absolute inset-0 z-0 transition-all duration-700 ease-in-out filter blur-md group-hover:blur-none opacity-60 group-hover:opacity-70"
            style={{
              backgroundImage: `url(${cat.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {/* Effet de brillance au survol */}
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/20 to-black/80 transition-opacity duration-500 group-hover:opacity-40" />
          
          {/* Contenu Central */}
          <div className="relative z-10 flex flex-col items-center transition-transform duration-500 group-hover:scale-110">
            {cat.icon}
            <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white/50 transition-colors group-hover:text-white">
              {cat.title}
            </h2>
            
            {/* Barre de soulignement animée */}
            <div className="mt-4 h-1 w-0 bg-current transition-all duration-500 group-hover:w-full opacity-50" />
          </div>

          {/* Label discret en bas */}
          <span
            className="absolute bottom-12 text-[10px] uppercase tracking-widest text-bg2 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-10px]"
          >Voir le classement</span>
        </div>
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