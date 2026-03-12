<script lang="ts">
  import BasicFlow from "./flows/BasicFlow.svelte";
  import GroupsFlow from "./flows/GroupsFlow.svelte";
  import SubflowsFlow from "./flows/SubflowsFlow.svelte";
  import AutoLayoutFlow from "./flows/AutoLayoutFlow.svelte";
  import AutoLayoutGroupsFlow from "./flows/AutoLayoutGroupsFlow.svelte";
  import StressTestFlow from "./flows/StressTestFlow.svelte";
  import DAGFlow from "./flows/DAGFlow.svelte";
  import TreeFlow from "./flows/TreeFlow.svelte";

  type Tab = "basic" | "group" | "subflows" | "dag" | "tree" | "elk" | "auto-layout-groups" | "stress";

  const validTabs: Tab[] = ["basic", "group", "subflows", "dag", "tree", "elk", "auto-layout-groups", "stress"];

  function getInitialTab(): Tab {
    const params = new URLSearchParams(window.location.search);
    const example = params.get("example") as Tab | null;
    return example && validTabs.includes(example) ? example : "basic";
  }

  let tab: Tab = getInitialTab();

  function setTab(newTab: Tab) {
    tab = newTab;
    const url = new URL(window.location.href);
    url.searchParams.set("example", newTab);
    window.history.replaceState({}, "", url.toString());
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basic", label: "Basic" },
    { id: "group", label: "Groups" },
    { id: "subflows", label: "Subflows" },
    { id: "dag", label: "Complex DAG" },
    { id: "tree", label: "Tree (Circles)" },
    { id: "elk", label: "Auto Layout" },
    { id: "auto-layout-groups", label: "Auto Layout + Groups" },
    { id: "stress", label: "Stress Test (200)" },
  ];
</script>

<div class="flow-container">
  {#key tab}
    {#if tab === "basic"}
      <BasicFlow />
    {:else if tab === "group"}
      <GroupsFlow />
    {:else if tab === "subflows"}
      <SubflowsFlow />
    {:else if tab === "dag"}
      <DAGFlow />
    {:else if tab === "tree"}
      <TreeFlow />
    {:else if tab === "elk"}
      <AutoLayoutFlow />
    {:else if tab === "auto-layout-groups"}
      <AutoLayoutGroupsFlow />
    {:else if tab === "stress"}
      <StressTestFlow />
    {/if}
  {/key}

  <div class="tab-bar">
    {#each tabs as t}
      <button
        class="tab-btn"
        class:active={tab === t.id}
        on:click={() => setTab(t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>
</div>

<style>
  :global(html, body, #app) {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  :global(.svelte-flow) {
    --xy-background-color: #f7f9fb;
    --xy-theme-selected: #f57dbd;
    --xy-theme-hover: #c5c5c5;
    --xy-theme-edge-hover: black;
    --xy-theme-color-focus: #e8e8e8;
    --xy-node-border-default: 1px solid #ededed;
    --xy-node-boxshadow-default:
      0px 3.54px 4.55px 0px #00000005, 0px 3.54px 4.55px 0px #0000000d,
      0px 0.51px 1.01px 0px #0000001a;
    --xy-node-border-radius-default: 8px;
    --xy-handle-background-color-default: #ffffff;
    --xy-handle-border-color-default: #aaaaaa;
    --xy-edge-label-color-default: #505050;
  }

  :global(.svelte-flow__node) {
    box-shadow: var(--xy-node-boxshadow-default);
    border-radius: var(--xy-node-border-radius-default);
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 10px;
    font-size: 12px;
    flex-direction: column;
    border: var(--xy-node-border-default);
  }

  :global(.svelte-flow__node.selectable:hover),
  :global(.svelte-flow__node.draggable:hover) {
    border-color: var(--xy-theme-hover);
  }

  :global(.svelte-flow__node.selectable.selected) {
    border-color: var(--xy-theme-selected);
  }

  :global(.svelte-flow__node-group) {
    background-color: rgba(207, 182, 255, 0.4);
    border-color: #9e86ed;
  }

  :global(.svelte-flow__handle) {
    visibility: hidden;
  }

  .flow-container {
    width: 100vw;
    height: 100vh;
    position: relative;
  }

  .tab-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 20;
    padding: 8px 12px;
    overflow-x: auto;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #e5e5e5;
    white-space: nowrap;
    scrollbar-width: thin;
    scrollbar-color: #888 #e5e5e5;
  }

  .tab-bar::-webkit-scrollbar {
    height: 6px;
    display: block !important;
  }

  .tab-bar::-webkit-scrollbar-track {
    background: #e5e5e5;
  }

  .tab-bar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 6px;
  }

  .tab-bar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .tab-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: #fff;
    color: #333;
    cursor: pointer;
    font-size: 13px;
    font-weight: 400;
    flex-shrink: 0;
  }

  .tab-btn.active {
    background: #333;
    color: #fff;
    font-weight: 600;
  }
</style>
