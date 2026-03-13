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
import { CurvedAvoidEdge } from "../CurvedAvoidEdge";
import { resolveCollisions } from "../utils/resolve-collisions";
import { AutoLayoutSettingsPanel, type AutoLayoutSettings } from "../SettingsPanel";
import GroupNode from "../GroupNode";
import SelectedNodesToolbar from "../SelectedNodesToolbar";
import { treeNodes, treeEdges } from "../initialElementsTree";
import { runAutoLayoutWithGroups } from "../utils/auto-layout";

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

export default function TreeFlow() {
  const [nodes, setNodes] = useState<Node[]>(treeNodes);
  const [edges, setEdges] = useState<Edge[]>(treeEdges);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("avoidNodes");
  const prevRoundingRef = useRef(8);
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
  // For curvedAvoid, the router needs edges typed as "avoidNodes" to compute routes
  const routerEdges = useMemo(
    () => edgeStyle === "curvedAvoid" ? applyEdgeType(edges, "avoidNodes") : styledEdges,
    [edges, edgeStyle, styledEdges]
  );
  const edgeTypes = useMemo(() => edgeTypeMap[edgeStyle] ?? {}, [edgeStyle]);

  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, routerEdges, settings);
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

  // Reset routing when edge style uses avoid-nodes routing
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
                  // Save current settings and switch to optimal curved avoid defaults
                  prevRoundingRef.current = settings.edgeRounding;
                  setSettings((s) => ({
                    ...s,
                    edgeRounding: 0,
                    edgeToEdgeSpacing: 16,
                    edgeToNodeSpacing: 20,
                    layoutAlgorithm: "elk" as const,
                    layoutDirection: "LR" as const,
                  }));
                } else if (value !== "curvedAvoid" && prev === "curvedAvoid") {
                  // Restore previous settings
                  setSettings((s) => ({
                    ...s,
                    edgeRounding: prevRoundingRef.current,
                    edgeToEdgeSpacing: 10,
                    edgeToNodeSpacing: 12,
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
      <AutoLayoutSettingsPanel
        settings={settings}
        onChange={onSettingChange}
        onLayoutChange={onLayoutChange}
        onReLayout={onReLayout}
      />
    </ReactFlow>
  );
}
