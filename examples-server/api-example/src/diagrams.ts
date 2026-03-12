/**
 * All diagram data sets — stored server-side.
 * The server computes layout + routing, the client just renders.
 */

// Simple types matching what React Flow expects on the client
type NodeData = {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  style?: Record<string, unknown>;
  type?: string;
  parentId?: string;
  expandParent?: boolean;
  width?: number;
  height?: number;
};

type EdgeData = {
  id: string;
  source: string;
  target: string;
  type: string;
  markerEnd?: { type: string; width: number; height: number; color: string };
  data?: Record<string, unknown>;
};

function makeEdge(
  id: string,
  source: string,
  target: string,
  color: string,
  extra?: Record<string, unknown>
): EdgeData {
  return {
    id,
    source,
    target,
    type: "avoidNodes",
    markerEnd: { type: "arrowclosed", width: 12, height: 12, color },
    data: { strokeColor: color, ...extra },
  };
}

// ════════════════════════════════════════════════════════════════
// BASIC
// ════════════════════════════════════════════════════════════════

const basicColors: Record<string, string> = {
  start: "#e91e63", validate: "#2196f3", transform: "#ff9800",
  enrich: "#9c27b0", merge: "#009688", decision: "#f44336",
  retry: "#4caf50", log: "#00bcd4", notify: "#795548",
};

const basicNodes: NodeData[] = [
  { id: "start", data: { label: "Start" }, position: { x: 0, y: 150 }, style: { width: 150, height: 50, border: "2px solid #f472b6", borderRadius: 12 } },
  { id: "validate", data: { label: "Validate" }, position: { x: 300, y: 0 }, style: { width: 140, height: 50 } },
  { id: "transform", data: { label: "Transform" }, position: { x: 300, y: 150 }, style: { width: 140, height: 50 } },
  { id: "enrich", data: { label: "Enrich" }, position: { x: 300, y: 300 }, style: { width: 140, height: 50, border: "2px solid #f472b6", borderRadius: 12 } },
  { id: "blocker1", data: { label: "Blocker" }, position: { x: 530, y: 60 }, style: { width: 120, height: 50, opacity: 0.6 } },
  { id: "merge", data: { label: "Merge" }, position: { x: 700, y: 75 }, style: { width: 140, height: 50 } },
  { id: "decision", data: { label: "Decision" }, position: { x: 700, y: 225 }, style: { width: 140, height: 50 } },
  { id: "blocker2", data: { label: "Cache" }, position: { x: 900, y: 150 }, style: { width: 100, height: 50, opacity: 0.6 } },
  { id: "success", data: { label: "Success" }, position: { x: 1100, y: 50 }, style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 } },
  { id: "retry", data: { label: "Retry" }, position: { x: 1100, y: 200 }, style: { width: 140, height: 50, border: "2px solid #facc15", borderRadius: 12 } },
  { id: "error", data: { label: "Error" }, position: { x: 1100, y: 350 }, style: { width: 140, height: 50, border: "2px solid #f87171", borderRadius: 12 } },
  { id: "log", data: { label: "Log" }, position: { x: 500, y: 400 }, style: { width: 120, height: 50 } },
  { id: "notify", data: { label: "Notify" }, position: { x: 750, y: 400 }, style: { width: 120, height: 50 } },
];

const basicEdges: EdgeData[] = [
  makeEdge("e-start-validate", "start", "validate", basicColors.start, { label: "check" }),
  makeEdge("e-start-transform", "start", "transform", basicColors.start, { label: "process" }),
  makeEdge("e-start-enrich", "start", "enrich", basicColors.start, { label: "extend" }),
  makeEdge("e-validate-merge", "validate", "merge", basicColors.validate),
  makeEdge("e-transform-merge", "transform", "merge", basicColors.transform),
  makeEdge("e-enrich-decision", "enrich", "decision", basicColors.enrich),
  makeEdge("e-transform-decision", "transform", "decision", basicColors.transform),
  makeEdge("e-merge-success", "merge", "success", basicColors.merge, { label: "ok" }),
  makeEdge("e-decision-success", "decision", "success", basicColors.decision),
  makeEdge("e-decision-retry", "decision", "retry", basicColors.decision, { label: "retry" }),
  makeEdge("e-decision-error", "decision", "error", basicColors.decision, { label: "fail" }),
  makeEdge("e-retry-transform", "retry", "transform", basicColors.retry, { label: "again", strokeDasharray: "5,5" }),
  makeEdge("e-enrich-log", "enrich", "log", basicColors.enrich),
  makeEdge("e-log-notify", "log", "notify", basicColors.log),
  makeEdge("e-notify-error", "notify", "error", basicColors.notify),
];

// ════════════════════════════════════════════════════════════════
// GROUPS
// ════════════════════════════════════════════════════════════════

const groupColors: Record<string, string> = {
  start: "#e91e63", validate: "#2196f3", transform: "#ff9800",
  enrich: "#9c27b0", merge: "#009688", decision: "#f44336",
  retry: "#4caf50", log: "#00bcd4", notify: "#795548",
};

const groupNodes: NodeData[] = [
  { id: "start", data: { label: "Start" }, position: { x: 0, y: 200 }, style: { width: 150, height: 50, border: "2px solid #f472b6", borderRadius: 12 } },
  { id: "group-processing", data: { label: "Processing" }, type: "group", position: { x: 250, y: 0 }, style: { width: 380, height: 420, backgroundColor: "rgba(59, 130, 246, 0.05)", border: "1px dashed #3b82f6", borderRadius: 8 } },
  { id: "validate", data: { label: "Validate" }, position: { x: 50, y: 50 }, parentId: "group-processing", expandParent: true, style: { width: 140, height: 50 } },
  { id: "transform", data: { label: "Transform" }, position: { x: 50, y: 170 }, parentId: "group-processing", expandParent: true, style: { width: 140, height: 50 } },
  { id: "enrich", data: { label: "Enrich" }, position: { x: 50, y: 290 }, parentId: "group-processing", expandParent: true, style: { width: 140, height: 50, border: "2px solid #f472b6", borderRadius: 12 } },
  { id: "blocker1", data: { label: "Blocker" }, position: { x: 680, y: 80 }, style: { width: 120, height: 50, opacity: 0.6 } },
  { id: "group-output", data: { label: "Output" }, type: "group", position: { x: 940, y: 20 }, style: { width: 340, height: 460, backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px dashed #22c55e", borderRadius: 8 } },
  { id: "success", data: { label: "Success" }, position: { x: 50, y: 50 }, parentId: "group-output", expandParent: true, style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 } },
  { id: "retry", data: { label: "Retry" }, position: { x: 50, y: 190 }, parentId: "group-output", expandParent: true, style: { width: 140, height: 50, border: "2px solid #facc15", borderRadius: 12 } },
  { id: "error", data: { label: "Error" }, position: { x: 50, y: 330 }, parentId: "group-output", expandParent: true, style: { width: 140, height: 50, border: "2px solid #f87171", borderRadius: 12 } },
  { id: "merge", data: { label: "Merge" }, position: { x: 680, y: 200 }, style: { width: 140, height: 50 } },
  { id: "decision", data: { label: "Decision" }, position: { x: 680, y: 320 }, style: { width: 140, height: 50 } },
  { id: "log", data: { label: "Log" }, position: { x: 500, y: 480 }, style: { width: 120, height: 50 } },
  { id: "notify", data: { label: "Notify" }, position: { x: 750, y: 480 }, style: { width: 120, height: 50 } },
];

const groupEdges: EdgeData[] = [
  makeEdge("e-start-validate", "start", "validate", groupColors.start, { label: "check" }),
  makeEdge("e-start-transform", "start", "transform", groupColors.start, { label: "process" }),
  makeEdge("e-start-enrich", "start", "enrich", groupColors.start, { label: "extend" }),
  makeEdge("e-validate-merge", "validate", "merge", groupColors.validate),
  makeEdge("e-transform-merge", "transform", "merge", groupColors.transform),
  makeEdge("e-enrich-decision", "enrich", "decision", groupColors.enrich),
  makeEdge("e-transform-decision", "transform", "decision", groupColors.transform),
  makeEdge("e-merge-success", "merge", "success", groupColors.merge, { label: "ok" }),
  makeEdge("e-decision-success", "decision", "success", groupColors.decision),
  makeEdge("e-decision-retry", "decision", "retry", groupColors.decision, { label: "retry" }),
  makeEdge("e-decision-error", "decision", "error", groupColors.decision, { label: "fail" }),
  makeEdge("e-retry-transform", "retry", "transform", groupColors.retry, { label: "again", strokeDasharray: "5,5" }),
  makeEdge("e-enrich-log", "enrich", "log", groupColors.enrich),
  makeEdge("e-log-notify", "log", "notify", groupColors.log),
  makeEdge("e-notify-error", "notify", "error", groupColors.notify),
];

// ════════════════════════════════════════════════════════════════
// SUBFLOWS
// ════════════════════════════════════════════════════════════════

const sfColors: Record<string, string> = { "1": "#e91e63", "2a": "#2196f3", "3": "#ff9800", "4a": "#009688", "4b1": "#9c27b0" };

const subflowNodes: NodeData[] = [
  { id: "1", data: { label: "Node 0" }, position: { x: 250, y: 5 }, style: { width: 150, height: 40 } },
  { id: "2", data: { label: "Group A" }, position: { x: 50, y: 100 }, style: { width: 220, height: 140, backgroundColor: "rgba(59, 130, 246, 0.05)", border: "1px dashed #3b82f6", borderRadius: 8 }, type: "group" },
  { id: "2a", data: { label: "Node A.1" }, position: { x: 35, y: 50 }, parentId: "2", expandParent: true, style: { width: 150, height: 40 } },
  { id: "3", data: { label: "Node 1" }, position: { x: 380, y: 80 }, style: { width: 150, height: 40 } },
  { id: "4", data: { label: "Group B" }, position: { x: 340, y: 200 }, style: { width: 380, height: 340, backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px dashed #22c55e", borderRadius: 8 }, type: "group" },
  { id: "4a", data: { label: "Node B.1" }, position: { x: 30, y: 55 }, parentId: "4", expandParent: true, style: { width: 150, height: 40 } },
  { id: "4b", data: { label: "Group B.A" }, position: { x: 30, y: 140 }, style: { backgroundColor: "rgba(255, 0, 255, 0.08)", height: 170, width: 320, border: "1px dashed #d946ef", borderRadius: 8 }, parentId: "4", type: "group" },
  { id: "4b1", data: { label: "Node B.A.1" }, position: { x: 30, y: 40 }, parentId: "4b", expandParent: true, style: { width: 110, height: 40 } },
  { id: "4b2", data: { label: "Node B.A.2" }, position: { x: 180, y: 100 }, parentId: "4b", expandParent: true, style: { width: 110, height: 40 } },
];

const subflowEdges: EdgeData[] = [
  makeEdge("e1-3", "1", "3", sfColors["1"]),
  makeEdge("e2a-4a", "2a", "4a", sfColors["2a"]),
  makeEdge("e3-4b", "3", "4b1", sfColors["3"]),
  makeEdge("e4a-4b1", "4a", "4b1", sfColors["4a"]),
  makeEdge("e4a-4b2", "4a", "4b2", sfColors["4a"]),
  makeEdge("e4b1-4b2", "4b1", "4b2", sfColors["4b1"]),
];

// ════════════════════════════════════════════════════════════════
// DAG
// ════════════════════════════════════════════════════════════════

const dagColors: Record<string, string> = {
  root1: "#818cf8", root2: "#f59e0b", root3: "#ec4899",
  parser: "#3b82f6", validator: "#8b5cf6", dedupe: "#d946ef",
  enrich: "#06b6d4", "feature-eng": "#22c55e", train: "#14b8a6",
  "validate-model": "#fb923c", benchmark: "#ef4444",
  "notify-email": "#a855f7", "notify-slack": "#f43f5e",
  dashboard: "#4ade80", "audit-log": "#64748b",
};

const dagNodes: NodeData[] = [
  // Tree 1
  { id: "root1", data: { label: "API Gateway" }, position: { x: 0, y: 0 }, style: { width: 130, height: 40, border: "2px solid #818cf8", borderRadius: 12 } },
  { id: "ingest-group", data: { label: "Ingestion Layer" }, position: { x: 0, y: 70 }, style: { width: 10, height: 10, backgroundColor: "rgba(59, 130, 246, 0.05)", border: "1px dashed #3b82f6", borderRadius: 8 }, type: "group" },
  { id: "parser", data: { label: "Parser" }, position: { x: 20, y: 30 }, parentId: "ingest-group", expandParent: true, style: { width: 110, height: 36 } },
  { id: "validator", data: { label: "Validator" }, position: { x: 150, y: 30 }, parentId: "ingest-group", expandParent: true, style: { width: 110, height: 36 } },
  { id: "normalize-group", data: { label: "Normalization" }, position: { x: 20, y: 90 }, parentId: "ingest-group", expandParent: true, style: { width: 10, height: 10, backgroundColor: "rgba(255, 0, 255, 0.06)", border: "1px dashed #d946ef", borderRadius: 8 }, type: "group" },
  { id: "dedupe", data: { label: "Deduplicate" }, position: { x: 15, y: 30 }, parentId: "normalize-group", expandParent: true, style: { width: 100, height: 36 } },
  { id: "enrich-dag", data: { label: "Enrich" }, position: { x: 135, y: 30 }, parentId: "normalize-group", expandParent: true, style: { width: 100, height: 36 } },
  // Tree 2
  { id: "root2", data: { label: "Scheduler" }, position: { x: 400, y: 0 }, style: { width: 120, height: 40, border: "2px solid #f59e0b", borderRadius: 12 } },
  { id: "ml-group", data: { label: "ML Pipeline" }, position: { x: 370, y: 70 }, style: { width: 10, height: 10, backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px dashed #22c55e", borderRadius: 8 }, type: "group" },
  { id: "feature-eng", data: { label: "Feature Eng." }, position: { x: 20, y: 30 }, parentId: "ml-group", expandParent: true, style: { width: 110, height: 36 } },
  { id: "train", data: { label: "Train Model" }, position: { x: 150, y: 30 }, parentId: "ml-group", expandParent: true, style: { width: 110, height: 36 } },
  { id: "eval-group", data: { label: "Evaluation" }, position: { x: 20, y: 90 }, parentId: "ml-group", expandParent: true, style: { width: 10, height: 10, backgroundColor: "rgba(251, 146, 60, 0.08)", border: "1px dashed #fb923c", borderRadius: 8 }, type: "group" },
  { id: "validate-model", data: { label: "Validate" }, position: { x: 15, y: 30 }, parentId: "eval-group", expandParent: true, style: { width: 100, height: 36 } },
  { id: "benchmark", data: { label: "Benchmark" }, position: { x: 135, y: 30 }, parentId: "eval-group", expandParent: true, style: { width: 100, height: 36 } },
  // Tree 3
  { id: "root3", data: { label: "Event Bus" }, position: { x: 200, y: 340 }, style: { width: 120, height: 40, border: "2px solid #ec4899", borderRadius: 12 } },
  { id: "notify-email", data: { label: "Email Notify" }, position: { x: 80, y: 410 }, style: { width: 110, height: 36 } },
  { id: "notify-slack", data: { label: "Slack Notify" }, position: { x: 210, y: 410 }, style: { width: 110, height: 36 } },
  { id: "dashboard", data: { label: "Dashboard" }, position: { x: 340, y: 410 }, style: { width: 110, height: 36, border: "2px solid #4ade80", borderRadius: 12 } },
  { id: "audit-log", data: { label: "Audit Log" }, position: { x: 150, y: 480 }, style: { width: 110, height: 36 } },
  { id: "data-lake", data: { label: "Data Lake" }, position: { x: 200, y: 550 }, style: { width: 130, height: 40, border: "2px solid #06b6d4", borderRadius: 12 } },
];

const dagEdges: EdgeData[] = [
  makeEdge("e-r1-parser", "root1", "parser", dagColors.root1),
  makeEdge("e-r1-validator", "root1", "validator", dagColors.root1),
  makeEdge("e-parser-dedupe", "parser", "dedupe", dagColors.parser),
  makeEdge("e-validator-enrich", "validator", "enrich-dag", dagColors.validator),
  makeEdge("e-dedupe-enrich", "dedupe", "enrich-dag", dagColors.dedupe),
  makeEdge("e-r2-feat", "root2", "feature-eng", dagColors.root2),
  makeEdge("e-feat-train", "feature-eng", "train", dagColors["feature-eng"]),
  makeEdge("e-train-validate", "train", "validate-model", dagColors.train),
  makeEdge("e-train-bench", "train", "benchmark", dagColors.train),
  makeEdge("e-validate-bench", "validate-model", "benchmark", dagColors["validate-model"]),
  makeEdge("e-enrich-feat", "enrich-dag", "feature-eng", dagColors.enrich),
  makeEdge("e-enrich-bus", "enrich-dag", "root3", dagColors.enrich),
  makeEdge("e-bench-bus", "benchmark", "root3", dagColors.benchmark),
  makeEdge("e-bus-email", "root3", "notify-email", dagColors.root3),
  makeEdge("e-bus-slack", "root3", "notify-slack", dagColors.root3),
  makeEdge("e-bus-dash", "root3", "dashboard", dagColors.root3),
  makeEdge("e-email-audit", "notify-email", "audit-log", dagColors["notify-email"]),
  makeEdge("e-slack-audit", "notify-slack", "audit-log", dagColors["notify-slack"]),
  makeEdge("e-audit-lake", "audit-log", "data-lake", dagColors["audit-log"]),
  makeEdge("e-dash-lake", "dashboard", "data-lake", dagColors.dashboard),
  makeEdge("e-bench-lake", "benchmark", "data-lake", dagColors.benchmark),
];

// ════════════════════════════════════════════════════════════════
// TREE (CIRCLES)
// ════════════════════════════════════════════════════════════════

const CIRCLE = 56;
const cs = (border: string, bg: string, color: string) => ({
  width: CIRCLE, height: CIRCLE, borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 11, fontWeight: 600, padding: 0, textAlign: "center",
  border, background: bg, color,
});

const treeColors: Record<string, string> = {
  ceo: "#6366f1", "vp-eng": "#3b82f6", "fe-lead": "#a855f7",
  "be-lead": "#14b8a6", "vp-product": "#f59e0b", pm1: "#fbbf24",
  pm2: "#fbbf24", "vp-ops": "#ec4899",
};

const treeNodes: NodeData[] = [
  { id: "ceo", data: { label: "CEO" }, position: { x: 0, y: 0 }, style: cs("3px solid #6366f1", "#eef2ff", "#4338ca") },
  // Engineering
  { id: "eng-group", data: { label: "Engineering" }, position: { x: 0, y: 80 }, style: { width: 10, height: 10, backgroundColor: "rgba(59, 130, 246, 0.06)", border: "1px dashed #3b82f6", borderRadius: 12 }, type: "group" },
  { id: "vp-eng", data: { label: "VP Eng" }, position: { x: 20, y: 30 }, parentId: "eng-group", expandParent: true, style: cs("2px solid #3b82f6", "#dbeafe", "#1d4ed8") },
  { id: "frontend-group", data: { label: "Frontend" }, position: { x: 10, y: 100 }, parentId: "eng-group", expandParent: true, style: { width: 10, height: 10, backgroundColor: "rgba(168, 85, 247, 0.06)", border: "1px dashed #a855f7", borderRadius: 8 }, type: "group" },
  { id: "fe-lead", data: { label: "FE Lead" }, position: { x: 15, y: 30 }, parentId: "frontend-group", expandParent: true, style: cs("2px solid #a855f7", "#f3e8ff", "#7c3aed") },
  { id: "fe-dev1", data: { label: "Dev A" }, position: { x: 15, y: 100 }, parentId: "frontend-group", expandParent: true, style: cs("1.5px solid #c084fc", "#faf5ff", "#7c3aed") },
  { id: "fe-dev2", data: { label: "Dev B" }, position: { x: 85, y: 100 }, parentId: "frontend-group", expandParent: true, style: cs("1.5px solid #c084fc", "#faf5ff", "#7c3aed") },
  { id: "backend-group", data: { label: "Backend" }, position: { x: 200, y: 100 }, parentId: "eng-group", expandParent: true, style: { width: 10, height: 10, backgroundColor: "rgba(20, 184, 166, 0.06)", border: "1px dashed #14b8a6", borderRadius: 8 }, type: "group" },
  { id: "be-lead", data: { label: "BE Lead" }, position: { x: 15, y: 30 }, parentId: "backend-group", expandParent: true, style: cs("2px solid #14b8a6", "#ccfbf1", "#0f766e") },
  { id: "be-dev1", data: { label: "Dev C" }, position: { x: 15, y: 100 }, parentId: "backend-group", expandParent: true, style: cs("1.5px solid #5eead4", "#f0fdfa", "#0f766e") },
  { id: "be-dev2", data: { label: "Dev D" }, position: { x: 85, y: 100 }, parentId: "backend-group", expandParent: true, style: cs("1.5px solid #5eead4", "#f0fdfa", "#0f766e") },
  // Product
  { id: "product-group", data: { label: "Product" }, position: { x: 300, y: 80 }, style: { width: 10, height: 10, backgroundColor: "rgba(245, 158, 11, 0.06)", border: "1px dashed #f59e0b", borderRadius: 12 }, type: "group" },
  { id: "vp-product", data: { label: "VP Prod" }, position: { x: 20, y: 30 }, parentId: "product-group", expandParent: true, style: cs("2px solid #f59e0b", "#fef3c7", "#b45309") },
  { id: "pm1", data: { label: "PM 1" }, position: { x: 15, y: 100 }, parentId: "product-group", expandParent: true, style: cs("1.5px solid #fbbf24", "#fffbeb", "#b45309") },
  { id: "pm2", data: { label: "PM 2" }, position: { x: 85, y: 100 }, parentId: "product-group", expandParent: true, style: cs("1.5px solid #fbbf24", "#fffbeb", "#b45309") },
  { id: "designer", data: { label: "Design" }, position: { x: 50, y: 170 }, parentId: "product-group", expandParent: true, style: cs("1.5px solid #fb923c", "#fff7ed", "#c2410c") },
  // Ops
  { id: "ops-group", data: { label: "Operations" }, position: { x: 500, y: 80 }, style: { width: 10, height: 10, backgroundColor: "rgba(236, 72, 153, 0.06)", border: "1px dashed #ec4899", borderRadius: 12 }, type: "group" },
  { id: "vp-ops", data: { label: "VP Ops" }, position: { x: 20, y: 30 }, parentId: "ops-group", expandParent: true, style: cs("2px solid #ec4899", "#fce7f3", "#be185d") },
  { id: "devops", data: { label: "DevOps" }, position: { x: 15, y: 100 }, parentId: "ops-group", expandParent: true, style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d") },
  { id: "sre", data: { label: "SRE" }, position: { x: 85, y: 100 }, parentId: "ops-group", expandParent: true, style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d") },
  { id: "security", data: { label: "SecOps" }, position: { x: 50, y: 170 }, parentId: "ops-group", expandParent: true, style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d") },
];

const treeEdges: EdgeData[] = [
  makeEdge("e-ceo-eng", "ceo", "vp-eng", treeColors.ceo),
  makeEdge("e-ceo-prod", "ceo", "vp-product", treeColors.ceo),
  makeEdge("e-ceo-ops", "ceo", "vp-ops", treeColors.ceo),
  makeEdge("e-eng-fe", "vp-eng", "fe-lead", treeColors["vp-eng"]),
  makeEdge("e-eng-be", "vp-eng", "be-lead", treeColors["vp-eng"]),
  makeEdge("e-fe-dev1", "fe-lead", "fe-dev1", treeColors["fe-lead"]),
  makeEdge("e-fe-dev2", "fe-lead", "fe-dev2", treeColors["fe-lead"]),
  makeEdge("e-be-dev1", "be-lead", "be-dev1", treeColors["be-lead"]),
  makeEdge("e-be-dev2", "be-lead", "be-dev2", treeColors["be-lead"]),
  makeEdge("e-prod-pm1", "vp-product", "pm1", treeColors["vp-product"]),
  makeEdge("e-prod-pm2", "vp-product", "pm2", treeColors["vp-product"]),
  makeEdge("e-pm1-design", "pm1", "designer", treeColors.pm1),
  makeEdge("e-pm2-design", "pm2", "designer", treeColors.pm2),
  makeEdge("e-ops-devops", "vp-ops", "devops", treeColors["vp-ops"]),
  makeEdge("e-ops-sre", "vp-ops", "sre", treeColors["vp-ops"]),
  makeEdge("e-devops-sec", "devops", "security", "#f472b6"),
  makeEdge("e-sre-sec", "sre", "security", "#f472b6"),
  makeEdge("e-be-devops", "be-lead", "devops", treeColors["be-lead"]),
  makeEdge("e-pm1-fe", "pm1", "fe-lead", treeColors.pm1),
];

// ════════════════════════════════════════════════════════════════
// ELK (Auto Layout)
// ════════════════════════════════════════════════════════════════

const elkColors: Record<string, string> = {
  input: "#e91e63", auth: "#2196f3", validate: "#ff9800",
  "fetch-db": "#009688", "fetch-api": "#9c27b0", cache: "#4caf50",
  merge: "#f44336", transform: "#00bcd4", filter: "#ff5722",
  format: "#3f51b5", log: "#795548",
};

const elkNodes: NodeData[] = [
  { id: "input", data: { label: "User Input" }, position: { x: 0, y: 0 }, style: { width: 150, height: 50, border: "2px solid #818cf8", borderRadius: 12 } },
  { id: "auth", data: { label: "Authenticate" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50 } },
  { id: "validate-elk", data: { label: "Validate" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50 } },
  { id: "fetch-db", data: { label: "Fetch DB" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50 } },
  { id: "fetch-api", data: { label: "Fetch API" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50 } },
  { id: "cache-elk", data: { label: "Cache" }, position: { x: 0, y: 0 }, style: { width: 120, height: 50, opacity: 0.7 } },
  { id: "merge-elk", data: { label: "Merge Results" }, position: { x: 0, y: 0 }, style: { width: 150, height: 50 } },
  { id: "transform-elk", data: { label: "Transform" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50 } },
  { id: "filter", data: { label: "Filter" }, position: { x: 0, y: 0 }, style: { width: 120, height: 50 } },
  { id: "format", data: { label: "Format" }, position: { x: 0, y: 0 }, style: { width: 120, height: 50 } },
  { id: "respond", data: { label: "Respond" }, position: { x: 0, y: 0 }, style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 } },
  { id: "log-elk", data: { label: "Log" }, position: { x: 0, y: 0 }, style: { width: 100, height: 50 } },
  { id: "error-elk", data: { label: "Error" }, position: { x: 0, y: 0 }, style: { width: 120, height: 50, border: "2px solid #f87171", borderRadius: 12 } },
];

const elkEdges: EdgeData[] = [
  makeEdge("e-input-auth", "input", "auth", elkColors.input),
  makeEdge("e-input-validate", "input", "validate-elk", elkColors.input),
  makeEdge("e-auth-fetch-db", "auth", "fetch-db", elkColors.auth),
  makeEdge("e-auth-fetch-api", "auth", "fetch-api", elkColors.auth),
  makeEdge("e-fetch-db-cache", "fetch-db", "cache-elk", elkColors["fetch-db"]),
  makeEdge("e-fetch-db-merge", "fetch-db", "merge-elk", elkColors["fetch-db"]),
  makeEdge("e-fetch-api-merge", "fetch-api", "merge-elk", elkColors["fetch-api"]),
  makeEdge("e-cache-merge", "cache-elk", "merge-elk", elkColors.cache),
  makeEdge("e-validate-merge", "validate-elk", "merge-elk", elkColors.validate),
  makeEdge("e-merge-transform", "merge-elk", "transform-elk", elkColors.merge),
  makeEdge("e-transform-filter", "transform-elk", "filter", elkColors.transform),
  makeEdge("e-transform-log", "transform-elk", "log-elk", elkColors.transform),
  makeEdge("e-filter-format", "filter", "format", elkColors.filter),
  makeEdge("e-format-respond", "format", "respond", elkColors.format),
  makeEdge("e-merge-error", "merge-elk", "error-elk", elkColors.merge),
  makeEdge("e-log-respond", "log-elk", "respond", elkColors.log),
];

// ════════════════════════════════════════════════════════════════
// AUTO LAYOUT + GROUPS
// ════════════════════════════════════════════════════════════════

const algColors: Record<string, string> = {
  "api-input": "#e91e63", "file-input": "#2196f3", "stream-input": "#ff9800",
  "validate-alg": "#009688", "transform-alg": "#9c27b0",
  "router-alg": "#f44336", "logger-alg": "#4caf50",
  "database-alg": "#00bcd4", "cache-alg": "#795548",
};

const autoLayoutGroupNodes: NodeData[] = [
  { id: "group-ingestion", data: { label: "Ingestion" }, type: "group", position: { x: 0, y: 0 }, style: { width: 340, height: 300, backgroundColor: "rgba(99, 102, 241, 0.05)", border: "1px dashed #6366f1", borderRadius: 8 } },
  { id: "api-input", data: { label: "API Input" }, position: { x: 40, y: 50 }, parentId: "group-ingestion", expandParent: true, style: { width: 120, height: 50 } },
  { id: "file-input", data: { label: "File Input" }, position: { x: 40, y: 140 }, parentId: "group-ingestion", expandParent: true, style: { width: 120, height: 50 } },
  { id: "stream-input", data: { label: "Stream Input" }, position: { x: 40, y: 230 }, parentId: "group-ingestion", expandParent: true, style: { width: 120, height: 50 } },
  { id: "group-processing-alg", data: { label: "Processing" }, type: "group", position: { x: 450, y: 30 }, style: { width: 340, height: 250, backgroundColor: "rgba(245, 158, 11, 0.05)", border: "1px dashed #f59e0b", borderRadius: 8 } },
  { id: "validate-alg", data: { label: "Validate" }, position: { x: 40, y: 50 }, parentId: "group-processing-alg", expandParent: true, style: { width: 120, height: 50 } },
  { id: "transform-alg", data: { label: "Transform" }, position: { x: 40, y: 150 }, parentId: "group-processing-alg", expandParent: true, style: { width: 120, height: 50 } },
  { id: "group-storage", data: { label: "Storage" }, type: "group", position: { x: 900, y: 0 }, style: { width: 340, height: 300, backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px dashed #22c55e", borderRadius: 8 } },
  { id: "cache-alg", data: { label: "Cache" }, position: { x: 40, y: 50 }, parentId: "group-storage", expandParent: true, style: { width: 120, height: 50 } },
  { id: "database-alg", data: { label: "Database" }, position: { x: 40, y: 140 }, parentId: "group-storage", expandParent: true, style: { width: 120, height: 50 } },
  { id: "archive", data: { label: "Archive" }, position: { x: 40, y: 230 }, parentId: "group-storage", expandParent: true, style: { width: 120, height: 50 } },
  { id: "router-alg", data: { label: "Router" }, position: { x: 450, y: 340 }, style: { width: 120, height: 50 } },
  { id: "logger-alg", data: { label: "Logger" }, position: { x: 680, y: 340 }, style: { width: 120, height: 50 } },
  { id: "monitor", data: { label: "Monitor" }, position: { x: 1300, y: 120 }, style: { width: 120, height: 50 } },
];

const autoLayoutGroupEdges: EdgeData[] = [
  makeEdge("e-api-validate", "api-input", "validate-alg", algColors["api-input"]),
  makeEdge("e-file-validate", "file-input", "validate-alg", algColors["file-input"]),
  makeEdge("e-stream-transform", "stream-input", "transform-alg", algColors["stream-input"]),
  makeEdge("e-api-transform", "api-input", "transform-alg", algColors["api-input"]),
  makeEdge("e-validate-cache", "validate-alg", "cache-alg", algColors["validate-alg"]),
  makeEdge("e-validate-database", "validate-alg", "database-alg", algColors["validate-alg"]),
  makeEdge("e-transform-database", "transform-alg", "database-alg", algColors["transform-alg"]),
  makeEdge("e-transform-archive", "transform-alg", "archive", algColors["transform-alg"]),
  makeEdge("e-file-router", "file-input", "router-alg", algColors["file-input"]),
  makeEdge("e-router-transform", "router-alg", "transform-alg", algColors["router-alg"]),
  makeEdge("e-router-logger", "router-alg", "logger-alg", algColors["router-alg"]),
  makeEdge("e-logger-archive", "logger-alg", "archive", algColors["logger-alg"]),
  makeEdge("e-database-monitor", "database-alg", "monitor", algColors["database-alg"]),
  makeEdge("e-cache-monitor", "cache-alg", "monitor", algColors["cache-alg"]),
];

// ════════════════════════════════════════════════════════════════
// STRESS TEST (200 nodes)
// ════════════════════════════════════════════════════════════════

const COLS = 20, ROWS = 10, NODE_W = 120, NODE_H = 40, GAP_X = 180, GAP_Y = 80;
const stressColors = ["#e91e63", "#2196f3", "#ff9800", "#9c27b0", "#009688", "#f44336", "#4caf50", "#00bcd4", "#795548", "#3f51b5"];

const stressNodes: NodeData[] = [];
const stressEdges: EdgeData[] = [];

for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    stressNodes.push({
      id: `n-${row}-${col}`,
      data: { label: `${row}-${col}` },
      position: { x: col * GAP_X, y: row * GAP_Y },
      style: { width: NODE_W, height: NODE_H },
    });
  }
}
let eIdx = 0;
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS - 1; col++) {
    if ((row + col) % 3 !== 0) continue;
    const c = stressColors[eIdx % stressColors.length];
    stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row}-${col + 1}`, c));
  }
}
for (let row = 0; row < ROWS - 1; row++) {
  for (let col = 0; col < COLS; col++) {
    if ((row * 3 + col) % 5 !== 0) continue;
    const c = stressColors[eIdx % stressColors.length];
    stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row + 1}-${col}`, c));
  }
}
for (let row = 0; row < ROWS - 2; row++) {
  for (let col = 0; col < COLS - 2; col++) {
    if ((row + col) % 7 !== 0) continue;
    const c = stressColors[eIdx % stressColors.length];
    stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row + 2}-${col + 2}`, c));
  }
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

export type TabName = "basic" | "group" | "subflows" | "dag" | "tree" | "elk" | "auto-layout-groups" | "stress";

export type DiagramData = {
  nodes: NodeData[];
  edges: EdgeData[];
  needsLayout: boolean; // if true, run ELK before routing
};

export const diagrams: Record<TabName, DiagramData> = {
  basic:                 { nodes: basicNodes,            edges: basicEdges,            needsLayout: false },
  group:                 { nodes: groupNodes,            edges: groupEdges,            needsLayout: false },
  subflows:              { nodes: subflowNodes,          edges: subflowEdges,          needsLayout: false },
  dag:                   { nodes: dagNodes,              edges: dagEdges,              needsLayout: false },
  tree:                  { nodes: treeNodes,             edges: treeEdges,             needsLayout: false },
  elk:                   { nodes: elkNodes,              edges: elkEdges,              needsLayout: true },
  "auto-layout-groups":  { nodes: autoLayoutGroupNodes,  edges: autoLayoutGroupEdges,  needsLayout: false },
  stress:                { nodes: stressNodes,           edges: stressEdges,           needsLayout: false },
};
