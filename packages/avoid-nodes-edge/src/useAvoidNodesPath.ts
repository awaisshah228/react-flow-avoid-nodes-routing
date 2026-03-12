import { useMemo } from "react";
import { getStraightPath, getSmoothStepPath, Position as RFPosition } from "@xyflow/react";
import { useAvoidRoutesStore } from "./store";
import { EDGE_BORDER_RADIUS } from "./constants";
import type { ConnectorType } from "./routing-core";

export type Position = "left" | "right" | "top" | "bottom";

const RF_POS: Record<Position, RFPosition> = {
  left: "left" as RFPosition,
  right: "right" as RFPosition,
  top: "top" as RFPosition,
  bottom: "bottom" as RFPosition,
};

export interface UseAvoidNodesPathParams {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: Position;
  targetPosition?: Position;
  points?: { x: number; y: number }[];
  borderRadius?: number;
  offset?: number;
}

/**
 * Returns [path, labelX, labelY, wasRouted, points] for an avoid-nodes edge.
 * Reads from the avoid store (set by the worker); falls back to straight/smooth-step.
 * `points` contains the raw waypoints from the router (available when routed).
 */
export function useAvoidNodesPath(
  params: UseAvoidNodesPathParams
): [path: string, labelX: number, labelY: number, wasRouted: boolean, points?: { x: number; y: number }[], connectorType?: ConnectorType] {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    offset,
  } = params;

  const loaded = useAvoidRoutesStore((s) => s.loaded);
  const route = useAvoidRoutesStore((s) => s.routes[id]);

  return useMemo(() => {
    if (loaded && route) {
      return [route.path, route.labelX, route.labelY, true, route.points, route.connectorType];
    }

    if (sourcePosition && targetPosition) {
      const [smoothPath, sLabelX, sLabelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition: RF_POS[sourcePosition],
        targetPosition: RF_POS[targetPosition],
        borderRadius: params.borderRadius ?? EDGE_BORDER_RADIUS,
        offset: offset ?? 20,
      });
      return [smoothPath, sLabelX, sLabelY, false, undefined];
    }

    const [straightPath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });
    return [straightPath, labelX, labelY, false, undefined];
  }, [loaded, route, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, offset, params.borderRadius]);
}
