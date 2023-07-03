// Initial graph layout load
reloadGraphLayout();

// Get the "Reload" button element
var reloadButton = document.getElementById("reload-graph-layout");

// Check if a node is connected to non-hidden nodes
function isNodeConnectedToNonHidden(nodeId) {
  for (const edge of edges) {
    if (edge.isHidden) continue;
    if (edge.hasOwnProperty("srcNodeId") && edge.srcNodeId === nodeId) {
      if (!window.nodes[edge.dstNodeId].isHidden) return true;
    }
    if (edge.hasOwnProperty("dstNodeId") && edge.dstNodeId === nodeId) {
      if (!window.nodes[edge.srcNodeId].isHidden) return true;
    }
  }
  return false;
}

// Your function to be executed when the button is pressed
function reloadGraphLayout() {
  let nodeIndex;
  let node;

  console.log("Reloading graph layout...");

  let graph = new Springy.Graph();

  // Iterate over window.nodes and add them to the graph
  for (const [nodeId, node] of Object.entries(window.nodes)) {
    if (node.isHidden) continue;
    if (isNodeConnectedToNonHidden(nodeId)) {
      graph.newNode(nodeId, {});
    } else {
      hideNode(node);
    }
  }

  // Iterate over window.edges and add them to the graph
  for (const edge of window.edges) {
    const { srcNodeId, dstNodeId } = edge;
    if (window.nodes[srcNodeId].isHidden) continue;
    if (window.nodes[dstNodeId].isHidden) continue;
    graph.newEdge(graph.nodeSet[srcNodeId], graph.nodeSet[dstNodeId]);
  }

  // Initialize and compute the layout
  const layout = new Springy.Layout.ForceDirected(
    graph,
    500.0, // Spring stiffness
    2000.0, // Node repulsion
    0.5 // Damping
  );
  layout.start();

  // Get min position values
  let [minX, minY] = [Infinity, Infinity];
  let [maxX, maxY] = [-Infinity, -Infinity];
  for (const [nodeId] of Object.entries(window.nodes)) {
    if (window.nodes[nodeId].isHidden) continue;
    if (layout.nodePoints[nodeId].p.x < minX) minX = layout.nodePoints[nodeId].p.x;
    if (layout.nodePoints[nodeId].p.y < minY) minY = layout.nodePoints[nodeId].p.y;
    if (layout.nodePoints[nodeId].p.x > maxX) maxX = layout.nodePoints[nodeId].p.x;
    if (layout.nodePoints[nodeId].p.y > maxY) maxY = layout.nodePoints[nodeId].p.y;
  }

  // Tune and assign positions to non-hidden nodes
  for (const [nodeId] of Object.entries(window.nodes)) {
    if (window.nodes[nodeId].isHidden) continue;

    // Get node html element
    nodeIndex = window.nodes[nodeId].index;
    node = document.getElementById(nodeId);

    // Compute new position and assign to html element
    const pos = [
      5 + (75 * (layout.nodePoints[nodeId].p.x - minX)) / (maxX - minX),
      5 + (75 * (layout.nodePoints[nodeId].p.y - minY)) / (maxY - minY),
    ];
    node.style = `left: ${pos[0]}%; top: ${pos[1]}%;`;
  }
}

// Add event listener to the button element
reloadButton.addEventListener("click", reloadGraphLayout);
