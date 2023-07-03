// Given a proper node or edge object, add a node or edge to the graph viewer

// Initialize window nodes and edges
window.nodes = {};
window.edges = [];

/* Add node object
node = {
    id: "unique-node-id",
    category: "shared-node-class-1",
    text: "text to add to node" 
}
*/
function addNode(node) {
    const { id, category, text } = node;

    // Add node to window dictionary
    node.isHidden = false;
    window.nodes[id] = node;

    // Create html node element and add to graph viewer
    const nodeHTML = `
        <div id="${id}" class="node ${category}">
            <div class="media">
                <div class="media-content">
                    <h5 class="title is-5">${id} (${category})</h5>
                </div>
                <div class="media-right">
                    <button class="button is-danger is-outlined is-rounded is-small hide-button">
                        <span class="icon is-small">
                            <i class="fas fa-eye-slash"></i>
                        </span>
                    </button>
                </div>
            </div>
            ${text ? `<h5 class="subtitle is-5">${text}</h5>` : ""}
        </div>
    `;

    // Append nodeHTML to graph viewer
    document.getElementById("graph-viewer").innerHTML += nodeHTML;

    // Add new node toggle if new category
    if ((!window.shownNodesCategoryCount[category]) && (window.shownNodesCategoryCount[category] !== 0)) {
        const nodeToggleHTML = `
            <button id="${category}-toggle" class="node-toggle-hide button is-danger is-outlined">
                <span>${category.toUpperCase()}</span>
                <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>
            </button>
        `;
        document.getElementById("node-toggles").innerHTML += nodeToggleHTML;
    }

    // Increment shown nodes category count
    if (!shownNodesCategoryCount[node.category]) shownNodesCategoryCount[node.category] = 0;
    shownNodesCategoryCount[node.category] += 1;
};

/* Add edge object
edge = {
    srcNodeId: "unique-node-id-1",
    dstNodeId: "unique-node-id-2",
    category: "shared-edge-class-1",
    text: "text to add to edge" 
}
*/
function addEdge(edge) {
    const { srcNodeId, dstNodeId, category, text } = edge;

    // Add edge to window list
    edge.id = srcNodeId + "-" + dstNodeId;
    edge.isHidden = false;
    window.edges.push(edge);

    // Create jQuery Arrows edge
    $().arrows({
        within: '#svg-arrows',
        id: edge.id,
        class: category,
        name: text + ` (${category})`,
        from: '#' + srcNodeId,
        to: '#' + dstNodeId
    });

    // Add new edge toggle if new category
    if ((!window.shownEdgesCategoryCount[category]) && (window.shownEdgesCategoryCount[category] !== 0)) {
        const edgeToggleHTML = `
            <button id="${category}-toggle" class="edge-toggle-hide button is-danger is-outlined">
                <span>${category.toUpperCase()}</span>
                <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>
            </button>
        `;
        document.getElementById("edge-toggles").innerHTML += edgeToggleHTML;
    }

    // Increment shown edges category count
    if (!shownEdgesCategoryCount[edge.category]) shownEdgesCategoryCount[edge.category] = 0;
    shownEdgesCategoryCount[edge.category] += 1;
};