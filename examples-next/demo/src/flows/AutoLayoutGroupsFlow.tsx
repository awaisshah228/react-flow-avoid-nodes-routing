import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
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
  useReactFlow,
} from "@xyflow/react";

import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { resolveCollisions } from "../utils/resolve-collisions";
import { AutoLayoutSettingsPanel, type AutoLayoutSettings } from "../SettingsPanel";
import GroupNode from "../GroupNode";
import SelectedNodesToolbar from "../SelectedNodesToolbar";
import { autoLayoutGroupNodes, autoLayoutGroupEdges } from "../initialElementsAutoLayoutGroups";
import { runAutoLayoutWithGroups } from "../utils/auto-layout";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

export default function AutoLayoutGroupsFlow() {
  const [nodes, setNodes] = useState<Node[]>(autoLayoutGroupNodes);
  const [edges, setEdges] = useState<Edge[]>(autoLayoutGroupEdges);
  const [settings, setSettings] = useState<AutoLayoutSettings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
    layoutDirection: "LR",
    layoutAlgorithm: "elk",
    layoutSpacing: 60,
  });

  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, edges, settings);
  const { fitView } = useReactFlow();
  const didLayout = useRef(false);

  const applyLayout = useCallback(
    async (currentNodes: Node[]) => {
      const laid = await runAutoLayoutWithGroups(currentNodes, edges, {
        direction: settings.layoutDirection,
        algorithm: settings.layoutAlgorithm,
        spacing: settings.layoutSpacing,
      });
      setNodes(laid);
      // Wait for React Flow to measure repositioned nodes before routing
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTimeout(() => {
          resetRouting();
          fitView({ duration: 300 });
        }, 50);
      }));
    },
    [edges, settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing, resetRouting, fitView]
  );

  useEffect(() => {
    if (!didLayout.current) {
      didLayout.current = true;
      applyLayout(nodes);
      return;
    }
    applyLayout(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing]);

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
    (_event: React.MouseEvent, _draggedNode: Node, draggedNodes: Node[]) => {
      if (settings.resolveCollisions) {
        setNodes((nds) => {
          const posMap = new Map(draggedNodes.map(n => [n.id, n.position]));
          const updated = nds.map(n => {
            const pos = posMap.get(n.id);
            return pos ? { ...n, position: pos } : n;
          });
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

  const onLayoutChange = useCallback(
    (key: string, value: string | number) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const onReLayout = useCallback(() => {
    applyLayout(nodes);
  }, [applyLayout, nodes]);

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
    >
      <Background />
      <Controls />
      <MiniMap />
      <SelectedNodesToolbar />
      <AutoLayoutSettingsPanel
        settings={settings}
        onChange={onSettingChange}
        onLayoutChange={onLayoutChange}
        onReLayout={onReLayout}
      />
    </ReactFlow>
  );
}
