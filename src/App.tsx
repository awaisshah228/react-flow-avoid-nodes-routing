import { useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  ProOptions,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodes as defaultNodes, edges as defaultEdges } from "./initialElements";
import { AvoidNodesEdge } from "./edges/AvoidNodesEdge";
import { useAvoidNodesRouterFromWorker } from "./avoid";
import { useAvoidRouterWasm } from "./avoid";
import { resolveCollisions } from "./utils/resolve-collisions";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const proOptions: ProOptions = { hideAttribution: true };

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);

  // Load WASM (main thread — needed as fallback; worker loads its own copy)
  useAvoidRouterWasm();

  // Worker-based routing: edges route around nodes on a separate thread
  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, edges, {
    edgeToNodeSpacing: 16,
    edgeToEdgeSpacing: 10,
  });

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
      // Re-route when edges are added/removed
      const needsReset = changes.some((c) => c.type === "add" || c.type === "remove");
      if (needsReset) resetRouting();
    },
    [resetRouting]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "avoidNodes" }, eds));
      // Trigger re-route so the new edge avoids nodes
      resetRouting();
    },
    [resetRouting]
  );

  // Resolve node-on-node collisions after drag ends
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      setNodes((nds) => {
        const resolved = resolveCollisions(nds, { margin: 20, maxIterations: 50 });
        return resolved;
      });
      // Re-route edges after collision resolution
      resetRouting();
    },
    [resetRouting]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "avoidNodes" }}
      fitView
      proOptions={proOptions}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
