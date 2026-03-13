import { useCallback, useEffect, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import type { AvoidRouterWorkerCommand } from "./worker-messages";
import type { AvoidRoute } from "./router";
import { attachAvoidWorkerListener } from "./worker-listener";

export interface UseAvoidWorkerOptions {
  create?: boolean;
  onRouted?: (routes: Record<string, AvoidRoute>) => void;
  onLoaded?: (success: boolean) => void;
  onCollisionsResolved?: (nodes: Node[]) => void;
}

export interface UseAvoidWorkerResult {
  workerLoaded: boolean;
  post: (cmd: AvoidRouterWorkerCommand) => void;
  close: () => void;
}

/**
 * Creates the avoid-router Web Worker and waits for it to load WASM.
 * WASM loads exclusively in the worker thread — never on the main thread.
 */
export function useAvoidWorker(options?: UseAvoidWorkerOptions): UseAvoidWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const [workerLoaded, setWorkerLoaded] = useState(false);
  const onRoutedRef = useRef(options?.onRouted);
  const onLoadedRef = useRef(options?.onLoaded);
  const onCollisionsResolvedRef = useRef(options?.onCollisionsResolved);
  useEffect(() => {
    onRoutedRef.current = options?.onRouted;
    onLoadedRef.current = options?.onLoaded;
    onCollisionsResolvedRef.current = options?.onCollisionsResolved;
  });

  const createWorker = options?.create !== false;

  useEffect(() => {
    if (!createWorker) {
      workerRef.current = null;
      setWorkerLoaded(false);
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("./workers/avoid-router.worker.js", import.meta.url), { type: "module" });
    } catch (e) {
      console.error("[avoid-worker] Failed to create worker:", e);
      return;
    }

    workerRef.current = worker;

    worker.addEventListener("error", (e) => {
      console.error("[avoid-worker] Worker error:", e.message);
    });

    const cleanup = attachAvoidWorkerListener(worker, {
      onRouted: (routes) => onRoutedRef.current?.(routes),
      onLoaded: (success) => {
        setWorkerLoaded(success);
        onLoadedRef.current?.(success);
      },
      onCollisionsResolved: (nodes) => onCollisionsResolvedRef.current?.(nodes),
    });

    // Terminate worker on page unload (useEffect cleanup doesn't run on refresh)
    const onBeforeUnload = () => {
      worker.postMessage({ command: "close" } as AvoidRouterWorkerCommand);
      worker.terminate();
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      cleanup();
      worker.postMessage({ command: "close" } as AvoidRouterWorkerCommand);
      worker.terminate();
      workerRef.current = null;
      setWorkerLoaded(false);
    };
  }, [createWorker]);

  const post = useCallback((cmd: AvoidRouterWorkerCommand) => {
    if (workerRef.current) {
      workerRef.current.postMessage(cmd);
    }
  }, []);

  const close = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ command: "close" } as AvoidRouterWorkerCommand);
      workerRef.current.terminate();
      workerRef.current = null;
      setWorkerLoaded(false);
    }
  }, []);

  return { workerLoaded, post, close };
}
