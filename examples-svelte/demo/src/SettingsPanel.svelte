<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let edgeRounding = 8;
  export let edgeToEdgeSpacing = 10;
  export let edgeToNodeSpacing = 12;
  export let diagramGridSize = 0;
  export let shouldSplitEdgesNearHandle = true;
  export let autoBestSideConnection = true;
  export let resolveCollisions = true;

  export let showLayout = false;
  export let layoutAlgorithm = "elk";
  export let layoutDirection = "LR";
  export let layoutSpacing = 60;

  const dispatch = createEventDispatcher();

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  let open = !mobile;

  function onSlider(key: string, e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    dispatch("change", { key, value: val });
  }

  function onToggle(key: string, val: boolean) {
    dispatch("change", { key, value: val });
  }

  function onLayoutChange(key: string, value: string | number) {
    dispatch("layoutChange", { key, value });
  }

  function onReLayout() {
    dispatch("reLayout");
  }

  const sliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
    { key: "diagramGridSize", label: "Diagram Grid Size", min: 0, max: 48 },
  ] as const;

  const layoutSliders = [
    { key: "edgeRounding", label: "Edge Rounding", min: 0, max: 48 },
    { key: "edgeToEdgeSpacing", label: "Edge-to-Edge Spacing", min: 0, max: 24 },
    { key: "edgeToNodeSpacing", label: "Edge-to-Node Spacing", min: 0, max: 48 },
  ] as const;

  $: values = {
    edgeRounding,
    edgeToEdgeSpacing,
    edgeToNodeSpacing,
    diagramGridSize,
  } as Record<string, number>;
</script>

<div class="panel">
  <div class="header" on:click={() => (open = !open)}>
    <span>{open ? (showLayout ? "Auto Layout + libavoid" : "Settings") : (showLayout ? "Auto Layout" : "Settings")}</span>
    <span class="toggle">{open ? "\u2715" : ""}</span>
  </div>

  {#if open}
    {#if showLayout}
      <div class="section-label">Layout Engine</div>

      <div class="row">
        <label>Algorithm</label>
        <select value={layoutAlgorithm} on:change={(e) => onLayoutChange("layoutAlgorithm", e.currentTarget.value)}>
          <option value="elk">ELK (Layered)</option>
          <option value="dagre">Dagre</option>
          <option value="d3-hierarchy">D3 Hierarchy</option>
        </select>
      </div>

      <div class="row">
        <label>Direction</label>
        <select value={layoutDirection} on:change={(e) => onLayoutChange("layoutDirection", e.currentTarget.value)}>
          <option value="LR">Left to Right</option>
          <option value="TB">Top to Bottom</option>
          <option value="RL">Right to Left</option>
          <option value="BT">Bottom to Top</option>
        </select>
      </div>

      <div class="row">
        <label>Node Spacing</label>
        <div class="slider-group">
          <input type="range" min={20} max={120} value={layoutSpacing} on:input={(e) => onLayoutChange("layoutSpacing", Number(e.currentTarget.value))} />
          <span class="value">{layoutSpacing}</span>
        </div>
      </div>

      <button class="relayout-btn" on:click={onReLayout}>Re-Layout</button>

      <div class="section-label">libavoid Routing</div>

      {#each layoutSliders as { key, label, min, max }}
        <div class="row">
          <label>{label}</label>
          <div class="slider-group">
            <input type="range" {min} {max} value={values[key]} on:input={(e) => onSlider(key, e)} />
            <span class="value">{values[key]}</span>
          </div>
        </div>
      {/each}

      <div class="row">
        <label>Auto Best Side</label>
        <div class="btn-group">
          <button class:active={autoBestSideConnection} on:click={() => onToggle("autoBestSideConnection", true)}>True</button>
          <button class:active={!autoBestSideConnection} on:click={() => onToggle("autoBestSideConnection", false)}>False</button>
        </div>
      </div>

      <div class="row">
        <label>Resolve Collisions</label>
        <div class="btn-group">
          <button class:active={resolveCollisions} on:click={() => onToggle("resolveCollisions", true)}>True</button>
          <button class:active={!resolveCollisions} on:click={() => onToggle("resolveCollisions", false)}>False</button>
        </div>
      </div>
    {:else}
      {#each sliders as { key, label, min, max }}
        <div class="row">
          <label>{label}</label>
          <div class="slider-group">
            <input type="range" {min} {max} value={values[key]} on:input={(e) => onSlider(key, e)} />
            <span class="value">{values[key]}</span>
          </div>
        </div>
      {/each}

      <div class="row">
        <label>Split Edges Near Handle</label>
        <div class="btn-group">
          <button class:active={shouldSplitEdgesNearHandle} on:click={() => onToggle("shouldSplitEdgesNearHandle", true)}>True</button>
          <button class:active={!shouldSplitEdgesNearHandle} on:click={() => onToggle("shouldSplitEdgesNearHandle", false)}>False</button>
        </div>
      </div>

      <div class="row">
        <label>Resolve Collisions</label>
        <div class="btn-group">
          <button class:active={resolveCollisions} on:click={() => onToggle("resolveCollisions", true)}>True</button>
          <button class:active={!resolveCollisions} on:click={() => onToggle("resolveCollisions", false)}>False</button>
        </div>
      </div>

      <div class="row">
        <label>Auto Best Side</label>
        <div class="btn-group">
          <button class:active={autoBestSideConnection} on:click={() => onToggle("autoBestSideConnection", true)}>True</button>
          <button class:active={!autoBestSideConnection} on:click={() => onToggle("autoBestSideConnection", false)}>False</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
    min-width: 240px;
    max-width: min(320px, calc(100vw - 24px));
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    font-size: 13px;
  }

  @media (max-width: 767px) {
    .panel {
      top: 90px;
      max-height: calc(100vh - 100px);
    }
  }

  .header {
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
  }

  .toggle {
    font-size: 11px;
    color: #888;
  }

  .section-label {
    font-weight: 500;
    margin-bottom: 8px;
    margin-top: 8px;
    font-size: 12px;
    color: #888;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-group input[type="range"] {
    width: 100px;
  }

  .value {
    min-width: 28px;
    text-align: right;
  }

  .btn-group {
    display: flex;
    gap: 4px;
  }

  .btn-group button {
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: #fff;
    color: #333;
    cursor: pointer;
  }

  .btn-group button.active {
    background: #333;
    color: #fff;
  }

  select {
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  .relayout-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: 1px solid #818cf8;
    background: #818cf8;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    width: 100%;
    margin-bottom: 12px;
  }
</style>
