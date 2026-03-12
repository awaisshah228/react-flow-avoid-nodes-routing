import { createContext, memo, useContext } from "react";
import { BaseEdge, type EdgeProps, getSmoothStepPath } from "@xyflow/react";

type AvoidRoute = { path: string; labelX: number; labelY: number };

export const RoutesContext = createContext<Record<string, AvoidRoute>>({});

function ServerRoutedEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const routes = useContext(RoutesContext);
  const route = routes[id];

  if (route) {
    return <BaseEdge id={id} path={route.path} />;
  }

  const [fallbackPath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return <BaseEdge id={id} path={fallbackPath} style={{ strokeDasharray: "6,3" }} />;
}

export const ServerRoutedEdge = memo(ServerRoutedEdgeComponent);
