// Initialize window nodes and edges
window.nodes = {};
window.edges = [];

// Get the button element by its ID
var addNodeButton = document.getElementById('add-node');

// Add an event listener for the 'click' event
addNodeButton.addEventListener('click', function () {
    // Get field values
    const nodeId = document.getElementById('node-id').value;
    const nodeClass = document.getElementById('node-class').value;
    const nodeText = document.getElementById('node-text').value;

    // Check that the node id is not empty
    if (nodeId === "") {
        alert('The node id is empty! Write an unique node id.');
        return;
    }
    // Check that the node id doesnt exist yet
    if (window.nodes[nodeId]) {
        alert('The node id already exists! Write an unique node id.');
        return;
    }

    // Reset values
    document.getElementById('node-id').value = null;
    document.getElementById('node-text').value = null;

    // Otherwise add new node
    const node = {
        id: nodeId,
        category: nodeClass,
        text: nodeText
    }
    addNode(node);
});

// Get the button element by its ID
var addEdgeButton = document.getElementById('add-edge');

// Add an event listener for the 'click' event
addEdgeButton.addEventListener('click', function () {
    // Get field values
    const edgeSrcNodeId = document.getElementById('edge-src-node-id').value;
    const edgeDstNodeId = document.getElementById('edge-dst-node-id').value;
    const edgeClass = document.getElementById('edge-class').value;
    const edgeText = document.getElementById('edge-text').value;

    // Check that src and dst node are different
    if (edgeSrcNodeId === edgeDstNodeId) {
        alert('The source and destination node ids must not match!');
        return;
    }
    // Check that the edge id doesnt exist yet
    for (const edge of window.edges) {
        if ((edge.id === (edgeSrcNodeId + "-" + edgeDstNodeId)) || (edge.id === (edgeDstNodeId + "-" + edgeSrcNodeId))) {
            alert('The edge already exists! Change srcNodeId or dstNodeId.');
            return;
        }
    }

    // Reset values
    document.getElementById('edge-text').value = null;

    // Otherwise add new node
    const edge = {
        srcNodeId: edgeSrcNodeId,
        dstNodeId: edgeDstNodeId,
        category: edgeClass,
        text: edgeText
    }
    addEdge(edge);
});

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
                    <h5 class="title is-5">${id}</h5>
                    ${text ? `<h6 class="subtitle is-6">${text}</h6>` : ""}
                    <!-- <span class="tag is-link is-small">${category}</span> -->
                </div>
                <div class="media-right">
                    <button class="button is-danger is-outlined is-rounded is-small hide-button">
                        <span class="icon is-small">
                            <i class="fas fa-eye-slash"></i>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Append nodeHTML to graph viewer
    document.getElementById("graph-viewer").innerHTML += nodeHTML;
    $(".node").draggable(); // Make node boxes draggable with jQuery UI

    // Add node to edge source and destination select elems
    var srcSelectElem = document.getElementById('edge-src-node-id');
    var dstSelectElem = document.getElementById('edge-dst-node-id');

    // Create a new option element
    var newSrcOption = document.createElement('option');
    var newDstOption = document.createElement('option');
    newSrcOption.text = id; // Set the text content of the option
    newSrcOption.value = id; // Optionally, set the value of the option
    newDstOption.text = id; // Set the text content of the option
    newDstOption.value = id; // Optionally, set the value of the option

    // Append the new option to the select element
    srcSelectElem.appendChild(newSrcOption);
    dstSelectElem.appendChild(newDstOption);

    // Add new node toggle if new category
    if ((!window.shownNodesCategoryCount[category]) && (window.shownNodesCategoryCount[category] !== 0)) {
        const nodeToggleHTML = `
            <button id="${category}-toggle" class="node-toggle-hide button is-danger is-outlined">
                <span>${category.toUpperCase()}</span>
                <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>
            </button>
        `;
        document.getElementById("node-toggles").innerHTML += nodeToggleHTML;

        // Create new class option
        var classSelectElem = document.getElementById('node-class');
        var newClassOption = document.createElement('option');
        newClassOption.text = category; // Set the text content of the option
        newClassOption.value = category; // Optionally, set the value of the option
        classSelectElem.appendChild(newClassOption);
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
        category: category,
        name: text,
        from: '#' + srcNodeId,
        to: '#' + dstNodeId
    });

    var newArrow = $("#" + edge.id);
    setInterval(function () {
        newArrow.arrows("update");
    }, 50);

    // Add new edge toggle if new category
    if ((!window.shownEdgesCategoryCount[category]) && (window.shownEdgesCategoryCount[category] !== 0)) {
        const edgeToggleHTML = `
            <button id="${category}-toggle" class="edge-toggle-hide button is-danger is-outlined">
                <span>${category.toUpperCase()}</span>
                <span class="icon is-small"><i class="fas fa-eye-slash"></i></span>
            </button>
        `;
        document.getElementById("edge-toggles").innerHTML += edgeToggleHTML;

        // Create new class option
        var classSelectElem = document.getElementById('edge-class');
        var newClassOption = document.createElement('option');
        newClassOption.text = category; // Set the text content of the option
        newClassOption.value = category; // Optionally, set the value of the option
        classSelectElem.appendChild(newClassOption);
    }

    // Increment shown edges category count
    if (!shownEdgesCategoryCount[edge.category]) shownEdgesCategoryCount[edge.category] = 0;
    shownEdgesCategoryCount[edge.category] += 1;
};