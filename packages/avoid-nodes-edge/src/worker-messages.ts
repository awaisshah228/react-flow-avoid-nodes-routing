/**
 * Message types for the avoid-router Web Worker.
 * Main thread posts commands; worker posts back 'loaded' and 'routed'.
 */

import type { Node, Edge } from "@xyflow/react";
import type { AvoidRoute, AvoidRouterOptions } from "./routing-core";
import type { ResolveCollisionsOptions } from "./resolve-collisions";

/** Commands the main thread can send to the worker */
export type AvoidRouterWorkerCommand =
  | { command: "reset"; nodes: Node[]; edges: Edge[]; options?: AvoidRouterOptions }
  | { command: "change"; cell: Node | Edge }
  | { command: "remove"; id: string }
  | { command: "add"; cell: Node | Edge }
  | { command: "route"; nodes: Node[]; edges: Edge[]; options?: AvoidRouterOptions }
  | { command: "updateNodes"; nodes: Node[] }
  | { command: "resolveCollisions"; nodes: Node[]; options?: ResolveCollisionsOptions }
  | { command: "close" };

/** Messages the worker sends back to the main thread */
export type AvoidRouterWorkerResponse =
  | { command: "loaded"; success: boolean }
  | { command: "routed"; routes: Record<string, AvoidRoute> }
  | { command: "collisionsResolved"; nodes: Node[] };
