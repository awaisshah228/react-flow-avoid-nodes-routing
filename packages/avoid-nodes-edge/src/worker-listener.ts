/**
 * Listener for avoid-router Web Worker messages.
 * Syncs "loaded" / "routed" into the avoid store.
 */

import type { AvoidRouterWorkerResponse } from "./worker-messages";
import { useAvoidRoutesStore } from "./store";

export interface AttachAvoidWorkerListenerOptions {
  onRouted?: (routes: Record<string, { path: string; labelX: number; labelY: number }>) => void;
  onLoaded?: (success: boolean) => void;
}

/**
 * Attach a message listener to an avoid-router worker so the app stays in sync.
 * @returns Cleanup function (removeEventListener).
 */
export function attachAvoidWorkerListener(
  worker: Worker,
  options: AttachAvoidWorkerListenerOptions = {}
): () => void {
  const { onRouted, onLoaded } = options;
  const setLoaded = useAvoidRoutesStore.getState().setLoaded;
  const setRoutes = useAvoidRoutesStore.getState().setRoutes;

  const handler = (e: MessageEvent<AvoidRouterWorkerResponse>) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object" || !("command" in msg)) return;

    switch (msg.command) {
      case "loaded":
        setLoaded(msg.success);
        onLoaded?.(msg.success);
        break;
      case "routed":
        setRoutes(msg.routes);
        onRouted?.(msg.routes);
        break;
      default:
        break;
    }
  };

  worker.addEventListener("message", handler);
  return () => worker.removeEventListener("message", handler);
}
