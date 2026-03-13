import { useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAvoidNodesRouterFromWorker } from 'avoid-nodes-edge';
import { AvoidNodesEdge } from 'avoid-nodes-edge/edge';
import { resolveCollisions } from './utils/resolve-collisions';

const edgeTypes = { avoidNodes: AvoidNodesEdge };

/**
 * Collision Resolution Demo
 *
 * This example demonstrates how edges automatically route around
 * blocking nodes in various scenarios:
 *
 * 1. Single blocker between source and target
 * 2. Multiple blockers forming a wall
 * 3. Parallel edges that get nudged apart
 * 4. Edges routing around a dense cluster
 *
 * Try dragging nodes around to see real-time collision resolution!
 */

const initialNodes: Node[] = [
  // --- Scenario 1: Single blocker ---
  { id: 'a1', position: { x: 0, y: 0 }, data: { label: 'Source A' } },
  { id: 'a2', position: { x: 500, y: 0 }, data: { label: 'Target A' } },
  { id: 'blocker1', position: { x: 225, y: -10 }, data: { label: 'Blocker' } },

  // --- Scenario 2: Wall of blockers ---
  { id: 'b1', position: { x: 0, y: 150 }, data: { label: 'Source B' } },
  { id: 'b2', position: { x: 500, y: 150 }, data: { label: 'Target B' } },
  { id: 'wall1', position: { x: 225, y: 100 }, data: { label: 'Wall 1' } },
  { id: 'wall2', position: { x: 225, y: 160 }, data: { label: 'Wall 2' } },
  { id: 'wall3', position: { x: 225, y: 220 }, data: { label: 'Wall 3' } },

  // --- Scenario 3: Parallel edges (nudging) ---
  { id: 'c1', position: { x: 0, y: 380 }, data: { label: 'Source C' } },
  { id: 'c2', position: { x: 500, y: 350 }, data: { label: 'Target C1' } },
  { id: 'c3', position: { x: 500, y: 420 }, data: { label: 'Target C2' } },
  { id: 'blocker2', position: { x: 225, y: 370 }, data: { label: 'Blocker' } },

  // --- Scenario 4: Dense cluster ---
  { id: 'd1', position: { x: 0, y: 560 }, data: { label: 'Source D' } },
  { id: 'd2', position: { x: 500, y: 560 }, data: { label: 'Target D' } },
  { id: 'cluster1', position: { x: 175, y: 530 }, data: { label: 'Cluster' } },
  { id: 'cluster2', position: { x: 275, y: 530 }, data: { label: 'Cluster' } },
  { id: 'cluster3', position: { x: 175, y: 590 }, data: { label: 'Cluster' } },
  { id: 'cluster4', position: { x: 275, y: 590 }, data: { label: 'Cluster' } },
];

const initialEdges: Edge[] = [
  // Scenario 1: Edge must go around single blocker
  { id: 'e-a1-a2', source: 'a1', target: 'a2', type: 'avoidNodes' },

  // Scenario 2: Edge must navigate around wall of blockers
  { id: 'e-b1-b2', source: 'b1', target: 'b2', type: 'avoidNodes' },

  // Scenario 3: Two parallel edges get nudged apart
  { id: 'e-c1-c2', source: 'c1', target: 'c2', type: 'avoidNodes' },
  { id: 'e-c1-c3', source: 'c1', target: 'c3', type: 'avoidNodes' },

  // Scenario 4: Edge routes around dense cluster
  { id: 'e-d1-d2', source: 'd1', target: 'd2', type: 'avoidNodes' },
];

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const { updateRoutingOnNodesChange, resetRouting } =
    useAvoidNodesRouterFromWorker(nodes, edges, {
      edgeToNodeSpacing: 12,
      edgeToEdgeSpacing: 12,
      edgeRounding: 8,
    });

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      updateRoutingOnNodesChange(changes);
    },
    [updateRoutingOnNodesChange]
  );

  const deferredReset = useCallback(() => {
    requestAnimationFrame(() => resetRouting());
  }, [resetRouting]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      if (changes.some((c) => c.type === 'add' || c.type === 'remove')) {
        deferredReset();
      }
    },
    [deferredReset]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'avoidNodes' }, eds));
      deferredReset();
    },
    [deferredReset]
  );

  // Resolve node-on-node collisions after drag ends
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      setNodes((nds) => {
        const updated = nds.map(n =>
          n.id === draggedNode.id ? { ...n, position: draggedNode.position } : n
        );
        return resolveCollisions(updated, { margin: 20, maxIterations: 50 });
      });
      deferredReset();
    },
    [deferredReset]
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'avoidNodes' }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
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
