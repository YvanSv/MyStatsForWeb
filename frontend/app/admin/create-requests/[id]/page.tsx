"use client";

import { FRONT_ROUTES } from "@/app/constants/routes";
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GitPullRequest, Music, Link as LinkIcon, History, CheckCircle, XCircle, ArrowLeft, Loader2, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import { useApiAdmin } from '../../action';
import { CreateRequest } from '@/app/data/admin-interfaces';
import { TrackHistory, TrackMapping } from '@/app/data/interfaces';
import { useLanguage } from '@/app/context/languageContext';
import { TOAST_STYLE } from "@/app/constants/ui";
import toast from "react-hot-toast";

// --- COMPOSANTS UI UTILITAIRES ---

const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
    <Icon className="w-5 h-5 text-vert" />
    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
  </div>
);

const InfoBubble = ({ label, value }: { label: string, value: string | number | undefined }) => (
  <div className="bg-bg2 p-3 rounded-lg border border-white/5">
    <div className="text-xs text3 uppercase tracking-widest mb-1">{label}</div>
    <div className="text-white font-medium">{value || "—"}</div>
  </div>
);

// Formatage mm:ss pour la durée
const formatDuration = (ms: number | undefined) => {
  if (!ms || !Number.isFinite(ms)) return "—";
  // On arrondit d'abord à la seconde : 59,5 s doit donner 1:00 et non 0:60
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

// Découpe "Artiste - Titre" au PREMIER " - " seulement (comme AppleMusicWorker._get_parts côté backend) :
// l'artiste est ce qui précède, le titre tout le reste. Robuste si le titre est absent ou vide.
const splitTrackTitle = (title: string | null | undefined): { artist: string | undefined, title: string | undefined } => {
  if (!title) return { artist: undefined, title: undefined };
  const idx = title.indexOf(" - ");
  if (idx === -1) return { artist: title, title: undefined };
  return { artist: title.slice(0, idx), title: title.slice(idx + 3) };
};

// --- PAGE PRINCIPALE ---

export default function CreateRequestDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const cr_id = Number(params.id);
  
  const { getCreateRequestById, resolveCreateRequest } = useApiAdmin();
  const [request, setRequest] = useState<CreateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [selectedMasterIndex, setSelectedMasterIndex] = useState<number>(0);
  const [selectedIsrcs, setSelectedIsrcs] = useState<string[]>([]);

  const toggleIsrc = (isrc: string) => {
    setSelectedIsrcs(prev => 
      prev.includes(isrc) ? prev.filter(i => i !== isrc) : [...prev, isrc]
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!cr_id) return;
        setRequest(await getCreateRequestById(cr_id));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cr_id, getCreateRequestById]);

  // Gestion de l'approbation / rejet
  const handleResolve = async (approve: boolean) => {
    if (!cr_id || resolving) return;
    setResolving(true);
    try {
      await resolveCreateRequest(cr_id, approve,selectedMasterIndex,selectedIsrcs);
      router.push(FRONT_ROUTES.ADMIN_CREATE_REQUESTS); 
      router.refresh();
    } catch (err) {
      toast.error(t.admin.createDetail.resolveError, { style: TOAST_STYLE });
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const { artist: trackArtist, title: trackTitle } = splitTrackTitle(request?.track?.title);
  // Calcul sans spread : Math.max(...tableau) peut dépasser la pile sur un très gros historique
  const maxMsPlayed = request?.track?.history?.length
    ? request.track.history.reduce((max, h) => (h.ms_played > max ? h.ms_played : max), 0)
    : undefined;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text3 animate-pulse bg-[#0a0a0a]">
      {t.admin.createDetail.loading}
    </div>
  );

  if (!request) return (
    <div className="min-h-screen flex items-center justify-center text-red-400 bg-[#0a0a0a]">
      <AlertTriangle className="mr-2" /> {t.admin.createDetail.notFound(cr_id)}
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        
        {/* Barre d'outils supérieure */}
        <div className="flex items-center justify-between mb-8">
          <Link href={FRONT_ROUTES.ADMIN_CREATE_REQUESTS} className="flex items-center gap-2 text-sm text3 hover:text-white transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t.admin.createDetail.back}
          </Link>
          <div className="text-xs text3 font-mono bg-white/5 px-3 py-1 rounded">
            {t.admin.createDetail.requestId} {request.id}
          </div>
        </div>

        {/* En-tête */}
        <header className="mb-12 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-vert/10 rounded-xl">
              <GitPullRequest className="w-8 h-8 text-vert" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{t.admin.createDetail.title}</h1>
              <p className="text3 mt-1">
                {t.admin.createDetail.createdOn(new Date(request.created_at).toLocaleDateString(t.common.locale, { day: '2-digit', month: 'long', year: 'numeric' }))}
              </p>
            </div>
          </div>
          {request.reason && (
            <div className="bg-amber-950/30 border border-amber-900 text-amber-300 p-4 rounded-xl text-sm flex items-start gap-3 mt-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block mb-0.5">{t.admin.createDetail.reason}</strong>
                {request.reason}
              </div>
            </div>
          )}
        </header>

        {/* GRILLE DE COMPARAISON SIDE-BY-SIDE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* --- COLONNE GAUCHE : TRACK ACTUELLE (SOURCE) --- */}
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-6">
                <Music className="w-7 h-7 text-gray-500" />
                <h2 className="text-xl font-bold text-gray-300">{t.admin.createDetail.currentTrack}</h2>
            </div>

            <div className="space-y-6">
              {/* Infos Clés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoBubble label={t.admin.createDetail.artist} value={trackArtist} />
                <InfoBubble label={t.admin.createDetail.trackTitle} value={trackTitle}/>
                <InfoBubble label={t.admin.createDetail.internalId} value={request.track?.id}/>
                <InfoBubble label={t.admin.createDetail.maxPlayed} value={formatDuration(maxMsPlayed)}/>
              </div>

              {/* Mappings Actuels */}
              <div>
                <SectionTitle icon={LinkIcon} title={t.admin.createDetail.existingMappings} />
                {request.track?.mappings && request.track.mappings.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {request.track.mappings.map((m: TrackMapping) => (
                      <div key={m.id} className="text-xs bg-bg2 p-2.5 rounded border border-white/5 flex items-center gap-2 justify-between">
                        <span className="font-mono text-gray-400">{m.provider}</span>
                        <span className="text-white font-semibold">{m.provider_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text3 italic">{t.admin.createDetail.noMappings}</p>
                )}
              </div>

              {/* Historique d'écoutes */}
              <div>
                <SectionTitle icon={History} title={t.admin.createDetail.history} />
                {request.track?.history && request.track.history.length > 0 ? (
                  <div className="space-y-1.5">
                    {request.track.history.map((h: TrackHistory) => (
                      <div key={h.id} className="text-xs bg-bg2 p-2.5 rounded flex items-center gap-3 justify-between">
                        <span className="text-white font-medium">{h.provider}</span>
                        <span className="text-gray-400 italic">
                          {new Date(h.played_at).toLocaleDateString(t.common.locale)} {new Date(h.played_at).toLocaleTimeString(t.common.locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-gray-500 font-mono">{formatDuration(h.ms_played)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text3 italic">{t.admin.createDetail.noHistory}</p>
                )}
              </div>
            </div>
          </div>

          {/* --- COLONNE DROITE : TRACK TROUVÉE (MUSICBRAINZ) --- */}
          <div className="space-y-4">
            <SectionTitle icon={CheckCircle} title={t.admin.createDetail.chooseMaster} />
            
            {request.match_data?.suggestions?.map((s:any, idx:number) => (
              <div key={idx} className={`p-4 rounded-xl border-2 transition-all ${
                selectedMasterIndex === idx ? 'border-vert bg-vert/5' : 'border-white/5 bg-white/5'
              }`} onClick={() => setSelectedMasterIndex(idx)}>
                <div className="flex justify-between items-center mb-3">
                  <button 
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                      selectedMasterIndex === idx ? 'bg-vert text-black' : 'bg-white/10 text-white'
                    }`}
                  >
                    {selectedMasterIndex === idx ? t.admin.createDetail.masterSelected : t.admin.createDetail.setMaster}
                  </button>
                </div>

                <h4 className="font-bold text-white">{s.title} — {s.duration_ms ? formatDuration(s.duration_ms) : '??'}</h4>
                <p className="text-sm text3 mb-4">{s['artist']} • {s.album}</p>

                {/* ISRC DE CETTE SUGGESTION (rien si absent). Deux suggestions de même ISRC partagent
                    le même état : les deux boutons se basculent ensemble, l'ISRC n'étant envoyé qu'une fois. */}
                {s.isrc && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleIsrc(s.isrc);
                      }}
                      aria-pressed={selectedIsrcs.includes(s.isrc)}
                      className={`text-[10px] font-mono px-2 py-1 border rounded transition-all ${
                        selectedIsrcs.includes(s.isrc) 
                          ? 'bg-vert/20 border-vert text-white' 
                          : 'bg-black/20 border-white/10 text-gray-500'
                      }`}
                    >{s.isrc}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-6">Suggestions trouvées ({request.match_data.suggestions?.length})</h2>
            
            {request.match_data.suggestions?.map((suggestion, index) => (
              <div 
                key={index}
                onClick={() => setSelectedMatch(suggestion)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedMatch === suggestion ? 'border-vert bg-vert/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-white">{suggestion.title}</h4>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase">Score: {suggestion.score}%</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoBubble label="Artiste Suggéré" value={mbArtist} />
                  <InfoBubble label="Titre Suggéré" value={mb.title} />
                  <InfoBubble label="Album Suggéré" value={mbAlbum} />
                  <InfoBubble label="Durée Suggérée" value={formatDuration(mb.length)}/>
                  {mb.isrc ? (
                    <div className="text-xs bg-vert/10 p-2.5 rounded border border-vert/20 text-white font-semibold font-mono text-center w-full">
                      {mb.isrc}
                    </div>
                  ) : (<p className="text-xs text-vert italic">Aucun ISRC trouvé dans match_data.</p>)}
                </div>
                {/* Identifiants Techniques *//*}
                <div className="bg-bg2 p-4 rounded-xl border border-white/5 mt-auto">
                  <SectionTitle icon={Info} title="Identifiants Techniques MB" />
                  <div className="text-xs font-mono text-gray-500 space-y-1">
                    <p>UUID Recording: <span className="text-white">{mb.id}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div> */}
          {/* <div className="bg-vert/5 p-6 rounded-2xl border border-vert/10 shadow-[0_0_30px_rgba(34,197,94,0.05)]">
            <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-7 h-7 text-vert" />
                <h2 className="text-xl font-bold text-white">Suggestion (MusicBrainz)</h2>
            </div>

            <div className="space-y-6">
              {/* Infos Clés Suggérées *//*}
              

              {/* ISRCs Suggérés *//*}
              <div>
                <SectionTitle icon={LinkIcon} title="ISRCs Trouvés (Nouveaux)" />
                {(mb.all_isrcs && mb.all_isrcs?.length > 0 || mb.isrcs && mb.isrcs?.length > 0) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* On fusionne les deux sources possibles et on dédoublonne avec un Set *//*}
                    {Array.from(new Set([...(mb.all_isrcs || []), ...(mb.isrcs || [])])).map((isrc) => (
                      <div 
                        key={isrc} 
                        className="text-xs bg-vert/10 p-2.5 rounded border border-vert/20 text-white font-semibold font-mono text-center"
                      >
                        {isrc}
                      </div>
                    ))}
                  </div>
                ) : mb.isrc ? (
                  /* Cas rare où MusicBrainz renvoie une string directe au lieu d'un tableau *//*
                  
                ) : (
                  /* État vide *//*
                  
                )}
              </div>
            </div>
          </div>*/}
        </div>

        {/* ZONE D'ACTION (FIXE EN BAS) */}
        <div className="sticky bottom-8 bg-bg2 p-6 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center gap-4 justify-between mt-12">
            <div className="text-center sm:text-left">
                <h4 className="text-lg font-bold text-white">{t.admin.createDetail.finalTitle}</h4>
                <p className="text-sm text3">{t.admin.createDetail.finalDescription}</p>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Bouton REJETER */}
                <button 
                    onClick={() => handleResolve(false)}
                    disabled={resolving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-8 py-3.5 bg-red-950/50 hover:bg-red-900 border border-red-900 text-red-200 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {resolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {t.admin.createDetail.reject}
                </button>

                {/* Bouton APPROUVER */}
                <button 
                    onClick={() => handleResolve(true)}
                    disabled={resolving}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-8 py-3.5 bg-vert hover:bg-vert/80 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                >
                    {resolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    {t.admin.createDetail.approve}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}