import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Analytics } from "@vercel/analytics/react";
import "@xyflow/react/dist/style.css";

import Flow, { type ExampleTab } from "./flows/Flow";
import AutoLayoutFlow from "./flows/AutoLayoutFlow";
import AutoLayoutGroupsFlow from "./flows/AutoLayoutGroupsFlow";
import StressTestFlow from "./flows/StressTestFlow";
import DAGFlow from "./flows/DAGFlow";
import TreeFlow from "./flows/TreeFlow";

const tabBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  gap: 4,
  zIndex: 20,
  padding: "8px 12px",
  overflowX: "auto",
  background: "rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid #e5e5e5",
  whiteSpace: "nowrap",
};

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
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState<ExampleTab>("basic");

  const renderFlow = () => {
    switch (tab) {
      case "dag": return <DAGFlow />;
      case "tree": return <TreeFlow />;
      case "elk": return <AutoLayoutFlow />;
      case "auto-layout-groups": return <AutoLayoutGroupsFlow />;
      case "stress": return <StressTestFlow />;
      default: return <Flow tab={tab} />;
    }
  };

  return (
    <>
    <ReactFlowProvider key={tab}>
      {renderFlow()}
      <div className="tab-bar" style={tabBarStyle}>
        <TabButton label="Basic" active={tab === "basic"} onClick={() => setTab("basic")} />
        <TabButton label="Groups" active={tab === "group"} onClick={() => setTab("group")} />
        <TabButton label="Subflows" active={tab === "subflows"} onClick={() => setTab("subflows")} />
        <TabButton label="Complex DAG" active={tab === "dag"} onClick={() => setTab("dag")} />
        <TabButton label="Tree (Circles)" active={tab === "tree"} onClick={() => setTab("tree")} />
        <TabButton label="Auto Layout" active={tab === "elk"} onClick={() => setTab("elk")} />
        <TabButton label="Auto Layout + Groups" active={tab === "auto-layout-groups"} onClick={() => setTab("auto-layout-groups")} />
        <TabButton label="Stress Test (200)" active={tab === "stress"} onClick={() => setTab("stress")} />
      </div>
    </ReactFlowProvider>
    <Analytics />
    </>
  );
}
