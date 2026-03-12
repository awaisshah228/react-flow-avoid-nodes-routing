import { useState, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useSocketIORouter } from "./useSocketIORouter";
import { ServerRoutedEdge, RoutesContext } from "./ServerRoutedEdge";

const edgeTypes = { avoidNodes: ServerRoutedEdge };

const initialNodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Node 1" }, width: 150, height: 40 },
  { id: "2", position: { x: 400, y: 0 }, data: { label: "Node 2" }, width: 150, height: 40 },
  { id: "3", position: { x: 200, y: 0 }, data: { label: "Blocker" }, width: 150, height: 40 },
  { id: "4", position: { x: 200, y: 200 }, data: { label: "Node 4" }, width: 150, height: 40 },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "avoidNodes" },
  { id: "e1-4", source: "1", target: "4", type: "avoidNodes" },
];

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { routes, updateRoutingOnNodesChange, resetRouting } = useSocketIORouter(
    nodes,
    edges,
    {
      url: "http://localhost:3003",
      edgeRounding: 8,
      edgeToEdgeSpacing: 10,
      edgeToNodeSpacing: 12,
      shouldSplitEdgesNearHandle: true,
      autoBestSideConnection: true,
    }
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      if (changes.some((c) => c.type === "add" || c.type === "remove")) {
        resetRouting();
      }
    },
    [resetRouting]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "avoidNodes" }, eds));
      requestAnimationFrame(() => resetRouting());
    },
    [resetRouting]
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "#fff",
          padding: "8px 14px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          fontSize: 13,
        }}
      >
        Socket.IO Example — edges routed on server
      </div>
      <RoutesContext.Provider value={routes}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "avoidNodes" }}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </RoutesContext.Provider>
    </div>
  );
}
