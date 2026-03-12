(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/ServerRoutedEdge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RoutesContext",
    ()=>RoutesContext,
    "ServerRoutedEdge",
    ()=>ServerRoutedEdge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * A simple edge component that renders a server-computed SVG path.
 * Uses a shared context to look up the route for each edge by ID.
 * Supports strokeColor and markerEnd from server edge data.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/@xyflow/react/dist/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$system$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/@xyflow/system/dist/esm/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const RoutesContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({});
function ServerRoutedEdgeComponent(props) {
    _s();
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } = props;
    const routes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(RoutesContext);
    const route = routes[id];
    const strokeColor = data?.strokeColor ?? "#94a3b8";
    const strokeDasharray = data?.strokeDasharray;
    const style = {
        stroke: strokeColor,
        strokeWidth: 2,
        ...strokeDasharray ? {
            strokeDasharray
        } : {}
    };
    if (route) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["BaseEdge"], {
            id: id,
            path: route.path,
            style: style,
            markerEnd: markerEnd
        }, void 0, false, {
            fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/ServerRoutedEdge.tsx",
            lineNumber: 39,
            columnNumber: 12
        }, this);
    }
    // Fallback: smooth step while waiting for server response
    const [fallbackPath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$system$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSmoothStepPath"])({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["BaseEdge"], {
        id: id,
        path: fallbackPath,
        style: {
            ...style,
            strokeDasharray: "6,3"
        },
        markerEnd: markerEnd
    }, void 0, false, {
        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/ServerRoutedEdge.tsx",
        lineNumber: 52,
        columnNumber: 10
    }, this);
}
_s(ServerRoutedEdgeComponent, "Bfy8WF8u+h+o3f0OYwCrONLy18A=");
_c = ServerRoutedEdgeComponent;
const ServerRoutedEdge = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(ServerRoutedEdgeComponent);
_c1 = ServerRoutedEdge;
var _c, _c1;
__turbopack_context__.k.register(_c, "ServerRoutedEdgeComponent");
__turbopack_context__.k.register(_c1, "ServerRoutedEdge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/GroupNode.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GroupNode",
    ()=>GroupNode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * Simple group node component for server-rendered diagrams.
 * Renders as a transparent container with a label.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
;
function GroupNodeComponent({ data }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: "100%",
            height: "100%",
            position: "relative"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                position: "absolute",
                top: 4,
                left: 8,
                fontSize: 10,
                color: "#888",
                fontWeight: 500,
                pointerEvents: "none",
                userSelect: "none"
            },
            children: data?.label
        }, void 0, false, {
            fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/GroupNode.tsx",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/GroupNode.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = GroupNodeComponent;
const GroupNode = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(GroupNodeComponent);
_c1 = GroupNode;
var _c, _c1;
__turbopack_context__.k.register(_c, "GroupNodeComponent");
__turbopack_context__.k.register(_c1, "GroupNode");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DiagramView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/@xyflow/react/dist/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$components$2f$ServerRoutedEdge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/ServerRoutedEdge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$components$2f$GroupNode$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/GroupNode.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes = {
    avoidNodes: __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$components$2f$ServerRoutedEdge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ServerRoutedEdge"]
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes = {
    group: __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$components$2f$GroupNode$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GroupNode"]
};
const tabs = [
    {
        key: "basic",
        label: "Basic"
    },
    {
        key: "group",
        label: "Groups"
    },
    {
        key: "subflows",
        label: "Subflows"
    },
    {
        key: "dag",
        label: "Complex DAG"
    },
    {
        key: "tree",
        label: "Tree (Circles)"
    },
    {
        key: "elk",
        label: "Auto Layout"
    },
    {
        key: "auto-layout-groups",
        label: "Auto Layout + Groups"
    },
    {
        key: "stress",
        label: "Stress Test (200)"
    }
];
function DiagramView() {
    _s();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("basic");
    const [nodes, setNodes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [edges, setEdges] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [routes, setRoutes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const fetchDiagram = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "DiagramView.useCallback[fetchDiagram]": (tab)=>{
            setLoading(true);
            fetch(`/api/diagram?tab=${tab}`).then({
                "DiagramView.useCallback[fetchDiagram]": (res)=>res.json()
            }["DiagramView.useCallback[fetchDiagram]"]).then({
                "DiagramView.useCallback[fetchDiagram]": (data)=>{
                    setNodes(data.nodes);
                    setEdges(data.edges);
                    setRoutes(data.routes);
                    setLoading(false);
                }
            }["DiagramView.useCallback[fetchDiagram]"]).catch({
                "DiagramView.useCallback[fetchDiagram]": (err)=>{
                    console.error("Failed to fetch diagram:", err);
                    setLoading(false);
                }
            }["DiagramView.useCallback[fetchDiagram]"]);
        }
    }["DiagramView.useCallback[fetchDiagram]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DiagramView.useEffect": ()=>{
            fetchDiagram(activeTab);
        }
    }["DiagramView.useEffect"], [
        activeTab,
        fetchDiagram
    ]);
    const handleTabClick = (tab)=>{
        setActiveTab(tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        window.history.replaceState({}, "", url.toString());
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 4,
                    padding: "8px 12px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                    overflowX: "auto",
                    flexShrink: 0
                },
                children: [
                    tabs.map(({ key, label })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>handleTabClick(key),
                            style: {
                                padding: "6px 14px",
                                borderRadius: 6,
                                border: activeTab === key ? "1px solid #818cf8" : "1px solid #e2e8f0",
                                background: activeTab === key ? "#818cf8" : "#fff",
                                color: activeTab === key ? "#fff" : "#334155",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: activeTab === key ? 600 : 400,
                                whiteSpace: "nowrap",
                                transition: "all 0.15s"
                            },
                            children: label
                        }, key, false, {
                            fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                            lineNumber: 86,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            marginLeft: "auto",
                            fontSize: 11,
                            color: "#94a3b8",
                            display: "flex",
                            alignItems: "center",
                            whiteSpace: "nowrap"
                        },
                        children: "Next.js API Route: ELK layout + edge routing"
                    }, void 0, false, {
                        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1,
                    position: "relative"
                },
                children: [
                    loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        style: {
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 20,
                            background: "rgba(255,255,255,0.8)",
                            fontSize: 14,
                            color: "#64748b"
                        },
                        children: "Loading diagram from server..."
                    }, void 0, false, {
                        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ReactFlowProvider"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$components$2f$ServerRoutedEdge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RoutesContext"].Provider, {
                            value: routes,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ReactFlow"], {
                                nodes: nodes,
                                edges: edges,
                                edgeTypes: edgeTypes,
                                nodeTypes: nodeTypes,
                                fitView: true,
                                nodesDraggable: false,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Background"], {}, void 0, false, {
                                        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                                        lineNumber: 149,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f40$xyflow$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Controls"], {}, void 0, false, {
                                        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                                        lineNumber: 150,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, activeTab, true, {
                                fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                                lineNumber: 140,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                            lineNumber: 139,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                        lineNumber: 138,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
                lineNumber: 120,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_s(DiagramView, "vf4sJC9gWAw+IIzfUD/1FPL9UCI=");
_c = DiagramView;
var _c;
__turbopack_context__.k.register(_c, "DiagramView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/components/DiagramView.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=avoid-nodes-pro-example_examples-server_nextjs-example_src_components_ae7bc3ae._.js.map