module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/diagrams.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * All diagram data sets — stored server-side.
 * The server computes layout + routing, the client just renders.
 */ // Simple types matching what React Flow expects on the client
__turbopack_context__.s([
    "diagrams",
    ()=>diagrams
]);
function makeEdge(id, source, target, color, extra) {
    return {
        id,
        source,
        target,
        type: "avoidNodes",
        markerEnd: {
            type: "arrowclosed",
            width: 12,
            height: 12,
            color
        },
        data: {
            strokeColor: color,
            ...extra
        }
    };
}
// ════════════════════════════════════════════════════════════════
// BASIC
// ════════════════════════════════════════════════════════════════
const basicColors = {
    start: "#e91e63",
    validate: "#2196f3",
    transform: "#ff9800",
    enrich: "#9c27b0",
    merge: "#009688",
    decision: "#f44336",
    retry: "#4caf50",
    log: "#00bcd4",
    notify: "#795548"
};
const basicNodes = [
    {
        id: "start",
        data: {
            label: "Start"
        },
        position: {
            x: 0,
            y: 150
        },
        style: {
            width: 150,
            height: 50,
            border: "2px solid #f472b6",
            borderRadius: 12
        }
    },
    {
        id: "validate",
        data: {
            label: "Validate"
        },
        position: {
            x: 300,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "transform",
        data: {
            label: "Transform"
        },
        position: {
            x: 300,
            y: 150
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "enrich",
        data: {
            label: "Enrich"
        },
        position: {
            x: 300,
            y: 300
        },
        style: {
            width: 140,
            height: 50,
            border: "2px solid #f472b6",
            borderRadius: 12
        }
    },
    {
        id: "blocker1",
        data: {
            label: "Blocker"
        },
        position: {
            x: 530,
            y: 60
        },
        style: {
            width: 120,
            height: 50,
            opacity: 0.6
        }
    },
    {
        id: "merge",
        data: {
            label: "Merge"
        },
        position: {
            x: 700,
            y: 75
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "decision",
        data: {
            label: "Decision"
        },
        position: {
            x: 700,
            y: 225
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "blocker2",
        data: {
            label: "Cache"
        },
        position: {
            x: 900,
            y: 150
        },
        style: {
            width: 100,
            height: 50,
            opacity: 0.6
        }
    },
    {
        id: "success",
        data: {
            label: "Success"
        },
        position: {
            x: 1100,
            y: 50
        },
        style: {
            width: 140,
            height: 50,
            border: "2px solid #4ade80",
            borderRadius: 12
        }
    },
    {
        id: "retry",
        data: {
            label: "Retry"
        },
        position: {
            x: 1100,
            y: 200
        },
        style: {
            width: 140,
            height: 50,
            border: "2px solid #facc15",
            borderRadius: 12
        }
    },
    {
        id: "error",
        data: {
            label: "Error"
        },
        position: {
            x: 1100,
            y: 350
        },
        style: {
            width: 140,
            height: 50,
            border: "2px solid #f87171",
            borderRadius: 12
        }
    },
    {
        id: "log",
        data: {
            label: "Log"
        },
        position: {
            x: 500,
            y: 400
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "notify",
        data: {
            label: "Notify"
        },
        position: {
            x: 750,
            y: 400
        },
        style: {
            width: 120,
            height: 50
        }
    }
];
const basicEdges = [
    makeEdge("e-start-validate", "start", "validate", basicColors.start, {
        label: "check"
    }),
    makeEdge("e-start-transform", "start", "transform", basicColors.start, {
        label: "process"
    }),
    makeEdge("e-start-enrich", "start", "enrich", basicColors.start, {
        label: "extend"
    }),
    makeEdge("e-validate-merge", "validate", "merge", basicColors.validate),
    makeEdge("e-transform-merge", "transform", "merge", basicColors.transform),
    makeEdge("e-enrich-decision", "enrich", "decision", basicColors.enrich),
    makeEdge("e-transform-decision", "transform", "decision", basicColors.transform),
    makeEdge("e-merge-success", "merge", "success", basicColors.merge, {
        label: "ok"
    }),
    makeEdge("e-decision-success", "decision", "success", basicColors.decision),
    makeEdge("e-decision-retry", "decision", "retry", basicColors.decision, {
        label: "retry"
    }),
    makeEdge("e-decision-error", "decision", "error", basicColors.decision, {
        label: "fail"
    }),
    makeEdge("e-retry-transform", "retry", "transform", basicColors.retry, {
        label: "again",
        strokeDasharray: "5,5"
    }),
    makeEdge("e-enrich-log", "enrich", "log", basicColors.enrich),
    makeEdge("e-log-notify", "log", "notify", basicColors.log),
    makeEdge("e-notify-error", "notify", "error", basicColors.notify)
];
// ════════════════════════════════════════════════════════════════
// GROUPS
// ════════════════════════════════════════════════════════════════
const groupColors = {
    start: "#e91e63",
    validate: "#2196f3",
    transform: "#ff9800",
    enrich: "#9c27b0",
    merge: "#009688",
    decision: "#f44336",
    retry: "#4caf50",
    log: "#00bcd4",
    notify: "#795548"
};
const groupNodes = [
    {
        id: "start",
        data: {
            label: "Start"
        },
        position: {
            x: 0,
            y: 200
        },
        style: {
            width: 150,
            height: 50,
            border: "2px solid #f472b6",
            borderRadius: 12
        }
    },
    {
        id: "group-processing",
        data: {
            label: "Processing"
        },
        type: "group",
        position: {
            x: 250,
            y: 0
        },
        style: {
            width: 380,
            height: 420,
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            border: "1px dashed #3b82f6",
            borderRadius: 8
        }
    },
    {
        id: "validate",
        data: {
            label: "Validate"
        },
        position: {
            x: 50,
            y: 50
        },
        parentId: "group-processing",
        expandParent: true,
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "transform",
        data: {
            label: "Transform"
        },
        position: {
            x: 50,
            y: 170
        },
        parentId: "group-processing",
        expandParent: true,
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "enrich",
        data: {
            label: "Enrich"
        },
        position: {
            x: 50,
            y: 290
        },
        parentId: "group-processing",
        expandParent: true,
        style: {
            width: 140,
            height: 50,
            border: "2px solid #f472b6",
            borderRadius: 12
        }
    },
    {
        id: "blocker1",
        data: {
            label: "Blocker"
        },
        position: {
            x: 680,
            y: 80
        },
        style: {
            width: 120,
            height: 50,
            opacity: 0.6
        }
    },
    {
        id: "group-output",
        data: {
            label: "Output"
        },
        type: "group",
        position: {
            x: 940,
            y: 20
        },
        style: {
            width: 340,
            height: 460,
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            border: "1px dashed #22c55e",
            borderRadius: 8
        }
    },
    {
        id: "success",
        data: {
            label: "Success"
        },
        position: {
            x: 50,
            y: 50
        },
        parentId: "group-output",
        expandParent: true,
        style: {
            width: 140,
            height: 50,
            border: "2px solid #4ade80",
            borderRadius: 12
        }
    },
    {
        id: "retry",
        data: {
            label: "Retry"
        },
        position: {
            x: 50,
            y: 190
        },
        parentId: "group-output",
        expandParent: true,
        style: {
            width: 140,
            height: 50,
            border: "2px solid #facc15",
            borderRadius: 12
        }
    },
    {
        id: "error",
        data: {
            label: "Error"
        },
        position: {
            x: 50,
            y: 330
        },
        parentId: "group-output",
        expandParent: true,
        style: {
            width: 140,
            height: 50,
            border: "2px solid #f87171",
            borderRadius: 12
        }
    },
    {
        id: "merge",
        data: {
            label: "Merge"
        },
        position: {
            x: 680,
            y: 200
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "decision",
        data: {
            label: "Decision"
        },
        position: {
            x: 680,
            y: 320
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "log",
        data: {
            label: "Log"
        },
        position: {
            x: 500,
            y: 480
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "notify",
        data: {
            label: "Notify"
        },
        position: {
            x: 750,
            y: 480
        },
        style: {
            width: 120,
            height: 50
        }
    }
];
const groupEdges = [
    makeEdge("e-start-validate", "start", "validate", groupColors.start, {
        label: "check"
    }),
    makeEdge("e-start-transform", "start", "transform", groupColors.start, {
        label: "process"
    }),
    makeEdge("e-start-enrich", "start", "enrich", groupColors.start, {
        label: "extend"
    }),
    makeEdge("e-validate-merge", "validate", "merge", groupColors.validate),
    makeEdge("e-transform-merge", "transform", "merge", groupColors.transform),
    makeEdge("e-enrich-decision", "enrich", "decision", groupColors.enrich),
    makeEdge("e-transform-decision", "transform", "decision", groupColors.transform),
    makeEdge("e-merge-success", "merge", "success", groupColors.merge, {
        label: "ok"
    }),
    makeEdge("e-decision-success", "decision", "success", groupColors.decision),
    makeEdge("e-decision-retry", "decision", "retry", groupColors.decision, {
        label: "retry"
    }),
    makeEdge("e-decision-error", "decision", "error", groupColors.decision, {
        label: "fail"
    }),
    makeEdge("e-retry-transform", "retry", "transform", groupColors.retry, {
        label: "again",
        strokeDasharray: "5,5"
    }),
    makeEdge("e-enrich-log", "enrich", "log", groupColors.enrich),
    makeEdge("e-log-notify", "log", "notify", groupColors.log),
    makeEdge("e-notify-error", "notify", "error", groupColors.notify)
];
// ════════════════════════════════════════════════════════════════
// SUBFLOWS
// ════════════════════════════════════════════════════════════════
const sfColors = {
    "1": "#e91e63",
    "2a": "#2196f3",
    "3": "#ff9800",
    "4a": "#009688",
    "4b1": "#9c27b0"
};
const subflowNodes = [
    {
        id: "1",
        data: {
            label: "Node 0"
        },
        position: {
            x: 250,
            y: 5
        },
        style: {
            width: 150,
            height: 40
        }
    },
    {
        id: "2",
        data: {
            label: "Group A"
        },
        position: {
            x: 50,
            y: 100
        },
        style: {
            width: 220,
            height: 140,
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            border: "1px dashed #3b82f6",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "2a",
        data: {
            label: "Node A.1"
        },
        position: {
            x: 35,
            y: 50
        },
        parentId: "2",
        expandParent: true,
        style: {
            width: 150,
            height: 40
        }
    },
    {
        id: "3",
        data: {
            label: "Node 1"
        },
        position: {
            x: 380,
            y: 80
        },
        style: {
            width: 150,
            height: 40
        }
    },
    {
        id: "4",
        data: {
            label: "Group B"
        },
        position: {
            x: 340,
            y: 200
        },
        style: {
            width: 380,
            height: 340,
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            border: "1px dashed #22c55e",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "4a",
        data: {
            label: "Node B.1"
        },
        position: {
            x: 30,
            y: 55
        },
        parentId: "4",
        expandParent: true,
        style: {
            width: 150,
            height: 40
        }
    },
    {
        id: "4b",
        data: {
            label: "Group B.A"
        },
        position: {
            x: 30,
            y: 140
        },
        style: {
            backgroundColor: "rgba(255, 0, 255, 0.08)",
            height: 170,
            width: 320,
            border: "1px dashed #d946ef",
            borderRadius: 8
        },
        parentId: "4",
        type: "group"
    },
    {
        id: "4b1",
        data: {
            label: "Node B.A.1"
        },
        position: {
            x: 30,
            y: 40
        },
        parentId: "4b",
        expandParent: true,
        style: {
            width: 110,
            height: 40
        }
    },
    {
        id: "4b2",
        data: {
            label: "Node B.A.2"
        },
        position: {
            x: 180,
            y: 100
        },
        parentId: "4b",
        expandParent: true,
        style: {
            width: 110,
            height: 40
        }
    }
];
const subflowEdges = [
    makeEdge("e1-3", "1", "3", sfColors["1"]),
    makeEdge("e2a-4a", "2a", "4a", sfColors["2a"]),
    makeEdge("e3-4b", "3", "4b1", sfColors["3"]),
    makeEdge("e4a-4b1", "4a", "4b1", sfColors["4a"]),
    makeEdge("e4a-4b2", "4a", "4b2", sfColors["4a"]),
    makeEdge("e4b1-4b2", "4b1", "4b2", sfColors["4b1"])
];
// ════════════════════════════════════════════════════════════════
// DAG
// ════════════════════════════════════════════════════════════════
const dagColors = {
    root1: "#818cf8",
    root2: "#f59e0b",
    root3: "#ec4899",
    parser: "#3b82f6",
    validator: "#8b5cf6",
    dedupe: "#d946ef",
    enrich: "#06b6d4",
    "feature-eng": "#22c55e",
    train: "#14b8a6",
    "validate-model": "#fb923c",
    benchmark: "#ef4444",
    "notify-email": "#a855f7",
    "notify-slack": "#f43f5e",
    dashboard: "#4ade80",
    "audit-log": "#64748b"
};
const dagNodes = [
    // Tree 1
    {
        id: "root1",
        data: {
            label: "API Gateway"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 130,
            height: 40,
            border: "2px solid #818cf8",
            borderRadius: 12
        }
    },
    {
        id: "ingest-group",
        data: {
            label: "Ingestion Layer"
        },
        position: {
            x: 0,
            y: 70
        },
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(59, 130, 246, 0.05)",
            border: "1px dashed #3b82f6",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "parser",
        data: {
            label: "Parser"
        },
        position: {
            x: 20,
            y: 30
        },
        parentId: "ingest-group",
        expandParent: true,
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "validator",
        data: {
            label: "Validator"
        },
        position: {
            x: 150,
            y: 30
        },
        parentId: "ingest-group",
        expandParent: true,
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "normalize-group",
        data: {
            label: "Normalization"
        },
        position: {
            x: 20,
            y: 90
        },
        parentId: "ingest-group",
        expandParent: true,
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(255, 0, 255, 0.06)",
            border: "1px dashed #d946ef",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "dedupe",
        data: {
            label: "Deduplicate"
        },
        position: {
            x: 15,
            y: 30
        },
        parentId: "normalize-group",
        expandParent: true,
        style: {
            width: 100,
            height: 36
        }
    },
    {
        id: "enrich-dag",
        data: {
            label: "Enrich"
        },
        position: {
            x: 135,
            y: 30
        },
        parentId: "normalize-group",
        expandParent: true,
        style: {
            width: 100,
            height: 36
        }
    },
    // Tree 2
    {
        id: "root2",
        data: {
            label: "Scheduler"
        },
        position: {
            x: 400,
            y: 0
        },
        style: {
            width: 120,
            height: 40,
            border: "2px solid #f59e0b",
            borderRadius: 12
        }
    },
    {
        id: "ml-group",
        data: {
            label: "ML Pipeline"
        },
        position: {
            x: 370,
            y: 70
        },
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            border: "1px dashed #22c55e",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "feature-eng",
        data: {
            label: "Feature Eng."
        },
        position: {
            x: 20,
            y: 30
        },
        parentId: "ml-group",
        expandParent: true,
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "train",
        data: {
            label: "Train Model"
        },
        position: {
            x: 150,
            y: 30
        },
        parentId: "ml-group",
        expandParent: true,
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "eval-group",
        data: {
            label: "Evaluation"
        },
        position: {
            x: 20,
            y: 90
        },
        parentId: "ml-group",
        expandParent: true,
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(251, 146, 60, 0.08)",
            border: "1px dashed #fb923c",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "validate-model",
        data: {
            label: "Validate"
        },
        position: {
            x: 15,
            y: 30
        },
        parentId: "eval-group",
        expandParent: true,
        style: {
            width: 100,
            height: 36
        }
    },
    {
        id: "benchmark",
        data: {
            label: "Benchmark"
        },
        position: {
            x: 135,
            y: 30
        },
        parentId: "eval-group",
        expandParent: true,
        style: {
            width: 100,
            height: 36
        }
    },
    // Tree 3
    {
        id: "root3",
        data: {
            label: "Event Bus"
        },
        position: {
            x: 200,
            y: 340
        },
        style: {
            width: 120,
            height: 40,
            border: "2px solid #ec4899",
            borderRadius: 12
        }
    },
    {
        id: "notify-email",
        data: {
            label: "Email Notify"
        },
        position: {
            x: 80,
            y: 410
        },
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "notify-slack",
        data: {
            label: "Slack Notify"
        },
        position: {
            x: 210,
            y: 410
        },
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "dashboard",
        data: {
            label: "Dashboard"
        },
        position: {
            x: 340,
            y: 410
        },
        style: {
            width: 110,
            height: 36,
            border: "2px solid #4ade80",
            borderRadius: 12
        }
    },
    {
        id: "audit-log",
        data: {
            label: "Audit Log"
        },
        position: {
            x: 150,
            y: 480
        },
        style: {
            width: 110,
            height: 36
        }
    },
    {
        id: "data-lake",
        data: {
            label: "Data Lake"
        },
        position: {
            x: 200,
            y: 550
        },
        style: {
            width: 130,
            height: 40,
            border: "2px solid #06b6d4",
            borderRadius: 12
        }
    }
];
const dagEdges = [
    makeEdge("e-r1-parser", "root1", "parser", dagColors.root1),
    makeEdge("e-r1-validator", "root1", "validator", dagColors.root1),
    makeEdge("e-parser-dedupe", "parser", "dedupe", dagColors.parser),
    makeEdge("e-validator-enrich", "validator", "enrich-dag", dagColors.validator),
    makeEdge("e-dedupe-enrich", "dedupe", "enrich-dag", dagColors.dedupe),
    makeEdge("e-r2-feat", "root2", "feature-eng", dagColors.root2),
    makeEdge("e-feat-train", "feature-eng", "train", dagColors["feature-eng"]),
    makeEdge("e-train-validate", "train", "validate-model", dagColors.train),
    makeEdge("e-train-bench", "train", "benchmark", dagColors.train),
    makeEdge("e-validate-bench", "validate-model", "benchmark", dagColors["validate-model"]),
    makeEdge("e-enrich-feat", "enrich-dag", "feature-eng", dagColors.enrich),
    makeEdge("e-enrich-bus", "enrich-dag", "root3", dagColors.enrich),
    makeEdge("e-bench-bus", "benchmark", "root3", dagColors.benchmark),
    makeEdge("e-bus-email", "root3", "notify-email", dagColors.root3),
    makeEdge("e-bus-slack", "root3", "notify-slack", dagColors.root3),
    makeEdge("e-bus-dash", "root3", "dashboard", dagColors.root3),
    makeEdge("e-email-audit", "notify-email", "audit-log", dagColors["notify-email"]),
    makeEdge("e-slack-audit", "notify-slack", "audit-log", dagColors["notify-slack"]),
    makeEdge("e-audit-lake", "audit-log", "data-lake", dagColors["audit-log"]),
    makeEdge("e-dash-lake", "dashboard", "data-lake", dagColors.dashboard),
    makeEdge("e-bench-lake", "benchmark", "data-lake", dagColors.benchmark)
];
// ════════════════════════════════════════════════════════════════
// TREE (CIRCLES)
// ════════════════════════════════════════════════════════════════
const CIRCLE = 56;
const cs = (border, bg, color)=>({
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        padding: 0,
        textAlign: "center",
        border,
        background: bg,
        color
    });
const treeColors = {
    ceo: "#6366f1",
    "vp-eng": "#3b82f6",
    "fe-lead": "#a855f7",
    "be-lead": "#14b8a6",
    "vp-product": "#f59e0b",
    pm1: "#fbbf24",
    pm2: "#fbbf24",
    "vp-ops": "#ec4899"
};
const treeNodes = [
    {
        id: "ceo",
        data: {
            label: "CEO"
        },
        position: {
            x: 0,
            y: 0
        },
        style: cs("3px solid #6366f1", "#eef2ff", "#4338ca")
    },
    // Engineering
    {
        id: "eng-group",
        data: {
            label: "Engineering"
        },
        position: {
            x: 0,
            y: 80
        },
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(59, 130, 246, 0.06)",
            border: "1px dashed #3b82f6",
            borderRadius: 12
        },
        type: "group"
    },
    {
        id: "vp-eng",
        data: {
            label: "VP Eng"
        },
        position: {
            x: 20,
            y: 30
        },
        parentId: "eng-group",
        expandParent: true,
        style: cs("2px solid #3b82f6", "#dbeafe", "#1d4ed8")
    },
    {
        id: "frontend-group",
        data: {
            label: "Frontend"
        },
        position: {
            x: 10,
            y: 100
        },
        parentId: "eng-group",
        expandParent: true,
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(168, 85, 247, 0.06)",
            border: "1px dashed #a855f7",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "fe-lead",
        data: {
            label: "FE Lead"
        },
        position: {
            x: 15,
            y: 30
        },
        parentId: "frontend-group",
        expandParent: true,
        style: cs("2px solid #a855f7", "#f3e8ff", "#7c3aed")
    },
    {
        id: "fe-dev1",
        data: {
            label: "Dev A"
        },
        position: {
            x: 15,
            y: 100
        },
        parentId: "frontend-group",
        expandParent: true,
        style: cs("1.5px solid #c084fc", "#faf5ff", "#7c3aed")
    },
    {
        id: "fe-dev2",
        data: {
            label: "Dev B"
        },
        position: {
            x: 85,
            y: 100
        },
        parentId: "frontend-group",
        expandParent: true,
        style: cs("1.5px solid #c084fc", "#faf5ff", "#7c3aed")
    },
    {
        id: "backend-group",
        data: {
            label: "Backend"
        },
        position: {
            x: 200,
            y: 100
        },
        parentId: "eng-group",
        expandParent: true,
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(20, 184, 166, 0.06)",
            border: "1px dashed #14b8a6",
            borderRadius: 8
        },
        type: "group"
    },
    {
        id: "be-lead",
        data: {
            label: "BE Lead"
        },
        position: {
            x: 15,
            y: 30
        },
        parentId: "backend-group",
        expandParent: true,
        style: cs("2px solid #14b8a6", "#ccfbf1", "#0f766e")
    },
    {
        id: "be-dev1",
        data: {
            label: "Dev C"
        },
        position: {
            x: 15,
            y: 100
        },
        parentId: "backend-group",
        expandParent: true,
        style: cs("1.5px solid #5eead4", "#f0fdfa", "#0f766e")
    },
    {
        id: "be-dev2",
        data: {
            label: "Dev D"
        },
        position: {
            x: 85,
            y: 100
        },
        parentId: "backend-group",
        expandParent: true,
        style: cs("1.5px solid #5eead4", "#f0fdfa", "#0f766e")
    },
    // Product
    {
        id: "product-group",
        data: {
            label: "Product"
        },
        position: {
            x: 300,
            y: 80
        },
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(245, 158, 11, 0.06)",
            border: "1px dashed #f59e0b",
            borderRadius: 12
        },
        type: "group"
    },
    {
        id: "vp-product",
        data: {
            label: "VP Prod"
        },
        position: {
            x: 20,
            y: 30
        },
        parentId: "product-group",
        expandParent: true,
        style: cs("2px solid #f59e0b", "#fef3c7", "#b45309")
    },
    {
        id: "pm1",
        data: {
            label: "PM 1"
        },
        position: {
            x: 15,
            y: 100
        },
        parentId: "product-group",
        expandParent: true,
        style: cs("1.5px solid #fbbf24", "#fffbeb", "#b45309")
    },
    {
        id: "pm2",
        data: {
            label: "PM 2"
        },
        position: {
            x: 85,
            y: 100
        },
        parentId: "product-group",
        expandParent: true,
        style: cs("1.5px solid #fbbf24", "#fffbeb", "#b45309")
    },
    {
        id: "designer",
        data: {
            label: "Design"
        },
        position: {
            x: 50,
            y: 170
        },
        parentId: "product-group",
        expandParent: true,
        style: cs("1.5px solid #fb923c", "#fff7ed", "#c2410c")
    },
    // Ops
    {
        id: "ops-group",
        data: {
            label: "Operations"
        },
        position: {
            x: 500,
            y: 80
        },
        style: {
            width: 10,
            height: 10,
            backgroundColor: "rgba(236, 72, 153, 0.06)",
            border: "1px dashed #ec4899",
            borderRadius: 12
        },
        type: "group"
    },
    {
        id: "vp-ops",
        data: {
            label: "VP Ops"
        },
        position: {
            x: 20,
            y: 30
        },
        parentId: "ops-group",
        expandParent: true,
        style: cs("2px solid #ec4899", "#fce7f3", "#be185d")
    },
    {
        id: "devops",
        data: {
            label: "DevOps"
        },
        position: {
            x: 15,
            y: 100
        },
        parentId: "ops-group",
        expandParent: true,
        style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d")
    },
    {
        id: "sre",
        data: {
            label: "SRE"
        },
        position: {
            x: 85,
            y: 100
        },
        parentId: "ops-group",
        expandParent: true,
        style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d")
    },
    {
        id: "security",
        data: {
            label: "SecOps"
        },
        position: {
            x: 50,
            y: 170
        },
        parentId: "ops-group",
        expandParent: true,
        style: cs("1.5px solid #f472b6", "#fdf2f8", "#be185d")
    }
];
const treeEdges = [
    makeEdge("e-ceo-eng", "ceo", "vp-eng", treeColors.ceo),
    makeEdge("e-ceo-prod", "ceo", "vp-product", treeColors.ceo),
    makeEdge("e-ceo-ops", "ceo", "vp-ops", treeColors.ceo),
    makeEdge("e-eng-fe", "vp-eng", "fe-lead", treeColors["vp-eng"]),
    makeEdge("e-eng-be", "vp-eng", "be-lead", treeColors["vp-eng"]),
    makeEdge("e-fe-dev1", "fe-lead", "fe-dev1", treeColors["fe-lead"]),
    makeEdge("e-fe-dev2", "fe-lead", "fe-dev2", treeColors["fe-lead"]),
    makeEdge("e-be-dev1", "be-lead", "be-dev1", treeColors["be-lead"]),
    makeEdge("e-be-dev2", "be-lead", "be-dev2", treeColors["be-lead"]),
    makeEdge("e-prod-pm1", "vp-product", "pm1", treeColors["vp-product"]),
    makeEdge("e-prod-pm2", "vp-product", "pm2", treeColors["vp-product"]),
    makeEdge("e-pm1-design", "pm1", "designer", treeColors.pm1),
    makeEdge("e-pm2-design", "pm2", "designer", treeColors.pm2),
    makeEdge("e-ops-devops", "vp-ops", "devops", treeColors["vp-ops"]),
    makeEdge("e-ops-sre", "vp-ops", "sre", treeColors["vp-ops"]),
    makeEdge("e-devops-sec", "devops", "security", "#f472b6"),
    makeEdge("e-sre-sec", "sre", "security", "#f472b6"),
    makeEdge("e-be-devops", "be-lead", "devops", treeColors["be-lead"]),
    makeEdge("e-pm1-fe", "pm1", "fe-lead", treeColors.pm1)
];
// ════════════════════════════════════════════════════════════════
// ELK (Auto Layout)
// ════════════════════════════════════════════════════════════════
const elkColors = {
    input: "#e91e63",
    auth: "#2196f3",
    validate: "#ff9800",
    "fetch-db": "#009688",
    "fetch-api": "#9c27b0",
    cache: "#4caf50",
    merge: "#f44336",
    transform: "#00bcd4",
    filter: "#ff5722",
    format: "#3f51b5",
    log: "#795548"
};
const elkNodes = [
    {
        id: "input",
        data: {
            label: "User Input"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 150,
            height: 50,
            border: "2px solid #818cf8",
            borderRadius: 12
        }
    },
    {
        id: "auth",
        data: {
            label: "Authenticate"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "validate-elk",
        data: {
            label: "Validate"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "fetch-db",
        data: {
            label: "Fetch DB"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "fetch-api",
        data: {
            label: "Fetch API"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "cache-elk",
        data: {
            label: "Cache"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 120,
            height: 50,
            opacity: 0.7
        }
    },
    {
        id: "merge-elk",
        data: {
            label: "Merge Results"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 150,
            height: 50
        }
    },
    {
        id: "transform-elk",
        data: {
            label: "Transform"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50
        }
    },
    {
        id: "filter",
        data: {
            label: "Filter"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "format",
        data: {
            label: "Format"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "respond",
        data: {
            label: "Respond"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 140,
            height: 50,
            border: "2px solid #4ade80",
            borderRadius: 12
        }
    },
    {
        id: "log-elk",
        data: {
            label: "Log"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 100,
            height: 50
        }
    },
    {
        id: "error-elk",
        data: {
            label: "Error"
        },
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 120,
            height: 50,
            border: "2px solid #f87171",
            borderRadius: 12
        }
    }
];
const elkEdges = [
    makeEdge("e-input-auth", "input", "auth", elkColors.input),
    makeEdge("e-input-validate", "input", "validate-elk", elkColors.input),
    makeEdge("e-auth-fetch-db", "auth", "fetch-db", elkColors.auth),
    makeEdge("e-auth-fetch-api", "auth", "fetch-api", elkColors.auth),
    makeEdge("e-fetch-db-cache", "fetch-db", "cache-elk", elkColors["fetch-db"]),
    makeEdge("e-fetch-db-merge", "fetch-db", "merge-elk", elkColors["fetch-db"]),
    makeEdge("e-fetch-api-merge", "fetch-api", "merge-elk", elkColors["fetch-api"]),
    makeEdge("e-cache-merge", "cache-elk", "merge-elk", elkColors.cache),
    makeEdge("e-validate-merge", "validate-elk", "merge-elk", elkColors.validate),
    makeEdge("e-merge-transform", "merge-elk", "transform-elk", elkColors.merge),
    makeEdge("e-transform-filter", "transform-elk", "filter", elkColors.transform),
    makeEdge("e-transform-log", "transform-elk", "log-elk", elkColors.transform),
    makeEdge("e-filter-format", "filter", "format", elkColors.filter),
    makeEdge("e-format-respond", "format", "respond", elkColors.format),
    makeEdge("e-merge-error", "merge-elk", "error-elk", elkColors.merge),
    makeEdge("e-log-respond", "log-elk", "respond", elkColors.log)
];
// ════════════════════════════════════════════════════════════════
// AUTO LAYOUT + GROUPS
// ════════════════════════════════════════════════════════════════
const algColors = {
    "api-input": "#e91e63",
    "file-input": "#2196f3",
    "stream-input": "#ff9800",
    "validate-alg": "#009688",
    "transform-alg": "#9c27b0",
    "router-alg": "#f44336",
    "logger-alg": "#4caf50",
    "database-alg": "#00bcd4",
    "cache-alg": "#795548"
};
const autoLayoutGroupNodes = [
    {
        id: "group-ingestion",
        data: {
            label: "Ingestion"
        },
        type: "group",
        position: {
            x: 0,
            y: 0
        },
        style: {
            width: 340,
            height: 300,
            backgroundColor: "rgba(99, 102, 241, 0.05)",
            border: "1px dashed #6366f1",
            borderRadius: 8
        }
    },
    {
        id: "api-input",
        data: {
            label: "API Input"
        },
        position: {
            x: 40,
            y: 50
        },
        parentId: "group-ingestion",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "file-input",
        data: {
            label: "File Input"
        },
        position: {
            x: 40,
            y: 140
        },
        parentId: "group-ingestion",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "stream-input",
        data: {
            label: "Stream Input"
        },
        position: {
            x: 40,
            y: 230
        },
        parentId: "group-ingestion",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "group-processing-alg",
        data: {
            label: "Processing"
        },
        type: "group",
        position: {
            x: 450,
            y: 30
        },
        style: {
            width: 340,
            height: 250,
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            border: "1px dashed #f59e0b",
            borderRadius: 8
        }
    },
    {
        id: "validate-alg",
        data: {
            label: "Validate"
        },
        position: {
            x: 40,
            y: 50
        },
        parentId: "group-processing-alg",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "transform-alg",
        data: {
            label: "Transform"
        },
        position: {
            x: 40,
            y: 150
        },
        parentId: "group-processing-alg",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "group-storage",
        data: {
            label: "Storage"
        },
        type: "group",
        position: {
            x: 900,
            y: 0
        },
        style: {
            width: 340,
            height: 300,
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            border: "1px dashed #22c55e",
            borderRadius: 8
        }
    },
    {
        id: "cache-alg",
        data: {
            label: "Cache"
        },
        position: {
            x: 40,
            y: 50
        },
        parentId: "group-storage",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "database-alg",
        data: {
            label: "Database"
        },
        position: {
            x: 40,
            y: 140
        },
        parentId: "group-storage",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "archive",
        data: {
            label: "Archive"
        },
        position: {
            x: 40,
            y: 230
        },
        parentId: "group-storage",
        expandParent: true,
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "router-alg",
        data: {
            label: "Router"
        },
        position: {
            x: 450,
            y: 340
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "logger-alg",
        data: {
            label: "Logger"
        },
        position: {
            x: 680,
            y: 340
        },
        style: {
            width: 120,
            height: 50
        }
    },
    {
        id: "monitor",
        data: {
            label: "Monitor"
        },
        position: {
            x: 1300,
            y: 120
        },
        style: {
            width: 120,
            height: 50
        }
    }
];
const autoLayoutGroupEdges = [
    makeEdge("e-api-validate", "api-input", "validate-alg", algColors["api-input"]),
    makeEdge("e-file-validate", "file-input", "validate-alg", algColors["file-input"]),
    makeEdge("e-stream-transform", "stream-input", "transform-alg", algColors["stream-input"]),
    makeEdge("e-api-transform", "api-input", "transform-alg", algColors["api-input"]),
    makeEdge("e-validate-cache", "validate-alg", "cache-alg", algColors["validate-alg"]),
    makeEdge("e-validate-database", "validate-alg", "database-alg", algColors["validate-alg"]),
    makeEdge("e-transform-database", "transform-alg", "database-alg", algColors["transform-alg"]),
    makeEdge("e-transform-archive", "transform-alg", "archive", algColors["transform-alg"]),
    makeEdge("e-file-router", "file-input", "router-alg", algColors["file-input"]),
    makeEdge("e-router-transform", "router-alg", "transform-alg", algColors["router-alg"]),
    makeEdge("e-router-logger", "router-alg", "logger-alg", algColors["router-alg"]),
    makeEdge("e-logger-archive", "logger-alg", "archive", algColors["logger-alg"]),
    makeEdge("e-database-monitor", "database-alg", "monitor", algColors["database-alg"]),
    makeEdge("e-cache-monitor", "cache-alg", "monitor", algColors["cache-alg"])
];
// ════════════════════════════════════════════════════════════════
// STRESS TEST (200 nodes)
// ════════════════════════════════════════════════════════════════
const COLS = 20, ROWS = 10, NODE_W = 120, NODE_H = 40, GAP_X = 180, GAP_Y = 80;
const stressColors = [
    "#e91e63",
    "#2196f3",
    "#ff9800",
    "#9c27b0",
    "#009688",
    "#f44336",
    "#4caf50",
    "#00bcd4",
    "#795548",
    "#3f51b5"
];
const stressNodes = [];
const stressEdges = [];
for(let row = 0; row < ROWS; row++){
    for(let col = 0; col < COLS; col++){
        stressNodes.push({
            id: `n-${row}-${col}`,
            data: {
                label: `${row}-${col}`
            },
            position: {
                x: col * GAP_X,
                y: row * GAP_Y
            },
            style: {
                width: NODE_W,
                height: NODE_H
            }
        });
    }
}
let eIdx = 0;
for(let row = 0; row < ROWS; row++){
    for(let col = 0; col < COLS - 1; col++){
        if ((row + col) % 3 !== 0) continue;
        const c = stressColors[eIdx % stressColors.length];
        stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row}-${col + 1}`, c));
    }
}
for(let row = 0; row < ROWS - 1; row++){
    for(let col = 0; col < COLS; col++){
        if ((row * 3 + col) % 5 !== 0) continue;
        const c = stressColors[eIdx % stressColors.length];
        stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row + 1}-${col}`, c));
    }
}
for(let row = 0; row < ROWS - 2; row++){
    for(let col = 0; col < COLS - 2; col++){
        if ((row + col) % 7 !== 0) continue;
        const c = stressColors[eIdx % stressColors.length];
        stressEdges.push(makeEdge(`e-${eIdx++}`, `n-${row}-${col}`, `n-${row + 2}-${col + 2}`, c));
    }
}
const diagrams = {
    basic: {
        nodes: basicNodes,
        edges: basicEdges,
        needsLayout: false
    },
    group: {
        nodes: groupNodes,
        edges: groupEdges,
        needsLayout: false
    },
    subflows: {
        nodes: subflowNodes,
        edges: subflowEdges,
        needsLayout: false
    },
    dag: {
        nodes: dagNodes,
        edges: dagEdges,
        needsLayout: false
    },
    tree: {
        nodes: treeNodes,
        edges: treeEdges,
        needsLayout: false
    },
    elk: {
        nodes: elkNodes,
        edges: elkEdges,
        needsLayout: true
    },
    "auto-layout-groups": {
        nodes: autoLayoutGroupNodes,
        edges: autoLayoutGroupEdges,
        needsLayout: false
    },
    stress: {
        nodes: stressNodes,
        edges: stressEdges,
        needsLayout: false
    }
};
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/vm [external] (vm, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("vm", () => require("vm"));

module.exports = mod;
}),
"[externals]/worker_threads [external] (worker_threads, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("worker_threads", () => require("worker_threads"));

module.exports = mod;
}),
"[project]/avoid-nodes-pro-example/packages/avoid-nodes-router/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createRoutingHandler",
    ()=>re,
    "getAvoidLib",
    ()=>q,
    "loadAvoidWasm",
    ()=>J,
    "routeAll",
    ()=>te
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$worker_threads__$5b$external$5d$__$28$worker_threads$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/worker_threads [external] (worker_threads, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$url__$5b$external$5d$__$28$url$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/url [external] (url, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
const __TURBOPACK__import$2e$meta__ = {
    get url () {
        return `file://${__turbopack_context__.P("avoid-nodes-pro-example/packages/avoid-nodes-router/dist/index.js")}`;
    }
};
var L = null;
async function J() {
    if (L) return;
    let t = await __turbopack_context__.A("[externals]/libavoid-js [external] (libavoid-js, esm_import, [project]/avoid-nodes-pro-example/node_modules/libavoid-js, async loader)"), s = t.AvoidLib ?? t.default;
    if (!s?.load) throw new Error("Failed to load libavoid-js");
    await s.load(), L = s.getInstance();
}
function q() {
    if (!L) throw new Error("Call loadAvoidWasm() before routing");
    return L;
}
function K(t) {
    let s = t.position?.x ?? 0, n = t.position?.y ?? 0, e = Number(t.measured?.width ?? t.width ?? t.style?.width ?? 150), i = Number(t.measured?.height ?? t.height ?? t.style?.height ?? 50);
    return {
        x: s,
        y: n,
        w: e,
        h: i
    };
}
function M(t, s) {
    let n = K(t), e = t;
    for(; e?.parentId;){
        let i = s.get(e.parentId);
        if (!i) break;
        n.x += i.position?.x ?? 0, n.y += i.position?.y ?? 0, e = i;
    }
    return n;
}
function W(t, s) {
    let n = s === "source" ? t.sourcePosition ?? t.data?.sourcePosition : t.targetPosition ?? t.data?.targetPosition, e = String(n ?? "").toLowerCase();
    return e === "left" || e === "right" || e === "top" || e === "bottom" ? e : s === "source" ? "right" : "left";
}
function H(t, s) {
    let { x: n, y: e, w: i, h: u } = t, h = n + i / 2, o = e + u / 2;
    switch(s){
        case "left":
            return {
                x: n,
                y: o
            };
        case "right":
            return {
                x: n + i,
                y: o
            };
        case "top":
            return {
                x: h,
                y: e
            };
        case "bottom":
            return {
                x: h,
                y: e + u
            };
        default:
            return {
                x: n + i,
                y: o
            };
    }
}
function X(t, s, n) {
    return n <= 0 ? {
        x: t,
        y: s
    } : {
        x: Math.round(t / n) * n,
        y: Math.round(s / n) * n
    };
}
function V(t, s) {
    let n = s.x + s.w / 2 - (t.x + t.w / 2), e = s.y + s.h / 2 - (t.y + t.h / 2);
    return Math.abs(n) >= Math.abs(e) ? n >= 0 ? {
        sourcePos: "right",
        targetPos: "left"
    } : {
        sourcePos: "left",
        targetPos: "right"
    } : e >= 0 ? {
        sourcePos: "bottom",
        targetPos: "top"
    } : {
        sourcePos: "top",
        targetPos: "bottom"
    };
}
function Z(t, s, n = {}) {
    if (t < 2) return "";
    let e = n.gridSize ?? 0, i = Math.max(0, n.cornerRadius ?? 0), u = (a)=>{
        let r = s(a);
        return e > 0 ? X(r.x, r.y, e) : r;
    };
    if (i <= 0) {
        let a = `M ${u(0).x} ${u(0).y}`;
        for(let r = 1; r < t; r++){
            let d = u(r);
            a += ` L ${d.x} ${d.y}`;
        }
        return a;
    }
    let h = (a, r)=>Math.hypot(r.x - a.x, r.y - a.y), o = (a, r)=>{
        let d = h(a, r);
        return d < 1e-6 ? {
            x: 0,
            y: 0
        } : {
            x: (r.x - a.x) / d,
            y: (r.y - a.y) / d
        };
    }, c = `M ${u(0).x} ${u(0).y}`;
    for(let a = 1; a < t - 1; a++){
        let r = u(a - 1), d = u(a), g = u(a + 1), v = o(d, r), P = o(d, g), S = h(d, r), O = h(d, g), E = Math.min(i, S / 2, O / 2), F = {
            x: d.x + v.x * E,
            y: d.y + v.y * E
        }, A = {
            x: d.x + P.x * E,
            y: d.y + P.y * E
        };
        c += ` L ${F.x} ${F.y} Q ${d.x} ${d.y} ${A.x} ${A.y}`;
    }
    let m = u(t - 1);
    return c += ` L ${m.x} ${m.y}`, c;
}
function ee(t, s, n, e) {
    let i = n / e, u = new Map, h = new Map;
    for (let o of t)s.has(o.id) && (u.has(o.source) || u.set(o.source, []), u.get(o.source).push(o.id), h.has(o.target) || h.set(o.target, []), h.get(o.target).push(o.id));
    for (let [, o] of u)o.length >= 2 && U(o, s, "source", i);
    for (let [, o] of h)o.length >= 2 && U(o, s, "target", i);
}
function U(t, s, n, e) {
    let i = [];
    for (let d of t){
        let g = s.get(d);
        !g || g.length < 2 || i.push({
            edgeId: d,
            pt: g[n === "source" ? 0 : g.length - 1]
        });
    }
    if (i.length < 2) return;
    let u = s.get(i[0].edgeId), h = n === "source" ? 0 : u.length - 2, o = u[h], c = u[h + 1], m = Math.abs(c.x - o.x) > Math.abs(c.y - o.y) ? "y" : "x", a = i.map((d)=>d.pt[m]), r = a.reduce((d, g)=>d + g, 0) / a.length;
    for (let d of t){
        let g = s.get(d);
        if (!g || g.length < 2) continue;
        let v = n === "source" ? [
            0,
            1
        ] : [
            g.length - 1,
            g.length - 2
        ];
        for (let P of v)g[P][m] = r + (g[P][m] - r) * e;
    }
}
function te(t, s, n) {
    let e = q(), i = n?.shapeBufferDistance ?? 8, u = n?.idealNudgingDistance ?? 10, h = n?.handleNudgingDistance ?? u, o = n?.edgeRounding ?? 0, c = n?.diagramGridSize ?? 0, m = n?.shouldSplitEdgesNearHandle ?? !1, a = n?.autoBestSideConnection ?? !1, r = new Map(t.map((p)=>[
            p.id,
            p
        ])), d = t.filter((p)=>p.type !== "group"), g = 1, v = 2, P = 3, S = 4, O = 5, E = {
        top: v,
        bottom: P,
        left: S,
        right: O
    }, F = {
        [g]: {
            x: .5,
            y: .5,
            dir: e.ConnDirAll
        },
        [v]: {
            x: .5,
            y: 0,
            dir: e.ConnDirUp
        },
        [P]: {
            x: .5,
            y: 1,
            dir: e.ConnDirDown
        },
        [S]: {
            x: 0,
            y: .5,
            dir: e.ConnDirLeft
        },
        [O]: {
            x: 1,
            y: .5,
            dir: e.ConnDirRight
        }
    }, A = {}, Q = new Map(d.map((p)=>[
            p.id,
            M(p, r)
        ])), w = new e.Router(e.OrthogonalRouting);
    w.setRoutingParameter(e.shapeBufferDistance, i), w.setRoutingParameter(e.idealNudgingDistance, u), w.setRoutingOption(e.nudgeOrthogonalSegmentsConnectedToShapes, !0), w.setRoutingOption(e.nudgeSharedPathsWithCommonEndPoint, !0), w.setRoutingOption(e.performUnifyingNudgingPreprocessingStep, !0);
    let _ = new Map, $ = [];
    for (let p of d){
        let l = Q.get(p.id), y = new e.Point(l.x, l.y), N = new e.Point(l.x + l.w, l.y + l.h), b = new e.Rectangle(y, N), f = new e.ShapeRef(w, b);
        $.push(f), _.set(p.id, f);
        for (let R of [
            g,
            v,
            P,
            S,
            O
        ]){
            let I = F[R];
            new e.ShapeConnectionPin(f, R, I.x, I.y, !0, 0, I.dir).setExclusive(!1);
        }
    }
    let B = [];
    for (let p of s){
        let l = r.get(p.source), y = r.get(p.target);
        if (!l || !y) continue;
        let N = _.get(p.source), b = _.get(p.target), f = W(l, "source"), R = W(y, "target");
        if (a) {
            let C = M(l, r), x = M(y, r), k = V(C, x);
            f = k.sourcePos, R = k.targetPos;
        }
        let I, T;
        if (m) I = N ? new e.ConnEnd(N, E[f] ?? g) : (()=>{
            let C = M(l, r), x = H(C, f);
            return new e.ConnEnd(new e.Point(x.x, x.y));
        })(), T = b ? new e.ConnEnd(b, E[R] ?? g) : (()=>{
            let C = M(y, r), x = H(C, R);
            return new e.ConnEnd(new e.Point(x.x, x.y));
        })();
        else {
            let C = M(l, r), x = H(C, f);
            I = new e.ConnEnd(new e.Point(x.x, x.y));
            let k = M(y, r), G = H(k, R);
            T = new e.ConnEnd(new e.Point(G.x, G.y));
        }
        let z = new e.ConnRef(w, I, T);
        z.setRoutingType(e.ConnType_Orthogonal), B.push({
            edgeId: p.id,
            connRef: z
        });
    }
    try {
        w.processTransaction();
    } catch  {
        return j(w, B, $), A;
    }
    let D = new Map;
    for (let { edgeId: p, connRef: l } of B)try {
        let y = l.displayRoute(), N = y.size();
        if (N < 2) continue;
        let b = [];
        for(let f = 0; f < N; f++){
            let R = y.get_ps(f);
            b.push({
                x: R.x,
                y: R.y
            });
        }
        D.set(p, b);
    } catch  {}
    h !== u && D.size > 0 && ee(s, D, h, u);
    for (let [p, l] of D){
        let y = Z(l.length, (R)=>l[R], {
            gridSize: c || void 0,
            cornerRadius: o
        }), N = Math.floor(l.length / 2), b = l[N], f = c > 0 ? X(b.x, b.y, c) : b;
        A[p] = {
            path: y,
            labelX: f.x,
            labelY: f.y
        };
    }
    return j(w, B, $), A;
}
function j(t, s, n) {
    try {
        let e = t;
        for (let { connRef: i } of s)e.deleteConnector(i);
        for (let i of n)e.deleteShape(i);
        e.delete();
    } catch  {}
}
;
;
;
var se = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].dirname((0, __TURBOPACK__imported__module__$5b$externals$5d2f$url__$5b$external$5d$__$28$url$2c$__cjs$29$__["fileURLToPath"])(__TURBOPACK__import$2e$meta__.url)), "routing-worker.js");
function re() {
    let t = 0, s = new Map, n = new __TURBOPACK__imported__module__$5b$externals$5d2f$worker_threads__$5b$external$5d$__$28$worker_threads$2c$__cjs$29$__["Worker"](se), e = !1, i = new Promise((o)=>{
        let c = (m)=>{
            m.command === "ready" && (e = !0, o());
        };
        n.on("message", c);
    });
    n.on("message", (o)=>{
        if (o.id == null) return;
        let c = s.get(o.id);
        c && (s.delete(o.id), o.command === "routed" ? c.resolve({
            command: "routed",
            routes: o.routes
        }) : o.command === "error" ? c.resolve({
            command: "error",
            message: o.message
        }) : o.command === "state" && c.resolve({
            command: "routed",
            routes: {}
        }));
    }), n.on("error", (o)=>{
        for (let [c, m] of s)m.resolve({
            command: "error",
            message: o.message
        }), s.delete(c);
    });
    async function u(o) {
        e || await i;
        let c = ++t;
        return new Promise((m)=>{
            s.set(c, {
                resolve: m
            }), n.postMessage({
                ...o,
                id: c
            });
        });
    }
    function h() {
        for (let [, o] of s)o.resolve({
            command: "error",
            message: "Handler destroyed"
        });
        s.clear(), n.terminate();
    }
    return {
        handleMessage: u,
        destroy: h
    };
}
;
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/lib/routing.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ensureWasm",
    ()=>ensureWasm,
    "expandGroups",
    ()=>expandGroups,
    "getHeight",
    ()=>getHeight,
    "getWidth",
    ()=>getWidth,
    "layoutWithELK",
    ()=>layoutWithELK,
    "toFlowEdges",
    ()=>toFlowEdges,
    "toFlowNodes",
    ()=>toFlowNodes
]);
/**
 * Server-side routing utilities.
 * Handles ELK layout, group expansion, overlap resolution, and edge routing.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$node_modules$2f$elkjs$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/node_modules/elkjs/lib/main.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$packages$2f$avoid$2d$nodes$2d$router$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/packages/avoid-nodes-router/dist/index.js [app-route] (ecmascript)");
;
;
const PADDING = 20;
const OVERLAP_GAP = 30;
// ---- WASM init (singleton) ----
let wasmLoaded = false;
async function ensureWasm() {
    if (!wasmLoaded) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$packages$2f$avoid$2d$nodes$2d$router$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadAvoidWasm"])();
        wasmLoaded = true;
    }
}
// ---- ELK layout ----
const elk = new __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$node_modules$2f$elkjs$2f$lib$2f$main$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]();
async function layoutWithELK(nodes, edges) {
    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.spacing.nodeNode": "60",
            "elk.layered.spacing.nodeNodeBetweenLayers": "80"
        },
        children: nodes.filter((n)=>!n.parentId && n.type !== "group").map((n)=>({
                id: n.id,
                width: getWidth(n),
                height: getHeight(n)
            })),
        edges: edges.map((e)=>({
                id: e.id,
                sources: [
                    e.source
                ],
                targets: [
                    e.target
                ]
            }))
    };
    const layout = await elk.layout(graph);
    return nodes.map((node)=>{
        const elkNode = layout.children?.find((c)=>c.id === node.id);
        if (elkNode) {
            return {
                ...node,
                position: {
                    x: elkNode.x ?? node.position.x,
                    y: elkNode.y ?? node.position.y
                }
            };
        }
        return node;
    });
}
function getWidth(n) {
    return n.width ?? n.style?.width ?? 150;
}
function getHeight(n) {
    return n.height ?? n.style?.height ?? 40;
}
function expandGroups(nodes) {
    const result = nodes.map((n)=>({
            ...n,
            style: n.style ? {
                ...n.style
            } : undefined
        }));
    const nodeMap = new Map();
    for (const n of result)nodeMap.set(n.id, n);
    const childrenOf = new Map();
    for (const n of result){
        if (n.parentId) {
            const list = childrenOf.get(n.parentId) || [];
            list.push(n.id);
            childrenOf.set(n.parentId, list);
        }
    }
    const groupIds = result.filter((n)=>n.type === "group").map((n)=>n.id);
    function nestingDepth(id, visited = new Set()) {
        if (visited.has(id)) return 0;
        visited.add(id);
        const node = nodeMap.get(id);
        if (!node?.parentId) return 0;
        return 1 + nestingDepth(node.parentId, visited);
    }
    const sortedGroups = [
        ...groupIds
    ].sort((a, b)=>nestingDepth(b) - nestingDepth(a));
    for (const groupId of sortedGroups){
        const group = nodeMap.get(groupId);
        const children = childrenOf.get(groupId);
        if (!children || children.length === 0) continue;
        let maxRight = 0;
        let maxBottom = 0;
        for (const childId of children){
            const child = nodeMap.get(childId);
            const cw = child.width ?? child.style?.width ?? 150;
            const ch = child.height ?? child.style?.height ?? 40;
            maxRight = Math.max(maxRight, child.position.x + cw);
            maxBottom = Math.max(maxBottom, child.position.y + ch);
        }
        const newWidth = maxRight + PADDING;
        const newHeight = maxBottom + PADDING;
        group.width = newWidth;
        group.height = newHeight;
        if (group.style) {
            group.style.width = newWidth;
            group.style.height = newHeight;
        } else {
            group.style = {
                width: newWidth,
                height: newHeight
            };
        }
    }
    resolveOverlaps(result);
    return result;
}
function resolveOverlaps(nodes) {
    const siblingGroups = new Map();
    for (const n of nodes){
        const key = n.parentId ?? "__root__";
        const list = siblingGroups.get(key) || [];
        list.push(n);
        siblingGroups.set(key, list);
    }
    for (const [, siblings] of siblingGroups){
        if (siblings.length < 2) continue;
        for(let pass = 0; pass < 3; pass++){
            for(let i = 0; i < siblings.length; i++){
                for(let j = i + 1; j < siblings.length; j++){
                    const a = siblings[i];
                    const b = siblings[j];
                    const aw = getWidth(a);
                    const ah = getHeight(a);
                    const bw = getWidth(b);
                    const xOverlap = a.position.x < b.position.x + bw && b.position.x < a.position.x + aw;
                    const yOverlap = a.position.y < b.position.y + getHeight(b) && b.position.y < a.position.y + ah;
                    if (xOverlap && yOverlap) {
                        const [left, right] = a.position.x <= b.position.x ? [
                            a,
                            b
                        ] : [
                            b,
                            a
                        ];
                        const leftRight = left.position.x + getWidth(left) + OVERLAP_GAP;
                        if (right.position.x < leftRight) {
                            right.position = {
                                x: leftRight,
                                y: right.position.y
                            };
                        }
                    }
                }
            }
        }
    }
}
function toFlowNodes(nodes) {
    return nodes.map((n)=>({
            id: n.id,
            position: n.position,
            width: n.width ?? n.style?.width ?? 150,
            height: n.height ?? n.style?.height ?? 40,
            data: n.data,
            type: n.type,
            parentId: n.parentId,
            style: n.style,
            expandParent: n.expandParent
        }));
}
function toFlowEdges(edges) {
    return edges.map((e)=>({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            markerEnd: e.markerEnd,
            data: e.data
        }));
}
;
}),
"[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/app/api/diagram/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$diagrams$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/diagrams.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/examples-server/nextjs-example/src/lib/routing.ts [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$packages$2f$avoid$2d$nodes$2d$router$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/avoid-nodes-pro-example/packages/avoid-nodes-router/dist/index.js [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ensureWasm"])();
        const tab = request.nextUrl.searchParams.get("tab") || "basic";
        const diagram = __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$diagrams$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["diagrams"][tab];
        if (!diagram) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Unknown tab: ${tab}. Available: ${Object.keys(__TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$diagrams$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["diagrams"]).join(", ")}`
            }, {
                status: 400
            });
        }
        let flowNodes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["toFlowNodes"])(diagram.nodes);
        const flowEdges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["toFlowEdges"])(diagram.edges);
        // 1. ELK layout for tabs that need it
        if (diagram.needsLayout) {
            flowNodes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["layoutWithELK"])(flowNodes, flowEdges);
        }
        // 2. Expand group nodes to fit their children
        flowNodes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$src$2f$lib$2f$routing$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["expandGroups"])(flowNodes);
        // 3. Edge routing — compute SVG paths that avoid nodes
        const routes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$packages$2f$avoid$2d$nodes$2d$router$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["routeAll"])(flowNodes, flowEdges, {
            shapeBufferDistance: 12,
            idealNudgingDistance: 10,
            edgeRounding: 8,
            autoBestSideConnection: true,
            shouldSplitEdgesNearHandle: true
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            tab,
            nodes: flowNodes,
            edges: diagram.edges,
            routes
        });
    } catch (err) {
        console.error("Error processing diagram:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$avoid$2d$nodes$2d$pro$2d$example$2f$examples$2d$server$2f$nextjs$2d$example$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: String(err)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2027d27f._.js.map