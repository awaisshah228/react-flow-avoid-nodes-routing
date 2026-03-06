import { memo, useMemo } from "react";
import {
  BaseEdge as RFBaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useAvoidNodesPath } from "../avoid";

/** Gap (px) between parallel avoid-nodes edges (same source/target). */
const PARALLEL_EDGE_GAP = 22;

/** Translate every coordinate pair in an SVG path by (offsetX, offsetY). */
function translatePath(pathStr: string, offsetX: number, offsetY: number): string {
  return pathStr.replace(/([\d.-]+)\s+([\d.-]+)/g, (_, a, b) =>
    `${Number(a) + offsetX} ${Number(b) + offsetY}`
  );
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

/** Apply parallel offset to avoid path: translate middle, keep start/end at handles. */
function applyAvoidPathParallelOffset(
  pathStr: string,
  sourceX: number,
  sourceY: number,
  _targetX: number,
  _targetY: number,
  offsetX: number,
  offsetY: number
): string {
  const translated = translatePath(pathStr, offsetX, offsetY);
  const rest = translated.replace(/^M\s*[\d.-]+\s+[\d.-]+/, "").trim();
  return (
    "M " + sourceX + " " + sourceY +
    " L " + (sourceX + offsetX) + " " + (sourceY + offsetY) +
    " " + rest +
    " L " + _targetX + " " + _targetY
  );
}

export interface AvoidNodesEdgeData {
  label?: string;
  connectorType?: ConnectorType;
  pathPoints?: { x: number; y: number }[];
}

/**
 * Avoid-nodes edge: orthogonal routing via libavoid-js WASM.
 * Path comes from useAvoidNodesPath (reads the avoid store).
 * Falls back to dashed straight line when router is not ready.
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
    markerEnd,
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

  const label = edgeData?.label ?? "";
  const connectorType: ConnectorType = edgeData?.connectorType ?? "default";

  // ── Parallel edge offset (when multiple edges share same source/target) ──
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

  const style = useMemo(
    () => ({
      strokeWidth: 1.5,
      stroke: "#94a3b8",
      strokeDasharray: !isRouted ? "12,4" : undefined,
    }),
    [isRouted]
  );

  return (
    <>
      <RFBaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 10,
              background: "white",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              border: "1px solid #e2e8f0",
              color: "#475569",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AvoidNodesEdge = memo(AvoidNodesEdgeComponent);
