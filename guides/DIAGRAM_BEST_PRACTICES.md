# Diagram Best Practices

Best practices for creating clear, readable diagrams with `avoid-nodes-edge` and React Flow.

---

## 1. Node Layout

### Use consistent node sizes
Keep nodes the same width/height within a category. This creates visual rhythm and makes the flow scannable.

```ts
// Good — uniform sizing
style: { width: 140, height: 50 }

// Avoid — random sizes that add visual noise
style: { width: 87, height: 63 }
```

### Space nodes generously
Leave enough room between nodes for edges to route cleanly. A minimum of **150–200px** horizontal gap and **80–120px** vertical gap works well.

```ts
// Good — enough room for edges to route
{ position: { x: 0, y: 0 } }    // Node A
{ position: { x: 300, y: 0 } }   // Node B (300px apart)

// Too tight — edges will crowd
{ position: { x: 0, y: 0 } }
{ position: { x: 160, y: 0 } }   // Only 20px gap after 140px-wide node
```

### Align nodes to a grid
Snap node positions to a grid (e.g., multiples of 50px). Aligned nodes look intentional and professional.

```ts
position: { x: 300, y: 150 }  // Good — grid-aligned
position: { x: 287, y: 143 }  // Avoid — looks arbitrary
```

### Flow left-to-right or top-to-bottom
Pick one primary direction. Left-to-right is the most natural for workflows. Top-to-bottom works well for hierarchies.

```
Good: Start → Validate → Transform → Output

Avoid: random node placement with no clear direction
```

---

## 2. Groups

### Use groups to show logical boundaries
Group related nodes together. This immediately communicates which nodes belong to the same stage or domain.

```ts
{
  id: "group-processing",
  type: "group",
  data: { label: "Processing" },
  style: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    border: "1px dashed #3b82f6",
    borderRadius: 8,
  },
}
```

### Keep groups visually distinct
Use different background tints and border colors per group. Keep backgrounds very light (5–10% opacity) so child nodes remain readable.

```ts
// Processing — blue tint
backgroundColor: "rgba(59, 130, 246, 0.05)"
border: "1px dashed #3b82f6"

// Storage — green tint
backgroundColor: "rgba(34, 197, 94, 0.05)"
border: "1px dashed #22c55e"
```

### Add padding inside groups
Place child nodes at least **30–50px** from the group border. This prevents children from touching the group edge.

```ts
// Group at (250, 0) with child at (50, 50) relative to group
{ id: "group-a", position: { x: 250, y: 0 }, style: { width: 380, height: 420 } }
{ id: "child-1", position: { x: 50, y: 50 }, parentId: "group-a" }
```

---

## 3. Edges

### Color edges by source node
Assign a unique color to each source node so you can trace where each edge originates at a glance.

```ts
const edgeColors: Record<string, string> = {
  "start":     "#e91e63", // magenta
  "validate":  "#2196f3", // blue
  "transform": "#ff9800", // orange
  "enrich":    "#9c27b0", // purple
  "merge":     "#009688", // teal
  "decision":  "#f44336", // red
};
```

### Choose maximally distinct colors
Avoid similar shades (e.g., two blues or two purples). Use colors from different hue families:

| Color     | Hex       | Use for            |
| --------- | --------- | ------------------ |
| Magenta   | `#e91e63` | Primary inputs     |
| Blue      | `#2196f3` | Validation         |
| Orange    | `#ff9800` | Transformation     |
| Purple    | `#9c27b0` | Enrichment         |
| Teal      | `#009688` | Merging/joining    |
| Red       | `#f44336` | Decisions/errors   |
| Green     | `#4caf50` | Success/retry      |
| Cyan      | `#00bcd4` | Logging/monitoring |
| Brown     | `#795548` | Notifications      |
| Indigo    | `#3f51b5` | Formatting         |
| Deep Orange | `#ff5722` | Filtering        |

### Add directional markers
Always show arrow markers at the target end so the flow direction is obvious. Use `MarkerType.ArrowClosed` with a small size (12x12) and matching color.

```ts
import { MarkerType } from "@xyflow/react";

markerEnd: {
  type: MarkerType.ArrowClosed,
  width: 12,
  height: 12,
  color: "#e91e63", // match the edge stroke color
}
```

### Use labels sparingly
Only label edges that need explanation. Not every connection needs a label — obvious flows (A → B) don't need text.

```ts
// Good — label explains the condition
data: { label: "retry" }
data: { label: "fail" }

// Unnecessary — the connection is self-evident
data: { label: "goes to next step" }
```

### Use dashed lines for special flows
Dashed edges signal non-standard paths like retries, fallbacks, or optional routes. This makes them stand out from normal flow.

```ts
data: { strokeDasharray: "5,5", label: "retry" }
```

---

## 4. Edge Routing Options

### Tune spacing for clarity
Adjust the routing options based on your diagram density:

```ts
useAvoidNodesRouterFromWorker(nodes, edges, {
  edgeToNodeSpacing: 12,  // gap between edges and nodes
  edgeToEdgeSpacing: 10,  // gap between parallel edges
  edgeRounding: 5,        // rounded corners (0 = sharp)
  diagramGridSize: 0,     // grid snap (0 = off)
});
```

| Diagram type     | edgeToNodeSpacing | edgeToEdgeSpacing | edgeRounding |
| ---------------- | ----------------- | ----------------- | ------------ |
| Sparse (< 10 nodes) | 8–12           | 8–10              | 5            |
| Medium (10–25 nodes) | 10–15          | 10–12             | 5            |
| Dense (25+ nodes)    | 15–20          | 12–15             | 8            |

### Place blocker nodes strategically
Use invisible or low-opacity nodes to force edges to route around specific areas:

```ts
{
  id: "blocker",
  data: { label: "Blocker" },
  position: { x: 530, y: 60 },
  style: { width: 120, height: 50, opacity: 0.6 },
}
```

---

## 5. Visual Hierarchy

### Highlight start and end nodes
Use colored borders to mark entry points and terminal nodes:

```ts
// Start node — pink border
style: { border: "2px solid #f472b6", borderRadius: 12 }

// Success node — green border
style: { border: "2px solid #4ade80", borderRadius: 12 }

// Error node — red border
style: { border: "2px solid #f87171", borderRadius: 12 }
```

### Keep a clear visual flow
Structure your diagram in layers:

```
Layer 1 (left):   Input / Source nodes
Layer 2 (middle): Processing / Decision nodes
Layer 3 (right):  Output / Result nodes
```

### Limit fan-out
A single node connecting to more than **4–5 targets** gets hard to read. Consider adding an intermediate node to split the flow:

```
Bad:   Start → [A, B, C, D, E, F]  (6 edges from one node)
Good:  Start → Router → [A, B, C]
                Router → [D, E, F]
```

---

## 6. Auto Layout

### Use ELK for hierarchical diagrams
When your diagram has groups with cross-group edges, use ELK with `INCLUDE_CHILDREN` to let the layout engine handle group positioning:

```ts
layoutOptions: {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.spacing.nodeNode": "60",
}
```

### Use Dagre for flat diagrams
For simple diagrams without nested groups, Dagre is faster and produces good results:

```ts
import dagre from "@dagrejs/dagre";
const g = new dagre.graphlib.Graph();
g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
```

---

## Quick Checklist

- [ ] Nodes are aligned to a consistent grid
- [ ] Groups have distinct colors with light backgrounds
- [ ] Each source node has a unique, clearly different edge color
- [ ] Arrow markers point from source to target
- [ ] Special flows (retry, error) use dashed lines
- [ ] Start/end nodes have colored borders
- [ ] Enough spacing between nodes for clean edge routing
- [ ] Labels only on edges that need explanation
- [ ] Flow direction is consistent (left→right or top→bottom)
- [ ] No node has more than 4–5 outgoing edges
