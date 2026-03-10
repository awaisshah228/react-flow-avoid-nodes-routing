<script lang="ts">
  import { writable } from "svelte/store";
  import {
    SvelteFlow,
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

  const edgeTypes: EdgeTypes = { avoidNodes: AvoidNodesEdge as any };

  const nodes = writable<Node[]>(stressNodes);
  const edges = writable<Edge[]>(stressEdges);

  let settings = {
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    debounceMs: 0,
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
  };

  $: router.reset($nodes, $edges, routerOptions);

  function handleNodeDrag() {
    router.updateNodes($nodes);
  }

  function handleNodeDragStop() {
    const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
    nodes.set(resolved);
    router.reset($nodes, $edges, routerOptions);
  }

  import { onDestroy } from "svelte";
  onDestroy(() => router.destroy());

  $: nodeCount = $nodes.length;
  $: edgeCount = $edges.length;
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
  {edges}
  {edgeTypes}
  fitView
  on:nodedrag={handleNodeDrag}
  on:nodedragstop={handleNodeDragStop}
>
  <Background />
  <Controls />
  <MiniMap />
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
</style>
