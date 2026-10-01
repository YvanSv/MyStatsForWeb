"use client";

import { FRONT_ROUTES } from "@/app/constants/routes";
import Link from 'next/link';
import { GitPullRequest, Music, Calendar, User, Info, ChevronRight, History } from 'lucide-react';
import { useApiAdmin } from '../action';
import { useEffect, useState } from 'react';
import { CreateRequest } from '@/app/data/admin-interfaces';
import { useLanguage } from '@/app/context/languageContext';

export default function CreateRequestListPage() {
  const { t } = useLanguage();
  const { getCreateRequests } = useApiAdmin();
  const [requests, setRequests] = useState<CreateRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try { 
        const data = await getCreateRequests();
        setRequests(data);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getCreateRequests]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text3 animate-pulse">
      {t.admin.createList.loading}
    </div>
  );

  if (!requests) return (
    <div className="min-h-screen flex items-center justify-center text-red-400">
      <Info className="mr-2" /> {t.admin.createList.error}
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto">
        
        {/* En-tête */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-vert/10 rounded-lg">
              <GitPullRequest className="w-8 h-8 text-vert" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t.admin.createList.title}</h1>
          </div>
          <p className="text3">
            {t.admin.createList.suggested(requests.length)}
          </p>
        </header>

        {/* Liste des demandes */}
        <div className="grid gap-4">
          {requests.map((mr) => (
            <Link 
              key={mr.id} 
              href={`${FRONT_ROUTES.ADMIN_CREATE_REQUESTS}/${mr.id}`}
              className="group flex items-center justify-between p-5 bg-white/5 rounded-xl border border-white/5 hover:border-vert/30 hover:bg-white/[0.08] transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center gap-6">
                {/* Icône */}
                <div className="hidden sm:block p-3 bg-bg2 rounded-xl text-vert/80 group-hover:text-vert group-hover:scale-110 transition-all">
                  <Music size={24} />
                </div>

                {/* Info sur la fusion */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-gray-400 font-medium px-2 py-0.5 bg-white/5 rounded text-sm">
                       {mr.track?.title || t.admin.createList.unknownTrack}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-vert/10 text-vert text-[10px] font-bold rounded-full border border-vert/20">
                      <History size={10}/>
                      {t.admin.createList.plays(mr.history_count || 0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text3 uppercase tracking-widest font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-vert" /> 
                      {new Date(mr.created_at).toLocaleDateString(t.common.locale, { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User size={12} className="text-vert" />
                      {/* Extraction sécurisée de l'artiste MB */}
                      {mr.track?.artist?.name || t.admin.createList.unknownArtist}
                    </span>
                  </div>
                </div>
              </div>

              {/* Petit indicateur visuel à droite */}
              <div className="text-gray-600 group-hover:text-vert transition-colors">
                <ChevronRight size={20} />
              </div>
            </Link>
          ))}
        </div>

        {/* État vide */}
        {requests.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <div className="mb-4 inline-block p-4 bg-white/5 rounded-full text-gray-600">
                <GitPullRequest size={32} />
            </div>
            <p className="text-gray-500 font-medium">{t.admin.createList.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}