import { useMemo } from "react";
import { useReactFlow, type EdgeMarker } from "@xyflow/react";
import { useAvoidNodesPath } from "./useAvoidNodesPath";
import type { Position } from "./useAvoidNodesPath";

/** Gap (px) between parallel avoid-nodes edges (same source/target). */
const PARALLEL_EDGE_GAP = 22;
const EDGE_STROKE_WIDTH = 1.5;
const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;
const LABEL_WIDTH_APPROX_PX_PER_CHAR = 7;
const LABEL_PADDING_PX = 32;

/** ER relationship types. */
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

/** Connector type: controls parallel-offset path shape. */
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
  offsetX: number,
  offsetY: number
): string {
  const s2 = sourceX + offsetX;
  const t2 = targetX + offsetX;
  const s3 = sourceY + offsetY;
  const t3 = targetY + offsetY;
  return `M ${sourceX} ${sourceY} L ${s2} ${s3} L ${t2} ${t3} L ${targetX} ${targetY}`;
}

function translatePath(pathStr: string, offsetX: number, offsetY: number): string {
  return pathStr.replace(/([\d.-]+)\s+([\d.-]+)/g, (_, a, b) =>
    `${Number(a) + offsetX} ${Number(b) + offsetY}`
  );
}

function applyAvoidPathParallelOffset(
  pathStr: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  offsetX: number,
  offsetY: number
): string {
  const translated = translatePath(pathStr, offsetX, offsetY);
  const rest = translated.replace(/^M\s*[\d.-]+\s+[\d.-]+/, "").trim();
  return (
    "M " +
    sourceX +
    " " +
    sourceY +
    " L " +
    (sourceX + offsetX) +
    " " +
    (sourceY + offsetY) +
    " " +
    rest +
    " L " +
    targetX +
    " " +
    targetY
  );
}

/** Edge data shape accepted by the hook. */
export interface AvoidNodesEdgeData extends Record<string, unknown> {
  label?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  flowDirection?: "mono" | "bi" | "none";
  markerEnd?: EdgeMarker | string;
  markerStart?: EdgeMarker | string;
  markerColor?: string;
  markerScale?: number;
  erRelation?: ERRelation;
  connectorType?: ConnectorType;
  pathPoints?: { x: number; y: number }[];
}

export interface UseAvoidNodesEdgePathParams {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  data?: AvoidNodesEdgeData;
  markerEnd?: string;
  markerStart?: string;
}

export interface UseAvoidNodesEdgePathResult {
  /** Final SVG path string (with parallel offset applied). */
  path: string;
  /** Label center X. */
  labelX: number;
  /** Label center Y. */
  labelY: number;
  /** Whether the edge was routed by libavoid (vs fallback). */
  isRouted: boolean;
  /** Resolved markerEnd (from data, props, or flow direction). */
  markerEnd: string | undefined;
  /** Resolved markerStart (from data, props, or flow direction). */
  markerStart: string | undefined;
  /** Computed style object for the edge path. */
  style: { strokeWidth: number; stroke: string; strokeDasharray?: string };
  /** Edge label text (empty string if none). */
  label: string;
  /** Whether the label should be shown given the edge length. */
  showLabel: boolean;
  /** ER relation definition (null if none). */
  erRelation: {
    sourceLabel: string;
    targetLabel: string;
    sourcePoint: { x: number; y: number };
    targetPoint: { x: number; y: number };
  } | null;
}

/**
 * Hook that computes the full avoid-nodes edge path with all logic applied
 * (routing, parallel offset, markers, style, label, ER labels) —
 * without rendering anything. Useful for custom edge components.
 */
export function useAvoidNodesEdgePath(
  params: UseAvoidNodesEdgePathParams
): UseAvoidNodesEdgePathResult {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd: markerEndProp,
    markerStart: markerStartProp,
  } = params;

  const { getEdges } = useReactFlow();

  const [basePath, labelX, labelY, isRouted] = useAvoidNodesPath({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    points: data?.pathPoints,
  });

  const strokeColor = data?.strokeColor ?? "#94a3b8";
  const strokeWidth = data?.strokeWidth ?? EDGE_STROKE_WIDTH;
  const strokeDasharray = data?.strokeDasharray;
  const flowDirection = data?.flowDirection ?? "mono";
  const label = data?.label ?? "";
  const erRelationId = data?.erRelation ?? null;
  const connectorType: ConnectorType = data?.connectorType ?? "default";

  // ── Markers ──
  const dataMarkerEnd = data?.markerEnd as string | undefined;
  const dataMarkerStart = data?.markerStart as string | undefined;
  const flowDirectionMarkerEnd =
    flowDirection === "mono" || flowDirection === "bi"
      ? "url(#arrowClosed)"
      : undefined;
  const flowDirectionMarkerStart =
    flowDirection === "bi" ? "url(#arrowClosed)" : undefined;
  const effectiveMarkerEnd =
    dataMarkerEnd ?? markerEndProp ?? flowDirectionMarkerEnd;
  const effectiveMarkerStart =
    dataMarkerStart ?? markerStartProp ?? flowDirectionMarkerStart;

  // ── Parallel edge offset ──
  const parallelEdgeOffset = useMemo(() => {
    const edges = getEdges().filter(
      (e) =>
        e.source === source && e.target === target && e.type === "avoidNodes"
    );
    if (edges.length <= 1) return { offsetX: 0, offsetY: 0 };
    const sorted = [...edges].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );
    const index = sorted.findIndex((e) => e.id === id);
    if (index < 0) return { offsetX: 0, offsetY: 0 };
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy);
    if (len === 0) return { offsetX: 0, offsetY: 0 };
    const perpX = -dy / len;
    const perpY = dx / len;
    const amount = (index - (edges.length - 1) / 2) * PARALLEL_EDGE_GAP;
    return { offsetX: perpX * amount, offsetY: perpY * amount };
  }, [source, target, id, sourceX, sourceY, targetX, targetY, getEdges]);

  const hasParallelOffset =
    parallelEdgeOffset.offsetX !== 0 || parallelEdgeOffset.offsetY !== 0;

  const path = hasParallelOffset
    ? connectorType === "straight"
      ? getStraightPathWithParallelOffset(
          sourceX,
          sourceY,
          targetX,
          targetY,
          parallelEdgeOffset.offsetX,
          parallelEdgeOffset.offsetY
        )
      : applyAvoidPathParallelOffset(
          basePath,
          sourceX,
          sourceY,
          targetX,
          targetY,
          parallelEdgeOffset.offsetX,
          parallelEdgeOffset.offsetY
        )
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

  const style = useMemo(
    () => ({
      strokeWidth,
      stroke: strokeColor,
      strokeDasharray: effectiveStrokeDasharray,
    }),
    [strokeWidth, strokeColor, effectiveStrokeDasharray]
  );

  // ── ER relation ──
  const erRelation = useMemo(() => {
    if (!erRelationId) return null;
    const relDef = ER_RELATIONS.find((r) => r.id === erRelationId);
    if (!relDef) return null;
    return {
      sourceLabel: relDef.sourceLabel,
      targetLabel: relDef.targetLabel,
      sourcePoint: offsetPoint(sourceX, sourceY, targetX, targetY, 20),
      targetPoint: offsetPoint(targetX, targetY, sourceX, sourceY, 20),
    };
  }, [erRelationId, sourceX, sourceY, targetX, targetY]);

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
