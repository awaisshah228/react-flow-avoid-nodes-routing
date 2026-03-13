/**
 * Worker thread for routing.
 *
 * Uses PersistentServerRouter to keep the WASM Router alive across requests,
 * avoiding expensive create/destroy cycles. When the worker is terminated,
 * ALL WASM memory is freed.
 */

import { parentPort } from "node:worker_threads";
import {
  type FlowNode,
  type FlowEdge,
  loadAvoidWasm,
  PersistentServerRouter,
} from "./routing-engine";

if (!parentPort) throw new Error("Must run as worker thread");

const router = new PersistentServerRouter();

async function init() {
  await loadAvoidWasm();
  parentPort!.postMessage({ command: "ready" });
}

parentPort.on("message", (msg) => {
  try {
    switch (msg.command) {
      case "reset": {
        const routes = router.reset(
          msg.nodes ?? [],
          msg.edges ?? [],
          msg.options
        );
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "updateNodes": {
        const routes = router.updateNodes(msg.nodes ?? []);
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "addNode": {
        const routes = router.updateNodes([msg.node]);
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "removeNode": {
        // Remove node and connected edges, then full rebuild
        const state = router.getState();
        const nodes = state.nodes.filter((n: FlowNode) => n.id !== msg.id);
        const edges = state.edges.filter(
          (e: FlowEdge) => e.source !== msg.id && e.target !== msg.id
        );
        const routes = router.reset(nodes, edges, state.options);
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "addEdge": {
        const state = router.getState();
        if (!state.edges.some((e: FlowEdge) => e.id === msg.edge.id)) {
          state.edges.push(msg.edge);
        }
        const routes = router.reset(state.nodes, state.edges, state.options);
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "removeEdge": {
        const state = router.getState();
        const edges = state.edges.filter((e: FlowEdge) => e.id !== msg.id);
        const routes = router.reset(state.nodes, edges, state.options);
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "route": {
        const routes = router.reset(
          msg.nodes ?? [],
          msg.edges ?? [],
          msg.options
        );
        parentPort!.postMessage({ id: msg.id, command: "routed", routes });
        break;
      }

      case "getState": {
        const state = router.getState();
        parentPort!.postMessage({
          id: msg.id,
          command: "state",
          nodes: state.nodes,
          edges: state.edges,
          options: state.options,
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
