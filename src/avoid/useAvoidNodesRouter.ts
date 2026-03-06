import { useCallback, useEffect, useRef } from "react";
import type { Node, NodeChange, Edge } from "@xyflow/react";
import { routeAll } from "./router";
import { useAvoidRoutesStore, useAvoidRouterActionsStore } from "./store";
import { DEBOUNCE_ROUTING_MS } from "./constants";
import type { AvoidRouterOptions } from "./router";

export interface UseAvoidNodesRouterOptions {
  shouldSplitEdgesNearHandle?: boolean;
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  /** When true, routing is not run (e.g. when worker is active instead). */
  disabled?: boolean;
}

const DEFAULT_OPTIONS: UseAvoidNodesRouterOptions = {
  edgeToEdgeSpacing: 10,
  edgeToNodeSpacing: 8,
};

export interface UseAvoidNodesRouterResult {
  updateRoutingOnNodesChange: (changes: NodeChange<Node>[]) => void;
  resetRouting: () => void;
  refreshRouting: () => void;
  updateRoutingForNodeIds: (nodeIds: string[]) => void;
}

/**
 * Main-thread avoid-nodes router.
 * Exposes updateRoutingOnNodesChange (for onNodesChange), resetRouting, refreshRouting, updateRoutingForNodeIds.
 */
export function useAvoidNodesRouter(
  nodes: Node[],
  edges: Edge[],
  options?: UseAvoidNodesRouterOptions
): UseAvoidNodesRouterResult {
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const setRoutes = useAvoidRoutesStore((s) => s.setRoutes);
  const setActions = useAvoidRouterActionsStore((s) => s.setActions);

  const opts: AvoidRouterOptions = {
    shouldSplitEdgesNearHandle: options?.shouldSplitEdgesNearHandle ?? DEFAULT_OPTIONS.shouldSplitEdgesNearHandle,
    idealNudgingDistance: options?.edgeToEdgeSpacing ?? DEFAULT_OPTIONS.edgeToEdgeSpacing,
    shapeBufferDistance: options?.edgeToNodeSpacing ?? DEFAULT_OPTIONS.edgeToNodeSpacing,
    edgeRounding: options?.edgeRounding,
    diagramGridSize: options?.diagramGridSize,
  };
  const disabled = options?.disabled ?? false;

  const runRoute = useCallback(() => {
    if (disabled) return;
    const loaded = useAvoidRoutesStore.getState().loaded;
    if (!loaded) return;
    const avoidEdges = edgesRef.current.filter((e) => e.type === "avoidNodes");
    if (avoidEdges.length === 0) {
      setRoutes({});
      return;
    }
    const routes = routeAll(nodesRef.current, avoidEdges, opts);
    setRoutes(routes);
  }, [
    disabled,
    opts.shapeBufferDistance,
    opts.idealNudgingDistance,
    opts.shouldSplitEdgesNearHandle,
    opts.edgeRounding,
    opts.diagramGridSize,
    setRoutes,
  ]);

  const refreshRouting = useCallback(() => { runRoute(); }, [runRoute]);
  const resetRouting = useCallback(() => { runRoute(); }, [runRoute]);
  const updateRoutingForNodeIds = useCallback((_nodeIds: string[]) => { runRoute(); }, [runRoute]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateRoutingOnNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const needsRefresh = changes.some((c) => {
        if (c.type === "position" && c.dragging === false) return true;
        if (c.type === "dimensions") return true;
        if (c.type === "add" || c.type === "remove") return true;
        return false;
      });
      if (!needsRefresh) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        runRoute();
      }, DEBOUNCE_ROUTING_MS);
    },
    [runRoute]
  );

  useEffect(() => {
    if (disabled) {
      setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
      return () => setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
    }
    setActions({ resetRouting, updateRoutesForNodeId: (nodeId) => updateRoutingForNodeIds([nodeId]) });
    return () => setActions({ resetRouting: () => {}, updateRoutesForNodeId: () => {} });
  }, [disabled, resetRouting, updateRoutingForNodeIds, setActions]);

  useEffect(() => {
    if (!disabled) runRoute();
  }, [disabled, nodes.length, edges.length, runRoute]);

  return {
    updateRoutingOnNodesChange,
    resetRouting,
    refreshRouting,
    updateRoutingForNodeIds,
  };
}
