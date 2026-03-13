import { MarkerType, type Node, type Edge } from "@xyflow/svelte";

export const autoLayoutGroupNodes: Node[] = [
  // ── Group A: Ingestion ──
  {
    id: "group-ingestion",
    data: { label: "Ingestion" },
    type: "group",
    position: { x: 0, y: 0 },
    style: "width: 340px; height: 300px; background-color: rgba(99, 102, 241, 0.05); border: 1px dashed #6366f1; border-radius: 8px;",
  },
  {
    id: "api-input",
    data: { label: "API Input" },
    position: { x: 110, y: 50 },
    parentId: "group-ingestion",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },
  {
    id: "file-input",
    data: { label: "File Input" },
    position: { x: 110, y: 140 },
    parentId: "group-ingestion",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },
  {
    id: "stream-input",
    data: { label: "Stream Input" },
    position: { x: 110, y: 230 },
    parentId: "group-ingestion",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },

  // ── Group B: Processing ──
  {
    id: "group-processing",
    data: { label: "Processing" },
    type: "group",
    position: { x: 450, y: 30 },
    style: "width: 340px; height: 250px; background-color: rgba(245, 158, 11, 0.05); border: 1px dashed #f59e0b; border-radius: 8px;",
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 110, y: 50 },
    parentId: "group-processing",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 110, y: 150 },
    parentId: "group-processing",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },

  // ── Group C: Storage ──
  {
    id: "group-storage",
    data: { label: "Storage" },
    type: "group",
    position: { x: 900, y: 0 },
    style: "width: 340px; height: 300px; background-color: rgba(34, 197, 94, 0.05); border: 1px dashed #22c55e; border-radius: 8px;",
  },
  {
    id: "cache",
    data: { label: "Cache" },
    position: { x: 110, y: 50 },
    parentId: "group-storage",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },
  {
    id: "database",
    data: { label: "Database" },
    position: { x: 110, y: 140 },
    parentId: "group-storage",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },
  {
    id: "archive",
    data: { label: "Archive" },
    position: { x: 110, y: 230 },
    parentId: "group-storage",
    extent: "parent",
    style: "width: 120px; height: 50px;",
  },

  // ── Standalone nodes ──
  {
    id: "router",
    data: { label: "Router" },
    position: { x: 450, y: 340 },
    style: "width: 120px; height: 50px;",
  },
  {
    id: "logger",
    data: { label: "Logger" },
    position: { x: 680, y: 340 },
    style: "width: 120px; height: 50px;",
  },
  {
    id: "monitor",
    data: { label: "Monitor" },
    position: { x: 1300, y: 120 },
    style: "width: 120px; height: 50px;",
  },
];

// Highly distinct edge colors per source node
const edgeColors: Record<string, string> = {
  "api-input":    "#e91e63", // magenta
  "file-input":   "#2196f3", // blue
  "stream-input": "#ff9800", // orange
  "validate":     "#009688", // teal
  "transform":    "#9c27b0", // purple
  "router":       "#f44336", // red
  "logger":       "#4caf50", // green
  "database":     "#00bcd4", // cyan
  "cache":        "#795548", // brown
};

function e(id: string, source: string, target: string): Edge {
  const color = edgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "avoidNodes",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color },
  };
}

export const autoLayoutGroupEdges: Edge[] = [
  // Ingestion → Processing (cross-group)
  e("e-api-validate", "api-input", "validate"),
  e("e-file-validate", "file-input", "validate"),
  e("e-stream-transform", "stream-input", "transform"),
  e("e-api-transform", "api-input", "transform"),

  // Processing → Storage (cross-group)
  e("e-validate-cache", "validate", "cache"),
  e("e-validate-database", "validate", "database"),
  e("e-transform-database", "transform", "database"),
  e("e-transform-archive", "transform", "archive"),

  // Router connections
  e("e-file-router", "file-input", "router"),
  e("e-router-transform", "router", "transform"),
  e("e-router-logger", "router", "logger"),

  // Logger → Storage
  e("e-logger-archive", "logger", "archive"),

  // Storage → Monitor
  e("e-database-monitor", "database", "monitor"),
  e("e-cache-monitor", "cache", "monitor"),
];
