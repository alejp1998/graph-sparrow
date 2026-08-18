/* global Springy, hideNode */

// Get the "Reload" button element
var reloadButton = document.getElementById("reload-graph-layout");

// Check if a node is connected to non-hidden nodes
function isNodeConnectedToNonHidden(nodeId) {
  for (const edge of window.edges) {
    if (edge.isHidden) continue;
    if (edge.hasOwnProperty.call(edge, "srcNodeId") && edge.srcNodeId === nodeId) {
      if (!window.nodes[edge.dstNodeId].isHidden) return true;
    }
    if (edge.hasOwnProperty.call(edge, "dstNodeId") && edge.dstNodeId === nodeId) {
      if (!window.nodes[edge.srcNodeId].isHidden) return true;
    }
  }
  return false;
}

// Your function to be executed when the button is pressed
function reloadGraphLayout() {
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

  // Run the force-directed simulation synchronously for a deterministic layout
  for (var tick = 0; tick < 400; tick++) {
    layout.tick(0.02);
  }

  // Get min position values
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [nodeId] of Object.entries(window.nodes)) {
    if (window.nodes[nodeId].isHidden) continue;
    const p = layout.nodePoints[nodeId].p;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  // Guard against degenerate layouts (single node / all same position)
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // Tune and assign positions to non-hidden nodes (percentage of the stage)
  for (const [nodeId] of Object.entries(window.nodes)) {
    if (window.nodes[nodeId].isHidden) continue;

    // Get node html element
    node = document.getElementById(nodeId);
    if (!node) continue;

    // Compute new position with generous screen margins:
    // centers map into 12-88%, then clamped so the FULL node rect
    // (including its own width/height) stays within [8%, 92%] of the stage.
    const p = layout.nodePoints[nodeId].p;
    const pctX = 12 + (76 * (p.x - minX)) / spanX;
    const pctY = 12 + (76 * (p.y - minY)) / spanY;

    const stageW = node.parentElement ? node.parentElement.clientWidth : 1300;
    const stageH = node.parentElement ? node.parentElement.clientHeight : 800;
    const halfW = (node.offsetWidth || 130) / 2;
    const halfH = (node.offsetHeight || 60) / 2;

    const minLeft = (halfW / stageW) * 100 + 8;
    const maxLeft = 100 - minLeft;
    const minTop = (halfH / stageH) * 100 + 8;
    const maxTop = 100 - minTop;

    node.style.left = Math.min(maxLeft, Math.max(minLeft, pctX)).toFixed(2) + "%";
    node.style.top = Math.min(maxTop, Math.max(minTop, pctY)).toFixed(2) + "%";
  }
}

// Add event listener to the button element
reloadButton.addEventListener("click", reloadGraphLayout);
