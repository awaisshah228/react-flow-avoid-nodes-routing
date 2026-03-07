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
import { resolveCollisions } from "./utils/resolve-collisions";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const proOptions: ProOptions = { hideAttribution: true };

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  zIndex: 10,
  minWidth: 240,
  fontSize: 13,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

type Settings = {
  edgeRounding: number;
  edgeToEdgeSpacing: number;
  edgeToNodeSpacing: number;
  diagramGridSize: number;
  shouldSplitEdgesNearHandle: boolean;
};

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (key: string, value: number | boolean) => void;
}) {
  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
    { key: "diagramGridSize", label: "Diagram Grid Size", min: 0, max: 48 },
  ] as const;

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Settings</div>
      {sliders.map(({ key, label, min, max }) => (
        <div key={key} style={rowStyle}>
          <label>{label}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min={min}
              max={max}
              value={settings[key]}
              onChange={(e) => onChange(key, Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ minWidth: 28, textAlign: "right" }}>{settings[key]}</span>
          </div>
        </div>
      ))}
      <div style={rowStyle}>
        <label>Split Edges Near Handle</label>
        <div style={{ display: "flex", gap: 4 }}>
          {[false, true].map((val) => (
            <button
              key={String(val)}
              onClick={() => onChange("shouldSplitEdgesNearHandle", val)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: settings.shouldSplitEdgesNearHandle === val ? "#333" : "#fff",
                color: settings.shouldSplitEdgesNearHandle === val ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {val ? "True" : "False"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Flow() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes);
  const [edges, setEdges] = useState<Edge[]>(defaultEdges);
  const [settings, setSettings] = useState<Settings>({
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: false,
  });

  // Worker-based routing: edges route around nodes on a separate thread (WASM loads in worker only)
  const { updateRoutingOnNodesChange, resetRouting } = useAvoidNodesRouterFromWorker(nodes, edges, settings);

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
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "avoidNodes" }}
      fitView
      proOptions={proOptions}
    >
      <Background />
      <Controls />
      <MiniMap />
      <SettingsPanel settings={settings} onChange={onSettingChange} />
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
