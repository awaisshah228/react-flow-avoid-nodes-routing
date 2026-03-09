/**
 * Svelte writable stores for avoid-nodes routing state.
 * Replaces zustand stores from the React version.
 */

import { writable, derived, get } from "svelte/store";
import type { AvoidRoute } from "./routing-core";

export const avoidRoutesLoaded = writable(false);
export const avoidRoutes = writable<Record<string, AvoidRoute>>({});

/** Get the routed path for a specific edge id. */
export function getRouteForEdge(id: string) {
  return derived(avoidRoutes, ($routes) => $routes[id] ?? null);
}

/** Imperatively read current routes (outside Svelte reactive context). */
export function getRoutes(): Record<string, AvoidRoute> {
  return get(avoidRoutes);
}
