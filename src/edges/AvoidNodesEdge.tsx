import { memo, useMemo } from "react";
import {
  BaseEdge as RFBaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";
import { useAvoidNodesPath } from "../avoid";

export interface AvoidNodesEdgeData {
  label?: string;
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
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    sourcePosition,
    targetPosition,
    markerEnd,
  } = props;

  const edgeData = data as AvoidNodesEdgeData | undefined;
  const [path, labelX, labelY, isRouted] = useAvoidNodesPath({
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
