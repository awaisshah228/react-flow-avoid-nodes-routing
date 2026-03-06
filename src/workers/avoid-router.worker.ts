/**
 * Web Worker: loads AvoidRouter (WASM) and handles routing commands.
 *
 * Uses debounced processTransaction pattern:
 *  - Main thread sends incremental commands: reset, change, add, remove, updateNodes
 *  - Worker maintains internal node/edge model
 *  - Debounced routeAll runs after changes settle
 *  - Posts back 'routed' with results only when no more pending changes
 */

// Must be first import: polyfills `window` as `self` for Web Worker.
import "./worker-polyfill";
import { AvoidRouter } from "../avoid/router";
import type { AvoidRouterOptions, AvoidRoute } from "../avoid/router";
import type { AvoidRouterWorkerCommand } from "../avoid/worker-messages";
import type { Node, Edge } from "@xyflow/react";

const DEBOUNCE_MS = 0;

// ---- Load WASM ----
const routerLoaded = AvoidRouter.load();
routerLoaded.then((success) => {
  postMessage({ command: "loaded", success } as const);
}).catch(() => {
  postMessage({ command: "loaded", success: false } as const);
});

// ---- Internal model ----
let nodes: Node[] = [];
let edges: Edge[] = [];
let options: AvoidRouterOptions = {};

function isNode(cell: Node | Edge): cell is Node {
  return "position" in cell && ("width" in cell || "measured" in cell || !("source" in cell));
}

function doRoute(): Record<string, AvoidRoute> {
  const avoidEdges = edges.filter((e) => e.type === "avoidNodes");
  if (avoidEdges.length === 0) return {};
  try {
    return AvoidRouter.getInstance().routeAll(nodes, avoidEdges, options);
  } catch {
    return {};
  }
}

// ---- Debounce ----
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
  }, DEBOUNCE_MS);
}

// ---- Message handler ----
onmessage = async (e: MessageEvent<AvoidRouterWorkerCommand>) => {
  await routerLoaded;

  const msg = e.data;
  if (!msg || typeof msg !== "object" || !("command" in msg)) return;

  switch (msg.command) {
    case "reset":
      nodes = msg.nodes ?? [];
      edges = msg.edges ?? [];
      if (msg.options) options = msg.options;
      debouncedRoute();
      break;

    case "change": {
      const cell = msg.cell;
      if (isNode(cell)) {
        const i = nodes.findIndex((n) => n.id === cell.id);
        if (i >= 0) nodes[i] = { ...nodes[i], ...cell };
        else nodes.push(cell);
      } else {
        const i = edges.findIndex((ed) => ed.id === cell.id);
        if (i >= 0) edges[i] = { ...edges[i], ...cell };
        else edges.push(cell);
      }
      debouncedRoute();
      break;
    }

    case "remove": {
      const id = msg.id;
      nodes = nodes.filter((n) => n.id !== id);
      edges = edges.filter((ed) => ed.id !== id);
      debouncedRoute();
      break;
    }

    case "add": {
      const cell = msg.cell;
      if (isNode(cell)) {
        if (!nodes.some((n) => n.id === cell.id)) nodes.push(cell);
      } else {
        if (!edges.some((ed) => ed.id === cell.id)) edges.push(cell);
      }
      debouncedRoute();
      break;
    }

    case "updateNodes": {
      const updatedNodes = msg.nodes ?? [];
      for (const updated of updatedNodes) {
        const i = nodes.findIndex((n) => n.id === updated.id);
        if (i >= 0) nodes[i] = { ...nodes[i], ...updated };
        else nodes.push(updated);
      }
      debouncedRoute();
      break;
    }

    case "route": {
      const routeNodes = msg.nodes ?? [];
      const routeEdges = (msg.edges ?? []).filter((ed: Edge) => ed.type === "avoidNodes");
      const routeOptions = msg.options ?? options;
      if (routeEdges.length === 0) {
        postMessage({ command: "routed", routes: {} } as const);
        break;
      }
      try {
        const routes = AvoidRouter.getInstance().routeAll(routeNodes, routeEdges, routeOptions);
        postMessage({ command: "routed", routes } as const);
      } catch {
        postMessage({ command: "routed", routes: {} } as const);
      }
      break;
    }

    case "close":
      cancelDebounce();
      self.close();
      break;

    default:
      break;
  }
};
