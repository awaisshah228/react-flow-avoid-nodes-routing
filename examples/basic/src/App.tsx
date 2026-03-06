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
import { AvoidNodesEdge } from "@xyflow/avoid-nodes-edge/edge";
import { useAvoidNodesRouterFromWorker } from "@xyflow/avoid-nodes-edge";
import { resolveCollisions } from "./utils/resolve-collisions";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const proOptions: ProOptions = { hideAttribution: true };

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);

  // Worker-based routing: edges route around nodes on a separate thread (WASM loads in worker only)
  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, edges, {
    edgeToNodeSpacing: 12,
    edgeToEdgeSpacing: 10,
    edgeRounding: 8,
  });

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  // Defer resetRouting so React flushes state and the worker reads fresh nodes/edges.
  const deferredReset = useCallback(() => {
    requestAnimationFrame(() => resetRouting());
  }, [resetRouting]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      // Re-route when edges are added/removed
      const needsReset = changes.some((c) => c.type === "add" || c.type === "remove");
      if (needsReset) deferredReset();
    },
    [deferredReset]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "avoidNodes" }, eds));
      // Trigger re-route so the new edge avoids nodes
      deferredReset();
    },
    [deferredReset]
  );

  // Resolve node-on-node collisions after drag ends
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      setNodes((nds) => {
        const resolved = resolveCollisions(nds, { margin: 20, maxIterations: 50 });
        return resolved;
      });
      // Re-route edges after collision resolution
      deferredReset();
    },
    [deferredReset]
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
