/**
 * Unit test suite for graph-sparrow core graph logic.
 * Runs on Node's built-in test runner with jsdom.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { JSDOM } = require("jsdom");

const dom = new JSDOM(
  `<!DOCTYPE html>
  <html>
    <body>
      <div id="graph-viewer"></div>
      <div id="svg-arrows"></div>
      <div id="node-toggles"></div>
      <div id="edge-toggles"></div>
      <select id="edge-src-node-id"></select>
      <select id="edge-dst-node-id"></select>
      <select id="node-class"><option value="green-node">green-node</option></select>
      <select id="edge-class"><option value="purple-edge">purple-edge</option></select>
      <button id="reload-graph-layout"></button>
      <div id="hidden-nodes"></div>
    </body>
  </html>`,
  { runScripts: "dangerously", pretendToBeVisual: true }
);

const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..");

const sources = [
  "node_modules/jquery/dist/jquery.js",
  "jquery.arrows.js",
  "springy.js",
  "addnodesedges.js",
  "hideshownodes.js",
  "edgenodetoggles.js",
  "reloadgraphlayout.js",
];

for (const src of sources) {
  dom.window.eval(fs.readFileSync(path.join(dir, src), "utf8"));
}

// Stub getBoundingClientRect (jsdom returns zeros)
dom.window.Element.prototype.getBoundingClientRect = function () {
  return { top: 10, left: 10, right: 100, bottom: 60, width: 90, height: 50, x: 10, y: 10 };
};

const w = dom.window;


// Reset graph state for test isolation
function resetGraph() {
  Object.keys(w.nodes).forEach((id) => w.removeNode(id));
  w.edges.length = 0;
  w.shownNodesCategoryCount = {};
  w.shownEdgesCategoryCount = {};
  dom.window.document.getElementById("node-toggles").innerHTML = "";
  dom.window.document.getElementById("edge-toggles").innerHTML = "";
  dom.window.document.getElementById("hidden-nodes").innerHTML = "";
  dom.window.document.getElementById("graph-viewer").innerHTML = "";
  dom.window.document.getElementById("svg-arrows").innerHTML = "";
  dom.window.document.getElementById("edge-src-node-id").innerHTML = "";
  dom.window.document.getElementById("edge-dst-node-id").innerHTML = "";
  dom.window.document.getElementById("node-class").innerHTML =
    '<option value="green-node">green-node</option>';
  dom.window.document.getElementById("edge-class").innerHTML =
    '<option value="purple-edge">purple-edge</option>';
}

// ---------------------------------------------------------------------------
// Node lifecycle
// ---------------------------------------------------------------------------

test("addNode registers the node and renders DOM element", () => {
  w.addNode({ id: "n1", category: "green-node", text: "test node" });
  assert.ok(w.nodes["n1"]);
  assert.strictEqual(w.nodes["n1"].isHidden, false);
  assert.ok(dom.window.document.getElementById("n1"));
  assert.ok(dom.window.document.getElementById("edge-src-node-id").querySelector('option[value="n1"]'));
});

test("addNode prevents duplicate ids via UI guard", () => {
  w.addNode({ id: "dup", category: "green-node" });
  w.addNode({ id: "dup", category: "green-node" });
  assert.strictEqual(Object.keys(w.nodes).filter((k) => k === "dup").length, 1);
});

test("addEdge creates arrow element and registers edge", () => {
  w.addNode({ id: "a", category: "cyan-node" });
  w.addNode({ id: "b", category: "cyan-node" });
  w.addEdge({ srcNodeId: "a", dstNodeId: "b", category: "purple-edge", text: "connects" });

  assert.strictEqual(w.edges.length, 1);
  assert.strictEqual(w.edges[0].id, "a-b");
  assert.ok(dom.window.document.getElementById("a-b"));
});

test("removeNode removes node and its incident edges", () => {
  resetGraph();
  w.addNode({ id: "x", category: "green-node" });
  w.addNode({ id: "y", category: "green-node" });
  w.addEdge({ srcNodeId: "x", dstNodeId: "y", category: "purple-edge" });

  w.removeNode("x");

  assert.ok(!w.nodes["x"]);
  assert.strictEqual(w.edges.length, 0);
  assert.ok(!dom.window.document.getElementById("x"));
});

test("removeEdge removes the arrow element", () => {
  resetGraph();
  w.addNode({ id: "p", category: "green-node" });
  w.addNode({ id: "q", category: "green-node" });
  w.addEdge({ srcNodeId: "p", dstNodeId: "q", category: "purple-edge" });

  w.removeEdge("p-q");
  assert.strictEqual(w.edges.length, 0);
  assert.ok(!dom.window.document.getElementById("p-q"));
});

// ---------------------------------------------------------------------------
// Visibility toggles
// ---------------------------------------------------------------------------

test("hideNode moves the DOM element to the hidden-nodes pool", () => {
  w.addNode({ id: "h1", category: "green-node" });
  w.hideNode(w.nodes["h1"]);
  assert.strictEqual(w.nodes["h1"].isHidden, true);
  const el = dom.window.document.getElementById("h1");
  assert.ok(el);
  assert.ok(el.classList.contains("node-isHidden"));
  assert.strictEqual(el.parentElement.id, "hidden-nodes");
});

test("showNode restores the DOM element to the graph viewer", () => {
  w.addNode({ id: "h2", category: "green-node" });
  w.hideNode(w.nodes["h2"]);
  w.showNode(w.nodes["h2"]);
  assert.strictEqual(w.nodes["h2"].isHidden, false);
  const el = dom.window.document.getElementById("h2");
  assert.ok(el);
  assert.ok(el.classList.contains("node"));
  assert.strictEqual(el.parentElement.id, "graph-viewer");
});

test("hideEdge hides the arrow element", () => {
  w.addNode({ id: "e1", category: "green-node" });
  w.addNode({ id: "e2", category: "green-node" });
  w.addEdge({ srcNodeId: "e1", dstNodeId: "e2", category: "purple-edge" });

  w.hideEdge(w.edges[0]);
  assert.strictEqual(w.edges[0].isHidden, true);
  assert.strictEqual(dom.window.document.getElementById("e1-e2").style.display, "none");
});

// ---------------------------------------------------------------------------
// Category counters
// ---------------------------------------------------------------------------

test("category counters track shown nodes and edges", () => {
  resetGraph();
  const before = w.shownNodesCategoryCount["green-node"] || 0;
  w.addNode({ id: "c1", category: "green-node" });
  assert.strictEqual(w.shownNodesCategoryCount["green-node"], before + 1);

  const eb = w.shownEdgesCategoryCount["purple-edge"] || 0;
  w.addNode({ id: "c2", category: "green-node" });
  w.addEdge({ srcNodeId: "c1", dstNodeId: "c2", category: "purple-edge" });
  assert.strictEqual(w.shownEdgesCategoryCount["purple-edge"], eb + 1);
});

// ---------------------------------------------------------------------------
// Springy force-directed layout
// ---------------------------------------------------------------------------

test("Springy graph API: add nodes/edges and query adjacency", () => {
  const g = new w.Springy.Graph();
  const n1 = g.newNode("s1", {});
  const n2 = g.newNode("s2", {});
  g.newEdge(n1, n2, {});

  assert.strictEqual(g.nodes.length, 2);
  assert.strictEqual(g.edges.length, 1);
  assert.strictEqual(g.getEdges(n1, n2).length, 1);
  assert.ok(g.nodeSet["s1"]);
});

test("Springy removeNode detaches incident edges", () => {
  const g = new w.Springy.Graph();
  const n1 = g.newNode("r1", {});
  const n2 = g.newNode("r2", {});
  g.newEdge(n1, n2, {});
  g.removeNode(n1);
  assert.strictEqual(g.nodes.length, 1);
  assert.strictEqual(g.edges.length, 0);
});

test("force-directed layout produces finite positions", () => {
  const g = new w.Springy.Graph();
  const a = g.newNode("f1", {});
  const b = g.newNode("f2", {});
  const c = g.newNode("f3", {});
  g.newEdge(a, b, {});
  g.newEdge(b, c, {});

  const layout = new w.Springy.Layout.ForceDirected(g, 500, 2000, 0.5);
  layout.start();
  for (let i = 0; i < 200; i++) layout.tick(0.02);

  for (const id of ["f1", "f2", "f3"]) {
    const p = layout.nodePoints[id].p;
    assert.ok(Number.isFinite(p.x), "x finite for " + id);
    assert.ok(Number.isFinite(p.y), "y finite for " + id);
  }
});

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

test("exportGraph round-trips through importGraph", () => {
  // Fresh clean state
  Object.keys(w.nodes).forEach((id) => w.removeNode(id));
  w.edges.length = 0;

  w.addNode({ id: "s1", category: "cyan-node", text: "sensor" });
  w.addNode({ id: "g1", category: "blue-node", text: "gateway" });
  w.addEdge({ srcNodeId: "s1", dstNodeId: "g1", category: "purple-edge", text: "pub" });

  const json = w.exportGraph();
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.nodes.length, 2);
  assert.strictEqual(parsed.edges.length, 1);

  // Import into a fresh graph
  Object.keys(w.nodes).forEach((id) => w.removeNode(id));
  w.edges.length = 0;
  w.importGraph(json);

  assert.ok(w.nodes["s1"]);
  assert.ok(w.nodes["g1"]);
  assert.strictEqual(w.edges.length, 1);
  assert.strictEqual(w.edges[0].id, "s1-g1");
});
