/**
 * Transport-agnostic routing message handler.
 *
 * Each handler spawns its own Worker thread with an isolated WASM instance.
 * When destroy() is called (e.g. on client disconnect), the worker is
 * terminated and ALL WASM memory is freed — no C++ heap leaks.
 *
 * Plug into any transport: WebSocket, SSE, HTTP POST, Socket.IO, etc.
 */

import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type {
  FlowNode,
  FlowEdge,
  AvoidRoute,
  AvoidRouterOptions,
} from "./routing-engine";

// ---- Request types (client → server) ----

export type RoutingRequest =
  | { command: "reset"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "updateNodes"; nodes: FlowNode[] }
  | { command: "addNode"; node: FlowNode }
  | { command: "removeNode"; id: string }
  | { command: "addEdge"; edge: FlowEdge }
  | { command: "removeEdge"; id: string }
  | { command: "route"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions };

// ---- Response types (server → client) ----

export type RoutingResponse =
  | { command: "routed"; routes: Record<string, AvoidRoute> }
  | { command: "error"; message: string };

// ---- Handler ----

export interface RoutingHandler {
  /** Process a message and return a response. Async because routing runs in a worker thread. */
  handleMessage(msg: RoutingRequest): Promise<RoutingResponse>;
  /** Terminate the worker and free all WASM memory. Call on client disconnect. */
  destroy(): void;
}

const workerPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "routing-worker.js"
);

export function createRoutingHandler(): RoutingHandler {
  let msgIdCounter = 0;
  const pending = new Map<number, { resolve: (v: RoutingResponse) => void }>();

  const worker = new Worker(workerPath);
  let ready = false;
  const readyPromise = new Promise<void>((resolve) => {
    const onReady = (msg: { command: string }) => {
      if (msg.command === "ready") {
        ready = true;
        resolve();
      }
    };
    worker.on("message", onReady);
  });

  worker.on("message", (msg) => {
    if (msg.id == null) return; // skip "ready" messages
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);

    if (msg.command === "routed") {
      entry.resolve({ command: "routed", routes: msg.routes });
    } else if (msg.command === "error") {
      entry.resolve({ command: "error", message: msg.message });
    } else if (msg.command === "state") {
      // getState response — not used via handleMessage
      entry.resolve({ command: "routed", routes: {} });
    }
  });

  worker.on("error", (err) => {
    for (const [, entry] of pending) {
      entry.resolve({ command: "error", message: err.message });
    }
    pending.clear();
  });

  worker.on("exit", (code) => {
    for (const [, entry] of pending) {
      entry.resolve({ command: "error", message: `Worker exited with code ${code}` });
    }
    pending.clear();
  });

  async function handleMessage(msg: RoutingRequest): Promise<RoutingResponse> {
    if (!ready) await readyPromise;

    const id = ++msgIdCounter;
    return new Promise<RoutingResponse>((resolve) => {
      pending.set(id, { resolve });
      worker.postMessage({ ...msg, id });
    });
  }

  function destroy() {
    for (const [, entry] of pending) {
      entry.resolve({ command: "error", message: "Handler destroyed" });
    }
    pending.clear();
    worker.terminate();
  }

  return { handleMessage, destroy };
}
