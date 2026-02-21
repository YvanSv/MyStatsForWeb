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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 w-fit">
      <div className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isLimited ? 'bg-red-500' : 'bg-vert'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isLimited ? 'bg-red-500' : 'bg-vert'
        }`}></span>
        {isLimited && `${status.retry_after_seconds}s restantes`}
      </div>
    </div>
  );
};