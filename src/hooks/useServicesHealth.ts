import { useEffect, useState } from "react";

export interface ServicesHealth {
  cortex: boolean;
  hermes: boolean;
  checking: boolean;
}

export function useServicesHealth(intervalMs = 30000): ServicesHealth {
  const [health, setHealth] = useState<ServicesHealth>({
    cortex: false,
    hermes: false,
    checking: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      // Check Cortex (:8899)
      const cortexPromise = (async () => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1800);
          const res = await fetch("http://127.0.0.1:8899/search?q=health", {
            method: "GET",
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          return res.ok || res.status === 400 || res.status === 404;
        } catch {
          return false;
        }
      })();

      // Check Hermes Gateway (:8642)
      const hermesPromise = (async () => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1800);
          const res = await fetch("http://127.0.0.1:8642/v1/models", {
            method: "GET",
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          // 200 OK or 401 Unauthorized (API key required) means the server is actively listening
          return res.status === 200 || res.status === 401;
        } catch {
          return false;
        }
      })();

      const [cortex, hermes] = await Promise.all([
        cortexPromise,
        hermesPromise,
      ]);

      if (!cancelled) {
        setHealth({
          cortex,
          hermes,
          checking: false,
        });
      }
    }

    void checkHealth();
    const interval = setInterval(() => {
      void checkHealth();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return health;
}
