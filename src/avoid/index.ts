/**
 * Avoid-nodes routing (libavoid-js): route edges so they avoid nodes.
 */

export { AvoidRouter, routeAll, loadAvoidRouter } from "./router";
export type { AvoidRoute, AvoidRouterOptions, HandlePosition } from "./router";

export { useAvoidRoutesStore, useAvoidRouterActionsStore } from "./store";
export type { AvoidRoutesState, AvoidRouterActions } from "./store";

export { useAvoidNodesPath } from "./useAvoidNodesPath";
export type { UseAvoidNodesPathParams, Position } from "./useAvoidNodesPath";

export { useAvoidNodesRouterFromWorker } from "./useAvoidNodesRouterFromWorker";
export type {
  UseAvoidNodesRouterOptions,
  UseAvoidNodesRouterResult,
} from "./useAvoidNodesRouterFromWorker";

export {
  DEV_LOG_WEB_WORKER_MESSAGES,
  DEBOUNCE_ROUTING_MS,
  SHOULD_START_EDGE_AT_HANDLE_BORDER,
  EDGE_BORDER_RADIUS,
} from "./constants";
