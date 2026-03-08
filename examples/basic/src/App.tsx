import { useCallback, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
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
import "@xyflow/react/dist/style.css";

import { basicNodes, basicEdges } from "./initialElementsBasic";
import { nodes as groupNodes, edges as groupEdges } from "./initialElements";
import { subflowNodes, subflowEdges } from "./initialElementsSubflows";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { resolveCollisions } from "./utils/resolve-collisions";
import GroupNode from "./GroupNode";
import SelectedNodesToolbar from "./SelectedNodesToolbar";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

type ExampleTab = "basic" | "group" | "subflows";

const tabBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  display: "flex",
  gap: 4,
  zIndex: 10,
};

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
  autoBestSideConnection: boolean;
  resolveCollisions: boolean;
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
          {[true, false].map((val) => (
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
      <div style={rowStyle}>
        <label>Resolve Collisions</label>
        <div style={{ display: "flex", gap: 4 }}>
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => onChange("resolveCollisions", val)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: settings.resolveCollisions === val ? "#333" : "#fff",
                color: settings.resolveCollisions === val ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              {val ? "True" : "False"}
            </button>
          ))}
        </div>
      </div>
      <div style={rowStyle}>
        <label>Auto Best Side</label>
        <div style={{ display: "flex", gap: 4 }}>
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => onChange("autoBestSideConnection", val)}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: settings.autoBestSideConnection === val ? "#333" : "#fff",
                color: settings.autoBestSideConnection === val ? "#fff" : "#333",
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

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 6,
        border: "1px solid #ccc",
        background: active ? "#333" : "#fff",
        color: active ? "#fff" : "#333",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

const initialNodesForTab: Record<ExampleTab, Node[]> = {
  basic: basicNodes,
  group: groupNodes,
  subflows: subflowNodes,
};
const initialEdgesForTab: Record<ExampleTab, Edge[]> = {
  basic: basicEdges,
  group: groupEdges,
  subflows: subflowEdges,
};

function Flow({ tab }: { tab: ExampleTab }) {
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

export default function App() {
  const [tab, setTab] = useState<ExampleTab>("basic");

  return (
    <ReactFlowProvider key={tab}>
      <Flow tab={tab} />
      <div style={tabBarStyle}>
        <TabButton label="Basic" active={tab === "basic"} onClick={() => setTab("basic")} />
        <TabButton label="Groups" active={tab === "group"} onClick={() => setTab("group")} />
        <TabButton label="Subflows" active={tab === "subflows"} onClick={() => setTab("subflows")} />
      </div>
    </ReactFlowProvider>
  );
}
