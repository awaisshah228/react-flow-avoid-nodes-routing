/**
 * A simple edge component that renders a server-computed SVG path.
 * Uses a shared context to look up the route for each edge by ID.
 * Supports strokeColor and markerEnd from server edge data.
 */

import { createContext, memo, useContext } from "react";
import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";

type AvoidRoute = { path: string; labelX: number; labelY: number };

export const RoutesContext = createContext<Record<string, AvoidRoute>>({});

function ServerRoutedEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  } = props;
  const routes = useContext(RoutesContext);
  const route = routes[id];

  const strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  const strokeDasharray = data?.strokeDasharray as string | undefined;

  const style: React.CSSProperties = {
    stroke: strokeColor,
    strokeWidth: 2,
    ...(strokeDasharray ? { strokeDasharray } : {}),
  };

  if (route) {
    return <BaseEdge id={id} path={route.path} style={style} markerEnd={markerEnd} />;
  }

  // Fallback: smooth step while waiting for server response
  const [fallbackPath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return <BaseEdge id={id} path={fallbackPath} style={{ ...style, strokeDasharray: "6,3" }} markerEnd={markerEnd} />;
}

export const ServerRoutedEdge = memo(ServerRoutedEdgeComponent);
