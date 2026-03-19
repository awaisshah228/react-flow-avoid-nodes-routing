import { get } from "svelte/store";
import { getSmoothStepPath } from "@xyflow/svelte";
import { avoidRoutesLoaded, avoidRoutes } from "./store";

export interface AvoidNodesEdgePathParams {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition?: string;
  targetPosition?: string;
  data?: Record<string, unknown>;
  style?: string;
}

export interface AvoidNodesEdgePathResult {
  /** Final SVG path string. */
  path: string;
  /** Label center X. */
  labelX: number;
  /** Label center Y. */
  labelY: number;
  /** Whether the edge was routed by libavoid (vs fallback). */
  isRouted: boolean;
  /** Computed inline style string for the edge path. */
  edgeStyle: string;
  /** Edge label text (empty string if none). */
  label: string;
  /** Stroke color. */
  strokeColor: string;
  /** Stroke width. */
  strokeWidth: number;
  /** Stroke dash array (undefined if solid). */
  strokeDasharray: string | undefined;
}

/**
 * Computes the full avoid-nodes edge path with all logic applied
 * (routing, style, label) — without rendering anything.
 *
 * Reads from the Svelte avoid-routes stores imperatively.
 * For reactive usage, call this inside a `$:` block.
 */
export function getAvoidNodesEdgePath(
  params: AvoidNodesEdgePathParams
): AvoidNodesEdgePathResult {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
  } = params;

  const loaded = get(avoidRoutesLoaded);
  const routes = get(avoidRoutes);
  const route = routes[id];

  const fallback = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: (sourcePosition as any) ?? "bottom",
    targetX,
    targetY,
    targetPosition: (targetPosition as any) ?? "top",
  });

  const isRouted = !!(loaded && route);
  const path = isRouted ? route.path : fallback[0];
  const labelX = isRouted ? route.labelX : fallback[1];
  const labelY = isRouted ? route.labelY : fallback[2];

  const label = (data?.label as string) ?? "";
  const strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  const strokeWidth = (data?.strokeWidth as number) ?? 1.5;
  const strokeDasharray =
    (data?.strokeDasharray as string | undefined) ??
    (!isRouted ? "6,3" : undefined);

  const edgeStyle =
    `stroke: ${strokeColor}; stroke-width: ${strokeWidth};` +
    (strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : "") +
    (style ? ` ${style}` : "");

  return {
    path,
    labelX,
    labelY,
    isRouted,
    edgeStyle,
    label,
    strokeColor,
    strokeWidth,
    strokeDasharray,
  };
}
