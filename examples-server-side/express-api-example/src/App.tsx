import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ServerRoutedEdge, RoutesContext } from "./ServerRoutedEdge";
import { GroupNode } from "./GroupNode";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes = { avoidNodes: ServerRoutedEdge } as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = { group: GroupNode } as any;

type AvoidRoute = { path: string; labelX: number; labelY: number };

type TabName = "basic" | "group" | "subflows" | "dag" | "tree" | "elk" | "auto-layout-groups" | "stress";

const tabs: { key: TabName; label: string }[] = [
  { key: "basic", label: "Basic" },
  { key: "group", label: "Groups" },
  { key: "subflows", label: "Subflows" },
  { key: "dag", label: "Complex DAG" },
  { key: "tree", label: "Tree (Circles)" },
  { key: "elk", label: "Auto Layout" },
  { key: "auto-layout-groups", label: "Auto Layout + Groups" },
  { key: "stress", label: "Stress Test (200)" },
];

const API_BASE = "http://localhost:3004";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("tab") as TabName) || "basic";
  });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [routes, setRoutes] = useState<Record<string, AvoidRoute>>({});
  const [loading, setLoading] = useState(true);

  const fetchDiagram = useCallback((tab: TabName) => {
    setLoading(true);
    fetch(`${API_BASE}/api/diagram?tab=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes);
        setEdges(data.edges);
        setRoutes(data.routes);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch diagram:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDiagram(activeTab);
  }, [activeTab, fetchDiagram]);

  const handleTabClick = (tab: TabName) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabClick(key)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: activeTab === key ? "1px solid #818cf8" : "1px solid #e2e8f0",
              background: activeTab === key ? "#818cf8" : "#fff",
              color: activeTab === key ? "#fff" : "#334155",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === key ? 600 : 400,
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
        <div
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          Server-Side: ELK layout + edge routing
        </div>
      </div>

      {/* Flow area */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              background: "rgba(255,255,255,0.8)",
              fontSize: 14,
              color: "#64748b",
            }}
          >
            Loading diagram from server...
          </div>
        )}
        <RoutesContext.Provider value={routes}>
          <ReactFlow
            key={activeTab}
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </RoutesContext.Provider>
      </div>
    </div>
  );
}
