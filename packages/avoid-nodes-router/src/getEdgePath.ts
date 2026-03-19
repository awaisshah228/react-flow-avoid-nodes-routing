/**
 * Pure utility to compute final edge path with all presentation logic applied.
 * Framework-agnostic — works server-side or anywhere without React/Svelte.
 *
 * Takes raw routes from routeAll() and edge data, returns the final path
 * with parallel offset, markers, style, labels, and ER relations resolved.
 */

import type { AvoidRoute, FlowEdge } from "./routing-engine";

/** Gap (px) between parallel avoid-nodes edges (same source/target). */
const PARALLEL_EDGE_GAP = 22;
const EDGE_STROKE_WIDTH = 1.5;
const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;
const LABEL_WIDTH_APPROX_PX_PER_CHAR = 7;
const LABEL_PADDING_PX = 32;

type ERRelation =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many"
  | null;

const ER_RELATIONS: {
  id: ERRelation;
  label: string;
  sourceLabel: string;
  targetLabel: string;
}[] = [
  { id: null, label: "None", sourceLabel: "", targetLabel: "" },
  { id: "one-to-one", label: "One to One", sourceLabel: "1", targetLabel: "1" },
  { id: "one-to-many", label: "One to Many", sourceLabel: "1", targetLabel: "*" },
  { id: "many-to-one", label: "Many to One", sourceLabel: "*", targetLabel: "1" },
  { id: "many-to-many", label: "Many to Many", sourceLabel: "*", targetLabel: "*" },
];

type ConnectorType = "smoothstep" | "default" | "straight" | "step";

function offsetPoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  gap: number
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0 || gap === 0) return { x: fromX, y: fromY };
  const ratio = gap / len;
  return { x: fromX + dx * ratio, y: fromY + dy * ratio };
}

function getStraightPathWithParallelOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offX: number,
  offY: number
): string {
  return `M ${sourceX} ${sourceY} L ${sourceX + offX} ${sourceY + offY} L ${targetX + offX} ${targetY + offY} L ${targetX} ${targetY}`;
}

function translatePath(pathStr: string, offX: number, offY: number): string {
  return pathStr.replace(/([\d.-]+)\s+([\d.-]+)/g, (_, a, b) =>
    `${Number(a) + offX} ${Number(b) + offY}`
  );
}

function applyAvoidPathParallelOffset(
  pathStr: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offX: number,
  offY: number
): string {
  const translated = translatePath(pathStr, offX, offY);
  const rest = translated.replace(/^M\s*[\d.-]+\s+[\d.-]+/, "").trim();
  return (
    `M ${sourceX} ${sourceY} L ${sourceX + offX} ${sourceY + offY} ` +
    rest +
    ` L ${targetX} ${targetY}`
  );
}

/** Edge data shape accepted by getEdgePath. */
export interface EdgePathData {
  label?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  flowDirection?: "mono" | "bi" | "none";
  markerEnd?: string;
  markerStart?: string;
  erRelation?: ERRelation;
  connectorType?: ConnectorType;
}

export interface GetEdgePathParams {
  /** Edge id. */
  id: string;
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  /** Source handle X. */
  sourceX: number;
  /** Source handle Y. */
  sourceY: number;
  /** Target handle X. */
  targetX: number;
  /** Target handle Y. */
  targetY: number;
  /** Per-edge data/settings. */
  data?: EdgePathData;
  /** All routes from routeAll(). */
  routes: Record<string, AvoidRoute>;
  /** All edges in the graph (needed for parallel offset calculation). */
  edges: FlowEdge[];
}

export interface EdgePathResult {
  /** Final SVG path string (with parallel offset applied). */
  path: string;
  /** Label center X. */
  labelX: number;
  /** Label center Y. */
  labelY: number;
  /** Whether a route was found for this edge. */
  isRouted: boolean;
  /** Resolved markerEnd. */
  markerEnd: string | undefined;
  /** Resolved markerStart. */
  markerStart: string | undefined;
  /** Computed style for the edge. */
  style: { strokeWidth: number; stroke: string; strokeDasharray?: string };
  /** Edge label text. */
  label: string;
  /** Whether the label should be shown given the edge length. */
  showLabel: boolean;
  /** ER relation data (null if none). */
  erRelation: {
    sourceLabel: string;
    targetLabel: string;
    sourcePoint: { x: number; y: number };
    targetPoint: { x: number; y: number };
  } | null;
}

/**
 * Compute the final edge path with all presentation logic:
 * routing lookup, parallel offset, markers, style, label visibility, ER labels.
 */
export function getEdgePath(params: GetEdgePathParams): EdgePathResult {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    routes,
    edges,
  } = params;

  const route = routes[id];
  const isRouted = !!route;
  const basePath = route?.path ?? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const labelX = route?.labelX ?? (sourceX + targetX) / 2;
  const labelY = route?.labelY ?? (sourceY + targetY) / 2;

  const strokeColor = data?.strokeColor ?? "#94a3b8";
  const strokeWidth = data?.strokeWidth ?? EDGE_STROKE_WIDTH;
  const strokeDasharray = data?.strokeDasharray;
  const flowDirection = data?.flowDirection ?? "mono";
  const label = data?.label ?? "";
  const erRelationId = data?.erRelation ?? null;
  const connectorType: ConnectorType = data?.connectorType ?? "default";

  // ── Markers ──
  const flowDirectionMarkerEnd =
    flowDirection === "mono" || flowDirection === "bi"
      ? "url(#arrowClosed)"
      : undefined;
  const flowDirectionMarkerStart =
    flowDirection === "bi" ? "url(#arrowClosed)" : undefined;
  const effectiveMarkerEnd = data?.markerEnd ?? flowDirectionMarkerEnd;
  const effectiveMarkerStart = data?.markerStart ?? flowDirectionMarkerStart;

  // ── Parallel edge offset ──
  const parallelEdges = edges.filter(
    (e) => e.source === source && e.target === target && e.type === "avoidNodes"
  );
  let offX = 0;
  let offY = 0;
  if (parallelEdges.length > 1) {
    const sorted = [...parallelEdges].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );
    const index = sorted.findIndex((e) => e.id === id);
    if (index >= 0) {
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const perpX = -dy / len;
        const perpY = dx / len;
        const amount = (index - (parallelEdges.length - 1) / 2) * PARALLEL_EDGE_GAP;
        offX = perpX * amount;
        offY = perpY * amount;
      }
    }
  }

  const hasParallelOffset = offX !== 0 || offY !== 0;
  const path = hasParallelOffset
    ? connectorType === "straight"
      ? getStraightPathWithParallelOffset(sourceX, sourceY, targetX, targetY, offX, offY)
      : applyAvoidPathParallelOffset(basePath, sourceX, sourceY, targetX, targetY, offX, offY)
    : basePath;

  const effectiveStrokeDasharray =
    strokeDasharray ?? (!isRouted ? "12,4" : undefined);

  // ── Label visibility ──
  const edgeLength = Math.hypot(targetX - sourceX, targetY - sourceY);
  const labelWidthApprox = (label?.length ?? 0) * LABEL_WIDTH_APPROX_PX_PER_CHAR;
  const minLengthToShowLabel = Math.max(
    MIN_EDGE_LENGTH_FOR_LABEL_PX,
    labelWidthApprox + LABEL_PADDING_PX
  );
  const showLabel = !!label && edgeLength >= minLengthToShowLabel;

  const style = {
    strokeWidth,
    stroke: strokeColor,
    strokeDasharray: effectiveStrokeDasharray,
  };

  // ── ER relation ──
  let erRelation: EdgePathResult["erRelation"] = null;
  if (erRelationId) {
    const relDef = ER_RELATIONS.find((r) => r.id === erRelationId);
    if (relDef) {
      erRelation = {
        sourceLabel: relDef.sourceLabel,
        targetLabel: relDef.targetLabel,
        sourcePoint: offsetPoint(sourceX, sourceY, targetX, targetY, 20),
        targetPoint: offsetPoint(targetX, targetY, sourceX, sourceY, 20),
      };
    }
  }

  return {
    path,
    labelX,
    labelY,
    isRouted,
    markerEnd: effectiveMarkerEnd,
    markerStart: effectiveMarkerStart,
    style,
    label,
    showLabel,
    erRelation,
  };
}
