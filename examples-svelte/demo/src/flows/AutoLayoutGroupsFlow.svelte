<script lang="ts">
  import { writable } from "svelte/store";
  import { onMount, onDestroy } from "svelte";
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
  import { autoLayoutGroupNodes, autoLayoutGroupEdges } from "../initialElementsAutoLayoutGroups";
  import { runAutoLayoutWithGroups, type LayoutDirection, type LayoutAlgorithmName } from "../utils/auto-layout";
  import SettingsPanel from "../SettingsPanel.svelte";
  import FitViewOnLayout from "../FitViewOnLayout.svelte";

  const edgeTypes: EdgeTypes = { avoidNodes: AvoidNodesEdge as any };

  const nodes = writable<Node[]>(autoLayoutGroupNodes);
  const edges = writable<Edge[]>(autoLayoutGroupEdges);

  let settings = {
    edgeRounding: 8,
    edgeToEdgeSpacing: 10,
    edgeToNodeSpacing: 12,
    diagramGridSize: 0,
    shouldSplitEdgesNearHandle: true,
    autoBestSideConnection: true,
    resolveCollisions: true,
    connectorType: "orthogonal" as "orthogonal" | "bezier" | "polyline",
    layoutDirection: "LR" as LayoutDirection,
    layoutAlgorithm: "elk" as LayoutAlgorithmName,
    layoutSpacing: 60,
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
    connectorType: settings.connectorType,
  };

  $: router.reset($nodes, $edges, routerOptions);

  let didLayout = false;
  let fitViewTrigger = 0;

  async function applyLayout(currentNodes: Node[]) {
    const laid = await runAutoLayoutWithGroups(currentNodes, $edges, {
      direction: settings.layoutDirection,
      algorithm: settings.layoutAlgorithm,
      spacing: settings.layoutSpacing,
    });
    nodes.set(laid);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.reset(laid, $edges, routerOptions);
        fitViewTrigger++;
      });
    });
  }

  onMount(() => {
    setTimeout(() => {
      didLayout = true;
      applyLayout($nodes);
    }, 100);
  });

  let prevLayoutKey = `${settings.layoutDirection}-${settings.layoutAlgorithm}-${settings.layoutSpacing}`;
  $: {
    const key = `${settings.layoutDirection}-${settings.layoutAlgorithm}-${settings.layoutSpacing}`;
    if (didLayout && key !== prevLayoutKey) {
      prevLayoutKey = key;
      applyLayout($nodes);
    }
  }

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

  function onLayoutChange(e: CustomEvent<{ key: string; value: string | number }>) {
    settings = { ...settings, [e.detail.key]: e.detail.value };
  }

  function onReLayout() {
    applyLayout($nodes);
  }

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
  <FitViewOnLayout trigger={fitViewTrigger} />
  <Background />
  <Controls />
  <MiniMap />
  <SettingsPanel
    {...settings}
    showLayout={true}
    on:change={onSettingChange}
    on:layoutChange={onLayoutChange}
    on:reLayout={onReLayout}
  />
</SvelteFlow>
