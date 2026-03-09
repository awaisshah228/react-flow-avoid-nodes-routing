import { useCallback, useEffect, useRef, useState } from "react";
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
import { elkNodes, elkEdges } from "./initialElementsElk";
import { autoLayoutGroupNodes, autoLayoutGroupEdges } from "./initialElementsAutoLayoutGroups";
import { AvoidNodesEdge } from "avoid-nodes-edge/edge";
import { useAvoidNodesRouterFromWorker } from "avoid-nodes-edge";
import { resolveCollisions } from "./utils/resolve-collisions";
import { runAutoLayout, runAutoLayoutWithGroups, type LayoutDirection, type LayoutAlgorithmName } from "./utils/auto-layout";
import GroupNode from "./GroupNode";
import SelectedNodesToolbar from "./SelectedNodesToolbar";

const edgeTypes = { avoidNodes: AvoidNodesEdge };
const nodeTypes = { group: GroupNode };
const proOptions: ProOptions = { hideAttribution: true };

type ExampleTab = "basic" | "group" | "subflows" | "elk" | "auto-layout-groups";

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
  elk: elkNodes,
  "auto-layout-groups": autoLayoutGroupNodes,
};
const initialEdgesForTab: Record<ExampleTab, Edge[]> = {
  basic: basicEdges,
  group: groupEdges,
  subflows: subflowEdges,
  elk: elkEdges,
  "auto-layout-groups": autoLayoutGroupEdges,
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

type AutoLayoutSettings = Settings & {
  layoutDirection: LayoutDirection;
  layoutAlgorithm: LayoutAlgorithmName;
  layoutSpacing: number;
};

function AutoLayoutSettingsPanel({
  settings,
  onChange,
  onLayoutChange,
  onReLayout,
}: {
  settings: AutoLayoutSettings;
  onChange: (key: string, value: number | boolean) => void;
  onLayoutChange: (key: string, value: string | number) => void;
  onReLayout: () => void;
}) {
  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
  ] as const;

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Auto Layout + libavoid</div>

      <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 12, color: "#888" }}>Layout Engine</div>
      <div style={rowStyle}>
        <label>Algorithm</label>
        <select
          value={settings.layoutAlgorithm}
          onChange={(e) => onLayoutChange("layoutAlgorithm", e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="elk">ELK (Layered)</option>
          <option value="dagre">Dagre</option>
          <option value="d3-hierarchy">D3 Hierarchy</option>
        </select>
      </div>
      <div style={rowStyle}>
        <label>Direction</label>
        <select
          value={settings.layoutDirection}
          onChange={(e) => onLayoutChange("layoutDirection", e.target.value)}
          style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="LR">Left to Right</option>
          <option value="TB">Top to Bottom</option>
          <option value="RL">Right to Left</option>
          <option value="BT">Bottom to Top</option>
        </select>
      </div>
      <div style={rowStyle}>
        <label>Node Spacing</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="range"
            min={20}
            max={120}
            value={settings.layoutSpacing}
            onChange={(e) => onLayoutChange("layoutSpacing", Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ minWidth: 28, textAlign: "right" }}>{settings.layoutSpacing}</span>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onReLayout}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "1px solid #818cf8",
            background: "#818cf8",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            width: "100%",
          }}
        >
          Re-Layout
        </button>
      </div>

      <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 12, color: "#888" }}>libavoid Routing</div>
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
    </div>
  );
}

function AutoLayoutFlow() {
  const [nodes, setNodes] = useState<Node[]>(elkNodes);
  const [edges, setEdges] = useState<Edge[]>(elkEdges);
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
  const didLayout = useRef(false);

  const applyLayout = useCallback(
    async (currentNodes: Node[]) => {
      const laid = await runAutoLayout(currentNodes, edges, {
        direction: settings.layoutDirection,
        algorithm: settings.layoutAlgorithm,
        spacing: settings.layoutSpacing,
      });
      setNodes(laid);
      // Double rAF ensures React has flushed state and node measurements are up-to-date
      requestAnimationFrame(() => requestAnimationFrame(() => resetRouting()));
    },
    [edges, settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing, resetRouting]
  );

  // Run layout on mount and when layout settings change
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
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: "avoidNodes" }}
      fitView
      proOptions={proOptions}
      selectNodesOnDrag={false}
    >
      <Background />
      <Controls />
      <MiniMap />
      <AutoLayoutSettingsPanel
        settings={settings}
        onChange={onSettingChange}
        onLayoutChange={onLayoutChange}
        onReLayout={onReLayout}
      />
    </ReactFlow>
  );
}

function AutoLayoutGroupsFlow() {
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
  const didLayout = useRef(false);

  const applyLayout = useCallback(
    async (currentNodes: Node[]) => {
      const laid = await runAutoLayoutWithGroups(currentNodes, edges, {
        direction: settings.layoutDirection,
        algorithm: settings.layoutAlgorithm,
        spacing: settings.layoutSpacing,
      });
      setNodes(laid);
      // Double rAF ensures React has flushed state and node measurements are up-to-date
      requestAnimationFrame(() => requestAnimationFrame(() => resetRouting()));
    },
    [edges, settings.layoutDirection, settings.layoutAlgorithm, settings.layoutSpacing, resetRouting]
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

export default function App() {
  const [tab, setTab] = useState<ExampleTab>("basic");

  const renderFlow = () => {
    switch (tab) {
      case "elk": return <AutoLayoutFlow />;
      case "auto-layout-groups": return <AutoLayoutGroupsFlow />;
      default: return <Flow tab={tab} />;
    }
  };

  return (
    <ReactFlowProvider key={tab}>
      {renderFlow()}
      <div style={tabBarStyle}>
        <TabButton label="Basic" active={tab === "basic"} onClick={() => setTab("basic")} />
        <TabButton label="Groups" active={tab === "group"} onClick={() => setTab("group")} />
        <TabButton label="Subflows" active={tab === "subflows"} onClick={() => setTab("subflows")} />
        <TabButton label="Auto Layout" active={tab === "elk"} onClick={() => setTab("elk")} />
        <TabButton label="Auto Layout + Groups" active={tab === "auto-layout-groups"} onClick={() => setTab("auto-layout-groups")} />
      </div>
    </ReactFlowProvider>
  );
}
