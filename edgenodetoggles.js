function nodesToggle(label, hide) {
  // Iterate through window nodes
  for (const [, node] of Object.entries(window.nodes)) {
    const { category, isHidden } = node;
    if (!(label === category)) continue;
    if (hide === isHidden) continue;

    // If node status changed, hide or show the node
    if (hide) {
      hideNode(node);
    } else {
      showNode(node);
    }
  }
}

function edgesToggle(label, hide) {
  // Iterate through window edges
  for (let edge of window.edges) {
    const { category, isHidden, srcNodeId, dstNodeId } = edge;
    if (!(label === category)) continue;
    if (hide === isHidden) continue;

    // If node status changed, hide or show the node
    if (hide) {
      hideEdge(edge);
    } else {
      const srcNode = window.nodes[srcNodeId];
      const dstNode = window.nodes[dstNodeId];
      if (!srcNode.isHidden && !dstNode.isHidden) showEdge(edge);
    }
  }
}

// Event delegation for node toggles
document.getElementById("node-toggles").addEventListener("click", function (e) {
  if (e.target.closest(".node-toggle-hide")) {
    // Get the pressed hide button
    const button = e.target.closest(".node-toggle-hide");
    const label = button.id.slice(0, button.id.length - 7);
    nodesToggle(label, true);
  } else if (e.target.closest(".node-toggle-show")) {
    // Get the pressed show button
    const button = e.target.closest(".node-toggle-show");
    const label = button.id.slice(0, button.id.length - 7);
    nodesToggle(label, false);
  }
});

// Event delegation for edge toggles
document.getElementById("edge-toggles").addEventListener("click", function (e) {
  if (e.target.closest(".edge-toggle-hide")) {
    // Get the pressed hide button
    const button = e.target.closest(".edge-toggle-hide");
    const label = button.id.slice(0, button.id.length - 7);
    edgesToggle(label, true);
  } else if (e.target.closest(".edge-toggle-show")) {
    // Get the pressed show button
    const button = e.target.closest(".edge-toggle-show");
    const label = button.id.slice(0, button.id.length - 7);
    edgesToggle(label, false);
  }
});
