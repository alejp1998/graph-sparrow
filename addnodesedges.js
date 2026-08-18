/* global hideNode */
/**
 * graph-sparrow — node & edge management module.
 * Public API: addNode(node), addEdge(edge), removeNode(id), removeEdge(id),
 * toggleNodeVisibility(id), toggleEdgeVisibility(id), exportGraph(), importGraph(json).
 */

// Initialize window nodes and edges
window.nodes = {};
window.edges = [];

// Shared category visibility counters (window-scoped, no implicit globals)
window.shownNodesCategoryCount = {};
window.shownEdgesCategoryCount = {};

/**
 * Single global arrow-update loop.
 * (Previously each edge spawned its own setInterval — a memory leak that
 * kept firing 50ms callbacks forever, even after the edge was removed.)
 */
window.arrowLoop = setInterval(function () {
  var arrows = document.querySelectorAll("arrow");
  for (var i = 0; i < arrows.length; i++) {
    var arrowEl = arrows[i];
    if (arrowEl) $(arrowEl).arrows("update");
  }
}, 50);

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function getGraphViewer() {
  return document.getElementById("graph-viewer");
}

function getSelect(id) {
  return document.getElementById(id);
}

function syncNodeOptions(nodeId) {
  var srcSelect = getSelect("edge-src-node-id");
  var dstSelect = getSelect("edge-dst-node-id");

  [srcSelect, dstSelect].forEach(function (select) {
    var option = document.createElement("option");
    option.text = nodeId;
    option.value = nodeId;
    select.appendChild(option);
  });
}

function syncClassOption(selectId, className) {
  var select = getSelect(selectId);
  var existing = Array.from(select.options).some(function (opt) {
    return opt.value === className;
  });
  if (existing) return;

  var option = document.createElement("option");
  option.text = className;
  option.value = className;
  select.appendChild(option);
}

function syncNodeToggle(category) {
  if (window.shownNodesCategoryCount[category] !== undefined) return;
  window.shownNodesCategoryCount[category] = 0;

  var container = document.getElementById("node-toggles");
  if (!container) return;
  var btn = document.createElement("button");
  btn.id = category + "-toggle";
  btn.className = "node-toggle-hide button is-danger is-outlined";
  btn.innerHTML =
    "<span>" +
    category.toUpperCase() +
    "</span>" +
    '<span class="icon is-small"><i class="fas fa-eye-slash"></i></span>';
  // Note: click delegation handled in edgenodetoggles.js
  container.appendChild(btn);
}

function syncEdgeToggle(category) {
  if (window.shownEdgesCategoryCount[category] !== undefined) return;
  window.shownEdgesCategoryCount[category] = 0;

  var container = document.getElementById("edge-toggles");
  if (!container) return;
  var btn = document.createElement("button");
  btn.id = category + "-toggle";
  btn.className = "edge-toggle-hide button is-danger is-outlined";
  btn.innerHTML =
    "<span>" +
    category.toUpperCase() +
    "</span>" +
    '<span class="icon is-small"><i class="fas fa-eye-slash"></i></span>';
  // Note: click delegation handled in edgenodetoggles.js
  container.appendChild(btn);
}

// ---------------------------------------------------------------------------
// Node / edge lifecycle
// ---------------------------------------------------------------------------

/**
 * Add a node object:
 * { id: "unique-node-id", category: "shared-class", text: "label" }
 */
function addNode(node) {
  var id = node.id;
  var category = node.category;
  var text = node.text;

  node.isHidden = false;
  window.nodes[id] = node;

  // Create the HTML node element
  var newNode = document.createElement("div");
  newNode.id = id;
  newNode.classList.add("node");
  if (category) newNode.classList.add(category);
  newNode.innerHTML =
    '<div class="media">' +
    '<div class="media-content">' +
    '<h5 class="title is-5">' +
    id +
    "</h5>" +
    (text ? '<h6 class="subtitle is-6">' + text + "</h6>" : "") +
    "</div>" +
    '<div class="media-right">' +
    '<button class="button is-danger is-outlined is-rounded is-small hide-button" title="Hide node">' +
    '<span class="icon is-small"><i class="fas fa-eye-slash"></i></span>' +
    "</button>" +
    "</div>" +
    "</div>";

  getGraphViewer().appendChild(newNode);

  // Hide button behavior
  newNode.querySelector(".hide-button").addEventListener("click", function () {
    hideNode(window.nodes[id]);
  });

  // Make draggable (jQuery UI, optional enhancement)
  if ($.fn.draggable) {
    $("#" + id).draggable({});
  }

  // Register in select dropdowns and category toggles
  syncNodeOptions(id);
  syncClassOption("node-class", category);
  syncNodeToggle(category);

  window.shownNodesCategoryCount[category] = (window.shownNodesCategoryCount[category] || 0) + 1;
}

/**
 * Add an edge object:
 * { srcNodeId, dstNodeId, category, text }
 */
function addEdge(edge) {
  var srcNodeId = edge.srcNodeId;
  var dstNodeId = edge.dstNodeId;
  var category = edge.category;
  var text = edge.text;

  edge.id = srcNodeId + "-" + dstNodeId;
  edge.isHidden = false;
  window.edges.push(edge);

  // Create the jQuery Arrows connector
  $().arrows({
    within: "#svg-arrows",
    id: edge.id,
    class: category, // v2 option; `category` alias also accepted
    name: text,
    from: "#" + srcNodeId,
    to: "#" + dstNodeId,
  });

  // Register the edge category toggle
  syncClassOption("edge-class", category);
  syncEdgeToggle(category);

  window.shownEdgesCategoryCount[category] = (window.shownEdgesCategoryCount[category] || 0) + 1;
}

/**
 * Remove a node and all its incident edges.
 */
function removeNode(nodeId) {
  var node = window.nodes[nodeId];
  if (!node) return;

  // Remove incident edges first
  window.edges
    .filter(function (e) {
      return e.srcNodeId === nodeId || e.dstNodeId === nodeId;
    })
    .forEach(function (e) {
      removeEdge(e.id);
    });

  // Remove the DOM element and bookkeeping
  var el = document.getElementById(nodeId);
  if (el && el.parentNode) el.parentNode.removeChild(el);
  delete window.nodes[nodeId];

  ["edge-src-node-id", "edge-dst-node-id"].forEach(function (selectId) {
    var select = getSelect(selectId);
    for (var i = select.options.length - 1; i >= 0; i--) {
      if (select.options[i].value === nodeId) select.remove(i);
    }
  });
}

/**
 * Remove an edge and its arrow element.
 */
function removeEdge(edgeId) {
  var idx = window.edges.findIndex(function (e) {
    return e.id === edgeId;
  });
  if (idx === -1) return;

  var edge = window.edges[idx];
  window.edges.splice(idx, 1);

  var arrowEl = document.getElementById(edgeId);
  if (arrowEl) $(arrowEl).arrows("remove");

  if (edge.category && window.shownEdgesCategoryCount[edge.category] !== undefined) {
    window.shownEdgesCategoryCount[edge.category] = Math.max(
      0,
      window.shownEdgesCategoryCount[edge.category] - 1
    );
  }
}

// ---------------------------------------------------------------------------
// Visibility toggles
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Graph serialization
/* exported exportGraph, importGraph */
// ---------------------------------------------------------------------------

function exportGraph() {
  return JSON.stringify(
    {
      nodes: Object.values(window.nodes).map(function (n) {
        return { id: n.id, category: n.category, text: n.text };
      }),
      edges: window.edges.map(function (e) {
        return {
          srcNodeId: e.srcNodeId,
          dstNodeId: e.dstNodeId,
          category: e.category,
          text: e.text,
        };
      }),
    },
    null,
    2
  );
}

function importGraph(json) {
  var data = typeof json === "string" ? JSON.parse(json) : json;

  // Clear current graph
  Object.keys(window.nodes).forEach(function (id) {
    removeNode(id);
  });
  document.querySelectorAll(".node-toggle-hide, .edge-toggle-hide").forEach(function (btn) {
    btn.remove();
  });
  window.shownNodesCategoryCount = {};
  window.shownEdgesCategoryCount = {};

  (data.nodes || []).forEach(addNode);
  (data.edges || []).forEach(addEdge);
}
