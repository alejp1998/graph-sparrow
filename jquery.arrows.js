/**
 * jQuery Arrows Plugin v2.1.0
 * Adds stylable, responsive SVG connector arrows with curved paths and text tags between DOM elements.
 *
 * @license MIT
 * @author Alejandro Jarabo-Peñas
 */
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("jquery"));
  } else {
    factory(jQuery);
  }
})(function ($) {
  "use strict";

  var counter = 0;

  /**
   * Main jQuery plugin entrypoint.
   */
  $.fn.arrows = function (options) {
    if (options === "update") {
      return processArrows(update, this);
    } else if (options === "remove") {
      return processArrows(destroy, this);
    } else {
      var opts = $.extend(
        true,
        {
          from: this,
          to: this,
          id: "arrow-" + counter++,
          within: "body",
          class: "arrow-default",
          name: "",
          curvature: 0.0,
          strokeWidth: 2,
        },
        options
      );

      if (!options.class && options.category) {
        opts.class = options.category;
      }

      connect(opts);
      return this;
    }
  };

  /**
   * Custom teardown event to clean up arrows when a node is removed from DOM.
   */
  $.event.special.arrows = {
    teardown: function () {
      processArrows(destroy, $(this));
    },
  };

  /**
   * Connects source and target elements based on options.
   */
  var connect = function (options) {
    var end1 = $(options.from);
    var end2 = $(options.to);
    var within = $(options.within);

    delete options.from;
    delete options.to;
    delete options.within;

    var container = within.length ? within : $("body");
    var done = [];

    end1.each(function () {
      var node = this;
      done.push(this);
      end2.not(done).each(function () {
        createArrow(container, [node, this], $.extend({}, options));
      });
    });
  };

  /**
   * Creates an arrow element and appends its SVG canvas to the container.
   */
  var createArrow = function (container, nodes, options) {
    var svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" id="' +
      options.id +
      '-svg" class="svg-arrow-canvas" style="position: absolute; pointer-events: none;"></svg>';
    var arrow = $("<arrow>", {
      id: options.id,
      class: options.class,
    }).html(svgString);

    container.append(arrow);

    var data = {
      id: options.id,
      class: options.class,
      name: options.name,
      curvature: options.curvature || 0.0,
      container: container,
      node_from: $(nodes[0]),
      node_to: $(nodes[1]),
      nodes_dom: nodes,
      cache: undefined,
      hidden: false,
      unmodified: false,
    };

    $.data(arrow.get(0), "arrow", data);
    $.data(arrow.get(0), "arrows", [arrow.get(0)]);

    for (var i = 0; i < 2; i++) {
      var existing = $.data(nodes[i], "arrows") || [];
      var merged = $(existing).add(arrow).get();
      $.data(nodes[i], "arrows", merged);

      if (merged.length === 1) {
        $(nodes[i]).on("arrows.arrows", false);
      }
    }

    update(arrow.get(0));
  };

  /**
   * Removes an arrow from the DOM and clears node references.
   */
  var destroy = function (arrow) {
    var arrowData = $.data(arrow, "arrow");
    if (!arrowData || !arrowData.nodes_dom) return;

    var nodes = arrowData.nodes_dom;
    for (var i = 0; i < 2; i++) {
      var remaining = $($.data(nodes[i], "arrows")).not(arrow).get();
      $.data(nodes[i], "arrows", remaining);
    }
    $(arrow).remove();
  };

  /**
   * Compares cached and live bounding rectangles of connected nodes.
   */
  var getState = function (data) {
    if (!data.nodes_dom[0] || !data.nodes_dom[1]) {
      data.hidden = true;
      return false;
    }

    data.rect_from = data.nodes_dom[0].getBoundingClientRect();
    data.rect_to = data.nodes_dom[1].getBoundingClientRect();

    var cached = data.cache;
    data.cache = [
      data.rect_from.top,
      data.rect_from.right,
      data.rect_from.bottom,
      data.rect_from.left,
      data.rect_to.top,
      data.rect_to.right,
      data.rect_to.bottom,
      data.rect_to.left,
    ];

    data.hidden =
      (data.cache[0] === 0 && data.cache[1] === 0 && data.cache[2] === 0 && data.cache[3] === 0) ||
      (data.cache[4] === 0 && data.cache[5] === 0 && data.cache[6] === 0 && data.cache[7] === 0);

    if (cached === undefined) {
      data.unmodified = false;
      return false;
    }

    data.unmodified = true;
    for (var i = 0; i < 8; i++) {
      if (Math.abs(cached[i] - data.cache[i]) > 0.5) {
        data.unmodified = false;
        break;
      }
    }

    return data.unmodified;
  };

  /**
   * Calculates the exact intersection point between a ray originating from the
   * rectangle center (cx, cy) toward an external point (px, py) and the rectangle border.
   *
   * Uses robust parametric ray-box intersection with ZERO division-by-zero singularities.
   */
  var pointOnRect = function (px, py, minX, minY, maxX, maxY) {
    var cx = (minX + maxX) / 2.0;
    var cy = (minY + maxY) / 2.0;
    var hw = (maxX - minX) / 2.0;
    var hh = (maxY - minY) / 2.0;

    var dx = px - cx;
    var dy = py - cy;

    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      return { x: cx, y: cy };
    }

    var tx = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity;
    var ty = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity;

    var t = Math.min(tx, ty);

    return {
      x: cx + t * dx,
      y: cy + t * dy,
    };
  };

  /**
   * Position and size the SVG canvas element.
   */
  var modifyCanvas = function (id, minX, minY, width, height) {
    var svg = document.getElementById(id + "-svg");
    if (!svg) return null;

    svg.setAttribute(
      "style",
      "position: absolute; top: " +
        minY +
        "px; left: " +
        minX +
        "px; z-index: 1; pointer-events: none; overflow: visible;"
    );
    svg.setAttribute("width", Math.max(1, width));
    svg.setAttribute("height", Math.max(1, height));
    return svg;
  };

  /**
   * Adds the SVG triangle marker arrowhead definition.
   */
  var addTriangleMarkerDef = function (svg, id, className) {
    if (svg.querySelector("defs")) return;

    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML =
      '<marker id="' +
      id +
      '-triangle" class="' +
      (className || "") +
      '" viewBox="0 0 10 10" refX="9" refY="5"' +
      ' markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path class="svg-line-triangle" d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor"></path>' +
      "</marker>";
    svg.appendChild(defs);
  };

  /**
   * Generates a curved or straight SVG path.
   */
  var addArrowLine = function (svg, id, x1, y1, x2, y2, curvature) {
    var prevLine = document.getElementById(id + "-svg-line");
    if (prevLine) prevLine.remove();

    var d;
    if (!curvature || Math.abs(curvature) < 1e-4) {
      d = "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
    } else {
      var mx = (x1 + x2) / 2;
      var my = (y1 + y2) / 2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - (dy / len) * curvature * 50;
      var cy = my + (dx / len) * curvature * 50;
      d = "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2;
    }

    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("id", id + "-svg-line");
    path.setAttribute("class", "svg-line");
    path.setAttribute("d", d);
    path.setAttribute("marker-end", "url(#" + id + "-triangle)");
    svg.appendChild(path);
  };

  /**
   * Adds the text label at the arrow's midpoint.
   * Labels always read left-to-right: the rotation follows the path only for
   * shallow angles (|angle| <= 55°) and clamps to horizontal for steep arrows,
   * so text is never upside down or sideways regardless of arrow orientation.
   */
  var addArrowName = function (svg, id, name, x1, y1, x2, y2, curvature) {
    if (!name) return;

    var prevText = document.getElementById(id + "-svg-text");
    if (prevText) prevText.remove();

    // Path midpoint: quadratic Bézier at t = 0.5, or line midpoint
    var mx, my;
    if (curvature === 0) {
      mx = (x1 + x2) / 2;
      my = (y1 + y2) / 2;
    } else {
      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = (x1 + x2) / 2 - (dy / len) * curvature * 50;
      var cy = (y1 + y2) / 2 + (dx / len) * curvature * 50;
      mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
      my = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
    }

    // Path angle, normalized to (-90, 90] so the text always reads left-to-right
    var angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    while (angleDeg > 90) angleDeg -= 180;
    while (angleDeg <= -90) angleDeg += 180;

    // Steep arrows keep the label horizontal for readability
    var rotation = Math.abs(angleDeg) > 55 ? 0 : angleDeg;

    var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("id", id + "-svg-text");
    text.setAttribute("class", "svg-text");
    text.setAttribute("x", mx);
    text.setAttribute("y", my);
    text.setAttribute("dy", "-6px");
    text.setAttribute("text-anchor", "middle");
    if (rotation !== 0) {
      text.setAttribute("transform", "rotate(" + rotation + " " + mx + " " + my + ")");
    }
    text.textContent = name;
    svg.appendChild(text);
  };

  /**
   * Draws the arrow elements inside the SVG canvas.
   */
  var drawArrow = function (id, className, name, x1, y1, x2, y2, curvature) {
    var svg = document.getElementById(id + "-svg");
    if (!svg) return;

    addTriangleMarkerDef(svg, id, className);
    addArrowLine(svg, id, x1, y1, x2, y2, curvature);
    addArrowName(svg, id, name, x1, y1, x2, y2, curvature);
  };

  /**
   * Updates an arrow position and geometry with proper container-relative coordinates.
   */
  var update = function (arrow) {
    var data = $.data(arrow, "arrow");
    if (!data) return;

    getState(data);
    if (data.unmodified || data.hidden) return;

    // Determine container offset for correct coordinate translation
    var containerEl =
      data.container && data.container.length ? data.container.get(0) : document.body;
    var containerRect = containerEl.getBoundingClientRect();
    var cScrollLeft = containerEl.scrollLeft || 0;
    var cScrollTop = containerEl.scrollTop || 0;

    // Convert node rectangles from viewport space to container space
    var from_left = data.rect_from.left - containerRect.left + cScrollLeft;
    var from_right = data.rect_from.right - containerRect.left + cScrollLeft;
    var from_top = data.rect_from.top - containerRect.top + cScrollTop;
    var from_bottom = data.rect_from.bottom - containerRect.top + cScrollTop;

    var to_left = data.rect_to.left - containerRect.left + cScrollLeft;
    var to_right = data.rect_to.right - containerRect.left + cScrollLeft;
    var to_top = data.rect_to.top - containerRect.top + cScrollTop;
    var to_bottom = data.rect_to.bottom - containerRect.top + cScrollTop;

    var from_cx = (from_left + from_right) / 2.0;
    var from_cy = (from_top + from_bottom) / 2.0;
    var to_cx = (to_left + to_right) / 2.0;
    var to_cy = (to_top + to_bottom) / 2.0;

    // Bounding box encompassing both node rectangles + padding
    var PADDING = 20;
    var minX = Math.min(from_left, to_left) - PADDING;
    var minY = Math.min(from_top, to_top) - PADDING;
    var maxX = Math.max(from_right, to_right) + PADDING;
    var maxY = Math.max(from_bottom, to_bottom) + PADDING;
    var width = maxX - minX;
    var height = maxY - minY;

    var svg = modifyCanvas(data.id, minX, minY, width, height);
    if (!svg) return;

    // Calculate exact boundary intersection points
    // From-node ray goes from from_cx towards to_cx
    var from_int = pointOnRect(to_cx, to_cy, from_left, from_top, from_right, from_bottom);
    // To-node ray goes from to_cx towards from_cx
    var to_int = pointOnRect(from_cx, from_cy, to_left, to_top, to_right, to_bottom);

    drawArrow(
      data.id,
      data.class,
      data.name,
      from_int.x - minX,
      from_int.y - minY,
      to_int.x - minX,
      to_int.y - minY,
      data.curvature
    );
  };

  /**
   * Helper to iterate over arrows and apply a method.
   */
  var processArrows = function (method, elements) {
    return elements.each(function () {
      var arrows = $.data(this, "arrows");
      if (Array.isArray(arrows)) {
        for (var i = 0, len = arrows.length; i < len; i++) {
          if (arrows[i]) method(arrows[i]);
        }
      }
    });
  };

  $.arrows = {
    pointOnRect: pointOnRect,
    version: "2.1.0",
  };
});
