import { SvelteComponentTyped } from "svelte";

declare class AvoidNodesEdge extends SvelteComponentTyped<{
  id: string;
  sourceX: number;
  sourceY: number;
  sourcePosition?: string;
  targetX: number;
  targetY: number;
  targetPosition?: string;
  markerEnd?: string;
  markerStart?: string;
  style?: string;
  data?: Record<string, unknown>;
}> {}

export default AvoidNodesEdge;
