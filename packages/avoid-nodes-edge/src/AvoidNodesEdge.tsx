import { memo, useMemo } from "react";
import {
  BaseEdge as RFBaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
  type EdgeMarker,
  type Edge,
} from "@xyflow/react";
import { useAvoidNodesPath } from "./useAvoidNodesPath";
import { useAvoidRoutesStore } from "./store";

/** Gap (px) between parallel avoid-nodes edges (same source/target). */
const PARALLEL_EDGE_GAP = 22;
const EDGE_STROKE_WIDTH = 1.5;
const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;
const LABEL_WIDTH_APPROX_PX_PER_CHAR = 7;
const LABEL_PADDING_PX = 32;
const DEFAULT_BEND_SIZE = 5;

// ── Path builders (matches editable-edge-pro-example algorithms) ──

type Pt = { x: number; y: number };

function ptDist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Linear: straight line segments between waypoints. */
function buildLinearPath(points: Pt[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

/** Step: orthogonal lines with rounded corners via quadratic Bezier (Q). */
function buildStepPath(points: Pt[], bendSize = DEFAULT_BEND_SIZE): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const bend = Math.min(ptDist(a, b) / 2, ptDist(b, c) / 2, bendSize);
    const { x, y } = b;
    if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
      d += ` L ${x} ${y}`;
    } else if (a.y === y) {
      const xDir = a.x < c.x ? -1 : 1;
      const yDir = a.y < c.y ? -1 : 1;
      d += ` L ${x + bend * xDir} ${y} Q ${x} ${y} ${x} ${y + bend * -yDir}`;
    } else {
      const xDir = a.x < c.x ? -1 : 1;
      const yDir = a.y < c.y ? -1 : 1;
      d += ` L ${x} ${y + bend * yDir} Q ${x} ${y} ${x + bend * -xDir} ${y}`;
    }
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Polyline: arbitrary-angle lines with rounded corners via quadratic Bezier (Q). */
function buildPolylinePath(points: Pt[], bendSize = DEFAULT_BEND_SIZE): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const dAB = ptDist(a, b);
    const dBC = ptDist(b, c);
    const bend = Math.min(dAB / 2, dBC / 2, bendSize);
    if (bend < 0.5) {
      d += ` L ${b.x} ${b.y}`;
      continue;
    }
    // Point on segment a→b at distance `bend` before b
    const t1 = bend / dAB;
    const qx1 = b.x + (a.x - b.x) * t1;
    const qy1 = b.y + (a.y - b.y) * t1;
    // Point on segment b→c at distance `bend` after b
    const t2 = bend / dBC;
    const qx2 = b.x + (c.x - b.x) * t2;
    const qy2 = b.y + (c.y - b.y) * t2;
    d += ` L ${qx1} ${qy1} Q ${b.x} ${b.y} ${qx2} ${qy2}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Catmull-Rom: smooth spline using Catmull-Rom → cubic Bezier conversion.
 * b1 = (-p0 + 6*p1 + p2) / 6, b2 = (p1 + 6*p2 - p3) / 6
 */
function buildCatmullRomPath(points: Pt[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const b1x = (-p0.x + 6 * p1.x + p2.x) / 6;
    const b1y = (-p0.y + 6 * p1.y + p2.y) / 6;
    const b2x = (p1.x + 6 * p2.x - p3.x) / 6;
    const b2y = (p1.y + 6 * p2.y - p3.y) / 6;
    d += ` C ${b1x} ${b1y}, ${b2x} ${b2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Bezier Catmull-Rom: smooth spline with adaptive tension and overshoot clamping.
 * Same as polylineToBezierPath but operating on client-side waypoints.
 */
function buildBezierCatmullRomPath(points: Pt[], baseTension = 0.2): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  // Deduplicate near-identical consecutive points
  const deduped: Pt[] = [];
  for (const p of points) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1 || Math.abs(last.y - p.y) > 1) {
      deduped.push(p);
    }
  }
  // Remove collinear intermediate points
  let pts: Pt[];
  if (deduped.length <= 2) {
    pts = deduped;
  } else {
    pts = [deduped[0]];
    for (let i = 1; i < deduped.length - 1; i++) {
      const prev = deduped[i - 1], curr = deduped[i], next = deduped[i + 1];
      const sameX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
      const sameY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
      if (!sameX || !sameY) pts.push(curr);
    }
    pts.push(deduped[deduped.length - 1]);
  }
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : "";
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const segLen = ptDist(p1, p2);
    const tension = segLen < 40 ? baseTension * 0.3 : segLen < 80 ? baseTension * 0.6 : baseTension;
    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;
    const maxReach = segLen * 0.4;
    const cp1Dist = ptDist(p1, { x: cp1x, y: cp1y });
    if (cp1Dist > maxReach && cp1Dist > 0) {
      const s = maxReach / cp1Dist;
      cp1x = p1.x + (cp1x - p1.x) * s;
      cp1y = p1.y + (cp1y - p1.y) * s;
    }
    const cp2Dist = ptDist(p2, { x: cp2x, y: cp2y });
    if (cp2Dist > maxReach && cp2Dist > 0) {
      const s = maxReach / cp2Dist;
      cp2x = p2.x + (cp2x - p2.x) * s;
      cp2y = p2.y + (cp2y - p2.y) * s;
    }
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Build path from waypoints using the specified algorithm. */
function buildPathFromPoints(
  points: Pt[],
  type: string,
  bendSize = DEFAULT_BEND_SIZE
): string {
  switch (type) {
    case "linear": return buildLinearPath(points);
    case "catmull-rom": return buildCatmullRomPath(points);
    case "bezier-catmull-rom": return buildBezierCatmullRomPath(points);
    case "bezier": return buildBezierCatmullRomPath(points);
    case "polyline": return buildPolylinePath(points, bendSize);
    case "step":
    case "orthogonal":
    default:
      return buildStepPath(points, bendSize);
  }
}

/** ER relationship types. */
type ERRelation = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many" | null;

const ER_RELATIONS: { id: ERRelation; label: string; sourceLabel: string; targetLabel: string }[] = [
  { id: null, label: "None", sourceLabel: "", targetLabel: "" },
  { id: "one-to-one", label: "One to One", sourceLabel: "1", targetLabel: "1" },
  { id: "one-to-many", label: "One to Many", sourceLabel: "1", targetLabel: "*" },
  { id: "many-to-one", label: "Many to One", sourceLabel: "*", targetLabel: "1" },
  { id: "many-to-many", label: "Many to Many", sourceLabel: "*", targetLabel: "*" },
];

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

/** Connector type: controls parallel-offset path shape. */
type ConnectorType = "smoothstep" | "default" | "straight" | "step";

/** Straight path with parallel offset: short segments at start/end so path still connects to nodes. */
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

/** Translate every coordinate pair in an SVG path by (offsetX, offsetY). */
function translatePath(pathStr: string, offsetX: number, offsetY: number): string {
  return pathStr.replace(/([\d.-]+)\s+([\d.-]+)/g, (_, a, b) =>
    `${Number(a) + offsetX} ${Number(b) + offsetY}`
  );
}

/** Apply parallel offset to path: translate middle, keep start/end at handles. */
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

/** Edge data: all per-edge settings (stroke, markers, label, ER, connector type). */
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

/**
 * Avoid-nodes edge: orthogonal routing via libavoid-js WASM.
 * Supports stroke color, width, dash, markers, ER labels, parallel offset.
 */
function AvoidNodesEdgeComponent(props: EdgeProps<Edge<AvoidNodesEdgeData>>) {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    sourcePosition,
    targetPosition,
    markerEnd: markerEndProp,
    markerStart: markerStartProp,
  } = props;

  const { getEdges } = useReactFlow();
  const edgeRounding = useAvoidRoutesStore((s) => s.edgeRounding);

  const edgeData = data as AvoidNodesEdgeData | undefined;
  const [basePath, labelX, labelY, isRouted, routePoints, routeConnectorType] = useAvoidNodesPath({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: sourcePosition as "left" | "right" | "top" | "bottom" | undefined,
    targetPosition: targetPosition as "left" | "right" | "top" | "bottom" | undefined,
    points: edgeData?.pathPoints,
  });

  // ── Per-edge settings (no global store) ──
  const strokeColor = edgeData?.strokeColor ?? "#94a3b8";
  const strokeWidth = edgeData?.strokeWidth ?? EDGE_STROKE_WIDTH;
  const strokeDasharray = edgeData?.strokeDasharray;
  const flowDirection = edgeData?.flowDirection ?? "mono";
  const label = edgeData?.label ?? "";
  const erRelation = edgeData?.erRelation ?? null;
  const connectorType = (routeConnectorType ?? edgeData?.connectorType ?? "orthogonal") as string;

  // ── Markers ──
  const dataMarkerEnd = edgeData?.markerEnd as string | undefined;
  const dataMarkerStart = edgeData?.markerStart as string | undefined;
  const flowDirectionMarkerEnd =
    flowDirection === "mono" || flowDirection === "bi" ? "url(#arrowClosed)" : undefined;
  const flowDirectionMarkerStart = flowDirection === "bi" ? "url(#arrowClosed)" : undefined;
  const effectiveMarkerEnd =
    dataMarkerEnd ?? (markerEndProp as string | undefined) ?? flowDirectionMarkerEnd;
  const effectiveMarkerStart =
    dataMarkerStart ?? (markerStartProp as string | undefined) ?? flowDirectionMarkerStart;

  // ── Parallel edge offset ──
  const parallelEdgeOffset = useMemo(() => {
    const edges = getEdges().filter(
      (e) => e.source === source && e.target === target && e.type === "avoidNodes"
    );
    if (edges.length <= 1) return { offsetX: 0, offsetY: 0 };
    const sorted = [...edges].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
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

  // When we have raw waypoints from the router, build the path client-side
  // using the selected algorithm (step, linear, catmull-rom, bezier-catmull-rom).
  const resolvedBasePath = useMemo(() => {
    if (routePoints && routePoints.length >= 2) {
      return buildPathFromPoints(routePoints, connectorType, edgeRounding || DEFAULT_BEND_SIZE);
    }
    return basePath;
  }, [routePoints, basePath, connectorType, edgeRounding]);

  const hasParallelOffset =
    parallelEdgeOffset.offsetX !== 0 || parallelEdgeOffset.offsetY !== 0;
  const edgePath = hasParallelOffset
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
          resolvedBasePath,
          sourceX,
          sourceY,
          targetX,
          targetY,
          parallelEdgeOffset.offsetX,
          parallelEdgeOffset.offsetY
        )
    : resolvedBasePath;

  const effectiveStrokeDasharray = strokeDasharray ?? (!isRouted ? "12,4" : undefined);

  // ── Label visibility ──
  const edgeLength = Math.hypot(targetX - sourceX, targetY - sourceY);
  const labelWidthApprox = (label?.length ?? 0) * LABEL_WIDTH_APPROX_PX_PER_CHAR;
  const minLengthToShowLabel = Math.max(
    MIN_EDGE_LENGTH_FOR_LABEL_PX,
    labelWidthApprox + LABEL_PADDING_PX
  );
  const showLabelByLength = !label || edgeLength >= minLengthToShowLabel;

  const style = useMemo(
    () => ({
      strokeWidth,
      stroke: strokeColor,
      strokeDasharray: effectiveStrokeDasharray,
    }),
    [strokeWidth, strokeColor, effectiveStrokeDasharray]
  );

  return (
    <>
      <RFBaseEdge
        id={id}
        path={edgePath}
        markerEnd={effectiveMarkerEnd}
        markerStart={effectiveMarkerStart}
        style={style}
      />
      <EdgeLabelRenderer key={id}>
        {erRelation && (() => {
          const relDef = ER_RELATIONS.find((r) => r.id === erRelation);
          if (!relDef) return null;
          const sOff = offsetPoint(sourceX, sourceY, targetX, targetY, 20);
          const tOff = offsetPoint(targetX, targetY, sourceX, sourceY, 20);
          return (
            <>
              {relDef.sourceLabel && (
                <div
                  style={{
                    position: "absolute",
                    transform: `translate(-50%, -50%) translate(${sOff.x}px,${sOff.y}px)`,
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                  className="nodrag nopan"
                >
                  <span style={{
                    padding: "2px 6px",
                    fontSize: 10,
                    fontWeight: "bold",
                    fontFamily: "monospace",
                    borderRadius: 4,
                    background: "white",
                    border: "1px solid #d1d5db",
                    color: "#374151",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}>
                    {relDef.sourceLabel}
                  </span>
                </div>
              )}
              {relDef.targetLabel && (
                <div
                  style={{
                    position: "absolute",
                    transform: `translate(-50%, -50%) translate(${tOff.x}px,${tOff.y}px)`,
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                  className="nodrag nopan"
                >
                  <span style={{
                    padding: "2px 6px",
                    fontSize: 10,
                    fontWeight: "bold",
                    fontFamily: "monospace",
                    borderRadius: 4,
                    background: "white",
                    border: "1px solid #d1d5db",
                    color: "#374151",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}>
                    {relDef.targetLabel}
                  </span>
                </div>
              )}
            </>
          );
        })()}
        {label && showLabelByLength && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
              background: "white",
              padding: "2px 10px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid #e2e8f0",
              color: "#475569",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const AvoidNodesEdge = memo(AvoidNodesEdgeComponent);
