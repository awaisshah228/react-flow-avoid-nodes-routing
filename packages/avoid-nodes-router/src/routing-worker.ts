/**
 * Worker thread for routing.
 *
 * Each worker loads its own WASM instance — when the worker is terminated,
 * ALL WASM memory is freed. This avoids C++ memory leaks from the shared
 * WASM heap that can never shrink.
 */

import { parentPort } from "node:worker_threads";
import {
  type FlowNode,
  type FlowEdge,
  type AvoidRouterOptions,
  loadAvoidWasm,
  routeAll,
} from "./routing-engine";

if (!parentPort) throw new Error("Must run as worker thread");

let currentNodes: FlowNode[] = [];
let currentEdges: FlowEdge[] = [];
let currentOptions: AvoidRouterOptions = {};

function isAvoidEdge(e: FlowEdge) {
  return e.type === "avoidNodes";
}

function doRoute() {
  const avoidEdges = currentEdges.filter(isAvoidEdge);
  if (avoidEdges.length === 0) return {};
  return routeAll(currentNodes, avoidEdges, currentOptions);
}

async function init() {
  await loadAvoidWasm();
  parentPort!.postMessage({ command: "ready" });
}

parentPort.on("message", (msg) => {
  try {
    switch (msg.command) {
      case "reset": {
        currentNodes = msg.nodes ?? [];
        currentEdges = msg.edges ?? [];
        if (msg.options) currentOptions = msg.options;
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "updateNodes": {
        for (const updated of msg.nodes) {
          const i = currentNodes.findIndex((n: FlowNode) => n.id === updated.id);
          if (i >= 0) currentNodes[i] = { ...currentNodes[i], ...updated };
          else currentNodes.push(updated);
        }
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "addNode": {
        if (!currentNodes.some((n: FlowNode) => n.id === msg.node.id)) {
          currentNodes.push(msg.node);
        }
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "removeNode": {
        currentNodes = currentNodes.filter((n: FlowNode) => n.id !== msg.id);
        currentEdges = currentEdges.filter(
          (e: FlowEdge) => e.source !== msg.id && e.target !== msg.id
        );
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "addEdge": {
        if (!currentEdges.some((e: FlowEdge) => e.id === msg.edge.id)) {
          currentEdges.push(msg.edge);
        }
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "removeEdge": {
        currentEdges = currentEdges.filter((e: FlowEdge) => e.id !== msg.id);
        const routes = doRoute();
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "route": {
        const routeEdges = (msg.edges ?? []).filter(isAvoidEdge);
        const routes = routeEdges.length > 0
          ? routeAll(msg.nodes ?? [], routeEdges, msg.options)
          : {};
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "getState": {
        parentPort!.postMessage({
          id: msg.id,
          command: "state",
          nodes: currentNodes,
          edges: currentEdges,
          options: currentOptions,
        });
        break;
      }

      default:
        parentPort!.postMessage({
          id: msg.id,
          command: "error",
          message: `Unknown command: ${msg.command}`,
        });
    }
  } catch (err) {
    parentPort!.postMessage({
      id: msg.id,
      command: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

init().catch((err) => {
  parentPort!.postMessage({ command: "error", message: `WASM load failed: ${err}` });
});
