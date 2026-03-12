<script lang="ts">
  import { writable } from "svelte/store";
  import {
    SvelteFlow,
    SmoothStepEdge,
    StraightEdge,
    BezierEdge,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type EdgeTypes,
  } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";

  import AvoidNodesEdge from "avoid-nodes-edge-svelte/edge";
  import { createAvoidNodesRouter } from "avoid-nodes-edge-svelte";
  import { resolveCollisions } from "../utils/resolve-collisions";
  import { stressNodes, stressEdges } from "../initialElementsStress";
  import CurvedAvoidEdge from "../CurvedAvoidEdge.svelte";

  import { onDestroy } from "svelte";

  type EdgeStyle = "avoidNodes" | "curvedAvoid" | "default" | "smoothstep" | "straight";

  const edgeTypeMap: Record<EdgeStyle, EdgeTypes> = {
    avoidNodes: { avoidNodes: AvoidNodesEdge as any },
    curvedAvoid: { curvedAvoid: CurvedAvoidEdge as any },
    default: { default: BezierEdge as any },
    smoothstep: { smoothstep: SmoothStepEdge as any },
    straight: { straight: StraightEdge as any },
  };

  const edgeStyleLabels: { value: EdgeStyle; label: string }[] = [
    { value: "avoidNodes", label: "Avoid Nodes" },
    { value: "curvedAvoid", label: "Curved Avoid" },
    { value: "default", label: "Bezier" },
    { value: "smoothstep", label: "Smooth Step" },
    { value: "straight", label: "Straight" },
  ];

  let edgeStyle: EdgeStyle = "avoidNodes";
  let prevRounding = 8;

  $: edgeTypes = edgeTypeMap[edgeStyle] ?? {};

  function applyEdgeType(edgeList: Edge[], style: EdgeStyle): Edge[] {
    const type = style === "default" ? undefined : style;
    return edgeList.map((e) => ({ ...e, type }));
  }

  const nodes = writable<Node[]>(stressNodes);
  const baseEdges = writable<Edge[]>(stressEdges);

  const styledEdges = writable<Edge[]>(applyEdgeType(stressEdges, edgeStyle));
  $: styledEdges.set(applyEdgeType($baseEdges, edgeStyle) as Edge[]);
  $: routerEdges = edgeStyle === "curvedAvoid"
    ? applyEdgeType($baseEdges, "avoidNodes")
    : $styledEdges;

  let settings = {
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    debounceMs: 0,
    connectorType: "orthogonal" as "orthogonal" | "bezier" | "polyline" | "step" | "linear" | "catmull-rom" | "bezier-catmull-rom",
  };

  let panelOpen = true;

  const router = createAvoidNodesRouter({
    onCollisionsResolved: (resolved) => nodes.set(resolved as Node[]),
  });

  $: routerOptions = {
    shapeBufferDistance: settings.edgeToNodeSpacing,
    idealNudgingDistance: settings.edgeToEdgeSpacing,
    edgeRounding: settings.edgeRounding,
    shouldSplitEdgesNearHandle: settings.shouldSplitEdgesNearHandle,
    autoBestSideConnection: settings.autoBestSideConnection,
    debounceMs: settings.debounceMs,
    connectorType: settings.connectorType,
  };

  $: router.reset($nodes, routerEdges, routerOptions);

  function handleNodeDrag() {
    router.updateNodes($nodes);
  }

  function handleNodeDragStop() {
    const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
    nodes.set(resolved);
    router.reset($nodes, routerEdges, routerOptions);
  }

  function setEdgeStyle(value: EdgeStyle) {
    if (value === "curvedAvoid" && edgeStyle !== "curvedAvoid") {
      prevRounding = settings.edgeRounding;
      settings = {
        ...settings,
        edgeRounding: 0,
        edgeToEdgeSpacing: 16,
        edgeToNodeSpacing: 20,
        connectorType: "polyline",
      };
    } else if (value !== "curvedAvoid" && edgeStyle === "curvedAvoid") {
      settings = {
        ...settings,
        edgeRounding: prevRounding,
        edgeToEdgeSpacing: 10,
        edgeToNodeSpacing: 12,
        connectorType: "orthogonal",
      };
    }
    edgeStyle = value;
    styledEdges.set(applyEdgeType($baseEdges, value));
    if (value === "avoidNodes" || value === "curvedAvoid") {
      requestAnimationFrame(() => router.reset($nodes, routerEdges, routerOptions));
    }
  }

  onDestroy(() => router.destroy());

  $: nodeCount = $nodes.length;
  $: edgeCount = $baseEdges.length;
</script>

<div class="stats">
  {nodeCount} nodes · {edgeCount} edges
</div>

<div class="settings-panel">
  <div
    class="settings-header"
    on:click={() => (panelOpen = !panelOpen)}
    on:keydown={(e) => e.key === "Enter" && (panelOpen = !panelOpen)}
    role="button"
    tabindex="0"
  >
    <span>{panelOpen ? "Stress Test Settings" : "\u2699\uFE0F Settings"}</span>
    <span class="close-icon">{panelOpen ? "\u2715" : ""}</span>
  </div>
  {#if panelOpen}
    <div class="setting-row">
      <label>Connector Type</label>
      <select bind:value={settings.connectorType}>
        <option value="orthogonal">Orthogonal</option>
        <option value="bezier">Bezier</option>
        <option value="polyline">Polyline</option>
        <option value="step">Step</option>
        <option value="linear">Linear</option>
        <option value="catmull-rom">Catmull-Rom</option>
        <option value="bezier-catmull-rom">Bezier Catmull-Rom</option>
      </select>
    </div>
    <div class="setting-row">
      <label>Edge Rounding</label>
      <div class="slider-wrap">
        <input type="range" min="0" max="48" bind:value={settings.edgeRounding} />
        <span class="val">{settings.edgeRounding}</span>
      </div>
    </div>
    <div class="setting-row">
      <label>Edge-to-Edge Spacing</label>
      <div class="slider-wrap">
        <input type="range" min="0" max="24" bind:value={settings.edgeToEdgeSpacing} />
        <span class="val">{settings.edgeToEdgeSpacing}</span>
      </div>
    </div>
    <div class="setting-row">
      <label>Edge-to-Node Spacing</label>
      <div class="slider-wrap">
        <input type="range" min="0" max="48" bind:value={settings.edgeToNodeSpacing} />
        <span class="val">{settings.edgeToNodeSpacing}</span>
      </div>
    </div>
    <div class="setting-row">
      <label>Debounce (ms)</label>
      <div class="slider-wrap">
        <input type="range" min="0" max="200" bind:value={settings.debounceMs} />
        <span class="val">{settings.debounceMs}</span>
      </div>
    </div>
    <div class="setting-row">
      <label>Split Near Handle</label>
      <div class="toggle-wrap">
        <button
          class:active={settings.shouldSplitEdgesNearHandle}
          on:click={() => (settings.shouldSplitEdgesNearHandle = true)}>True</button
        >
        <button
          class:active={!settings.shouldSplitEdgesNearHandle}
          on:click={() => (settings.shouldSplitEdgesNearHandle = false)}>False</button
        >
      </div>
    </div>
    <div class="setting-row">
      <label>Auto Best Side</label>
      <div class="toggle-wrap">
        <button
          class:active={settings.autoBestSideConnection}
          on:click={() => (settings.autoBestSideConnection = true)}>True</button
        >
        <button
          class:active={!settings.autoBestSideConnection}
          on:click={() => (settings.autoBestSideConnection = false)}>False</button
        >
      </div>
    </div>
  {/if}
</div>

<SvelteFlow
  {nodes}
  edges={styledEdges}
  {edgeTypes}
  fitView
  on:nodedrag={handleNodeDrag}
  on:nodedragstop={handleNodeDragStop}
>
  <Background />
  <Controls />
  <MiniMap />

  <!-- Edge style picker -->
  <div class="edge-picker">
    {#each edgeStyleLabels as { value, label }}
      <button
        class="edge-btn"
        class:active={edgeStyle === value}
        on:click={() => setEdgeStyle(value)}
      >
        {label}
      </button>
    {/each}
  </div>
</SvelteFlow>

<style>
  .stats {
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 20;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    pointer-events: none;
  }

  .settings-panel {
    position: absolute;
    top: 60px;
    right: 12px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 20;
    min-width: 240px;
    max-width: 320px;
    font-size: 13px;
  }

  .settings-header {
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
  }

  .close-icon {
    font-size: 11px;
    color: #888;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }

  .slider-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-wrap input[type="range"] {
    width: 100px;
  }

  .val {
    min-width: 28px;
    text-align: right;
  }

  .toggle-wrap {
    display: flex;
    gap: 4px;
  }

  .toggle-wrap button {
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #fff;
    color: #333;
    cursor: pointer;
  }

  .toggle-wrap button.active {
    background: #333;
    color: #fff;
  }

  .edge-picker {
    position: absolute;
    bottom: 24px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: center;
    gap: 4px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    overflow-x: auto;
  }

  .edge-btn {
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid #ccc;
    background: #fff;
    color: #333;
    cursor: pointer;
    font-size: 12px;
    font-weight: 400;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .edge-btn.active {
    background: #333;
    color: #fff;
    font-weight: 600;
  }
</style>
