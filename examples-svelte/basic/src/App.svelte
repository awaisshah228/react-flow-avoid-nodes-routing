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
  import {
    createAvoidNodesRouter,
    resolveCollisions,
  } from "avoid-nodes-edge-svelte";

  const edgeTypes: EdgeTypes = {
    avoidNodes: AvoidNodesEdge as any,
  };

  const initialNodes: Node[] = [
    {
      id: "source",
      type: "default",
      position: { x: 0, y: 100 },
      data: { label: "Source" },
      style: "width: 150px; height: 50px;",
    },
    {
      id: "blocker-1",
      type: "default",
      position: { x: 250, y: 50 },
      data: { label: "Blocker 1" },
      style: "width: 150px; height: 50px;",
    },
    {
      id: "blocker-2",
      type: "default",
      position: { x: 250, y: 200 },
      data: { label: "Blocker 2" },
      style: "width: 150px; height: 50px;",
    },
    {
      id: "target",
      type: "default",
      position: { x: 500, y: 100 },
      data: { label: "Target" },
      style: "width: 150px; height: 50px;",
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: "e-source-target",
      source: "source",
      target: "target",
      type: "avoidNodes",
      data: { label: "routed edge" },
    },
  ];

  const nodes = writable<Node[]>(initialNodes);
  const edges = writable<Edge[]>(initialEdges);

  const router = createAvoidNodesRouter({
    onCollisionsResolved: (resolvedNodes) => {
      nodes.set(resolvedNodes as Node[]);
    },
  });

  $: router.reset($nodes as any, $edges as any);

  function handleNodeDrag(event: CustomEvent) {
    router.updateNodes($nodes as any);
  }

  function handleNodeDragStop(event: CustomEvent) {
    const resolved = resolveCollisions($nodes as any, { margin: 20, maxIterations: 50 });
    nodes.set(resolved as any);
    router.reset(resolved as any, $edges as any);
  }

  import { onDestroy } from "svelte";
  onDestroy(() => {
    router.destroy();
  });
</script>

<div class="flow-container">
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
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
  }

  .flow-container {
    width: 100vw;
    height: 100vh;
  }
</style>
