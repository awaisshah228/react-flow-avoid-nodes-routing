/**
 * Web Worker: loads AvoidRouter (WASM) and handles routing commands.
 * WASM loads exclusively in this worker — never on the main thread.
 *
 * Uses PersistentRouter for incremental updates (moveShape_delta) during drag,
 * falling back to full reset when graph structure or settings change.
 */

import "./worker-polyfill";

import {
  type AvoidLibInstance,
  type AvoidRoute,
  type AvoidRouterOptions,
  type FlowNode,
  type FlowEdge,
  loadWasmWithRetry,
  routeAllCore,
} from "../routing-core";
import { PersistentRouter } from "../persistent-router";
import { resolveCollisions, type ResolveCollisionsOptions } from "../resolve-collisions";

// ---- Worker command types ----

type AvoidRouterWorkerCommand =
  | { command: "reset"; nodes?: FlowNode[]; edges?: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "change"; cell: FlowNode | FlowEdge }
  | { command: "remove"; id: string }
  | { command: "add"; cell: FlowNode | FlowEdge }
  | { command: "updateNodes"; nodes?: FlowNode[] }
  | { command: "route"; nodes?: FlowNode[]; edges?: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "resolveCollisions"; nodes?: FlowNode[]; options?: ResolveCollisionsOptions }
  | { command: "close" };

// ---- WASM Loading ----

let avoidLib: AvoidLibInstance | null = null;

const routerLoaded = loadWasmWithRetry().then((lib) => {
  avoidLib = lib;
  const success = lib != null;
  postMessage({ command: "loaded", success } as const);
  return success;
}).catch(() => {
  postMessage({ command: "loaded", success: false } as const);
  return false;
});

// ---- Internal model ----

let currentNodes: FlowNode[] = [];
let currentEdges: FlowEdge[] = [];
let currentOptions: AvoidRouterOptions = {};
let persistentRouter: PersistentRouter | null = null;

function isNode(cell: FlowNode | FlowEdge): cell is FlowNode {
  return "position" in cell && ("width" in cell || "measured" in cell || !("source" in cell));
}

/** Full reset using PersistentRouter. */
function doResetPersistent(): Record<string, AvoidRoute> {
  if (!avoidLib) return {};
  const avoidEdges = currentEdges.filter((e) => e.type === "avoidNodes");
  if (avoidEdges.length === 0) {
    persistentRouter?.destroy();
    persistentRouter = null;
    return {};
  }
  if (!persistentRouter) {
    persistentRouter = new PersistentRouter(avoidLib);
  }
  try {
    return persistentRouter.initialize(currentNodes, avoidEdges, currentOptions);
  } catch {
    persistentRouter?.destroy();
    persistentRouter = null;
    return {};
  }
}

/** Incremental update via PersistentRouter.moveNodes(). */
function doIncrementalUpdate(changedNodes: FlowNode[]): Record<string, AvoidRoute> {
  if (!persistentRouter?.isInitialized()) {
    return doResetPersistent();
  }
  try {
    return persistentRouter.moveNodes(changedNodes, currentNodes);
  } catch {
    return doResetPersistent();
  }
}

// ---- Debounce ----

const DEFAULT_DEBOUNCE_MS = 0;

function getDebounceMs(): number {
  return currentOptions.debounceMs ?? DEFAULT_DEBOUNCE_MS;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function isPending() { return debounceTimer != null; }
function cancelDebounce() {
  if (debounceTimer != null) { clearTimeout(debounceTimer); debounceTimer = null; }
}

function debouncedReset() {
  cancelDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const routes = doResetPersistent();
    setTimeout(() => {
      if (!isPending()) {
        postMessage({ command: "routed", routes } as const);
      }
    }, 0);
  }, getDebounceMs());
}

function debouncedIncremental(changedNodes: FlowNode[]) {
  cancelDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const routes = doIncrementalUpdate(changedNodes);
    setTimeout(() => {
      if (!isPending()) {
        postMessage({ command: "routed", routes } as const);
      }
    }, 0);
  }, getDebounceMs());
}

// ---- Message handler ----

onmessage = async (e: MessageEvent<AvoidRouterWorkerCommand>) => {
  await routerLoaded;

  const msg = e.data;
  if (!msg || typeof msg !== "object" || !("command" in msg)) return;

  switch (msg.command) {
    case "reset":
      currentNodes = msg.nodes ?? [];
      currentEdges = msg.edges ?? [];
      if (msg.options) currentOptions = msg.options;
      debouncedReset();
      break;

    case "change": {
      const cell = msg.cell;
      if (isNode(cell)) {
        const i = currentNodes.findIndex((n) => n.id === cell.id);
        if (i >= 0) currentNodes[i] = { ...currentNodes[i], ...cell };
        else currentNodes.push(cell);
      } else {
        const i = currentEdges.findIndex((ed) => ed.id === cell.id);
        if (i >= 0) currentEdges[i] = { ...currentEdges[i], ...cell };
        else currentEdges.push(cell);
      }
      debouncedReset();
      break;
    }

    case "remove": {
      const id = msg.id;
      const wasNode = currentNodes.some((n) => n.id === id);
      const wasEdge = currentEdges.some((ed) => ed.id === id);
      currentNodes = currentNodes.filter((n) => n.id !== id);
      currentEdges = currentEdges.filter((ed) => ed.id !== id);

      if (persistentRouter?.isInitialized()) {
        cancelDebounce();
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          let routes: Record<string, AvoidRoute> = {};
          if (wasNode) {
            routes = persistentRouter!.removeNode(id);
          } else if (wasEdge) {
            routes = persistentRouter!.removeEdge(id);
          }
          setTimeout(() => {
            if (!isPending()) postMessage({ command: "routed", routes } as const);
          }, 0);
        }, getDebounceMs());
      } else {
        debouncedReset();
      }
      break;
    }

    case "add": {
      const cell = msg.cell;
      if (isNode(cell)) {
        if (!currentNodes.some((n) => n.id === cell.id)) currentNodes.push(cell);
      } else {
        if (!currentEdges.some((ed) => ed.id === cell.id)) currentEdges.push(cell);
      }

      if (persistentRouter?.isInitialized()) {
        cancelDebounce();
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          let routes: Record<string, AvoidRoute>;
          if (isNode(cell)) {
            routes = persistentRouter!.addNode(cell);
          } else {
            routes = persistentRouter!.addEdge(cell);
          }
          setTimeout(() => {
            if (!isPending()) postMessage({ command: "routed", routes } as const);
          }, 0);
        }, getDebounceMs());
      } else {
        debouncedReset();
      }
      break;
    }

    case "updateNodes": {
      const updatedNodes = msg.nodes ?? [];
      for (const updated of updatedNodes) {
        const i = currentNodes.findIndex((n) => n.id === updated.id);
        if (i >= 0) currentNodes[i] = { ...currentNodes[i], ...updated };
        else currentNodes.push(updated);
      }
      // Full reset for now — incremental moveShape_delta needs more testing
      debouncedReset();
      break;
    }

    case "route": {
      if (!avoidLib) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      const routeNodes = msg.nodes ?? [];
      const routeEdges = (msg.edges ?? []).filter((ed: FlowEdge) => ed.type === "avoidNodes");
      const routeOptions = msg.options ?? currentOptions;
      if (routeEdges.length === 0) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      try {
        const routes = routeAllCore(avoidLib, routeNodes, routeEdges, routeOptions);
        postMessage({ command: "routed", routes } as const);
      } catch {
        postMessage({ command: "routed", routes: {} } as const);
      }
      break;
    }

    case "resolveCollisions": {
      const collisionNodes = (msg.nodes ?? currentNodes) as Parameters<typeof resolveCollisions>[0];
      const resolved = resolveCollisions(collisionNodes, msg.options);
      for (const node of resolved) {
        const i = currentNodes.findIndex((n) => n.id === node.id);
        if (i >= 0) currentNodes[i] = { ...currentNodes[i], position: node.position };
      }
      postMessage({ command: "collisionsResolved", nodes: resolved } as const);
      debouncedReset();
      break;
    }

    case "close":
      cancelDebounce();
      persistentRouter?.destroy();
      persistentRouter = null;
      self.close();
      break;

    default:
      break;
  }
};
