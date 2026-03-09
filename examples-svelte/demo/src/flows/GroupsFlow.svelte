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
  import { nodes as groupNodes, edges as groupEdges } from "../initialElements";
  import SettingsPanel from "../SettingsPanel.svelte";

  const edgeTypes: EdgeTypes = { avoidNodes: AvoidNodesEdge as any };

  const nodes = writable<Node[]>(groupNodes);
  const edges = writable<Edge[]>(groupEdges);

  let settings = {
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
  };

  const router = createAvoidNodesRouter({
    onCollisionsResolved: (resolved) => nodes.set(resolved as Node[]),
  });

  $: routerOptions = {
    shapeBufferDistance: settings.edgeToNodeSpacing,
    idealNudgingDistance: settings.edgeToEdgeSpacing,
    edgeRounding: settings.edgeRounding,
    diagramGridSize: settings.diagramGridSize,
    shouldSplitEdgesNearHandle: settings.shouldSplitEdgesNearHandle,
    autoBestSideConnection: settings.autoBestSideConnection,
  };

  $: router.reset($nodes, $edges, routerOptions);

  function handleNodeDrag() {
    router.updateNodes($nodes);
  }

  function handleNodeDragStop() {
    if (settings.resolveCollisions) {
      const resolved = resolveCollisions($nodes, { margin: 20, maxIterations: 50 });
      nodes.set(resolved);
    }
    router.reset($nodes, $edges, routerOptions);
  }

  function onSettingChange(e: CustomEvent<{ key: string; value: number | boolean }>) {
    settings = { ...settings, [e.detail.key]: e.detail.value };
  }

  import { onDestroy } from "svelte";
  onDestroy(() => router.destroy());
</script>

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
  <SettingsPanel
    {...settings}
    on:change={onSettingChange}
  />
</SvelteFlow>
