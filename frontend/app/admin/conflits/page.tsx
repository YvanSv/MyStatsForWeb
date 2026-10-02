"use client";

import { TOAST_SUCCESS_OPTIONS } from "@/app/constants/ui";
import { useEffect, useState } from "react";
import { TrackInfo, useApiAdmin } from "../action";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/languageContext";

export default function ConflitsPage() {
  const { t: dict } = useLanguage();
  const [tracks,setTracks] = useState<TrackInfo[] | null>(null);

  const { loading, getTracksError, updateTrack } = useApiAdmin();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setTracks(await getTracksError());
      } catch {}
    }

    fetchData();
  }, [getTracksError]);

  const handleLocalChange = (trackId: number, historyId: number | null, value: number) => {
    setTracks(prev => {
      if (!prev) return null;
      return prev.map(t => {
        if (t.id !== trackId) return t;
        if (historyId === null) return { ...t, duration_ms: value };
        return {
          ...t,
          history: t.history.map(h => h.id === historyId ? { ...h, ms_played: value } : h)
        };
      });
    });
  };

  const onSave = async (track: TrackInfo) => {
    try {
      await updateTrack(track);
      toast.success(dict.admin.conflicts.saved, TOAST_SUCCESS_OPTIONS);
    } catch (e) {toast.error(dict.admin.conflicts.saveError)}
  };

  const applyDurationToAll = (trackId: number, duration: number) => {
    setTracks(prev => {
      if (!prev) return null;
      return prev.map(t => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          history: t.history.map(h => ({ ...h, ms_played: duration }))
        };
      });
    });
  };

  if (loading && !tracks) return <div className="p-8 text-vert">{dict.admin.conflicts.loading}</div>;

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">
        {dict.admin.conflicts.title}
      </h1>

      <div className="space-y-6">
        {tracks && tracks.map((track) => (
          <div key={track.id} className="p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex flex-wrap gap-6 items-end mb-6">
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">{dict.admin.conflicts.trackTitle}</p>
                <p className="text-lg font-bold">{track.title} - {track.artist_name}, {track.album_name}</p>
              </div>

              <div>
                <label htmlFor={`track-duration-${track.id}`} className="block text-xs text-vert uppercase font-bold mb-1">{dict.admin.conflicts.trackDuration}</label>
                <input 
                  id={`track-duration-${track.id}`}
                  type="number" 
                  value={track.duration_ms}
                  onChange={(e) => handleLocalChange(track.id, null, parseInt(e.target.value) || 0)}
                  className="bg-black border border-white/20 rounded px-3 py-2 text-sm focus:border-vert outline-none"
                />
              </div>

              <button 
                onClick={() => onSave(track)}
                className="bg-vert text-black px-6 py-2 rounded font-black uppercase text-xs hover:bg-white transition-colors"
              >
                {dict.admin.conflicts.saveAll}
              </button>

              <button 
                onClick={() => applyDurationToAll(track.id, track.duration_ms)}
                className="bg-white/10 text-white/70 px-4 py-2 rounded font-bold uppercase text-[10px] border border-white/10 hover:bg-white/20 hover:text-white transition-all"
                title={dict.admin.conflicts.clampTitle}
              >
                {dict.admin.conflicts.clamp}
              </button>
            </div>

            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-[10px] text-red-400 font-bold uppercase mb-3">{dict.admin.conflicts.historiesToFix}</p>
              <div className="space-y-2">
                {track.history.map(h => {
                  const isError = h.ms_played > track.duration_ms;
                  return (
                    <div key={h.id} className={`flex items-center gap-4 p-2 rounded border ${isError ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {h.id}</span>
                      <div className="flex items-center gap-2">
                        <label htmlFor={`history-played-${h.id}`} className="text-[10px] uppercase font-bold text-gray-400">{dict.admin.conflicts.played}</label>
                        <input 
                          id={`history-played-${h.id}`}
                          type="number"
                          value={h.ms_played}
                          onChange={(e) => handleLocalChange(track.id, h.id, parseInt(e.target.value) || 0)}
                          className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs w-32 focus:border-red-500 outline-none"
                        />
                      </div>
                      {isError && <span className="text-[10px] text-red-500 font-bold">{dict.admin.conflicts.exceeds}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {tracks?.length === 0 && (
          <p className="text-gray-500 italic text-center py-20">{dict.admin.conflicts.empty}</p>
        )}
      </div>
    </div>
  );
}