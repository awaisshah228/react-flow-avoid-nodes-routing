/**
 * React hook: routes edges via an SSE server instead of local WASM.
 *
 * - Connects to GET /sse to receive route updates
 * - Sends commands via POST /api/route
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, NodeChange } from "@xyflow/react";

export type AvoidRoute = { path: string; labelX: number; labelY: number };

export interface SSERouterOptions {
  /** Base URL of the SSE server, e.g. "http://localhost:3002" or "" for same origin */
  baseUrl?: string;
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
}

export function useSSERouter(
  nodes: Node[],
  edges: { id: string; source: string; target: string; type?: string }[],
  options: SSERouterOptions = {}
) {
  const [routes, setRoutes] = useState<Record<string, AvoidRoute>>({});
  const sessionIdRef = useRef<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  optionsRef.current = options;

  const baseUrl = options.baseUrl ?? "";

  const postCommand = useCallback(
    async (msg: Record<string, unknown>) => {
      if (!sessionIdRef.current) return;
      try {
        await fetch(`${baseUrl}/api/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, ...msg }),
        });
      } catch (err) {
        console.error("Failed to post routing command:", err);
      }
    },
    [baseUrl]
  );

  const sendReset = useCallback(() => {
    const opts = optionsRef.current;
    postCommand({
      command: "reset",
      nodes: nodesRef.current,
      edges: edgesRef.current,
      options: {
        idealNudgingDistance: opts.edgeToEdgeSpacing ?? 10,
        shapeBufferDistance: opts.edgeToNodeSpacing ?? 12,
        edgeRounding: opts.edgeRounding ?? 8,
        diagramGridSize: opts.diagramGridSize ?? 0,
        shouldSplitEdgesNearHandle: opts.shouldSplitEdgesNearHandle ?? true,
        autoBestSideConnection: opts.autoBestSideConnection ?? true,
      },
    });
  }, [postCommand]);

  // Connect to SSE
  useEffect(() => {
    const es = new EventSource(`${baseUrl}/sse`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.command === "connected") {
          sessionIdRef.current = data.sessionId;
          sendReset();
        } else if (data.command === "routed") {
          setRoutes(data.routes);
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      es.close();
      sessionIdRef.current = null;
    };
  }, [baseUrl, sendReset]);

  // Re-send reset when options change
  useEffect(() => {
    if (sessionIdRef.current) sendReset();
  }, [
    nodes.length,
    edges.length,
    options.edgeToEdgeSpacing,
    options.edgeToNodeSpacing,
    options.edgeRounding,
    options.diagramGridSize,
    options.shouldSplitEdgesNearHandle,
    options.autoBestSideConnection,
    sendReset,
  ]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIds = useRef<Set<string>>(new Set());

  const updateRoutingOnNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      let hasPosition = false;
      let hasAddOrRemove = false;

      for (const c of changes) {
        if (c.type === "position") {
          hasPosition = true;
          pendingIds.current.add(c.id);
        } else if (c.type === "add" || c.type === "remove") {
          hasAddOrRemove = true;
        }
      }

      if (!hasPosition && !hasAddOrRemove) return;

      if (hasAddOrRemove) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        pendingIds.current.clear();
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          sendReset();
        }, 16);
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        const ids = Array.from(pendingIds.current);
        pendingIds.current.clear();
        if (ids.length > 0) {
          const nodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));
          const changedNodes = ids.map((id) => nodeMap.get(id)).filter(Boolean);
          postCommand({ command: "updateNodes", nodes: changedNodes });
        }
      }, 16);
    },
    [postCommand, sendReset]
  );

  const resetRouting = useCallback(() => sendReset(), [sendReset]);

  return { routes, updateRoutingOnNodesChange, resetRouting };
}
