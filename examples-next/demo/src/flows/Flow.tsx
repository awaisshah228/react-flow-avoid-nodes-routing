import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  SelectionMode,
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
} from "@xyflow/react";

import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { CurvedAvoidEdge } from "../CurvedAvoidEdge";
import { resolveCollisions } from "../utils/resolve-collisions";
import { SettingsPanel, type Settings } from "../SettingsPanel";
import GroupNode from "../GroupNode";
import SelectedNodesToolbar from "../SelectedNodesToolbar";
import { basicNodes, basicEdges } from "../initialElementsBasic";
import { nodes as groupNodes, edges as groupEdges } from "../initialElements";
import { subflowNodes, subflowEdges } from "../initialElementsSubflows";

type EdgeStyle = "avoidNodes" | "curvedAvoid" | "default" | "smoothstep" | "straight";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypeMap: Record<EdgeStyle, any> = {
  avoidNodes: { avoidNodes: AvoidNodesEdge },
  curvedAvoid: { curvedAvoid: CurvedAvoidEdge },
  default: {},
  smoothstep: { smoothstep: SmoothStepEdge },
  straight: { straight: StraightEdge },
};

const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

const edgeStyleLabels: { value: EdgeStyle; label: string }[] = [
  { value: "avoidNodes", label: "Avoid Nodes" },
  { value: "curvedAvoid", label: "Curved Avoid" },
  { value: "default", label: "Bezier" },
  { value: "smoothstep", label: "Smooth Step" },
  { value: "straight", label: "Straight" },
];

function applyEdgeType(edges: Edge[], edgeStyle: EdgeStyle): Edge[] {
  const type = edgeStyle === "default" ? undefined : edgeStyle;
  return edges.map((e) => ({ ...e, type }));
}

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
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("avoidNodes");
  const prevRoundingRef = useRef(8);
  const [settings, setSettings] = useState<Settings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
    connectorType: "orthogonal",
  });

  const styledEdges = useMemo(() => applyEdgeType(edges, edgeStyle), [edges, edgeStyle]);
  const routerEdges = useMemo(
    () => edgeStyle === "curvedAvoid" ? applyEdgeType(edges, "avoidNodes") : styledEdges,
    [edges, edgeStyle, styledEdges]
  );
  const edgeTypes = useMemo(() => edgeTypeMap[edgeStyle] ?? {}, [edgeStyle]);

  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, routerEdges, settings);

  useEffect(() => {
    if (edgeStyle === "avoidNodes" || edgeStyle === "curvedAvoid") {
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
      if (edgeStyle === "avoidNodes" || edgeStyle === "curvedAvoid") deferredReset();
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
    (key: string, value: number | boolean | string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

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
      multiSelectionKeyCode="Shift"
      selectionMode={SelectionMode.Partial}
    >
      <Background />
      <Controls />
      <MiniMap />
      {hasGroups && <SelectedNodesToolbar />}
      {/* Edge style picker */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 12,
          right: 12,
          display: "flex",
          justifyContent: "center",
          gap: 4,
          zIndex: 10,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 8,
          padding: "6px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          overflowX: "auto",
        }}
      >
        {edgeStyleLabels.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setEdgeStyle((prev) => {
                if (value === "curvedAvoid" && prev !== "curvedAvoid") {
                  prevRoundingRef.current = settings.edgeRounding;
                  setSettings((s) => ({
                    ...s,
                    edgeRounding: 0,
                    edgeToEdgeSpacing: 16,
                    edgeToNodeSpacing: 20,
                    connectorType: "polyline",
                  }));
                } else if (value !== "curvedAvoid" && prev === "curvedAvoid") {
                  setSettings((s) => ({
                    ...s,
                    edgeRounding: prevRoundingRef.current,
                    edgeToEdgeSpacing: 10,
                    edgeToNodeSpacing: 12,
                    connectorType: "orthogonal",
                  }));
                }
                return value;
              });
            }}
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
      <SettingsPanel settings={settings} onChange={onSettingChange} />
    </ReactFlow>
  );
}
