/**
 * Simple group node component for server-rendered diagrams.
 * Renders as a transparent container with a label.
 */

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

function GroupNodeComponent({ data }: NodeProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 8,
          fontSize: 10,
          color: "#888",
          fontWeight: 500,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {(data as { label?: string })?.label}
      </div>
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
