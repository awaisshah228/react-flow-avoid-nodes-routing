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
  top: 12,
  left: 12,
  right: 12,
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
  zIndex: 20,
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
      <div style={tabBarStyle}>
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
