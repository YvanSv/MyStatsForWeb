import Link from 'next/link';
import { ApiStatusBadge } from './small_elements/StatusBadge';
import { FRONT_ROUTES } from '../constants/routes';
import { GENERAL_STYLES } from '../styles/general';

const FOOTER_STYLES = {
  // Structure globale
  MAIN: "w-full",
  INNER_CONTAINER: "max-w-[1800px]",
  CONTENT_GRID: "bg-bg1/60 border-t border-white/5 p-6 pt-4 md:pt-5 pb-4 grid grid-cols-1 md:grid-cols-3 items-center",

  // Section Logo (Gauche)
  LOGO_SECTION: "hidden md:flex items-center gap-4 justify-start",
  LOGO_SECTION_MOBILE: "flex md:hidden items-center gap-4 justify-start",
  LOGO_BOX: "w-10 h-10 bg-vert rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(29,208,93,0.2)] shrink-0",
  LOGO_ICON: `text4 font-bold text-2xl`,
  BRAND_NAME: `text1 font-bold text-base leading-none tracking-tight`,
  BRAND_TAGLINE: `text3 text-[9px] uppercase tracking-[0.2em] mt-1`,

  // Section Navigation (Centre)
  NAV_SECTION: "flex flex-col items-center pb-3 md:pb-0",
  NAV_LINKS: `text3 flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.15em]`,
  LINK: `${GENERAL_STYLES.TRANSITION_TEXT_VERT}`,
  COPYRIGHT: `text3 text-[9px] font-mono font-medium pt-2 md:pt-3 opacity-50 uppercase tracking-tighter`,

  // Section Infos (Droite)
  INFO_SECTION: "flex items-center justify-end gap-6",
  INFO_TEXT_GROUP: "flex flex-col items-end gap-0.5",
  INFO_TAGLINE: `text3 text-[9px] font-mono uppercase tracking-tight`,
  INFO_VERSION: `text2 text-[10px] font-mono font-bold italic`
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={FOOTER_STYLES.MAIN}>
      <div className={FOOTER_STYLES.INNER_CONTAINER}>
        <div className={FOOTER_STYLES.CONTENT_GRID}>
          
          {/* Section Gauche PC : Logo / Nom */}
          <div className={FOOTER_STYLES.LOGO_SECTION}>
            <div className={FOOTER_STYLES.LOGO_BOX}>
              <span className={FOOTER_STYLES.LOGO_ICON}>⇅</span>
            </div>
            <div>
              <h4 className={FOOTER_STYLES.BRAND_NAME}>MyStats</h4>
              <p className={FOOTER_STYLES.BRAND_TAGLINE}>Analytics Studio</p>
            </div>
          </div>

          {/* Section Centre : Navigation */}
          <div className={FOOTER_STYLES.NAV_SECTION}>
            <nav className={FOOTER_STYLES.NAV_LINKS}>
              <Link href={FRONT_ROUTES.DASHBOARD} className={FOOTER_STYLES.LINK}>Mon dashboard</Link>
              <Link href={FRONT_ROUTES.ABOUT} className={FOOTER_STYLES.LINK}>À propos</Link>
            </nav>
            <p className={FOOTER_STYLES.COPYRIGHT}>
              &copy; {currentYear} • MyStats • Tous droits réservés
            </p>
          </div>

          <div className='flex justify-between'>
            {/* Section Gauche Mobile : Logo / Nom */}
            <div className={FOOTER_STYLES.LOGO_SECTION_MOBILE}>
              <div className={FOOTER_STYLES.LOGO_BOX}>
                <span className={FOOTER_STYLES.LOGO_ICON}>⇅</span>
              </div>
              <div>
                <h4 className={FOOTER_STYLES.BRAND_NAME}>MyStats</h4>
                <p className={FOOTER_STYLES.BRAND_TAGLINE}>Analytics Studio</p>
              </div>
            </div>

            {/* Section Droite : Status & Version */}
            <div className={FOOTER_STYLES.INFO_SECTION}>
              <div className="hidden sm:block">
                <ApiStatusBadge />
              </div>
              <div className={FOOTER_STYLES.INFO_TEXT_GROUP}>
                <p className={FOOTER_STYLES.INFO_TAGLINE}>Designed for Music Lovers</p>
                <p className={FOOTER_STYLES.INFO_VERSION}>v0.12.2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}