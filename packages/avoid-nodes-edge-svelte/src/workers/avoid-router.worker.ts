/**
 * Web Worker: loads AvoidRouter (WASM) and handles routing commands.
 * Uses PersistentRouter to prevent WASM heap growth from repeated alloc/free.
 */

import "./worker-polyfill";

import {
  type AvoidLibInstance,
  type AvoidRoute,
  type AvoidRouterOptions,
  type FlowNode,
  type FlowEdge,
  loadWasmWithRetry,
  PersistentRouter,
} from "../routing-core";
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
let nodeIndex = new Map<string, number>();
let edgeIndex = new Map<string, number>();
let topologyDirty = true;
let positionDirty = false;
let pendingNodeUpdates: FlowNode[] = [];

const persistentRouter = new PersistentRouter();

function rebuildIndices() {
  nodeIndex = new Map(currentNodes.map((n, i) => [n.id, i]));
  edgeIndex = new Map(currentEdges.map((e, i) => [e.id, i]));
}

function isNode(cell: FlowNode | FlowEdge): cell is FlowNode {
  return "position" in cell && ("width" in cell || "measured" in cell || !("source" in cell));
}

function doRoute(): Record<string, AvoidRoute> {
  if (!avoidLib) return {};
  if (currentEdges.length === 0) return {};
  try {
    if (topologyDirty) {
      topologyDirty = false;
      positionDirty = false;
      pendingNodeUpdates = [];
      return persistentRouter.reset(avoidLib, currentNodes, currentEdges, currentOptions);
    } else if (positionDirty && pendingNodeUpdates.length > 0) {
      positionDirty = false;
      const updates = pendingNodeUpdates;
      pendingNodeUpdates = [];
      return persistentRouter.updateNodes(updates);
    }
    return persistentRouter.reset(avoidLib, currentNodes, currentEdges, currentOptions);
  } catch {
    return {};
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

function debouncedRoute() {
  cancelDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const routes = doRoute();
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
      rebuildIndices();
      topologyDirty = true;
      pendingNodeUpdates = [];
      debouncedRoute();
      break;

    case "change": {
      const cell = msg.cell;
      if (isNode(cell)) {
        const i = nodeIndex.get(cell.id);
        if (i != null) {
          currentNodes[i] = { ...currentNodes[i], ...cell };
          if (!topologyDirty) { positionDirty = true; pendingNodeUpdates.push(currentNodes[i]); }
        } else {
          nodeIndex.set(cell.id, currentNodes.length);
          currentNodes.push(cell);
          topologyDirty = true;
        }
      } else {
        const i = edgeIndex.get(cell.id);
        if (i != null) currentEdges[i] = { ...currentEdges[i], ...cell };
        else { edgeIndex.set(cell.id, currentEdges.length); currentEdges.push(cell); }
        topologyDirty = true;
      }
      debouncedRoute();
      break;
    }

    case "remove": {
      const id = msg.id;
      currentNodes = currentNodes.filter((n) => n.id !== id);
      currentEdges = currentEdges.filter((ed) => ed.id !== id);
      rebuildIndices();
      topologyDirty = true;
      pendingNodeUpdates = [];
      debouncedRoute();
      break;
    }

    case "add": {
      const cell = msg.cell;
      if (isNode(cell)) {
        if (!nodeIndex.has(cell.id)) { nodeIndex.set(cell.id, currentNodes.length); currentNodes.push(cell); }
      } else {
        if (!edgeIndex.has(cell.id)) { edgeIndex.set(cell.id, currentEdges.length); currentEdges.push(cell); }
      }
      topologyDirty = true;
      debouncedRoute();
      break;
    }

    case "updateNodes": {
      const updatedNodes = msg.nodes ?? [];
      for (const updated of updatedNodes) {
        const i = nodeIndex.get(updated.id);
        if (i != null) {
          currentNodes[i] = { ...currentNodes[i], ...updated };
          if (!topologyDirty) { positionDirty = true; pendingNodeUpdates.push(currentNodes[i]); }
        } else {
          nodeIndex.set(updated.id, currentNodes.length);
          currentNodes.push(updated);
          topologyDirty = true;
        }
      }
      debouncedRoute();
      break;
    }

    case "route": {
      if (!avoidLib) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      const routeNodes = msg.nodes ?? [];
      const routeEdges = msg.edges ?? [];
      const routeOptions = msg.options ?? currentOptions;
      if (routeEdges.length === 0) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      try {
        const routes = persistentRouter.reset(avoidLib, routeNodes, routeEdges, routeOptions);
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
        const i = nodeIndex.get(node.id);
        if (i != null) currentNodes[i] = { ...currentNodes[i], position: node.position };
      }
      postMessage({ command: "collisionsResolved", nodes: resolved } as const);
      topologyDirty = true;
      debouncedRoute();
      break;
    }

    case "close":
      cancelDebounce();
      persistentRouter.destroy();
      self.close();
      break;

    default:
      break;
  }
};
