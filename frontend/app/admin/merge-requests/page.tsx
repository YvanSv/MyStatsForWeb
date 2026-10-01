"use client";

import Link from 'next/link';
import { GitPullRequest, ArrowRight, Disc, Mic2, Music, Calendar, ChevronRight } from 'lucide-react';
import { MergeEntityType, MergeRequest, useApiAdmin } from '../action';
import { useEffect, useState } from 'react';

export default function MergeRequestListPage() {
  const { getMergeRequests } = useApiAdmin();
  const [requests,setRequests] = useState<MergeRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMergeRequests();
        if (data) setRequests(data); else setFailed(true);
      }
      catch { setFailed(true) }
    };

    fetchData();
  }, [getMergeRequests]);

  if (!requests) return (
    <div className="p-8 text3">{failed ? "Erreur" : "Chargement..."}</div>
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* En-tête (Style constant) */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <GitPullRequest className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-white">Merge Requests en cours</h1>
          </div>
          <p className="text3">
            {requests.length} demande(s) de fusion en attente de validation.
          </p>
        </header>

        {/* Liste des demandes */}
        <div className="space-y-4">
          {requests.map((mr) => (
            <Link 
              key={mr.id} 
              href={`/admin/merge-requests/${mr.id}`}
              className="group flex items-center justify-between p-5 bg-white/5 rounded-xl border-2 border-transparent hover:border-white/10 hover:bg-white/[0.07] transition-all duration-300"
            >
              <div className="flex items-center gap-6">
                {/* Icône selon le type */}
                <div className="p-3 bg-bg2 rounded-lg text-vert group-hover:scale-110 transition-transform duration-300">
                  {mr.entity_type === MergeEntityType.ARTIST && <Mic2 size={24} />}
                  {mr.entity_type === MergeEntityType.ALBUM && <Disc size={24} />}
                  {mr.entity_type === MergeEntityType.TRACK && <Music size={24} />}
                </div>

                {/* Info sur la fusion */}
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-bold">{mr.duplicate_name}</span>
                    <ArrowRight size={14} className="text-gray-500" />
                    <span className="text-vert font-bold">{mr.target_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text3 uppercase tracking-widest">
                    <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white">
                      {mr.entity_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {mr.created_at}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action / Status */}
              <div className="flex items-center gap-4">
                <div className={`hidden md:block px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  mr.priority === 'high' ? 'border-red-500/50 text-red-400 bg-red-500/5' : 
                  mr.priority === 'medium' ? 'border-amber-500/50 text-amber-400 bg-amber-500/5' : 
                  'border-gray-500/50 text3 bg-white/5'
                }`}>
                  Priorité {mr.priority}
                </div>
                <div className="text-gray-600 group-hover:text-vert transition-colors">
                  <ChevronRight size={24} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* État vide (si pas de MR) */}
        {requests.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <p className="text3">Aucune merge request à traiter pour le moment. Beau boulot !</p>
          </div>
        )}
      </div>
    </div>
  );
}