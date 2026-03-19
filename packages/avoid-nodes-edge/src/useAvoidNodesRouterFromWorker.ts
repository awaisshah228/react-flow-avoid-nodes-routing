/**
 * useAvoidNodesRouterFromWorker
 * ---------------------------------------------------------------------------
 * Routes edges around nodes using a Web Worker running WASM.
 *
 * How it works:
 * 1. On load, sends ALL nodes + edges to the worker ("reset").
 * 2. On drag/resize, sends ONLY that node ("updateNodes") — much faster.
 * 3. On add/remove, does a full reset (graph structure changed).
 * 4. On settings change (spacing, rounding), does a full reset.
 *
 * The worker batches rapid changes (debounce) so dragging doesn't flood it.
 */

import { useCallback, useEffect, useRef } from "react";
import type { Node, NodeChange, Edge } from "@xyflow/react";
import { useAvoidRoutesStore, useAvoidRouterActionsStore } from "./store";
import { DEBOUNCE_ROUTING_MS } from "./constants";
import type { AvoidRouterOptions } from "./router";
import type { ResolveCollisionsOptions } from "./resolve-collisions";
import { useAvoidWorker } from "./useAvoidWorker";

export interface UseAvoidNodesRouterOptions {
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
  debounceMs?: number;
  onCollisionsResolved?: (nodes: Node[]) => void;
}

export interface UseAvoidNodesRouterResult {
  updateRoutingOnNodesChange: (changes: NodeChange<Node>[]) => void;
  resetRouting: () => void;
  refreshRouting: () => void;
  updateRoutingForNodeIds: (nodeIds: string[]) => void;
  resolveCollisionsInWorker: (options?: ResolveCollisionsOptions) => void;
}

const DEFAULT_OPTIONS: UseAvoidNodesRouterOptions = {
  edgeRounding: 8,
  edgeToEdgeSpacing: 10,
  edgeToNodeSpacing: 12,
  diagramGridSize: 0,
  shouldSplitEdgesNearHandle: true,
  autoBestSideConnection: true,
};

function toRouterOptions(opts?: UseAvoidNodesRouterOptions): AvoidRouterOptions {
  return {
    idealNudgingDistance: opts?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    shapeBufferDistance: opts?.edgeToNodeSpacing ?? DEFAULT_OPTIONS.edgeToNodeSpacing,
    edgeRounding: opts?.edgeRounding ?? DEFAULT_OPTIONS.edgeRounding,
    diagramGridSize: opts?.diagramGridSize ?? DEFAULT_OPTIONS.diagramGridSize,
    shouldSplitEdgesNearHandle: opts?.shouldSplitEdgesNearHandle ?? DEFAULT_OPTIONS.shouldSplitEdgesNearHandle,
    autoBestSideConnection: opts?.autoBestSideConnection ?? DEFAULT_OPTIONS.autoBestSideConnection,
    debounceMs: opts?.debounceMs ?? DEFAULT_OPTIONS.debounceMs,
  };
}

/**
 * Drop-in replacement for useAvoidNodesRouter — same API, but all heavy
 * routing calculations happen on a separate thread so the UI stays smooth.
 */
export function useAvoidNodesRouterFromWorker(
  nodes: Node[],
  edges: Edge[],
  options?: UseAvoidNodesRouterOptions
): UseAvoidNodesRouterResult {
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const opts = toRouterOptions(options);
  const optsRef = useRef<AvoidRouterOptions>(opts);

  // Update refs eagerly during render so that callbacks (like resetRouting
  // called from requestAnimationFrame) always see the latest data — useEffect
  // runs too late and causes stale reads after collision resolution.
  nodesRef.current = nodes;
  edgesRef.current = edges;
  optsRef.current = opts;

  const setRoutes = useAvoidRoutesStore((s) => s.setRoutes);
  const setActions = useAvoidRouterActionsStore((s) => s.setActions);

  const { post, workerLoaded } = useAvoidWorker({
    create: true,
    onCollisionsResolved: options?.onCollisionsResolved,
  });

  const didResetRef = useRef(false);
  const nodesMeasuredRef = useRef(false);

  const sendReset = useCallback(() => {
    if (!workerLoaded) return;
    // Don't route until React Flow has measured at least some nodes —
    // without measured data, obstacles get wrong sizes and edges clip through.
    const nodes = nodesRef.current;
    const hasMeasured = nodes.length === 0 || nodes.some((n) => n.measured?.width != null);
    if (!hasMeasured) return;
    nodesMeasuredRef.current = true;
    const edges = edgesRef.current;
    if (edges.length === 0) {
      setRoutes({});
      return;
    }
    post({
      command: "reset",
      nodes,
      edges,
      options: optsRef.current,
    });
    didResetRef.current = true;
  }, [post, setRoutes, workerLoaded]);

  const sendIncrementalChanges = useCallback(
    (nodeIds: string[]) => {
      if (!workerLoaded || !didResetRef.current) return;
      const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));
      const changedNodes = nodeIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is Node => n != null);
      if (changedNodes.length === 0) return;
      post({ command: "updateNodes", nodes: changedNodes });
    },
    [post, workerLoaded]
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChangeIdsRef = useRef<Set<string>>(new Set());

  const resetRouting = useCallback(() => { sendReset(); }, [sendReset]);
  const refreshRouting = useCallback(() => { sendReset(); }, [sendReset]);
  const updateRoutingForNodeIds = useCallback(
    (nodeIds: string[]) => { sendIncrementalChanges(nodeIds); },
    [sendIncrementalChanges]
  );

  const updateRoutingOnNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      if (!workerLoaded) return;

      let hasPosition = false;
      let hasDimensions = false;
      let hasAddOrRemove = false;

      for (const c of changes) {
        if (c.type === "position") {
          hasPosition = true;
          pendingChangeIdsRef.current.add(c.id);
        } else if (c.type === "dimensions") {
          hasDimensions = true;
          pendingChangeIdsRef.current.add(c.id);
        } else if (c.type === "add" || c.type === "remove") {
          hasAddOrRemove = true;
        }
      }

      if (!hasPosition && !hasDimensions && !hasAddOrRemove) return;

      // On first dimensions change (initial measurement) or structural changes,
      // do a full reset so all nodes get correct measured bounds.
      const needsFullReset = hasAddOrRemove || (hasDimensions && !nodesMeasuredRef.current);

      if (needsFullReset) {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        pendingChangeIdsRef.current.clear();
        // Use rAF to ensure React has flushed state (nodesRef is up to date).
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          requestAnimationFrame(() => sendReset());
        }, DEBOUNCE_ROUTING_MS);
        return;
      }

      if (!didResetRef.current) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        // Use rAF to ensure React has flushed state before reading nodesRef.
        requestAnimationFrame(() => {
          const ids = Array.from(pendingChangeIdsRef.current);
          pendingChangeIdsRef.current.clear();
          if (ids.length > 0) {
            sendIncrementalChanges(ids);
          }
        });
      }, DEBOUNCE_ROUTING_MS);
    },
    [workerLoaded, sendReset, sendIncrementalChanges]
  );

  useEffect(() => {
    setActions({
      resetRouting,
      updateRoutesForNodeId: (nodeId) => updateRoutingForNodeIds([nodeId]),
    });
    return () => setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
  }, [resetRouting, updateRoutingForNodeIds, setActions]);

  useEffect(() => {
    if (workerLoaded) sendReset();
  }, [
    workerLoaded,
    nodes.length,
    edges.length,
    opts.shapeBufferDistance,
    opts.idealNudgingDistance,
    opts.edgeRounding,
    opts.diagramGridSize,
    opts.shouldSplitEdgesNearHandle,
    opts.autoBestSideConnection,
    sendReset,
  ]);

  const resolveCollisionsInWorker = useCallback(
    (collisionOptions?: ResolveCollisionsOptions) => {
      if (!workerLoaded) return;
      post({ command: "resolveCollisions", nodes: nodesRef.current, options: collisionOptions });
    },
    [post, workerLoaded]
  );

  return {
    updateRoutingOnNodesChange,
    resetRouting,
    refreshRouting,
    updateRoutingForNodeIds,
    resolveCollisionsInWorker,
  };
}
