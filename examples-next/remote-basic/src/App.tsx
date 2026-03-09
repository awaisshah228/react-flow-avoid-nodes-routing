import { useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAvoidNodesRouterFromWorker } from 'avoid-nodes-edge';
import { AvoidNodesEdge } from 'avoid-nodes-edge/edge';

const edgeTypes = { avoidNodes: AvoidNodesEdge };

const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 400, y: 0 }, data: { label: 'Node 2' } },
  { id: '3', position: { x: 200, y: 0 }, data: { label: 'Blocker' } },
  { id: '4', position: { x: 200, y: 200 }, data: { label: 'Node 4' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'avoidNodes' },
  { id: 'e1-4', source: '1', target: '4', type: 'avoidNodes' },
];

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { updateRoutingOnNodesChange, resetRouting } =
    useAvoidNodesRouterFromWorker(nodes, edges, {
      edgeRounding: 8,
      edgeToEdgeSpacing: 10,
      edgeToNodeSpacing: 12,
      diagramGridSize: 0,
      shouldSplitEdgesNearHandle: true,
      autoBestSideConnection: true,
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
      if (changes.some((c) => c.type === 'add' || c.type === 'remove')) {
        requestAnimationFrame(() => resetRouting());
      }
    },
    [resetRouting]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'avoidNodes' }, eds));
      requestAnimationFrame(() => resetRouting());
    },
    [resetRouting]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'avoidNodes' }}
        fitView
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
