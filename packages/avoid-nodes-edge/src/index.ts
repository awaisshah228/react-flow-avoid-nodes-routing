/**
 * @xyflow/avoid-nodes-edge
 * Orthogonal edge routing for React Flow — WASM runs exclusively in a Web Worker.
 */

export { AvoidRouter, routeAll, loadAvoidRouter } from "./router";
export type { AvoidRoute, AvoidRouterOptions, HandlePosition, ConnectorType } from "./router";

export { useAvoidRoutesStore, useAvoidRouterActionsStore } from "./store";
export type { AvoidRoutesState, AvoidRouterActions } from "./store";

export { useAvoidNodesPath } from "./useAvoidNodesPath";
export type { UseAvoidNodesPathParams, Position } from "./useAvoidNodesPath";

export { useAvoidNodesRouterFromWorker } from "./useAvoidNodesRouterFromWorker";
export type {
  UseAvoidNodesRouterOptions,
  UseAvoidNodesRouterResult,
} from "./useAvoidNodesRouterFromWorker";

export { useAvoidWorker } from "./useAvoidWorker";
export type { UseAvoidWorkerOptions, UseAvoidWorkerResult } from "./useAvoidWorker";

export type { AvoidRouterWorkerCommand, AvoidRouterWorkerResponse } from "./worker-messages";
export { attachAvoidWorkerListener } from "./worker-listener";
export type { AttachAvoidWorkerListenerOptions } from "./worker-listener";

export {
  DEV_LOG_WEB_WORKER_MESSAGES,
  DEBOUNCE_ROUTING_MS,
  SHOULD_START_EDGE_AT_HANDLE_BORDER,
  EDGE_BORDER_RADIUS,
} from "./constants";

export { resolveCollisions, hasOverlap } from "./resolve-collisions";
export type { ResolveCollisionsOptions } from "./resolve-collisions";
