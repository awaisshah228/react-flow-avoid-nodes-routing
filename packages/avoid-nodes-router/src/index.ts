/**
 * avoid-nodes-edge-server
 *
 * Transport-agnostic server-side routing engine.
 *
 * Each handler spawns its own Worker thread with an isolated WASM instance.
 * When destroy() is called, the worker is terminated and ALL WASM memory is freed.
 *
 * Usage:
 *   1. const handler = createRoutingHandler()  — create a handler per client/session
 *   2. const response = await handler.handleMessage(msg) — feed messages in, get responses out
 *   3. handler.destroy()  — call on client disconnect to free WASM memory
 *
 * Wire handler.handleMessage to any transport: WebSocket, SSE, HTTP POST, IPC, etc.
 */

export { loadAvoidWasm, getAvoidLib, routeAll, PersistentServerRouter } from "./routing-engine";
export type {
  FlowNode,
  FlowEdge,
  AvoidRoute,
  AvoidRouterOptions,
} from "./routing-engine";

export {
  createRoutingHandler,
  type RoutingHandler,
  type RoutingRequest,
  type RoutingResponse,
} from "./handler";

export { getEdgePath } from "./getEdgePath";
export type { EdgePathData, GetEdgePathParams, EdgePathResult } from "./getEdgePath";
