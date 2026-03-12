import { create } from "zustand";
import type { AvoidRoute } from "./router";

export interface AvoidRoutesState {
  loaded: boolean;
  routes: Record<string, AvoidRoute>;
  edgeRounding: number;
  setLoaded: (loaded: boolean) => void;
  setRoutes: (routes: Record<string, AvoidRoute>) => void;
  setEdgeRounding: (edgeRounding: number) => void;
}

export const useAvoidRoutesStore = create<AvoidRoutesState>((set) => ({
  loaded: false,
  routes: {},
  edgeRounding: 0,
  setLoaded: (loaded) => set({ loaded }),
  setRoutes: (routes) => set({ routes }),
  setEdgeRounding: (edgeRounding) => set({ edgeRounding }),
}));

export interface AvoidRouterActions {
  resetRouting: () => void;
  updateRoutesForNodeId: (nodeId: string) => void;
}

const noop = () => {};
const noopId = (_nodeId: string) => {};

export const useAvoidRouterActionsStore = create<{
  actions: AvoidRouterActions;
  setActions: (a: AvoidRouterActions) => void;
}>((set) => ({
  actions: { resetRouting: noop, updateRoutesForNodeId: noopId },
  setActions: (actions) => set({ actions }),
}));
