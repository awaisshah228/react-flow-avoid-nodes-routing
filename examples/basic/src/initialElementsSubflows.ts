import type { Node, Edge } from "@xyflow/react";

export const subflowNodes: Node[] = [
  {
    id: "1",
    data: { label: "Node 0" },
    position: { x: 250, y: 5 },
    style: { width: 150, height: 40 },
  },
  {
    id: "2",
    data: { label: "Group A" },
    position: { x: 50, y: 100 },
    style: {
      width: 220,
      height: 140,
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      border: "1px dashed #3b82f6",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "2a",
    data: { label: "Node A.1" },
    position: { x: 35, y: 50 },
    parentId: "2",
    expandParent: true,
    style: { width: 150, height: 40 },
  },
  {
    id: "3",
    data: { label: "Node 1" },
    position: { x: 380, y: 80 },
    style: { width: 150, height: 40 },
  },
  {
    id: "4",
    data: { label: "Group B" },
    position: { x: 340, y: 200 },
    style: {
      width: 380,
      height: 340,
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      border: "1px dashed #22c55e",
      borderRadius: 8,
    },
    type: "group",
  },
  {
    id: "4a",
    data: { label: "Node B.1" },
    position: { x: 30, y: 55 },
    parentId: "4",
    expandParent: true,
    style: { width: 150, height: 40 },
  },
  {
    id: "4b",
    data: { label: "Group B.A" },
    position: { x: 30, y: 140 },
    style: {
      backgroundColor: "rgba(255, 0, 255, 0.08)",
      height: 170,
      width: 320,
      border: "1px dashed #d946ef",
      borderRadius: 8,
    },
    parentId: "4",
    type: "group",
  },
  {
    id: "4b1",
    data: { label: "Node B.A.1" },
    position: { x: 30, y: 40 },
    parentId: "4b",
    expandParent: true,
    style: { width: 110, height: 40 },
  },
  {
    id: "4b2",
    data: { label: "Node B.A.2" },
    position: { x: 180, y: 100 },
    parentId: "4b",
    expandParent: true,
    style: { width: 110, height: 40 },
  },
];

export const subflowEdges: Edge[] = [
  { id: "e1-3", source: "1", target: "3", type: "avoidNodes" },
  { id: "e2a-4a", source: "2a", target: "4a", type: "avoidNodes" },
  { id: "e3-4b", source: "3", target: "4b1", type: "avoidNodes" },
  { id: "e4a-4b1", source: "4a", target: "4b1", type: "avoidNodes" },
  { id: "e4a-4b2", source: "4a", target: "4b2", type: "avoidNodes" },
  { id: "e4b1-4b2", source: "4b1", target: "4b2", type: "avoidNodes" },
];
