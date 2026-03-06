import { memo, useMemo } from "react";
import {
  BaseEdge as RFBaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
  type EdgeMarker,
} from "@xyflow/react";
import { useAvoidNodesPath } from "../avoid";

/** Gap (px) between parallel avoid-nodes edges (same source/target). */
const PARALLEL_EDGE_GAP = 22;
const EDGE_STROKE_WIDTH = 1.5;
const MIN_EDGE_LENGTH_FOR_LABEL_PX = 72;
const LABEL_WIDTH_APPROX_PX_PER_CHAR = 7;
const LABEL_PADDING_PX = 32;

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
export interface AvoidNodesEdgeData {
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
function AvoidNodesEdgeComponent(props: EdgeProps) {
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

  const edgeData = data as AvoidNodesEdgeData | undefined;
  const [basePath, labelX, labelY, isRouted] = useAvoidNodesPath({
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
  const connectorType: ConnectorType = edgeData?.connectorType ?? "default";

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
          basePath,
          sourceX,
          sourceY,
          targetX,
          targetY,
          parallelEdgeOffset.offsetX,
          parallelEdgeOffset.offsetY
        )
    : basePath;

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
