import {
  useNodes,
  type Node,
  NodeToolbar,
  useStoreApi,
  useReactFlow,
  useStore,
} from "@xyflow/react";

const GROUP_PADDING = 25;

let groupIdCounter = 0;
function getGroupId() {
  return `group-${++groupIdCounter}`;
}

export default function SelectedNodesToolbar() {
  const nodes = useNodes();
  const { setNodes, getNodesBounds } = useReactFlow();
  const store = useStoreApi();

  const selectedNodes = useStore((state) => {
    return state.nodes.filter(
      (node) =>
        node.selected && !node.parentId && !state.parentLookup.get(node.id)
    );
  });

  if (selectedNodes.length < 2) {
    return null;
  }

  const selectedNodeIds = selectedNodes.map((node) => node.id);

  const onGroup = () => {
    const groupId = getGroupId();
    const selectedNodesRectangle = getNodesBounds(selectedNodes);
    const groupNodePosition = {
      x: selectedNodesRectangle.x,
      y: selectedNodesRectangle.y,
    };

    const groupNode: Node = {
      id: groupId,
      type: "group",
      position: groupNodePosition,
      style: {
        width: selectedNodesRectangle.width + GROUP_PADDING * 2,
        height: selectedNodesRectangle.height + GROUP_PADDING * 2,
      },
      data: {},
    };

    const nextNodes: Node[] = nodes.map((node) => {
      if (selectedNodeIds.includes(node.id)) {
        return {
          ...node,
          position: {
            x: node.position.x - groupNodePosition.x + GROUP_PADDING,
            y: node.position.y - groupNodePosition.y + GROUP_PADDING,
          },
          extent: "parent" as const,
          parentId: groupId,
        };
      }
      return node;
    });

    store.getState().resetSelectedElements();
    store.setState({ nodesSelectionActive: false });
    setNodes([groupNode, ...nextNodes]);
  };

  return (
    <NodeToolbar nodeId={selectedNodeIds} isVisible>
      <button
        onClick={onGroup}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Group selected nodes
      </button>
    </NodeToolbar>
  );
}
