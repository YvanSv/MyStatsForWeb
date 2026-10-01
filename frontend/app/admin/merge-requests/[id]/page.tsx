"use client";

import { PLACEHOLDER_IMAGE } from "@/app/constants/images";
import React, { useState } from 'react';
import { 
  GitPullRequest, ArrowRight, Merge, Disc, Music, 
  History, Link as LinkIcon, Trash2, CheckCircle, ChevronDown, ChevronRight, ExternalLink, 
  Cross,
  GitPullRequestClosed,
  GitPullRequestArrow
} from 'lucide-react';
import { useLanguage } from "../../../context/languageContext";

export default function MergeRequestPage() {
  const { t } = useLanguage();
  const [data] = useState({
    type: 'artist',
    duplicate: {
      id: "dup_123",
      name: "Daft Punk (Old)",
      image: PLACEHOLDER_IMAGE,
      mapping: { provider: "Spotify", id: "5p9...12" },
      albums: [
        { 
          id: "alb_1", title: "Discovery", 
          mapping: { provider: "Deezer", id: "8821" },
          tracks: [
            { 
              id: "tr_1", title: "One More Time", 
              mapping: { provider: "Spotify", id: "tr_abc" },
              history: [{ id: "h1", date: "2023-10-01", provider: "SPOTIFY" }] 
            }
          ] 
        }
      ]
    },
    target: {
      id: "dup_123",
      name: "Daft Punk (Old)",
      image: PLACEHOLDER_IMAGE,
      mapping: { provider: "Spotify", id: "5p9...12" },
      albums: [
        { 
          id: "alb_1", title: "Discovery", 
          mapping: { provider: "Deezer", id: "8821" },
          tracks: [
            { 
              id: "tr_1", title: "One More Time", 
              mapping: { provider: "Spotify", id: "tr_abc" },
              history: [{ id: "h1", date: "2023-10-01", provider: "SPOTIFY" }] 
            }
          ] 
        }
      ]
    },
  });

  return (
    <div className="min-h-screen p-8 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <GitPullRequest className="w-8 h-8 text-gray-700" />
              <h1 className="text-3xl font-bold text-white tracking-tight">{t.admin.mergeDetail.title}</h1>
            </div>
            <p className="text3">{t.admin.mergeDetail.subtitle}</p>
          </div>
          <div className='flex gap-3'>
            <button className="bg-rouge hover:bg-opacity-80 text-black font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center gap-2">
                {t.admin.mergeDetail.cancel} <GitPullRequestClosed size={20} />
            </button>
            <button className="bg-vert hover:bg-opacity-80 text-black font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center gap-2">
                {t.admin.mergeDetail.confirm} <GitPullRequestArrow size={20} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-12">
          <div className='min-w-0'><EntityExplorer title={t.admin.mergeDetail.duplicate} entity={data.duplicate} variant="red"/></div>
          <div className='flex w-full justify-center items-center'>
            <div className='flex h-min w-min p-4 items-center justify-center bg-bg2 rounded-full rotate-90 lg:rotate-0'>
              <ArrowRight size={32}/>
            </div>
          </div>
          <div className='min-w-0'><EntityExplorer title={t.admin.mergeDetail.target} entity={data.target} variant="vert"/></div>
        </div>
        
        {/* Footer info / Intention */}
        <footer className="mt-10 p-6 bg-white/5 rounded-xl border border-white/10">
          <div className="flex gap-4 items-start">
            <div className="p-2 bg-bg2 rounded-lg text-vert">
              <Merge size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">{t.admin.mergeDetail.impactTitle}</h3>
              <p className="text3 text-sm leading-relaxed">
                {t.admin.mergeDetail.impactBefore}<code className="text-white">trackhistory</code>{t.admin.mergeDetail.impactAfter}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function EntityExplorer({ title, entity, variant }: { title: string, entity: any, variant: 'red' | 'vert' }) {
  const { t } = useLanguage();
  if (!entity) return null;

  // Calcul des listes "à plat" pour l'artiste
  const allTracks = entity.albums?.flatMap((a: any) => a.tracks) || [];
  const allHistory = allTracks.flatMap((tr: any) => tr.history) || [];

  return (
    <section className={`p-6 bg-white/5 rounded-2xl border-2 border-transparent transition-all ${variant === 'red' ? 'hover:border-red-500/20' : 'hover:border-vert/20'}`}>
      {/* Header Entité */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={entity.image} className={`w-14 h-14 rounded-lg object-cover ${variant === 'red' ? 'grayscale opacity-70' : ''}`} alt="" />
          <div>
            <h2 className="text-lg font-bold text-white">{entity.name}</h2>
            <MappingBadge mapping={entity.mapping} />
          </div>
        </div>
        <span className="text-[10px] text3 font-mono bg-bg2 px-2 py-1 rounded">ID: {entity.id}</span>
      </div>

      <div className="space-y-2">
        {/* AXE 1 : ALBUMS (Hiérarchique) */}
        <ExpandableRow icon={<Disc size={16}/>} label={t.admin.mergeDetail.albums} count={entity.albums?.length}>
          {entity.albums?.map((album: any) => (
            <AlbumNode key={album.id} album={album} />
          ))}
        </ExpandableRow>

        {/* AXE 2 : TRACKS (Vue à plat) */}
        <ExpandableRow icon={<Music size={16}/>} label={t.admin.mergeDetail.allTracks} count={allTracks.length}>
          {allTracks.map((track: any) => (
            <TrackNode key={track.id} track={track} />
          ))}
        </ExpandableRow>

        {/* AXE 3 : HISTORY (Vue à plat) */}
        <ExpandableRow icon={<History size={16}/>} label={t.admin.mergeDetail.allHistory} count={allHistory.length}>
          <div className="grid grid-cols-1 gap-1 py-2">
            {allHistory.map((h: any) => (
              <div key={h.id} className="flex justify-between items-center p-2 bg-white/[0.02] rounded border border-white/5">
                <span className="text-[10px] text-gray-400 font-mono italic">{h.date}</span>
                <span className="text-[9px] font-bold text-vert/70">{h.provider}</span>
              </div>
            ))}
          </div>
        </ExpandableRow>
      </div>
    </section>
  );
}

// --- NODES DE L'ARBRE ---

function AlbumNode({ album }: { album: any }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="ml-2 border-l border-white/10 pl-4 py-1">
      <div className="flex items-center justify-between group">
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white">
          <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90 text-vert' : ''}`} />
          {album.title}
        </button>
        <MappingBadge mapping={album.mapping} />
      </div>
      {isOpen && album.tracks?.map((t: any) => <TrackNode key={t.id} track={t} />)}
    </div>
  );
}

function TrackNode({ track }: { track: any }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="ml-4 border-l border-white/10 pl-4 py-1">
      <div className="flex items-center justify-between group">
        <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200">
          <Music size={12} className={isOpen ? 'text-vert' : ''} />
          {track.title}
        </button>
        <MappingBadge mapping={track.mapping} />
      </div>
      {isOpen && (
        <div className="mt-2 space-y-1">
          {track.history?.map((h: any) => (
            <div key={h.id} className="text-[9px] text-gray-500 pl-6 flex justify-between italic">
              <span>{t.admin.mergeDetail.playedOn(h.date)}</span>
              <span>{t.admin.mergeDetail.via(h.provider)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- COMPOSANTS UI ATOMIQUES ---

function ExpandableRow({ icon, label, count, children }: { icon: any, label: string, count: number, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-bg2/50 rounded-xl border border-white/5 overflow-hidden">
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)} className="group w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all">
        <div className="flex items-center gap-3">
          <div className="text-gray-500 group-hover:text-vert">{icon}</div>
          <span className="text-sm font-semibold text-gray-200">{label}</span>
          <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{count}</span>
        </div>
        {isOpen ? <ChevronDown size={16} className="text-vert" /> : <ChevronRight size={16} className="text3" />}
      </button>
      {isOpen && <div className="p-4 pt-0 bg-black/20">{children}</div>}
    </div>
  );
}

function MappingBadge({ mapping }: { mapping: any }) {
  const { t } = useLanguage();
  if (!mapping) return <span className="text-[9px] text-gray-600 italic">{t.admin.mergeDetail.noMapping}</span>;
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-bg2 border border-white/10 rounded text-[9px] text-gray-400 opacity-60 hover:opacity-100 transition-opacity">
      <LinkIcon size={10} className="text-vert" />
      <span className="font-mono uppercase">{mapping.provider}:</span>
      <span className="text-white/70">{mapping.id}</span>
      <ExternalLink size={8} />
    </div>
  );
}