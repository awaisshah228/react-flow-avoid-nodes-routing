import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  Controls,
  MiniMap,
  SmoothStepEdge,
  StraightEdge,
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
import { treeNodes, treeEdges } from "../initialElementsTree";
import { runAutoLayoutWithGroups } from "../utils/auto-layout";

type EdgeStyle = "avoidNodes" | "default" | "smoothstep" | "straight";

const edgeTypeMap = {
  avoidNodes: { avoidNodes: AvoidNodesEdge },
  default: {},
  smoothstep: { smoothstep: SmoothStepEdge },
  straight: { straight: StraightEdge },
} as const;

const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

const edgeStyleLabels: { value: EdgeStyle; label: string }[] = [
  { value: "avoidNodes", label: "Avoid Nodes (libavoid)" },
  { value: "default", label: "Bezier" },
  { value: "smoothstep", label: "Smooth Step" },
  { value: "straight", label: "Straight" },
];

function applyEdgeType(edges: Edge[], edgeStyle: EdgeStyle): Edge[] {
  const type = edgeStyle === "default" ? undefined : edgeStyle;
  return edges.map((e) => ({ ...e, type }));
}

export default function TreeFlow() {
  const [nodes, setNodes] = useState<Node[]>(treeNodes);
  const [edges, setEdges] = useState<Edge[]>(treeEdges);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("avoidNodes");
  const [settings, setSettings] = useState<AutoLayoutSettings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
    layoutDirection: "TB",
    layoutAlgorithm: "dagre",
    layoutSpacing: 50,
  });

  const styledEdges = useMemo(() => applyEdgeType(edges, edgeStyle), [edges, edgeStyle]);
  const edgeTypes = useMemo(() => edgeTypeMap[edgeStyle] ?? {}, [edgeStyle]);

  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, styledEdges, settings);
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
      requestAnimationFrame(() => requestAnimationFrame(() => {
        resetRouting();
        fitView({ duration: 300, padding: 0.1 });
      }));
    },
    [edges, settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing, resetRouting, fitView]
  );

  useEffect(() => {
    if (!didLayout.current) {
      const timer = setTimeout(() => {
        didLayout.current = true;
        applyLayout(nodes);
      }, 100);
      return () => clearTimeout(timer);
    }
    applyLayout(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing]);

  // Reset routing when edge style changes back to avoidNodes
  useEffect(() => {
    if (edgeStyle === "avoidNodes") {
      requestAnimationFrame(() => resetRouting());
    }
  }, [edgeStyle, resetRouting]);

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
      setEdges((eds) => addEdge({ ...params, type: edgeStyle === "default" ? undefined : edgeStyle }, eds));
      if (edgeStyle === "avoidNodes") deferredReset();
    },
    [deferredReset, edgeStyle]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      if (settings.resolveCollisions) {
        setNodes((nds) => resolveCollisions(nds, { margin: 20, maxIterations: 50 }));
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
      edges={styledEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: edgeStyle === "default" ? undefined : edgeStyle }}
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
      {/* Edge style picker */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          zIndex: 10,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 8,
          padding: "6px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {edgeStyleLabels.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setEdgeStyle(value)}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              border: "1px solid #ccc",
              background: edgeStyle === value ? "#333" : "#fff",
              color: edgeStyle === value ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: edgeStyle === value ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <AutoLayoutSettingsPanel
        settings={settings}
        onChange={onSettingChange}
        onLayoutChange={onLayoutChange}
        onReLayout={onReLayout}
      />
    </ReactFlow>
  );
}
