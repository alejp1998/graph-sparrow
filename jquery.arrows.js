/**
 * jQuery Arrows Plugin v2.0.0
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

  // Unique arrow counter
  var counter = 0;

  /**
   * Main jQuery plugin entrypoint.
   *
   * @param {Object|string} options - Configuration object or command ('update' | 'remove')
   * @returns {jQuery}
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
          curvature: 0.0, // 0.0 = straight line, >0 = curved Bezier
          strokeWidth: 2,
        },
        options
      );

      // Backward compatibility: v1.x used `category` for the CSS class
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

    // Check if either node is hidden / zero-sized
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
   * Calculates the intersection point between a ray (from center to external point)
   * and a rectangle border, with robust handling for vertical/horizontal alignment singularities.
   */
  var pointOnRect = function (x, y, minX, minY, maxX, maxY) {
    var midX = (minX + maxX) / 2;
    var midY = (minY + maxY) / 2;
    var dx = midX - x;
    var dy = midY - y;

    // Handle exact center coincidence
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      return { x: midX, y: midY };
    }

    // Handle purely vertical alignment (dx == 0)
    if (Math.abs(dx) < 1e-6) {
      return {
        x: midX,
        y: y > midY ? maxY : minY,
      };
    }

    // Handle purely horizontal alignment (dy == 0)
    if (Math.abs(dy) < 1e-6) {
      return {
        x: x > midX ? maxX : minX,
        y: midY,
      };
    }

    var m = dy / dx;

    // Left border
    if (x <= midX) {
      var yLeft = m * (minX - x) + y;
      if (minY <= yLeft && yLeft <= maxY) {
        return { x: minX, y: yLeft };
      }
    }

    // Right border
    if (x >= midX) {
      var yRight = m * (maxX - x) + y;
      if (minY <= yRight && yRight <= maxY) {
        return { x: maxX, y: yRight };
      }
    }

    // Top border
    if (y <= midY) {
      var xTop = (minY - y) / m + x;
      if (minX <= xTop && xTop <= maxX) {
        return { x: xTop, y: minY };
      }
    }

    // Bottom border
    if (y >= midY) {
      var xBottom = (maxY - y) / m + x;
      if (minX <= xBottom && xBottom <= maxX) {
        return { x: xBottom, y: maxY };
      }
    }

    return { x: midX, y: midY };
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
        "px; z-index: 1; pointer-events: none;"
    );
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
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
      '" viewBox="0 0 10 10" refX="8" refY="5"' +
      ' markerUnits="strokeWidth" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path class="svg-line-triangle" d="M 0 1 L 9 5 L 0 9 z" fill="currentColor"></path>' +
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
      // Calculate perpendicular offset for curved Bezier arch
      var mx = (x1 + x2) / 2;
      var my = (y1 + y2) / 2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - (dy / len) * curvature * 40;
      var cy = my + (dx / len) * curvature * 40;
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
   * Adds the text label tag along the arrow path.
   */
  var addArrowName = function (svg, id, name) {
    if (!name) return;

    var prevText = document.getElementById(id + "-svg-text");
    if (prevText) prevText.remove();

    var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("id", id + "-svg-text");
    text.setAttribute("class", "svg-text");
    text.setAttribute("dy", "-6px");
    text.setAttribute("text-anchor", "middle");

    var textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
    textPath.setAttribute("href", "#" + id + "-svg-line");
    textPath.setAttribute("startOffset", "50%");
    textPath.textContent = name;

    text.appendChild(textPath);
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
    addArrowName(svg, id, name);
  };

  /**
   * Updates an arrow position and geometry.
   */
  var update = function (arrow) {
    var data = $.data(arrow, "arrow");
    if (!data) return;

    getState(data);
    if (data.unmodified || data.hidden) return;

    var from_cx = (data.rect_from.left + data.rect_from.right) / 2 + window.scrollX;
    var from_cy = (data.rect_from.bottom + data.rect_from.top) / 2 + window.scrollY;
    var to_cx = (data.rect_to.left + data.rect_to.right) / 2 + window.scrollX;
    var to_cy = (data.rect_to.bottom + data.rect_to.top) / 2 + window.scrollY;

    var PADDING = 30;
    var minX = Math.min(from_cx, to_cx) - PADDING;
    var minY = Math.min(from_cy, to_cy) - PADDING;
    var width = Math.abs(from_cx - to_cx) + PADDING * 2;
    var height = Math.abs(from_cy - to_cy) + PADDING * 2;

    var svg = modifyCanvas(data.id, minX, minY, width, height);
    if (!svg) return;

    var from_rect_doc = {
      left: data.rect_from.left + window.scrollX,
      right: data.rect_from.right + window.scrollX,
      top: data.rect_from.top + window.scrollY,
      bottom: data.rect_from.bottom + window.scrollY,
    };

    var to_rect_doc = {
      left: data.rect_to.left + window.scrollX,
      right: data.rect_to.right + window.scrollX,
      top: data.rect_to.top + window.scrollY,
      bottom: data.rect_to.bottom + window.scrollY,
    };

    var to_int = pointOnRect(
      from_cx,
      from_cy,
      to_rect_doc.left,
      to_rect_doc.top,
      to_rect_doc.right,
      to_rect_doc.bottom
    );

    var from_int = pointOnRect(
      to_cx,
      to_cy,
      from_rect_doc.left,
      from_rect_doc.top,
      from_rect_doc.right,
      from_rect_doc.bottom
    );

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

  // Expose pure functions for unit testing
  $.arrows = {
    pointOnRect: pointOnRect,
    version: "2.0.0",
  };
});
