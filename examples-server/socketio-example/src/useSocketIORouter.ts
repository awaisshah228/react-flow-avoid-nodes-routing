/**
 * React hook: routes edges via a Socket.IO server instead of local WASM.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Node, NodeChange } from "@xyflow/react";

export type AvoidRoute = { path: string; labelX: number; labelY: number };

export interface SocketIORouterOptions {
  url: string; // http://localhost:3003
  edgeToEdgeSpacing?: number;
  edgeToNodeSpacing?: number;
  edgeRounding?: number;
  diagramGridSize?: number;
  shouldSplitEdgesNearHandle?: boolean;
  autoBestSideConnection?: boolean;
}

export function useSocketIORouter(
  nodes: Node[],
  edges: { id: string; source: string; target: string; type?: string }[],
  options: SocketIORouterOptions
) {
  const [routes, setRoutes] = useState<Record<string, AvoidRoute>>({});
  const socketRef = useRef<Socket | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  optionsRef.current = options;

  const send = useCallback((msg: unknown) => {
    socketRef.current?.emit("route", msg);
  }, []);

  const sendReset = useCallback(() => {
    const opts = optionsRef.current;
    send({
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
  }, [send]);

  // Connect to Socket.IO server
  useEffect(() => {
    const socket = io(options.url);
    socketRef.current = socket;

    socket.on("connect", () => {
      sendReset();
    });

    socket.on("routed", (data: { command: string; routes?: Record<string, AvoidRoute> }) => {
      if (data.command === "routed" && data.routes) {
        setRoutes(data.routes);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.url, sendReset]);

  // Re-send reset when nodes/edges/options change
  useEffect(() => {
    if (socketRef.current?.connected) sendReset();
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
          send({ command: "updateNodes", nodes: changedNodes });
        }
      }, 16);
    },
    [send, sendReset]
  );

  const resetRouting = useCallback(() => sendReset(), [sendReset]);

  return { routes, updateRoutingOnNodesChange, resetRouting };
}
