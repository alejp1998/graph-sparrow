/* global updateToggleCount */

// Eye / eye-slash SVG icons (replaces emoji on hide/show buttons)
const EYE_ICON =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SLASH_ICON =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

// Create shared shown category count dict
window.shownNodesCategoryCount = getShownNodesCategoryCount();
window.shownEdgesCategoryCount = getShownEdgesCategoryCount();

// Get shown nodes count for each category
function getShownNodesCategoryCount() {
  let shownNodesCategoryCount = {};

  for (const [, node] of Object.entries(window.nodes)) {
    if (!node.isHidden) {
      if (!shownNodesCategoryCount[node.category]) shownNodesCategoryCount[node.category] = 0;
      shownNodesCategoryCount[node.category] += 1;
    }
  }

  return shownNodesCategoryCount;
}

// Get shown edges count for each category
function getShownEdgesCategoryCount() {
  let shownEdgesCategoryCount = {};

  for (const edge of window.edges) {
    if (!edge.isHidden) {
      if (!shownEdgesCategoryCount[edge.category]) shownEdgesCategoryCount[edge.category] = 0;
      shownEdgesCategoryCount[edge.category] += 1;
    }
  }

  return shownEdgesCategoryCount;
}

// Hide edge
function hideEdge(edge) {
  if (edge.isHidden) return;
  var connection = document.getElementById(edge.id);
  connection.style.display = "none";

  // Mark the edge as hidden
  edge.isHidden = true;
  window.shownEdgesCategoryCount[edge.category]--;
  updateToggleCount(edge.category, "edge");

  // Turn the hide/show nodes button of same category into show type if it was last node of the category
  if (window.shownEdgesCategoryCount[edge.category] === 0) {
    var button = document.getElementById(`${edge.category}-toggle`);
    button.blur();
    button.classList.replace("edge-toggle-hide", "edge-toggle-show");
    var eye = button.querySelector(".toggle-eye");
    if (eye) eye.innerHTML = EYE_SLASH_ICON;
  }
}

// Hide node edges
function hideNodeEdges(node) {
  for (let edge of window.edges) {
    if (edge.srcNodeId === node.id || edge.dstNodeId === node.id) {
      hideEdge(edge);
    }
  }
}

// Show edge
function showEdge(edge) {
  if (!edge.isHidden) return;
  var connection = document.getElementById(edge.id);
  connection.style.display = "block";

  // Mark the edge as hidden
  edge.isHidden = false;
  window.shownEdgesCategoryCount[edge.category]++;
  updateToggleCount(edge.category, "edge");

  // Turn the hide/show nodes button of same category into hide type
  var button = document.getElementById(`${edge.category}-toggle`);
  button.blur();
  button.classList.replace("edge-toggle-show", "edge-toggle-hide");
  var eye = button.querySelector(".toggle-eye");
  if (eye) eye.innerHTML = EYE_ICON;
}

// Show node edges
function showNodeEdges(node) {
  for (let edge of window.edges) {
    if (edge.srcNodeId === node.id) {
      const dstNode = window.nodes[edge.dstNodeId];
      if (!dstNode.isHidden) showEdge(edge);
    } else if (edge.dstNodeId === node.id) {
      const srcNode = window.nodes[edge.srcNodeId];
      if (!srcNode.isHidden) showEdge(edge);
    }
  }
}

// Hide node
function hideNode(node) {
  var nodeElem = document.getElementById(node.id);
  document.getElementById("graph-viewer").removeChild(nodeElem);

  // Mark the node as hidden
  node.isHidden = true;
  window.shownNodesCategoryCount[node.category]--;
  updateToggleCount(node.category, "node");

  // Hide node edges
  hideNodeEdges(node);

  // Modify the node
  $(nodeElem).removeClass("node").addClass("node-isHidden");
  nodeElem.style = {};

  // Change button to show type (SVG eye icon + keep the remove button)
  var nodeMediaRight = nodeElem.querySelector(".media-right");
  nodeMediaRight.innerHTML =
    '<button class="node-btn remove-button" title="Remove node" aria-label="Remove node">✕</button>' +
    '<button class="node-btn show-button" title="Show node" aria-label="Show node">' +
    '<span class="toggle-eye">' +
    EYE_ICON +
    "</span>" +
    "</button>";

  // Turn the hide/show nodes button of same category into show type if it was last node of the category
  if (window.shownNodesCategoryCount[node.category] === 0) {
    var button = document.getElementById(`${node.category}-toggle`);
    button.blur();
    button.classList.replace("node-toggle-hide", "node-toggle-show");
    var eye = button.querySelector(".toggle-eye");
    if (eye) eye.innerHTML = EYE_SLASH_ICON;
  }

  // Append the node as hiddenNode
  document.getElementById("hidden-nodes").append(nodeElem);
}

// Show a node
function showNode(node) {
  var nodeElem = document.getElementById(node.id);
  document.getElementById("hidden-nodes").removeChild(nodeElem);

  // Mark the node as non-hidden
  node.isHidden = false;
  window.shownNodesCategoryCount[node.category]++;
  updateToggleCount(node.category, "node");

  // Show node edges
  showNodeEdges(node);

  // Modify the node element
  $(nodeElem).removeClass("node-isHidden").addClass("node");
  nodeElem.style = {
    position: "absolute",
    top: "5%",
    left: "5%",
  };

  // Change button to hide type (SVG eye-slash icon + keep the remove button)
  var nodeMediaRight = nodeElem.querySelector(".media-right");
  nodeMediaRight.innerHTML =
    '<button class="node-btn remove-button" title="Remove node" aria-label="Remove node">✕</button>' +
    '<button class="node-btn hide-button" title="Hide node" aria-label="Hide node">' +
    '<span class="toggle-eye">' +
    EYE_SLASH_ICON +
    "</span>" +
    "</button>";

  // Turn the hide/show nodes button of same category into hide type
  var button = document.getElementById(`${node.category}-toggle`);
  button.blur();
  button.classList.replace("node-toggle-show", "node-toggle-hide");
  var eye = button.querySelector(".toggle-eye");
  if (eye) eye.innerHTML = EYE_ICON;

  // Append to shown nodes div
  document.getElementById("graph-viewer").append(nodeElem);
}

// Event delegation for remove buttons
document.getElementById("graph-viewer").addEventListener("click", function (e) {
  if (e.target.closest(".remove-button")) {
    const nodeElem = e.target.closest(".node");
    if (!nodeElem) return;
    const nodeId = nodeElem.id;
    removeNode(nodeId);
    return;
  }

  if (e.target.closest(".hide-button")) {
    // Resolve the node from the click target (may be the SVG icon inside the button)
    const nodeElem = e.target.closest(".node");
    if (!nodeElem) return;
    const nodeId = nodeElem.id;
    let node = window.nodes[nodeId];
    hideNode(node);
  }
});

// Event delegation for show buttons
document.getElementById("hidden-nodes").addEventListener("click", function (e) {
  if (e.target.closest(".show-button")) {
    // Get the pressed hide button
    const button = e.target.closest(".show-button");

    // Get the node and remove it from hidden nodes
    const nodeElem = button.closest(".node-isHidden");
    const nodeId = nodeElem.id;
    let node = window.nodes[nodeId];
    showNode(node);
  }
});
