"use client";
import { useState, useEffect, useCallback } from "react";
import { useApi } from "../hooks/useApi";

export const ApiStatusBadge = () => {
  const { getStatus } = useApi();
  const [status, setStatus] = useState({ is_rate_limited: false, retry_after_seconds: 0 });

  const checkStatus = useCallback(async () => {
    try {
      const data = await getStatus(); 
      setStatus(data);
    } catch (err) { console.error("Impossible de récupérer le statut API", err); }
  }, [getStatus]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const isLimited = status.is_rate_limited;
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border ${isLimited ? 'border-rouge/20' : 'border-white/5'} w-fit`}>
      {/* Le Rond avec son animation */}
      <div className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isLimited ? 'bg-rouge' : 'bg-vert'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isLimited ? 'bg-rouge' : 'bg-vert'
        }`}></span>
      </div>

      {/* Le Texte à côté */}
      <span className="text-[10px] text-gray-400 font-mono uppercase whitespace-nowrap">
        {isLimited ? (
          <>Rate Limited <span className="text-rouge ml-1">{status.retry_after_seconds}<span className="lowercase">s</span></span></>
        ) : (
          "System Active"
        )}
      </span>
    </div>
  );
};