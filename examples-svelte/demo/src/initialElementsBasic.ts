
import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const basicNodes: Node[] = [
  {
    id: "start",
    data: { label: "Start" },
    position: { x: 0, y: 150 },
    style: "width: 150px; height: 50px; border: 2px solid #f472b6; border-radius: 12px;",
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 300, y: 0 },
    style: "width: 140px; height: 50px;",
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 300, y: 150 },
    style: "width: 140px; height: 50px;",
  },
  {
    id: "enrich",
    data: { label: "Enrich" },
    position: { x: 300, y: 300 },
    style: "width: 140px; height: 50px; border: 2px solid #f472b6; border-radius: 12px;",
  },
  {
    id: "blocker1",
    data: { label: "Blocker" },
    position: { x: 530, y: 60 },
    style: "width: 120px; height: 50px; opacity: 0.6;",
  },
  {
    id: "merge",
    data: { label: "Merge" },
    position: { x: 700, y: 75 },
    style: "width: 140px; height: 50px;",
  },
  {
    id: "decision",
    data: { label: "Decision" },
    position: { x: 700, y: 225 },
    style: "width: 140px; height: 50px;",
  },
  {
    id: "blocker2",
    data: { label: "Cache" },
    position: { x: 900, y: 150 },
    style: "width: 100px; height: 50px; opacity: 0.6;",
  },
  {
    id: "success",
    data: { label: "Success" },
    position: { x: 1100, y: 50 },
    style: "width: 140px; height: 50px; border: 2px solid #4ade80; border-radius: 12px;",
  },
  {
    id: "retry",
    data: { label: "Retry" },
    position: { x: 1100, y: 200 },
    style: "width: 140px; height: 50px; border: 2px solid #facc15; border-radius: 12px;",
  },
  {
    id: "error",
    data: { label: "Error" },
    position: { x: 1100, y: 350 },
    style: "width: 140px; height: 50px; border: 2px solid #f87171; border-radius: 12px;",
  },
  {
    id: "log",
    data: { label: "Log" },
    position: { x: 500, y: 400 },
    style: "width: 120px; height: 50px;",
  },
  {
    id: "notify",
    data: { label: "Notify" },
    position: { x: 750, y: 400 },
    style: "width: 120px; height: 50px;",
  },
];

// Highly distinct edge colors per source node
const basicEdgeColors: Record<string, string> = {
  "start":     "#e91e63", // magenta
  "validate":  "#2196f3", // blue
  "transform": "#ff9800", // orange
  "enrich":    "#9c27b0", // purple
  "merge":     "#009688", // teal
  "decision":  "#f44336", // red
  "retry":     "#4caf50", // green
  "log":       "#00bcd4", // cyan
  "notify":    "#795548", // brown
};

function be(id: string, source: string, target: string, extra?: Record<string, unknown>): Edge {
  const color = basicEdgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "avoidNodes",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color, ...extra },
  };
}

export const basicEdges: Edge[] = [
  be("e-start-validate", "start", "validate", { label: "check" }),
  be("e-start-transform", "start", "transform", { label: "process" }),
  be("e-start-enrich", "start", "enrich", { label: "extend" }),
  be("e-validate-merge", "validate", "merge"),
  be("e-transform-merge", "transform", "merge"),
  be("e-enrich-decision", "enrich", "decision"),
  be("e-transform-decision", "transform", "decision"),
  be("e-merge-success", "merge", "success", { label: "ok" }),
  be("e-decision-success", "decision", "success"),
  be("e-decision-retry", "decision", "retry", { label: "retry" }),
  be("e-decision-error", "decision", "error", { label: "fail" }),
  be("e-retry-transform", "retry", "transform", { label: "again", strokeDasharray: "5,5" }),
  be("e-enrich-log", "enrich", "log"),
  be("e-log-notify", "log", "notify"),
  be("e-notify-error", "notify", "error"),
];
