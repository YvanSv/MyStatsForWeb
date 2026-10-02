import { PrimaryButton } from "../components/Atomic/Buttons";
import { CheckIcon, CrossIcon, SpotifyIcon } from "../components/Atomic/Icons";

const STYLES = {
  SERVICE_CARD: (hasSpotify: boolean) => `p-6 rounded-[30px] border transition-all duration-500 ${hasSpotify ? 'bg-vert/5 border-vert/20' : 'bg-white/5 border-white/10'}`,
  SPOTIFY_ICON_BOX: (hasSpotify: boolean) => `p-4 rounded-2xl ${hasSpotify ? `bg-vert text4` : `text1 bg-white/10`}`,
  BADGE_SUCCESS: `text2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center`,
  BADGE_ERROR: "flex items-center gap-2 text-rouge text-[11px] font-bold uppercase tracking-widest rounded-xl justify-center",
};

interface Props {
  spotify: { has: boolean; email?: string | null };
  synchronizedLabel: string;
  notSynchronizedLabel: string;
  linkLabel: string;
  onLink: () => void;
}

// Carte du service Spotify : état de la synchronisation et bouton de liaison
export function SpotifyCard({ spotify, synchronizedLabel, notSynchronizedLabel, linkLabel, onLink }: Props) {
  return (
    <div className={STYLES.SERVICE_CARD(spotify.has)}>
      <div className="flex items-center gap-5 mb-6">
        <div className={STYLES.SPOTIFY_ICON_BOX(spotify.has)}>
          <SpotifyIcon />
        </div>
        <div>
          <h3 className={`text1 font-bold text-lg`}>Spotify</h3>
          {spotify.has ?
            <div className={STYLES.BADGE_SUCCESS}>
              <CheckIcon/> {synchronizedLabel}
            </div>
            :
            <div className={STYLES.BADGE_ERROR}>
              <CrossIcon/> {notSynchronizedLabel}
            </div>
          }
        </div>
      </div>

      {spotify.has ? (
        <div className="space-y-4">
          <p className="text3 w-full py-3 text-[11px] font-bold uppercase tracking-widest">
            {spotify.email}
          </p>
        </div>
      ) : (
        <PrimaryButton onClick={onLink} additional="w-full py-4 sm:rounded-2xl">
          {linkLabel}
        </PrimaryButton>
      )}
    </div>
  );
}
