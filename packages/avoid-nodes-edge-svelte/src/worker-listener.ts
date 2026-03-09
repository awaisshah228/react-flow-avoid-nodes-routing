/**
 * Listener for avoid-router Web Worker messages.
 * Syncs "loaded" / "routed" into Svelte stores.
 */

import type { AvoidRoute } from "./routing-core";
import { avoidRoutesLoaded, avoidRoutes } from "./store";

export type AvoidRouterWorkerResponse =
  | { command: "loaded"; success: boolean }
  | { command: "routed"; routes: Record<string, AvoidRoute> }
  | { command: "collisionsResolved"; nodes: unknown[] };

export interface AttachAvoidWorkerListenerOptions {
  onRouted?: (routes: Record<string, AvoidRoute>) => void;
  onLoaded?: (success: boolean) => void;
  onCollisionsResolved?: (nodes: unknown[]) => void;
}

export function attachAvoidWorkerListener(
  worker: Worker,
  options: AttachAvoidWorkerListenerOptions = {}
): () => void {
  const { onRouted, onLoaded, onCollisionsResolved } = options;

  const handler = (e: MessageEvent<AvoidRouterWorkerResponse>) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object" || !("command" in msg)) return;

    switch (msg.command) {
      case "loaded":
        avoidRoutesLoaded.set(msg.success);
        onLoaded?.(msg.success);
        break;
      case "routed":
        avoidRoutes.set(msg.routes);
        onRouted?.(msg.routes);
        break;
      case "collisionsResolved":
        onCollisionsResolved?.(msg.nodes);
        break;
      default:
        break;
    }
  };

  worker.addEventListener("message", handler);
  return () => worker.removeEventListener("message", handler);
}
