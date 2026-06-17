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

const TOP_BAR_HEIGHT = 46;

const topBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: TOP_BAR_HEIGHT,
  display: "flex",
  alignItems: "center",
  gap: 10,
  zIndex: 21,
  padding: "0 14px",
  background: "linear-gradient(90deg, #0d1117 0%, #161b22 100%)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 1px 8px rgba(0,0,0,0.25)",
  overflowX: "auto",
  whiteSpace: "nowrap",
};

const tabBarStyle: React.CSSProperties = {
  position: "absolute",
  top: TOP_BAR_HEIGHT,
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

const GITHUB_URL = "https://github.com/awaisshah228";
const LINKEDIN_URL = "https://www.linkedin.com/in/awaisshah228";
// Both source repositories for this project.
const REPO_AVOID_NODES_URL = "https://github.com/awaisshah228/react-flow-avoid-nodes-routing";
const REPO_AVOID_EDGE_URL = "https://github.com/awaisshah228/avoid-edge-routing";

const headerLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  borderRadius: 7,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#e6edf3",
  textDecoration: "none",
  fontSize: 12.5,
  fontWeight: 600,
  flexShrink: 0,
};

function GitHubMark({ color = "currentColor" }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill={color} aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.96.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" />
    </svg>
  );
}

/** Prominent top bar — rendered above the example tab bar. */
function TopBar() {
  return (
    <div style={topBarStyle}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", letterSpacing: 0.2 }}>Avoid Nodes Edge</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7ee787", border: "1px solid rgba(126,231,135,0.4)", background: "rgba(126,231,135,0.12)", borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Open Source</span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: "auto", flexShrink: 0 }}>
        <a href={REPO_AVOID_NODES_URL} target="_blank" rel="noopener noreferrer" style={headerLinkStyle} title="react-flow-avoid-nodes-routing — WASM (libavoid-js) on GitHub">
          <GitHubMark /> avoid-nodes-edge
        </a>
        <a href={REPO_AVOID_EDGE_URL} target="_blank" rel="noopener noreferrer" style={headerLinkStyle} title="avoid-edge-routing — pure TypeScript on GitHub">
          <GitHubMark /> avoid-edge-routing
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={headerLinkStyle} title="GitHub profile">
          <GitHubMark /> @awaisshah228
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" style={{ ...headerLinkStyle, background: "#0a66c2", color: "#fff", borderColor: "#0a66c2" }} title="LinkedIn">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
          </svg>
          LinkedIn
        </a>
      </div>
    </div>
  );
}

const validTabs: ExampleTab[] = ["basic", "group", "subflows", "dag", "tree", "elk", "auto-layout-groups", "stress"];

function getInitialTab(): ExampleTab {
  const params = new URLSearchParams(window.location.search);
  const example = params.get("example") as ExampleTab | null;
  return example && validTabs.includes(example) ? example : "basic";
}

export default function App() {
  const [tab, setTabState] = useState<ExampleTab>(getInitialTab);

  const setTab = (newTab: ExampleTab) => {
    setTabState(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("example", newTab);
    window.history.replaceState({}, "", url.toString());
  };

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
      <TopBar />
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
