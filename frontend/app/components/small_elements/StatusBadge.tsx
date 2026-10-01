"use client";
import { useState, useEffect, useCallback } from "react";
import { useApi } from "../../hooks/useApi";
import { useLanguage } from "@/app/context/languageContext";

const BADGE_STYLES = {
  // Conteneur principal
  WRAPPER: (isLimited: boolean) => `
    flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border w-fit transition-colors duration-500
    ${isLimited ? 'border-rouge/20' : 'border-white/5'}
  `,

  // Indicateur LED (le point)
  DOT_CONTAINER: "relative flex h-2 w-2 shrink-0",
  DOT_PING: (isLimited: boolean) => `
    animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 
    ${isLimited ? 'bg-rouge' : 'bg-vert'}
  `,
  DOT_CORE: (isLimited: boolean) => `
    relative inline-flex rounded-full h-2 w-2 
    ${isLimited ? 'bg-rouge' : 'bg-vert'}
  `,

  // Typographie
  TEXT: `text3 text-[10px] font-mono uppercase whitespace-nowrap tracking-wider`,
  TIMER: "text-rouge ml-1 font-bold",
  UNIT: "lowercase font-normal opacity-70"
};

export const ApiStatusBadge = () => {
  const { t } = useLanguage();
  const dict = t.api;
  const { getSpotifyStatus } = useApi();
  // L'échéance est calculée à la réception du statut : le compte à rebours ne dépend pas de la fréquence du polling
  const [status, setStatus] = useState({ is_rate_limited: false, retryAt: 0 });
  const [now, setNow] = useState(() => Date.now());

  const checkStatus = useCallback(async () => {
    try {
      const data = await getSpotifyStatus();
      const received = Date.now();
      setStatus({ is_rate_limited: !!data.is_rate_limited, retryAt: received + (Number(data.retry_after_seconds) || 0) * 1000 });
      setNow(received);
    } catch (err) {console.error(dict.status, err)}
  }, [getSpotifyStatus, dict.status]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const isLimited = status.is_rate_limited;

  // Tic d'une seconde uniquement tant que l'API est limitée
  useEffect(() => {
    if (!isLimited) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [isLimited]);

  const remaining = Math.max(0, Math.ceil((status.retryAt - now) / 1000));

  return (
    <div className={BADGE_STYLES.WRAPPER(isLimited)}>
      {/* Indicateur visuel */}
      <div className={BADGE_STYLES.DOT_CONTAINER}>
        <span className={BADGE_STYLES.DOT_PING(isLimited)}></span>
        <span className={BADGE_STYLES.DOT_CORE(isLimited)}></span>
      </div>

      {/* Libellé de statut */}
      <span className={BADGE_STYLES.TEXT}>
        {isLimited ? (
          <>
            {dict.statusRateLimited}{" "}
            <span className={BADGE_STYLES.TIMER}>
              {remaining}
              <span className={BADGE_STYLES.UNIT}>{t.a11y.unitSeconds}</span>
            </span>
          </>
        ) : dict.statusActive}
      </span>
    </div>
  );
};