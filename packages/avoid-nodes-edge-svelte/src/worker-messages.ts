/**
 * Message types for the avoid-router Web Worker.
 * Uses generic FlowNode/FlowEdge from routing-core (framework-agnostic).
 */

import type { FlowNode, FlowEdge, AvoidRoute, AvoidRouterOptions } from "./routing-core";
import type { ResolveCollisionsOptions } from "./resolve-collisions";

export type AvoidRouterWorkerCommand =
  | { command: "reset"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "change"; cell: FlowNode | FlowEdge }
  | { command: "remove"; id: string }
  | { command: "add"; cell: FlowNode | FlowEdge }
  | { command: "route"; nodes: FlowNode[]; edges: FlowEdge[]; options?: AvoidRouterOptions }
  | { command: "updateNodes"; nodes: FlowNode[] }
  | { command: "resolveCollisions"; nodes: FlowNode[]; options?: ResolveCollisionsOptions }
  | { command: "close" };

export type AvoidRouterWorkerResponse =
  | { command: "loaded"; success: boolean }
  | { command: "routed"; routes: Record<string, AvoidRoute> }
  | { command: "collisionsResolved"; nodes: FlowNode[] };
