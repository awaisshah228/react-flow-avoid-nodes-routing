import { useAvoidRouterActionsStore } from "./store";

/**
 * Exposes resetRouting and updateRoutesForNodeId without prop drilling.
 * Use in sidebars or node templates.
 */
export function useAvoidNodesRouterActions(): {
  resetRouting: () => void;
  updateRoutesForNodeId: (nodeId: string) => void;
} {
  const actions = useAvoidRouterActionsStore((s) => s.actions);
  return actions;
}
