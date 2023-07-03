var Springy = {};

var Graph = (Springy.Graph = function () {
  this.nodeSet = {};
  this.nodes = [];
  this.edges = [];
  this.adjacency = {};

  this.nextNodeId = 0;
  this.nextEdgeId = 0;
});

var Node = (Springy.Node = function (id, data) {
  this.id = id;
  this.data = data !== undefined ? data : {};
});

var Edge = (Springy.Edge = function (id, source, target, data) {
  this.id = id;
  this.source = source;
  this.target = target;
  this.data = data !== undefined ? data : {};
});

Graph.prototype.addNode = function (node) {
  if (!(node.id in this.nodeSet)) {
    this.nodes.push(node);
  }

  this.nodeSet[node.id] = node;
  return node;
};

Graph.prototype.addEdge = function (edge) {
  var exists = false;
  this.edges.forEach(function (e) {
    if (edge.id === e.id) {
      exists = true;
    }
  });

  if (!exists) {
    this.edges.push(edge);
  }

  if (!(edge.source.id in this.adjacency)) {
    this.adjacency[edge.source.id] = {};
  }
  if (!(edge.target.id in this.adjacency[edge.source.id])) {
    this.adjacency[edge.source.id][edge.target.id] = [];
  }

  exists = false;
  this.adjacency[edge.source.id][edge.target.id].forEach(function (e) {
    if (edge.id === e.id) {
      exists = true;
    }
  });

  if (!exists) {
    this.adjacency[edge.source.id][edge.target.id].push(edge);
  }

  return edge;
};

Graph.prototype.newNode = function (id, data) {
  var node = new Node(id, data);
  this.addNode(node);
  return node;
};

Graph.prototype.newEdge = function (source, target, data) {
  var edge = new Edge(this.nextEdgeId++, source, target, data);
  this.addEdge(edge);
  return edge;
};

// find the edges from node1 to node2
Graph.prototype.getEdges = function (node1, node2) {
  if (node1.id in this.adjacency && node2.id in this.adjacency[node1.id]) {
    return this.adjacency[node1.id][node2.id];
  }

  return [];
};

// remove a node and it's associated edges from the graph
Graph.prototype.removeNode = function (node) {
  if (node.id in this.nodeSet) {
    delete this.nodeSet[node.id];
  }

  for (var i = this.nodes.length - 1; i >= 0; i--) {
    if (this.nodes[i].id === node.id) {
      this.nodes.splice(i, 1);
    }
  }

  this.detachNode(node);
};

// removes edges associated with a given node
Graph.prototype.detachNode = function (node) {
  var tmpEdges = this.edges.slice();
  tmpEdges.forEach(function (e) {
    if (e.source.id === node.id || e.target.id === node.id) {
      this.removeEdge(e);
    }
  }, this);
};

// remove a node and it's associated edges from the graph
Graph.prototype.removeEdge = function (edge) {
  for (var i = this.edges.length - 1; i >= 0; i--) {
    if (this.edges[i].id === edge.id) {
      this.edges.splice(i, 1);
    }
  }

  for (var x in this.adjacency) {
    for (var y in this.adjacency[x]) {
      var edges = this.adjacency[x][y];

      for (var j = edges.length - 1; j >= 0; j--) {
        if (this.adjacency[x][y][j].id === edge.id) {
          this.adjacency[x][y].splice(j, 1);
        }
      }

      // Clean up empty edge arrays
      if (this.adjacency[x][y].length == 0) {
        delete this.adjacency[x][y];
      }
    }

    // Clean up empty objects
    if (isEmpty(this.adjacency[x])) {
      delete this.adjacency[x];
    }
  }
};

// -----------
var Layout = (Springy.Layout = {});
Layout.ForceDirected = function (graph, stiffness, repulsion, damping, minEnergyThreshold, maxSpeed) {
  this.graph = graph;
  this.stiffness = stiffness; // spring stiffness constant
  this.repulsion = repulsion; // repulsion constant
  this.damping = damping; // velocity damping factor
  this.minEnergyThreshold = minEnergyThreshold || 0.01; //threshold used to determine render stop
  this.maxSpeed = maxSpeed || Infinity; // nodes aren't allowed to exceed this speed

  this.nodePoints = {}; // keep track of points associated with nodes
  this.edgeSprings = {}; // keep track of springs associated with edges
};

Layout.ForceDirected.prototype.point = function (node) {
  if (!(node.id in this.nodePoints)) {
    var mass = node.data.mass !== undefined ? node.data.mass : 1.0;
    this.nodePoints[node.id] = new Layout.ForceDirected.Point(Vector.random(), mass);
  }

  return this.nodePoints[node.id];
};

Layout.ForceDirected.prototype.spring = function (edge) {
  if (!(edge.id in this.edgeSprings)) {
    var length = edge.data.length !== undefined ? edge.data.length : 1.0;

    var existingSpring = false;

    var from = this.graph.getEdges(edge.source, edge.target);
    from.forEach(function (e) {
      if (existingSpring === false && e.id in this.edgeSprings) {
        existingSpring = this.edgeSprings[e.id];
      }
    }, this);

    if (existingSpring !== false) {
      return new Layout.ForceDirected.Spring(existingSpring.point1, existingSpring.point2, 0.0, 0.0);
    }

    var to = this.graph.getEdges(edge.target, edge.source);
    from.forEach(function (e) {
      if (existingSpring === false && e.id in this.edgeSprings) {
        existingSpring = this.edgeSprings[e.id];
      }
    }, this);

    if (existingSpring !== false) {
      return new Layout.ForceDirected.Spring(existingSpring.point2, existingSpring.point1, 0.0, 0.0);
    }

    this.edgeSprings[edge.id] = new Layout.ForceDirected.Spring(
      this.point(edge.source),
      this.point(edge.target),
      length,
      this.stiffness
    );
  }

  return this.edgeSprings[edge.id];
};

// callback should accept two arguments: Node, Point
Layout.ForceDirected.prototype.eachNode = function (callback) {
  var t = this;
  this.graph.nodes.forEach(function (n) {
    callback.call(t, n, t.point(n));
  });
};

// callback should accept two arguments: Edge, Spring
Layout.ForceDirected.prototype.eachEdge = function (callback) {
  var t = this;
  this.graph.edges.forEach(function (e) {
    callback.call(t, e, t.spring(e));
  });
};

// callback should accept one argument: Spring
Layout.ForceDirected.prototype.eachSpring = function (callback) {
  var t = this;
  this.graph.edges.forEach(function (e) {
    callback.call(t, t.spring(e));
  });
};

// Physics stuff
Layout.ForceDirected.prototype.applyCoulombsLaw = function () {
  this.eachNode(function (n1, point1) {
    this.eachNode(function (n2, point2) {
      if (point1 !== point2) {
        var d = point1.p.subtract(point2.p);
        var distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
        var direction = d.normalise();

        // apply force to each end point
        point1.applyForce(direction.multiply(this.repulsion).divide(distance * distance * 0.5));
        point2.applyForce(direction.multiply(this.repulsion).divide(distance * distance * -0.5));
      }
    });
  });
};

Layout.ForceDirected.prototype.applyHookesLaw = function () {
  this.eachSpring(function (spring) {
    var d = spring.point2.p.subtract(spring.point1.p); // the direction of the spring
    var displacement = spring.length - d.magnitude();
    var direction = d.normalise();

    // apply force to each end point
    spring.point1.applyForce(direction.multiply(spring.k * displacement * -0.5));
    spring.point2.applyForce(direction.multiply(spring.k * displacement * 0.5));
  });
};

Layout.ForceDirected.prototype.attractToCentre = function () {
  this.eachNode(function (node, point) {
    var direction = point.p.multiply(-1.0);
    point.applyForce(direction.multiply(this.repulsion / 50.0));
  });
};

Layout.ForceDirected.prototype.updateVelocity = function (timestep) {
  this.eachNode(function (node, point) {
    // Is this, along with updatePosition below, the only places that your
    // integration code exist?
    point.v = point.v.add(point.a.multiply(timestep)).multiply(this.damping);
    if (point.v.magnitude() > this.maxSpeed) {
      point.v = point.v.normalise().multiply(this.maxSpeed);
    }
    point.a = new Vector(0, 0);
  });
};

Layout.ForceDirected.prototype.updatePosition = function (timestep) {
  this.eachNode(function (node, point) {
    // Same question as above; along with updateVelocity, is this all of
    // your integration code?
    point.p = point.p.add(point.v.multiply(timestep));
  });
};

// Calculate the total kinetic energy of the system
Layout.ForceDirected.prototype.totalEnergy = function (timestep) {
  var energy = 0.0;
  this.eachNode(function (node, point) {
    var speed = point.v.magnitude();
    energy += 0.5 * point.m * speed * speed;
  });

  return energy;
};

/**
 * Start simulation if it's not running already.
 * In case it's running then the call is ignored, and none of the callbacks passed is ever executed.
 */
Layout.ForceDirected.prototype.start = function () {
  var t = this;
  t.tick(0.03);
  console.log("Initial total energy: " + this.totalEnergy());
  if (this._started) return;
  this._started = true;
  this._stop = false;

  let n = 0;
  while (!t._stop && t.totalEnergy() > 0.000001) {
    t.tick(0.03);
    n++;
  }
  console.log("Final total energy: " + this.totalEnergy() + " in " + n + " steps");
  t._started = false;
};

Layout.ForceDirected.prototype.stop = function () {
  this._stop = true;
};

Layout.ForceDirected.prototype.tick = function (timestep) {
  this.applyCoulombsLaw();
  this.applyHookesLaw();
  this.attractToCentre();
  this.updateVelocity(timestep);
  this.updatePosition(timestep);
};

// Find the nearest point to a particular position
Layout.ForceDirected.prototype.nearest = function (pos) {
  var min = { node: null, point: null, distance: null };
  var t = this;
  this.graph.nodes.forEach(function (n) {
    var point = t.point(n);
    var distance = point.p.subtract(pos).magnitude();

    if (min.distance === null || distance < min.distance) {
      min = { node: n, point: point, distance: distance };
    }
  });

  return min;
};

// returns [bottomleft, topright]
Layout.ForceDirected.prototype.getBoundingBox = function () {
  var bottomleft = new Vector(-2, 2);
  var topright = new Vector(-2, 2);

  this.eachNode(function (n, point) {
    if (point.p.x < bottomleft.x) {
      bottomleft.x = point.p.x;
    }
    if (point.p.y < bottomleft.y) {
      bottomleft.y = point.p.y;
    }
    if (point.p.x > topright.x) {
      topright.x = point.p.x;
    }
    if (point.p.y > topright.y) {
      topright.y = point.p.y;
    }
  });

  var padding = topright.subtract(bottomleft).multiply(0.2); // ~5% padding

  return { bottomleft: bottomleft.subtract(padding), topright: topright.add(padding) };
};

// Vector
var Vector = (Springy.Vector = function (x, y) {
  this.x = x;
  this.y = y;
});

Vector.random = function () {
  return new Vector(20.0 * Math.random(), 20.0 * Math.random());
};

Vector.prototype.add = function (v2) {
  return new Vector(this.x + v2.x, this.y + v2.y);
};

Vector.prototype.subtract = function (v2) {
  return new Vector(this.x - v2.x, this.y - v2.y);
};

Vector.prototype.multiply = function (n) {
  return new Vector(this.x * n, this.y * n);
};

Vector.prototype.divide = function (n) {
  return new Vector(this.x / n || 0, this.y / n || 0); // Avoid divide by zero errors..
};

Vector.prototype.magnitude = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vector.prototype.normal = function () {
  return new Vector(-this.y, this.x);
};

Vector.prototype.normalise = function () {
  return this.divide(this.magnitude());
};

// Point
Layout.ForceDirected.Point = function (position, mass) {
  this.p = position; // position
  this.m = mass; // mass
  this.v = new Vector(0, 0); // velocity
  this.a = new Vector(0, 0); // acceleration
};

Layout.ForceDirected.Point.prototype.applyForce = function (force) {
  this.a = this.a.add(force.divide(this.m));
};

// Spring
Layout.ForceDirected.Spring = function (point1, point2, length, k) {
  this.point1 = point1;
  this.point2 = point2;
  this.length = length; // spring length at rest
  this.k = k; // spring constant (See Hooke's law) .. how stiff the spring is
};

var isEmpty = function (obj) {
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      return false;
    }
  }
  return true;
};
