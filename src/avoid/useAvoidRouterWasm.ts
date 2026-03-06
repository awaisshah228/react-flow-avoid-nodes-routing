import { useEffect, useState } from "react";
import { AvoidRouter } from "./router";
import { useAvoidRoutesStore } from "./store";

export interface UseAvoidRouterWasmResult {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
}

/**
 * Load the libavoid-js WASM module on mount.
 * Call once at app root so avoid-nodes edges can route.
 */
export function useAvoidRouterWasm(): UseAvoidRouterWasmResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const setStoreLoaded = useAvoidRoutesStore((s) => s.setLoaded);

  useEffect(() => {
    let cancelled = false;
    AvoidRouter.load()
      .then((ok) => {
        if (cancelled) return;
        setIsLoaded(ok);
        setStoreLoaded(ok);
        if (!ok) setError(new Error("AvoidRouter.load() returned false"));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStoreLoaded(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setStoreLoaded]);

  return { isLoading, isLoaded, error };
}
