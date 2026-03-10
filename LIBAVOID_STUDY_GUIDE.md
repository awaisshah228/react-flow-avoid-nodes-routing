# libavoid Study Guide (for humans)

A plain-English guide to understanding the libavoid C++ routing engine — the algorithm behind `avoid-nodes-edge`.

**Source**: https://github.com/awaisshah228/adaptagrams/tree/master/cola/libavoid

---

## What does libavoid do?

Imagine you have boxes on a whiteboard and you need to draw lines between them. But the lines can't go through any box — they have to go around them. And the lines can only go horizontally or vertically (no diagonals). That's what libavoid does.

It takes:
- A list of **rectangles** (your nodes/boxes)
- A list of **connections** (which box connects to which)

And outputs:
- A series of **waypoints** for each connection that avoids all the boxes

---

## The Big Picture (4 steps)

```
Step 1: Register obstacles (boxes)
Step 2: Register connectors (lines between boxes)
Step 3: Solve routes (the hard part)
Step 4: Read the results (list of x,y points for each line)
```

That's it. Everything else is optimization and edge cases.

---

## How the routing actually works

### Step 3 broken down: `processTransaction()`

When you call `processTransaction()`, here's what happens inside:

### 3a. Build a Visibility Graph

Think of it like this: stand at the corner of a box and look around. Which other corners can you see in a straight line (horizontally or vertically) without another box blocking your view?

```
    ┌─────┐
    │  A  │
    └──┬──┘
       │  ← this vertical line is "visible" (nothing blocks it)
       │
    ┌──┴──┐         ┌─────┐
    │  B  │         │  C  │
    └─────┘         └─────┘
```

The visibility graph connects all corners/edges that can "see" each other. But since we only allow horizontal and vertical lines, it only checks in 4 directions (up, down, left, right) from each point.

**File**: `visibility.cpp`, `orthogonal.cpp` → `generateStaticOrthogonalVisGraph()`

### 3b. Find the Shortest Path

Now we have a graph of all possible horizontal/vertical segments. Finding the best route is just a shortest-path problem (like Google Maps but on a grid).

libavoid uses A* search — start at the source point, explore neighboring visible points, find the shortest path to the target.

**File**: `makepath.cpp` → `makePath()`

### 3c. Nudge Parallel Segments Apart

After finding paths, some edges might overlap (sitting on top of each other). The "nudging" step pushes them apart so you can see each one clearly.

```
Before nudging:          After nudging:

  A ──────── C           A ──────── C
  B ──────── D             B ──────── D
  (same line!)           (offset apart)
```

This uses a constraint solver (VPSC — Variable Placement with Separation Constraints) to figure out the minimum movement needed to separate overlapping segments.

**File**: `orthogonal.cpp` → `improveOrthogonalRoutes()`, `vpsc.cpp`

---

## File-by-File Guide

Read them in this order for the best understanding:

### Level 1: Start here

| File | What to learn | Difficulty |
|---|---|---|
| `libavoid.h` | The public API — see what's exposed | Easy |
| `geomtypes.h` | Basic types: `Point`, `Rectangle`, `Polygon` | Easy |
| `router.h` | The `Router` class — how everything connects | Medium |

### Level 2: The objects

| File | What to learn |
|---|---|
| `shape.h/cpp` | `ShapeRef` — how obstacles (boxes) are represented |
| `connector.h/cpp` | `ConnRef` — how connections (lines) are represented |
| `connectionpin.h/cpp` | `ShapeConnectionPin` — where on a box a line can attach |
| `obstacle.h/cpp` | Base class for shapes — shared obstacle logic |
| `connend.h/cpp` | `ConnEnd` — endpoints of a connection |

### Level 3: The algorithm (the interesting part)

| File | What to learn |
|---|---|
| `orthogonal.cpp` | **Read this first** — the main routing algorithm |
| `visibility.cpp` | How the visibility graph is built |
| `makepath.cpp` | The A* shortest path search |
| `graph.cpp` | The graph data structure used internally |
| `vertices.cpp` | Vertex representation in the graph |

### Level 4: Optimization & advanced

| File | What to learn |
|---|---|
| `vpsc.cpp` | The constraint solver for nudging parallel segments |
| `scanline.cpp` | Efficient overlap detection using sweep line algorithm |
| `hyperedge.cpp` | Edges that split into multiple targets |
| `junction.cpp` | Points where multiple connectors meet |
| `viscluster.cpp` | Grouping/cluster support |

---

## Key Concepts Explained

### Visibility Graph

A graph where:
- **Nodes** = corners of obstacles + connection endpoints
- **Edges** = straight horizontal/vertical lines between nodes that don't pass through any obstacle

Once you have this graph, finding a route is just finding a path through it.

### Orthogonal Routing

"Orthogonal" means only horizontal and vertical lines — no diagonals. This is what makes diagram edges look clean and professional (like circuit diagrams or flowcharts).

### Scanline Algorithm

Instead of checking every pair of obstacles for overlap (slow), a "scanline" sweeps across the diagram left-to-right (or top-to-bottom), only checking obstacles it's currently touching. Much faster for large diagrams.

**Used in**: Building the visibility graph efficiently.

### Nudging (VPSC)

When multiple edges share the same horizontal or vertical segment, they need to be pushed apart. VPSC (Variable Placement with Separation Constraints) is a 1D constraint solver:

- Input: "Edge A and Edge B must be at least 10px apart"
- Output: The minimum displacement needed to satisfy all constraints

It's essentially solving a system of inequalities.

### Incremental Updates

When you drag one box, libavoid doesn't recompute everything from scratch. It:
1. Finds which parts of the visibility graph are affected
2. Rebuilds only those parts
3. Re-routes only the connectors that touch the moved box

This is why dragging feels smooth even with hundreds of nodes.

### Connection Pins

A pin is a point on a shape where a connector can attach. Each pin has:
- **Position**: where on the shape (e.g., center of the right edge)
- **Direction**: which way the connector leaves (up/down/left/right)
- **Exclusive**: whether only one connector can use this pin

In `avoid-nodes-edge`, we create 5 pins per node: center, top, bottom, left, right.

### Transactions

Instead of processing every change immediately, changes are batched:

```cpp
router->moveShape(shape1, newRect1);   // queued
router->moveShape(shape2, newRect2);   // queued
router->addConnector(conn);            // queued
router->processTransaction();          // process all at once
```

This is much more efficient than processing each change individually.

---

## How avoid-nodes-edge uses libavoid

```
Your React/Svelte app
  │
  │ nodes + edges
  ▼
avoid-nodes-edge (TypeScript)
  │
  │ posts to Web Worker
  ▼
Web Worker
  │
  │ calls libavoid-js (WASM)
  ▼
libavoid (C++ compiled to WASM)
  │
  │ 1. Create Router
  │ 2. Add ShapeRefs (one per node)
  │ 3. Add ShapeConnectionPins (5 per node)
  │ 4. Add ConnRefs (one per edge)
  │ 5. processTransaction()  ← visibility graph + A* + nudging
  │ 6. Read displayRoute() for each ConnRef
  │
  │ returns polyline points
  ▼
avoid-nodes-edge converts to SVG path
  │
  │ posts back to main thread
  ▼
AvoidNodesEdge component renders the path
```

---

## Papers to Read

If you want the full academic background:

1. **"Orthogonal Connector Routing"** — Wybrow, Marriott, Stuckey (2010)
   - The core algorithm paper. Explains visibility graph construction for orthogonal routing.

2. **"Incremental Connector Routing"** — Wybrow, Marriott, Stuckey (2005)
   - How to efficiently update routes when obstacles move.

3. **"Solving Aesthetic Placement Problems using Adaptive Constraint Reduction"** — Dwyer, Marriott (2006)
   - Background on the VPSC constraint solver used in nudging.

Search these on Google Scholar — they're freely available.

---

## Quick Glossary

| Term | Meaning |
|---|---|
| **Router** | The main object that holds everything and solves routes |
| **ShapeRef** | A rectangle that edges must avoid (your nodes) |
| **ConnRef** | A connection between two points that needs routing (your edges) |
| **ConnEnd** | One end of a connection (source or target) |
| **ShapeConnectionPin** | A specific point on a shape where connectors can attach |
| **Visibility Graph** | A graph of all points that can "see" each other in straight lines |
| **Nudging** | Pushing overlapping parallel edge segments apart |
| **VPSC** | The constraint solver used for nudging |
| **Scanline** | An efficient sweep algorithm for finding overlaps |
| **Orthogonal** | Only horizontal and vertical lines (no diagonals) |
| **Transaction** | A batch of changes processed all at once |
| **Polyline** | A series of connected straight line segments (the route output) |
