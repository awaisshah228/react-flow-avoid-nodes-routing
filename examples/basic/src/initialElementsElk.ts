import type { Node, Edge } from "@xyflow/react";

/**
 * ELK + libavoid example: nodes have no manual positions —
 * ELK auto-layout positions them, then libavoid routes edges around them.
 */

export const elkNodes: Node[] = [
  {
    id: "input",
    data: { label: "User Input" },
    position: { x: 0, y: 0 },
    style: { width: 150, height: 50, border: "2px solid #818cf8", borderRadius: 12 },
  },
  {
    id: "auth",
    data: { label: "Authenticate" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "validate",
    data: { label: "Validate" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "fetch-db",
    data: { label: "Fetch DB" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "fetch-api",
    data: { label: "Fetch API" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "cache",
    data: { label: "Cache" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50, opacity: 0.7 },
  },
  {
    id: "merge",
    data: { label: "Merge Results" },
    position: { x: 0, y: 0 },
    style: { width: 150, height: 50 },
  },
  {
    id: "transform",
    data: { label: "Transform" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50 },
  },
  {
    id: "filter",
    data: { label: "Filter" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50 },
  },
  {
    id: "format",
    data: { label: "Format" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50 },
  },
  {
    id: "respond",
    data: { label: "Respond" },
    position: { x: 0, y: 0 },
    style: { width: 140, height: 50, border: "2px solid #4ade80", borderRadius: 12 },
  },
  {
    id: "log",
    data: { label: "Log" },
    position: { x: 0, y: 0 },
    style: { width: 100, height: 50 },
  },
  {
    id: "error",
    data: { label: "Error" },
    position: { x: 0, y: 0 },
    style: { width: 120, height: 50, border: "2px solid #f87171", borderRadius: 12 },
  },
];

export const elkEdges: Edge[] = [
  { id: "e-input-auth", source: "input", target: "auth", type: "avoidNodes" },
  { id: "e-input-validate", source: "input", target: "validate", type: "avoidNodes" },
  { id: "e-auth-fetch-db", source: "auth", target: "fetch-db", type: "avoidNodes" },
  { id: "e-auth-fetch-api", source: "auth", target: "fetch-api", type: "avoidNodes" },
  { id: "e-fetch-db-cache", source: "fetch-db", target: "cache", type: "avoidNodes" },
  { id: "e-fetch-db-merge", source: "fetch-db", target: "merge", type: "avoidNodes" },
  { id: "e-fetch-api-merge", source: "fetch-api", target: "merge", type: "avoidNodes" },
  { id: "e-cache-merge", source: "cache", target: "merge", type: "avoidNodes" },
  { id: "e-validate-merge", source: "validate", target: "merge", type: "avoidNodes" },
  { id: "e-merge-transform", source: "merge", target: "transform", type: "avoidNodes" },
  { id: "e-transform-filter", source: "transform", target: "filter", type: "avoidNodes" },
  { id: "e-transform-log", source: "transform", target: "log", type: "avoidNodes" },
  { id: "e-filter-format", source: "filter", target: "format", type: "avoidNodes" },
  { id: "e-format-respond", source: "format", target: "respond", type: "avoidNodes" },
  { id: "e-merge-error", source: "merge", target: "error", type: "avoidNodes" },
  { id: "e-log-respond", source: "log", target: "respond", type: "avoidNodes" },
];
