import { useCallback, useState } from "react";
import {
  ReactFlow,
  SelectionMode,
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

import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { resolveCollisions } from "../utils/resolve-collisions";
import { SettingsPanel, type Settings } from "../SettingsPanel";
import GroupNode from "../GroupNode";
import SelectedNodesToolbar from "../SelectedNodesToolbar";
import { basicNodes, basicEdges } from "../initialElementsBasic";
import { nodes as groupNodes, edges as groupEdges } from "../initialElements";
import { subflowNodes, subflowEdges } from "../initialElementsSubflows";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

export type ExampleTab = "basic" | "group" | "subflows" | "dag" | "tree" | "elk" | "auto-layout-groups" | "stress";

const initialNodesForTab: Record<string, Node[]> = {
  basic: basicNodes,
  group: groupNodes,
  subflows: subflowNodes,
};
const initialEdgesForTab: Record<string, Edge[]> = {
  basic: basicEdges,
  group: groupEdges,
  subflows: subflowEdges,
};

export default function Flow({ tab }: { tab: "basic" | "group" | "subflows" }) {
  const hasGroups = tab === "group" || tab === "subflows";
  const [nodes, setNodes] = useState<Node[]>(initialNodesForTab[tab]);
  const [edges, setEdges] = useState<Edge[]>(initialEdgesForTab[tab]);
  const [settings, setSettings] = useState<Settings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
  });

  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, edges, settings);

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
      const needsReset = changes.some((c) => c.type === "add" || c.type === "remove");
      if (needsReset) deferredReset();
    },
    [deferredReset]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "avoidNodes" }, eds));
      deferredReset();
    },
    [deferredReset]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      if (settings.resolveCollisions) {
        setNodes((nds) => {
          const updated = nds.map(n =>
            n.id === draggedNode.id ? { ...n, position: draggedNode.position } : n
          );
          return resolveCollisions(updated, { margin: 20, maxIterations: 50 });
        });
      }
      deferredReset();
    },
    [deferredReset, settings.resolveCollisions]
  );

  const onSettingChange = useCallback(
    (key: string, value: number | boolean) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "avoidNodes" }}
      fitView
      minZoom={0.01}
      maxZoom={100}
      proOptions={proOptions}
      selectNodesOnDrag={false}
      multiSelectionKeyCode="Shift"
      selectionMode={SelectionMode.Partial}
    >
      <Background />
      <Controls />
      <MiniMap />
      {hasGroups && <SelectedNodesToolbar />}
      <SettingsPanel settings={settings} onChange={onSettingChange} />
    </ReactFlow>
  );
}
