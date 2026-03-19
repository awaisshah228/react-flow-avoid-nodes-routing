/**
 * createAvoidNodesRouter
 * ---------------------------------------------------------------------------
 * Svelte equivalent of useAvoidNodesRouterFromWorker.
 * Creates a Web Worker, manages routing state via Svelte stores.
 *
 * Usage in a Svelte component:
 *   const router = createAvoidNodesRouter();
 *   // When nodes/edges/options change:
 *   router.reset(nodes, edges, options);
 *   // When a node is dragged:
 *   router.updateNodes(changedNodes);
 *   // On destroy:
 *   router.destroy();
 */

import type { AvoidRouterOptions, FlowNode, FlowEdge } from "./routing-core";
import type { AvoidRouterWorkerCommand } from "./worker-messages";
import type { ResolveCollisionsOptions } from "./resolve-collisions";
import { attachAvoidWorkerListener } from "./worker-listener";
import { avoidRoutes } from "./store";

export interface CreateAvoidNodesRouterOptions {
  onCollisionsResolved?: (nodes: FlowNode[]) => void;
}

/** Default router options — matches the React package defaults. */
const DEFAULT_ROUTER_OPTIONS: Required<AvoidRouterOptions> = {
  shapeBufferDistance: 12,
  idealNudgingDistance: 10,
  handleNudgingDistance: 10,
  edgeRounding: 8,
  diagramGridSize: 0,
  shouldSplitEdgesNearHandle: true,
  autoBestSideConnection: true,
  debounceMs: 0,
};

function mergeDefaults(opts?: AvoidRouterOptions): AvoidRouterOptions {
  return {
    shapeBufferDistance: opts?.shapeBufferDistance ?? DEFAULT_ROUTER_OPTIONS.shapeBufferDistance,
    idealNudgingDistance: opts?.idealNudgingDistance ?? DEFAULT_ROUTER_OPTIONS.idealNudgingDistance,
    handleNudgingDistance: opts?.handleNudgingDistance ?? DEFAULT_ROUTER_OPTIONS.handleNudgingDistance,
    edgeRounding: opts?.edgeRounding ?? DEFAULT_ROUTER_OPTIONS.edgeRounding,
    diagramGridSize: opts?.diagramGridSize ?? DEFAULT_ROUTER_OPTIONS.diagramGridSize,
    shouldSplitEdgesNearHandle: opts?.shouldSplitEdgesNearHandle ?? DEFAULT_ROUTER_OPTIONS.shouldSplitEdgesNearHandle,
    autoBestSideConnection: opts?.autoBestSideConnection ?? DEFAULT_ROUTER_OPTIONS.autoBestSideConnection,
    debounceMs: opts?.debounceMs ?? DEFAULT_ROUTER_OPTIONS.debounceMs,
  };
}

export interface AvoidNodesRouter {
  /** Send a full reset with current nodes, edges, and options. */
  reset: (nodes: FlowNode[], edges: FlowEdge[], options?: AvoidRouterOptions) => void;
  /** Send incremental node position updates (for drag). */
  updateNodes: (nodes: FlowNode[]) => void;
  /** Re-route edges for a single node by ID (e.g. after handle position changes). */
  updateRoutesForNodeId: (nodeId: string, allNodes: FlowNode[]) => void;
  /** Resolve collisions in the worker. */
  resolveCollisions: (nodes: FlowNode[], options?: ResolveCollisionsOptions) => void;
  /** Clean up worker. Call in onDestroy. */
  destroy: () => void;
  /** Whether the WASM worker has loaded. */
  readonly loaded: boolean;
}

export function createAvoidNodesRouter(
  options?: CreateAvoidNodesRouterOptions
): AvoidNodesRouter {
  let worker: Worker | null = null;
  let loaded = false;
  let didReset = false;

  try {
    worker = new Worker(
      new URL("./workers/avoid-router.worker.js", import.meta.url),
      { type: "module" }
    );
  } catch (e) {
    console.error("[avoid-nodes-svelte] Failed to create worker:", e);
  }

  let cleanup: (() => void) | null = null;

  if (worker) {
    worker.addEventListener("error", (e) => {
      console.error("[avoid-nodes-svelte] Worker error:", e.message);
    });

    cleanup = attachAvoidWorkerListener(worker, {
      onLoaded: (success) => {
        loaded = success;
      },
      onCollisionsResolved: (nodes) => {
        options?.onCollisionsResolved?.(nodes as FlowNode[]);
      },
    });

    // Terminate worker on page unload (Svelte onDestroy doesn't run on refresh)
    const onBeforeUnload = () => {
      worker?.postMessage({ command: "close" } as AvoidRouterWorkerCommand);
      worker?.terminate();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", onBeforeUnload);
    }
    const originalCleanup = cleanup;
    cleanup = () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeunload", onBeforeUnload);
      }
      originalCleanup?.();
    };
  }

  function post(cmd: AvoidRouterWorkerCommand) {
    worker?.postMessage(cmd);
  }

  function reset(nodes: FlowNode[], edges: FlowEdge[], routerOptions?: AvoidRouterOptions) {
    if (!loaded && !worker) return;
    if (edges.length === 0) {
      avoidRoutes.set({});
      return;
    }
    post({ command: "reset", nodes, edges, options: mergeDefaults(routerOptions) });
    didReset = true;
  }

  function updateNodes(nodes: FlowNode[]) {
    if (!loaded || !didReset || nodes.length === 0) return;
    post({ command: "updateNodes", nodes });
  }

  function updateRoutesForNodeId(nodeId: string, allNodes: FlowNode[]) {
    if (!loaded || !didReset) return;
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return;
    post({ command: "updateNodes", nodes: [node] });
  }

  function resolveCollisionsInWorker(nodes: FlowNode[], collisionOptions?: ResolveCollisionsOptions) {
    if (!loaded) return;
    post({ command: "resolveCollisions", nodes, options: collisionOptions });
  }

  function destroy() {
    cleanup?.();
    if (worker) {
      post({ command: "close" });
      worker.terminate();
      worker = null;
    }
    loaded = false;
    didReset = false;
  }

  return {
    reset,
    updateNodes,
    updateRoutesForNodeId,
    resolveCollisions: resolveCollisionsInWorker,
    destroy,
    get loaded() { return loaded; },
  };
}
