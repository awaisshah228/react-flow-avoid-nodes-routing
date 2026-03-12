/**
 * avoid-nodes-edge-svelte
 * Orthogonal edge routing for Svelte Flow — WASM runs exclusively in a Web Worker.
 */

// AvoidNodesEdge.svelte is shipped as a raw .svelte file — import from "avoid-nodes-edge-svelte/edge"

export { createAvoidNodesRouter } from "./createAvoidNodesRouter";
export type { AvoidNodesRouter, CreateAvoidNodesRouterOptions } from "./createAvoidNodesRouter";

export { avoidRoutesLoaded, avoidRoutes, getRouteForEdge, getRoutes } from "./store";

export { resolveCollisions, hasOverlap } from "./resolve-collisions";
export type { ResolveCollisionsOptions } from "./resolve-collisions";

export type { AvoidRoute, AvoidRouterOptions, HandlePosition, ConnectorType, FlowNode, FlowEdge } from "./routing-core";
export type { AvoidRouterWorkerCommand, AvoidRouterWorkerResponse } from "./worker-messages";

export {
  DEV_LOG_WEB_WORKER_MESSAGES,
  DEBOUNCE_ROUTING_MS,
  SHOULD_START_EDGE_AT_HANDLE_BORDER,
  EDGE_BORDER_RADIUS,
} from "./constants";
