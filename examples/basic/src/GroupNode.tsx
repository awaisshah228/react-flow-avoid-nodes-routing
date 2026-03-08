import { memo } from "react";
import {
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  useStore,
  useReactFlow,
} from "@xyflow/react";
import useDetachNodes from "./useDetachNodes";

function GroupNode({ id }: NodeProps) {
  const detachNodes = useDetachNodes();
  const { getNodes } = useReactFlow();

  const hasChildNodes = useStore((store) => {
    const childNodeCount = store.parentLookup.get(id)?.size ?? 0;
    return childNodeCount > 0;
  });

  const onDetach = () => {
    const childNodeIds = getNodes()
      .filter((node) => node.parentId === id)
      .map((node) => node.id);
    detachNodes(childNodeIds, id);
  };

  return (
    <div>
      <NodeResizer />
      {hasChildNodes && (
        <NodeToolbar className="nodrag">
          <button
            onClick={onDetach}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Ungroup
          </button>
        </NodeToolbar>
      )}
    </div>
  );
}

export default memo(GroupNode);
