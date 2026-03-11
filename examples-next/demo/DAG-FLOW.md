# Complex DAG Flow — Implementation Guide

A real-world example of rendering a **directional acyclic graph** with multiple root nodes, nested subflows, and cross-boundary edges using React Flow + avoid-nodes-edge routing.

This solves the common frustration with layout libraries like Dagre and ELK being poorly documented and hard to debug for complex graph structures.

---

## What This Example Demonstrates

```
API Gateway          Scheduler
     |                   |
 [Ingestion Layer]   [ML Pipeline]
  Parser  Validator   Feature Eng.  Train Model
     \      /    \       /              |
  [Normalization]  \    /         [Evaluation]
  Dedupe → Enrich ---→ ←        Validate  Benchmark
              \                       |       /
               → Event Bus ← --------+------+
              /      |      \
     Email Notify  Slack   Dashboard
          \        /           |
         Audit Log            |
           \                 /
            → Data Lake ← --+
```

- **3 root nodes** — disjoint entry points (API Gateway, Scheduler, Event Bus)
- **Nested subflows** — groups inside groups (Normalization inside Ingestion, Evaluation inside ML Pipeline)
- **Cross-boundary edges** — Enrich (inside Ingestion) connects to Feature Eng. (inside ML Pipeline)
- **Convergent sinks** — multiple paths merge into Data Lake

---

## File Structure

```
examples-next/demo/src/
├── App.tsx                        # Tab switcher — "Complex DAG" tab
├── flows/
│   └── DAGFlow.tsx                # DAG flow component with auto-layout
├── initialElementsDAG.ts          # Node and edge definitions
├── utils/
│   ├── auto-layout.ts             # Recursive dagre/ELK layout with group support
│   └── resolve-collisions.ts      # Bottom-up collision resolution
```

---

## How It Works

### 1. Node Definitions (`initialElementsDAG.ts`)

Nodes are organized into three independent trees plus a shared sink. Groups use `type: "group"` with minimal initial size (`width: 10, height: 10`) — the auto-layout algorithm computes the actual size based on children.

```tsx
// Group node — starts tiny, auto-layout sets real size
{
  id: "ingest-group",
  data: { label: "Ingestion Layer" },
  position: { x: 0, y: 70 },
  style: { width: 10, height: 10, /* styling */ },
  type: "group",
}

// Child node — expandParent lets React Flow auto-expand the group
{
  id: "parser",
  data: { label: "Parser" },
  position: { x: 20, y: 30 },
  parentId: "ingest-group",
  expandParent: true,
  style: { width: 110, height: 36 },
}
```

**Nesting:** `normalize-group` has `parentId: "ingest-group"` and its own children (`dedupe`, `enrich`), creating a group-inside-group.

### 2. Edge Definitions

Each edge gets a distinct color based on its source node and uses the `avoidNodes` type for orthogonal routing:

```tsx
function de(id: string, source: string, target: string): Edge {
  const color = dagEdgeColors[source] ?? "#94a3b8";
  return {
    id, source, target, type: "avoidNodes",
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
    data: { strokeColor: color },
  };
}

// Cross-boundary edge — Enrich (inside Ingestion) → Feature Eng. (inside ML)
de("e-enrich-feat", "enrich", "feature-eng"),
```

### 3. DAG Flow Component (`DAGFlow.tsx`)

Uses `runAutoLayoutWithGroups()` instead of `runAutoLayout()` — this is critical for nested groups.

```tsx
import { runAutoLayoutWithGroups } from "../utils/auto-layout";

// Default settings — dagre with top-to-bottom direction
const [settings] = useState({
  layoutDirection: "TB",
  layoutAlgorithm: "dagre",  // dagre handles nested groups more predictably
  layoutSpacing: 60,
  resolveCollisions: true,
  // ... edge routing settings
});

// Apply layout
const laid = await runAutoLayoutWithGroups(currentNodes, edges, {
  direction: settings.layoutDirection,
  algorithm: settings.layoutAlgorithm,
  spacing: settings.layoutSpacing,
});
setNodes(laid);

// Double requestAnimationFrame ensures React Flow has measured DOM before reset
requestAnimationFrame(() => requestAnimationFrame(() => {
  resetRouting();
  fitView({ duration: 300, padding: 0.1 });
}));
```

### 4. Recursive Auto-Layout (`auto-layout.ts`)

The `dagreLayoutWithGroups()` function uses a **bottom-up recursive strategy**:

```
Step 1: Layout deepest children first
  normalize-group → layout Dedupe, Enrich → compute group size (255 x 86)
  eval-group → layout Validate, Benchmark → compute group size (255 x 86)

Step 2: Layout parent groups using computed child sizes
  ingest-group → layout Parser, Validator, normalize-group(255x86) → compute size
  ml-group → layout Feature Eng., Train Model, eval-group(255x86) → compute size

Step 3: Layout root level using computed group sizes
  root → layout root1, ingest-group(computed), root2, ml-group(computed),
         root3, notify-*, dashboard, audit-log, data-lake
```

**Key implementation details:**

- Groups start at `10x10` — the layout algorithm computes and sets the real `width`/`height` in the node's style
- Cross-boundary edges are mapped to their nearest direct-child level so dagre sees proper connections between siblings
- All descendants of a child are mapped to that child when computing edges between siblings:

```tsx
// Map all descendants to their root-level sibling
const nodeToDirectChild = new Map();
for (const child of children) {
  nodeToDirectChild.set(child.id, child.id);
  const mapDescendants = (id) => {
    for (const d of childrenByParent.get(id) ?? []) {
      nodeToDirectChild.set(d.id, child.id);
      mapDescendants(d.id);
    }
  };
  mapDescendants(child.id);
}

// Edge from "enrich" (inside normalize-group, inside ingest-group)
// to "feature-eng" (inside ml-group)
// At root level: maps to ingest-group → ml-group edge
```

### 5. Collision Resolution (`resolve-collisions.ts`)

Bottom-up resolution ensures nested subflows are resolved before their parents:

```
1. Sort parent groups by nesting depth (deepest first)
2. For each parent: resolve all sibling children (including sub-groups)
3. Update positions in-place so parent size calculations use resolved positions
4. Group sizes are computed recursively from children
```

**Why bottom-up matters:** If you resolve root-level first, the group sizes are computed from pre-resolution child positions — which may be overlapping. Bottom-up means parent group sizes always reflect already-resolved children.

---

## Why Dagre Over ELK for This Example

| Aspect | Dagre | ELK |
| --- | --- | --- |
| Nested groups | Recursive manual approach — predictable | `INCLUDE_CHILDREN` — sometimes pulls nodes to unexpected positions |
| Cross-boundary edges | Mapped to sibling level — clean | Can create overly tall groups to accommodate hierarchy edges |
| Group sizing | Computed bottom-up from children | Computed by ELK — sometimes too generous |
| Debugging | Simple bounding box math | Opaque layout options, hard to debug |

Both are supported via the settings panel — switch between `dagre` and `elk` at runtime.

---

## Settings Panel

The DAG flow includes the full `AutoLayoutSettingsPanel` with:

| Setting | Description |
| --- | --- |
| Layout Direction | TB, LR, BT, RL |
| Layout Algorithm | dagre, elk, d3-hierarchy |
| Layout Spacing | Gap between nodes (px) |
| Re-Layout | Button to re-run layout after manual drag |
| Edge Rounding | Corner radius on routed paths |
| Edge-to-Node Spacing | Gap between edges and node boundaries |
| Edge-to-Edge Spacing | Gap between parallel edges |
| Resolve Collisions | Toggle collision resolution on drag stop |

---

## Adding More Nodes

To extend the DAG:

1. Add nodes to the appropriate tree array in `initialElementsDAG.ts`
2. Set `parentId` and `expandParent: true` for nodes inside groups
3. For new groups: use `type: "group"` with `width: 10, height: 10` — the layout computes the real size
4. Add edges with `de("edge-id", "source-id", "target-id")`
5. Add edge colors to `dagEdgeColors` for the new source nodes

The recursive layout handles any nesting depth automatically — no code changes needed in the layout or collision resolution.
