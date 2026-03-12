import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
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
  ProOptions,
} from "@xyflow/react";

import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { CurvedAvoidEdge } from "../CurvedAvoidEdge";
import { resolveCollisions } from "../utils/resolve-collisions";
import { stressNodes, stressEdges } from "../initialElementsStress";

type EdgeStyle = "avoidNodes" | "curvedAvoid" | "default" | "smoothstep" | "straight";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypeMap: Record<EdgeStyle, any> = {
  avoidNodes: { avoidNodes: AvoidNodesEdge },
  curvedAvoid: { curvedAvoid: CurvedAvoidEdge },
  default: {},
  smoothstep: { smoothstep: SmoothStepEdge },
  straight: { straight: StraightEdge },
};

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

const statsStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  background: "rgba(0,0,0,0.7)",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 13,
  zIndex: 20,
  pointerEvents: "none",
};

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 768;

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: isMobile() ? 90 : 12,
  right: 12,
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  zIndex: 10,
  minWidth: 240,
  maxWidth: "min(320px, calc(100vw - 24px))",
  fontSize: 13,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

type ConnectorType = "orthogonal" | "bezier" | "polyline" | "step" | "linear" | "catmull-rom" | "bezier-catmull-rom";

type StressSettings = {
  edgeRounding: number;
  edgeToEdgeSpacing: number;
  edgeToNodeSpacing: number;
  shouldSplitEdgesNearHandle: boolean;
  autoBestSideConnection: boolean;
  resolveCollisionsEnabled: boolean;
  debounceMs: number;
  connectorType: ConnectorType;
};

export default function StressTestFlow() {
  const [nodes, setNodes] = useState<Node[]>(stressNodes);
  const [edges, setEdges] = useState<Edge[]>(stressEdges);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("avoidNodes");
  const prevRoundingRef = useRef(8);
  const [open, setOpen] = useState(() => !isMobile());
  const [settings, setSettings] = useState<StressSettings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisionsEnabled: true,
    debounceMs: 0,
    connectorType: "orthogonal",
  });

  const styledEdges = useMemo(() => applyEdgeType(edges, edgeStyle), [edges, edgeStyle]);
  const routerEdges = useMemo(
    () => edgeStyle === "curvedAvoid" ? applyEdgeType(edges, "avoidNodes") : styledEdges,
    [edges, edgeStyle, styledEdges]
  );
  const edgeTypes = useMemo(() => edgeTypeMap[edgeStyle] ?? {}, [edgeStyle]);

  const { updateRoutingOnNodesChange, resetRouting } =
    useAvoidNodesRouterFromWorker(nodes, routerEdges, settings);

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

  const onNodeDragStop = useCallback(() => {
    if (settings.resolveCollisionsEnabled) {
      setNodes((nds) => resolveCollisions(nds, { margin: 20, maxIterations: 50 }));
    }
    deferredReset();
  }, [deferredReset, settings.resolveCollisionsEnabled]);

  const onSettingChange = useCallback(
    (key: string, value: number | boolean | string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
    { key: "debounceMs", label: "Debounce (ms)", min: 0, max: 200 },
  ] as const;

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
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
      </ReactFlow>
      <div style={panelStyle}>
        <div
          style={{ fontWeight: 600, marginBottom: open ? 12 : 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
          onClick={() => setOpen(!open)}
        >
          <span>{open ? "Stress Test Settings" : "\u2699\uFE0F Settings"}</span>
          <span style={{ fontSize: 11, color: "#888" }}>{open ? "\u2715" : ""}</span>
        </div>
        {open && (
          <>
            <div style={rowStyle}>
              <label>Connector Type</label>
              <select
                value={settings.connectorType}
                onChange={(e) => onSettingChange("connectorType", e.target.value)}
                style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
              >
                <option value="orthogonal">Orthogonal</option>
                <option value="bezier">Bezier</option>
                <option value="polyline">Polyline</option>
                <option value="step">Step</option>
                <option value="linear">Linear</option>
                <option value="catmull-rom">Catmull-Rom</option>
                <option value="bezier-catmull-rom">Bezier Catmull-Rom</option>
              </select>
            </div>
            {sliders.map(({ key, label, min, max }) => (
              <div key={key} style={rowStyle}>
                <label>{label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={settings[key]}
                    onChange={(e) => onSettingChange(key, Number(e.target.value))}
                    style={{ width: 100 }}
                  />
                  <span style={{ minWidth: 28, textAlign: "right" }}>{settings[key]}</span>
                </div>
              </div>
            ))}
            {([
              { key: "shouldSplitEdgesNearHandle", label: "Split Near Handle" },
              { key: "autoBestSideConnection", label: "Auto Best Side" },
              { key: "resolveCollisionsEnabled", label: "Resolve Collisions" },
            ] as const).map(({ key, label }) => (
              <div key={key} style={rowStyle}>
                <label>{label}</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => onSettingChange(key, val)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        background: settings[key] === val ? "#333" : "#fff",
                        color: settings[key] === val ? "#fff" : "#333",
                        cursor: "pointer",
                      }}
                    >
                      {val ? "True" : "False"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div style={statsStyle}>
        Nodes: {nodes.length} &nbsp;|&nbsp; Edges: {edges.length}
      </div>
    </>
  );
}
