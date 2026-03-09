<script lang="ts">
  /**
   * AvoidNodesEdge — Svelte Flow edge component for orthogonal routing via libavoid-js WASM.
   * Reads routed paths from the avoidRoutes store; falls back to a straight line.
   */
  import { BaseEdge } from "@xyflow/svelte";
  import { avoidRoutesLoaded, avoidRoutes } from "./store";

  export let id: string;
  export let sourceX: number;
  export let sourceY: number;
  export let targetX: number;
  export let targetY: number;
  export let markerEnd: string | undefined = undefined;
  export let markerStart: string | undefined = undefined;
  export let style: string | undefined = undefined;
  export let data: Record<string, unknown> | undefined = undefined;

  $: route = $avoidRoutes[id];
  $: loaded = $avoidRoutesLoaded;

  $: label = (data?.label as string) ?? "";
  $: strokeColor = (data?.strokeColor as string) ?? "#94a3b8";
  $: strokeWidth = (data?.strokeWidth as number) ?? 1.5;
  $: strokeDasharray = (data?.strokeDasharray as string | undefined) ?? (!loaded || !route ? "12,4" : undefined);

  $: edgePath = loaded && route
    ? route.path
    : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  $: labelX = loaded && route ? route.labelX : (sourceX + targetX) / 2;
  $: labelY = loaded && route ? route.labelY : (sourceY + targetY) / 2;

  $: edgeStyle = `stroke: ${strokeColor}; stroke-width: ${strokeWidth};${strokeDasharray ? ` stroke-dasharray: ${strokeDasharray};` : ""}${style ? ` ${style}` : ""}`;
</script>

<BaseEdge
  {id}
  path={edgePath}
  {markerEnd}
  {markerStart}
  style={edgeStyle}
/>

{#if label}
  <div
    class="nodrag nopan"
    style="
      position: absolute;
      transform: translate(-50%, -50%) translate({labelX}px, {labelY}px);
      pointer-events: all;
      z-index: 10;
      background: white;
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #e2e8f0;
      color: #475569;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    "
  >
    {label}
  </div>
{/if}
