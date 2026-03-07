import type { Node, Edge } from "@xyflow/react";

export const nodes: Node[] = [
  // Row 1 - Input layer
  {
    id: "start",
    data: { label: "Start" },
    position: { x: 0, y: 150 },
    style: { width: 150, height: 50, border: "2px solid #f472b6", borderRadius: 12 },
  },

  // Row 2 - Processing
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 300, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 300, y: 150 },
    style: { width: 140, height: 50 },
  },
  {
    id: "enrich",
    data: { label: "Enrich" },
    position: { x: 300, y: 300 },
    style: { width: 140, height: 50 },
  },

  // Blocker node (forces routing around it)
  {
    id: "blocker1",
    data: { label: "Blocker" },
    position: { x: 530, y: 60 },
    style: { width: 120, height: 50, opacity: 0.6 },
  },

  // Row 3 - Merge & decide
  {
    id: "merge",
    data: { label: "Merge" },
    position: { x: 700, y: 75 },
    style: { width: 140, height: 50 },
  },
  {
    id: "decision",
    data: { label: "Decision" },
    position: { x: 700, y: 225 },
    style: { width: 140, height: 50 },
  },

  // Another blocker
  {
    id: "blocker2",
    data: { label: "Cache" },
    position: { x: 900, y: 150 },
    style: { width: 100, height: 50, opacity: 0.6 },
  },

  // Row 4 - Output layer
  {
    id: "success",
    data: { label: "Success" },
    position: { x: 1100, y: 50 },
    style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 },
  },
  {
    id: "retry",
    data: { label: "Retry" },
    position: { x: 1100, y: 200 },
    style: { width: 140, height: 50, border: "2px solid #facc15", borderRadius: 12 },
  },
  {
    id: "error",
    data: { label: "Error" },
    position: { x: 1100, y: 350 },
    style: { width: 140, height: 50, border: "2px solid #f87171", borderRadius: 12 },
  },

  // Side branch
  {
    id: "log",
    data: { label: "Log" },
    position: { x: 500, y: 400 },
    style: { width: 120, height: 50 },
  },
  {
    id: "notify",
    data: { label: "Notify" },
    position: { x: 750, y: 400 },
    style: { width: 120, height: 50 },
  },
];

export const edges: Edge[] = [
  // Start fans out to 3 targets (tests shouldSplitEdgesNearHandle)
  { id: "e-start-validate", source: "start", target: "validate", type: "avoidNodes", data: { label: "check" } },
  { id: "e-start-transform", source: "start", target: "transform", type: "avoidNodes", data: { label: "process" } },
  { id: "e-start-enrich", source: "start", target: "enrich", type: "avoidNodes", data: { label: "extend" } },

  // Processing to merge (multiple edges into same target - tests fan-in)
  { id: "e-validate-merge", source: "validate", target: "merge", type: "avoidNodes" },
  { id: "e-transform-merge", source: "transform", target: "merge", type: "avoidNodes" },

  // Processing to decision
  { id: "e-enrich-decision", source: "enrich", target: "decision", type: "avoidNodes" },
  { id: "e-transform-decision", source: "transform", target: "decision", type: "avoidNodes" },

  // Merge/Decision to outputs (routes must go around blocker2)
  { id: "e-merge-success", source: "merge", target: "success", type: "avoidNodes", data: { label: "ok" } },
  { id: "e-decision-success", source: "decision", target: "success", type: "avoidNodes" },
  { id: "e-decision-retry", source: "decision", target: "retry", type: "avoidNodes", data: { label: "retry" } },
  { id: "e-decision-error", source: "decision", target: "error", type: "avoidNodes", data: { label: "fail" } },

  // Retry loops back (long route)
  { id: "e-retry-transform", source: "retry", target: "transform", type: "avoidNodes", data: { label: "again", strokeDasharray: "5,5" } },

  // Side branch
  { id: "e-enrich-log", source: "enrich", target: "log", type: "avoidNodes" },
  { id: "e-log-notify", source: "log", target: "notify", type: "avoidNodes" },
  { id: "e-notify-error", source: "notify", target: "error", type: "avoidNodes" },
];
