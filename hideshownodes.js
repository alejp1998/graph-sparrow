// Create shared shown category count dict
window.shownNodesCategoryCount = getShownNodesCategoryCount();
window.shownEdgesCategoryCount = getShownEdgesCategoryCount();

// Get shown nodes count for each category
function getShownNodesCategoryCount() {
  let shownNodesCategoryCount = {};

  for (const [nodeId, node] of Object.entries(window.nodes)) {
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
  shownEdgesCategoryCount[edge.category]--;

  // Turn the hide/show nodes button of same category into show type if it was last node of the category
  if (window.shownEdgesCategoryCount[edge.category] === 0) {
    var button = document.getElementById(`${edge.category}-toggle`);
    button.blur();
    button.classList.replace("edge-toggle-hide", "edge-toggle-show");
    button.classList.replace("is-danger", "is-link");
    button.innerHTML = `<span>${edge.category.toUpperCase()}</span>
      <span class="icon is-small"><i class="fas fa-eye"></i></span>`;
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
  shownEdgesCategoryCount[edge.category]++;

  // Turn the hide/show nodes button of same category into hide type
  var button = document.getElementById(`${edge.category}-toggle`);
  button.blur();
  button.classList.replace("edge-toggle-show", "edge-toggle-hide");
  button.classList.replace("is-link", "is-danger");
  button.innerHTML = `<span>${edge.category.toUpperCase()}</span>
      <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>`;
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

  // Hide node edges
  hideNodeEdges(node);

  // Modify the node
  $(nodeElem).removeClass("node").addClass("node-isHidden");
  nodeElem.style = {};

  // Change button to show type
  var nodeMediaRight = nodeElem.querySelector(".media-right");
  nodeMediaRight.innerHTML = `
  <button class="button is-link is-outlined is-rounded is-small show-button">
    <span class="icon is-small">
      <i class="fas fa-eye"></i>
    </span>
  </button>`;

  // Turn the hide/show nodes button of same category into show type if it was last node of the category
  if (window.shownNodesCategoryCount[node.category] === 0) {
    var button = document.getElementById(`${node.category}-toggle`);
    button.blur();
    button.classList.replace("node-toggle-hide", "node-toggle-show");
    button.classList.replace("is-danger", "is-link");
    button.innerHTML = `<span>${node.category.toUpperCase()}</span>
      <span class="icon is-small"><i class="fas fa-eye"></i></span>`;
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

  // Show node edges
  showNodeEdges(node);

  // Modify the node element
  $(nodeElem).removeClass("node-isHidden").addClass("node");
  nodeElem.style = {
    position: "absolute",
    top: "5%",
    left: "5%",
  };

  // Change button to hide type
  var nodeMediaRight = nodeElem.querySelector(".media-right");
  nodeMediaRight.innerHTML = `
  <button class="button is-danger is-outlined is-rounded is-small hide-button">
    <span class="icon is-small">
      <i class="fas fa-eye-slash"></i>
    </span>
  </button>`;

  // Turn the hide/show nodes button of same category into hide type
  var button = document.getElementById(`${node.category}-toggle`);
  button.blur();
  button.classList.replace("node-toggle-show", "node-toggle-hide");
  button.classList.replace("is-link", "is-danger");
  button.innerHTML = `<span>${node.category.toUpperCase()}</span>
    <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>`;

  // Append to shown nodes div
  document.getElementById("graph-viewer").append(nodeElem);
}

// Event delegation for hide buttons
document.getElementById("graph-viewer").addEventListener("click", function (e) {
  if (e.target.closest(".hide-button")) {
    // Get the pressed hide button
    button = e.target.closest(".hide-button");

    // Get the node and remove it from graph viewer
    const nodeElem = button.closest(".node");
    const nodeId = nodeElem.id;
    let node = window.nodes[nodeId];
    hideNode(node);
  }
});

// Event delegation for show buttons
document.getElementById("hidden-nodes").addEventListener("click", function (e) {
  if (e.target.closest(".show-button")) {
    // Get the pressed hide button
    button = e.target.closest(".show-button");

    // Get the node and remove it from hidden nodes
    const nodeElem = button.closest(".node-isHidden");
    const nodeId = nodeElem.id;
    let node = window.nodes[nodeId];
    showNode(node);
  }
});
