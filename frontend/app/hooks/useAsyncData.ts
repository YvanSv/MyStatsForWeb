import { DependencyList, useCallback, useEffect, useState } from "react";

/**
 * Charge une donnée asynchrone au montage et à chaque changement de `deps`.
 * Le résultat d'un appel périmé (démontage, dépendances modifiées) est ignoré.
 * `retry` relance le chargement ; `error` vaut l'erreur levée par `fn` (loguée en console).
 */
export function useAsyncData<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erreur chargement:", err);
        setData(null);
        setError(err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, loading, error, retry };
}
