import type { Node, Edge } from "@xyflow/react";

export const nodes: Node[] = [
  {
    id: "1",
    data: { label: "Start" },
    position: { x: 0, y: 0 },
    style: { width: 150, height: 50 },
  },
  {
    id: "2",
    data: { label: "Process A" },
    position: { x: 300, y: -50 },
    style: { width: 150, height: 50 },
  },
  {
    id: "3",
    data: { label: "Process B" },
    position: { x: 300, y: 100 },
    style: { width: 150, height: 50 },
  },
  {
    id: "4",
    data: { label: "Decision" },
    position: { x: 600, y: 25 },
    style: { width: 150, height: 50 },
  },
  {
    id: "5",
    data: { label: "End" },
    position: { x: 900, y: 25 },
    style: { width: 150, height: 50 },
  },
  {
    id: "6",
    data: { label: "Blocker" },
    position: { x: 450, y: -120 },
    style: { width: 120, height: 50 },
  },
  {
    id: "7",
    data: { label: "Side Task" },
    position: { x: 150, y: 220 },
    style: { width: 150, height: 50 },
  },
];

export const edges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", type: "avoidNodes", data: { label: "path A" } },
  { id: "e1-3", source: "1", target: "3", type: "avoidNodes", data: { label: "path B" } },
  { id: "e2-4", source: "2", target: "4", type: "avoidNodes" },
  { id: "e3-4", source: "3", target: "4", type: "avoidNodes" },
  { id: "e4-5", source: "4", target: "5", type: "avoidNodes", data: { label: "approved" } },
  { id: "e1-7", source: "1", target: "7", type: "avoidNodes" },
  { id: "e7-5", source: "7", target: "5", type: "avoidNodes" },
];
