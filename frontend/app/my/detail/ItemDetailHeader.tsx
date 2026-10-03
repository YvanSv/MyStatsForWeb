import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Disc, Mic2, Music2 } from "lucide-react";
import { useLanguage } from "@/app/context/languageContext";
import type { ItemDetail } from "@/app/hooks/apiTypes";
import { itemDetailPath, itemRankingPath } from "@/app/services/url";

const ICONS = { track: Music2, album: Disc, artist: Mic2 };

/** En-tête : retour au classement, pochette (ronde pour un artiste), nom et parents cliquables. */
export default function ItemDetailHeader({ entity }: { entity: ItemDetail["entity"] }) {
  const { t } = useLanguage();
  const dict = t.itemDetail;
  const isArtist = entity.type === "artist";
  const Icon = ICONS[entity.type];
  const typeLabel = { track: dict.typeTrack, album: dict.typeAlbum, artist: dict.typeArtist }[entity.type];
  const backLabel = { track: dict.backTrack, album: dict.backAlbum, artist: dict.backArtist }[entity.type];
  const link = "text-gray-300 hover:text-vert underline-offset-2 hover:underline transition-colors";

  return (
    <header className="flex flex-col gap-4 mb-6">
      <Link href={itemRankingPath(entity.type)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-fit">
        <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
      </Link>
      <div className="flex flex-row items-end gap-4 lg:gap-6">
        <div className={`relative flex-shrink-0 w-24 h-24 lg:w-40 lg:h-40 overflow-hidden bg-bg2 shadow-2xl border border-white/10 ${isArtist ? "rounded-full" : "rounded-2xl"}`}>
          {entity.image ? (
            <Image src={entity.image} alt={entity.name} fill sizes="160px" className="object-cover" />
          ) : (
            <div role="img" aria-label={dict.noCover} className="w-full h-full flex items-center justify-center text-gray-600"><Icon size={40} aria-hidden="true" /></div>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] lg:text-xs uppercase tracking-widest text-blue-400 font-bold">{typeLabel}</p>
          <h1 className="text-2xl lg:text-5xl font-bold break-words">{entity.name}</h1>
          {(entity.artist || entity.album) && (
            <p className="text-sm lg:text-base text-gray-400 flex flex-wrap items-center gap-x-2">
              {entity.artist && <Link href={itemDetailPath("artist", entity.artist.id)} className={link}>{entity.artist.name}</Link>}
              {entity.artist && entity.album && <span aria-hidden="true">●</span>}
              {entity.album && <Link href={itemDetailPath("album", entity.album.id)} className={`${link} italic`}>{entity.album.name}</Link>}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
