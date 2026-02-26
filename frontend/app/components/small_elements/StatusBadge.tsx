"use client";
import { useState, useEffect, useCallback } from "react";
import { useApi } from "../../hooks/useApi";
import { GENERAL_STYLES } from "@/app/styles/general";

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
  TEXT: `${GENERAL_STYLES.TEXT3} text-[10px] font-mono uppercase whitespace-nowrap tracking-wider`,
  TIMER: "text-rouge ml-1 font-bold",
  UNIT: "lowercase font-normal opacity-70"
};

export const ApiStatusBadge = () => {
  const { getSpotifyStatus } = useApi();
  const [status, setStatus] = useState({ is_rate_limited: false, retry_after_seconds: 0 });

  const checkStatus = useCallback(async () => {
    try {
      const data = await getSpotifyStatus(); 
      setStatus(data);
    } catch (err) {console.error("Impossible de récupérer le statut API", err)}
  }, [getSpotifyStatus]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const isLimited = status.is_rate_limited;

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
            Rate Limited 
            <span className={BADGE_STYLES.TIMER}>
              {status.retry_after_seconds}
              <span className={BADGE_STYLES.UNIT}>s</span>
            </span>
          </>
        ) : (
          "System Active"
        )}
      </span>
    </div>
  );
};