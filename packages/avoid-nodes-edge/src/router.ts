/**
 * React Flow integration for libavoid-js: route edges so they avoid nodes (excluding group nodes).
 * Use AvoidRouter.load() once, then AvoidRouter.getInstance().routeAll(nodes, edges).
 */

import type { Node, Edge } from "@xyflow/react";
import {
  type AvoidLibInstance,
  type AvoidRouterOptions,
  type AvoidRoute,
  loadWasmWithRetry,
  routeAllCore,
} from "./routing-core";

// Re-export types for public API
export type { AvoidRoute, AvoidRouterOptions, HandlePosition, ConnectorType } from "./routing-core";

/**
 * AvoidRouter: routes diagram edges around nodes using libavoid-js (WASM).
 * Use static load() once, then getInstance().routeAll(nodes, edges).
 */
export class AvoidRouter {
  private static lib: AvoidLibInstance | null = null;
  private static instance: AvoidRouter | null = null;

  static async load(wasmUrl?: string): Promise<boolean> {
    if (AvoidRouter.lib != null) return true;
    if (typeof globalThis === "undefined") return false;
    const lib = await loadWasmWithRetry(wasmUrl);
    if (lib == null) return false;
    AvoidRouter.lib = lib;
    return true;
  }

  static getInstance(): AvoidRouter {
    if (AvoidRouter.instance == null) AvoidRouter.instance = new AvoidRouter();
    if (AvoidRouter.lib == null) throw new Error("AvoidRouter.load() must be called first.");
    return AvoidRouter.instance;
  }

  routeAll(nodes: Node[], edges: Edge[], options?: AvoidRouterOptions): Record<string, AvoidRoute> {
    const Avoid = AvoidRouter.lib;
    if (!Avoid) return {};
    return routeAllCore(Avoid, nodes as Parameters<typeof routeAllCore>[1], edges as Parameters<typeof routeAllCore>[2], options);
  }
}

export async function loadAvoidRouter(): Promise<boolean> {
  return AvoidRouter.load();
}

export function routeAll(
  nodes: Node[],
  edges: Edge[],
  options?: AvoidRouterOptions
): Record<string, AvoidRoute> {
  try {
    return AvoidRouter.getInstance().routeAll(nodes, edges, options);
  } catch {
    return {};
  }
}
