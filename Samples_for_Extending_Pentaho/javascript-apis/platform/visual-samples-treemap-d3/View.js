/*
 * This program is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License, version 2.1 as published by the Free Software
 * Foundation.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this
 * program; if not, you can obtain a copy at http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * or from the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * Copyright 2016 - 2019 Hitachi Vantara. All rights reserved.
 */
define([
  "pentaho/module!_",
  "pentaho/visual/impl/View",
  "d3",
  "pentaho/visual/scene/Base",
  "./clickD3"
], function(module, BaseView, d3, Scene, d3ClickController) {

  "use strict";

  // Create and return the Bar View class
  return BaseView.extend(module.id, {
    
    createTreemap: function (model, data, { // data is either tabular (array of objects) or hierarchy (nested objects)
      path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
      id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
      parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
      children, // if hierarchical data, given a d in data, returns its children
      value, // given a node d, returns a quantitative value (for area encoding; null for count)
      sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
      label, // given a leaf node d, returns the name to display on the rectangle
      group, // given a leaf node d, returns a categorical value (for color encoding)
      title, // given a leaf node d, returns its hover text
      link, // given a leaf node d, its link (if any)
      linkTarget = "_blank", // the target attribute for links (if any)
      tile = d3.treemapBinary, // treemap strategy
      width = 640, // outer width, in pixels
      height = 400, // outer height, in pixels
      margin = 0, // shorthand for margins
      marginTop = margin, // top margin, in pixels
      marginRight = margin, // right margin, in pixels
      marginBottom = margin, // bottom margin, in pixels
      marginLeft = margin, // left margin, in pixels
      padding = 1, // shorthand for inner and outer padding
      paddingInner = padding, // to separate a node from its adjacent siblings
      paddingOuter = padding, // shorthand for top, right, bottom, and left padding
      paddingTop = paddingOuter, // to separate a node’s top edge from its children
      paddingRight = paddingOuter, // to separate a node’s right edge from its children
      paddingBottom = paddingOuter, // to separate a node’s bottom edge from its children
      paddingLeft = paddingOuter, // to separate a node’s left edge from its children
      round = true, // whether to round to exact pixels
      colors = d3.schemeTableau10, // array of colors
      zDomain, // array of values for the color scale
      fill = "#ccc", // fill for node rects (if no group color encoding)
      fillOpacity = group == null ? null : 0.6, // fill opacity for node rects
      stroke, // stroke for node rects
      strokeWidth, // stroke width for node rects
      strokeOpacity, // stroke opacity for node rects
      strokeLinejoin, // stroke line join for node rects
    } = {}) {

      // If id and parentId options are specified, or the path option, use d3.stratify
      // to convert tabular data to a hierarchy; otherwise we assume that the data is
      // specified as an object {children} with nested objects (a.k.a. the “flare.json”
      // format), and use d3.hierarchy.
      const root = path != null ? d3.stratify().path(path)(data)
          : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
          : d3.hierarchy(data, children);

      // Compute the values of internal nodes by aggregating from the leaves.
      value == null ? root.count() : root.sum(d => Math.max(0, value(d)));

      // Prior to sorting, if a group channel is specified, construct an ordinal color scale.
      const leaves = root.leaves();
      const G = group == null ? null : leaves.map(d => group(d.data, d));
      if (zDomain === undefined) zDomain = G;
      zDomain = new d3.InternSet(zDomain);
      const color = group == null ? null : d3.scaleOrdinal(zDomain, colors);

      // Compute labels and titles.
      const L = label == null ? null : leaves.map(d => label(d.data, d, model));
      const T = title === undefined ? L : title == null ? null : leaves.map(d => title(d.data, d, model));

      // Sort the leaves (typically by descending value for a pleasing layout).
      if (sort != null) root.sort(sort);

      // Compute the treemap layout.
      d3.treemap()
          .tile(tile)
          .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
          .paddingInner(paddingInner)
          .paddingTop(paddingTop)
          .paddingRight(paddingRight)
          .paddingBottom(paddingBottom)
          .paddingLeft(paddingLeft)
          .round(round)
        (root);

      const svg = d3.create("svg")
          .attr("viewBox", [-marginLeft, -marginTop, width, height])
          .attr("width", width)
          .attr("height", height)
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
          .attr("font-family", "sans-serif")
          .attr("font-size", 10);

      const node = svg.selectAll("a")
        .data(leaves)
        .join("a")
          .attr("xlink:href", link == null ? null : (d, i) => link(d.data, d))
          .attr("target", link == null ? null : linkTarget)
          .attr("transform", d => `translate(${d.x0},${d.y0})`);

      node.append("rect")
          .attr("fill", color ? (d, i) => color(G[i]) : fill)
          .attr("fill-opacity", fillOpacity)
          .attr("stroke", stroke)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-opacity", strokeOpacity)
          .attr("stroke-linejoin", strokeLinejoin)
          .attr("width", d => d.x1 - d.x0)
          .attr("height", d => d.y1 - d.y0);

      if (T) {
        node.append("title").text((d, i) => T[i]);
      }

      if (L) {
        // A unique identifier for clip paths (to avoid conflicts).
        const uid = `O-${Math.random().toString(16).slice(2)}`;

        node.append("clipPath")
           .attr("id", (d, i) => `${uid}-clip-${i}`)
         .append("rect")
           .attr("width", d => d.x1 - d.x0)
           .attr("height", d => d.y1 - d.y0);

        node.append("text")
            .attr("clip-path", (d, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`)
          .selectAll("tspan")
          .data((d, i) => `${L[i]}`.split(/\n/g))
          .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i, D) => `${1.2 + i * 1.2}em`)
            .attr("fill-opacity", 1)
            .text(d => d);   
      }
      
      var cc = d3ClickController();
      node.call(cc);

      cc.on("dblclick", function (event, d) {
          var filter = d.data.createFilter();

          // Dispatch an "execute" action through the model
          model.execute({
              dataFilter: filter
          });
      });
      
      cc.on("click", function (event, d) {
          var filter = d.data.createFilter();

          // Dispatch a "select" action through the model
          model.select({
              dataFilter: filter,
              selectionMode: "toggle"
          });
      });

      node.classed("notSelected", function (d) {
          var selectionFilter = model.selectionFilter;
          var hasSelections = model.selectionFilter.toDnf().kind !== "false";
          if (!hasSelections)
              return false;
          return !(!!selectionFilter && model.data.filterMatchesRow(selectionFilter, d.data.index));
      });
      
      return Object.assign(svg.node(), {scales: {color}});
    },



    /**
     * Performs a full update of the visualization.
     *
     * The D3 code was adapted from https://bl.ocks.org/mbostock/3885304.
     *
     * @return {?Promise} A promise that is resolved when the update operation has completed or, _nully_,
     * if it completed synchronous and with no errors.
     *
     * @protected
     * @override
     */
    _updateAll: function() {

      var model = this.model;

      var dataTable = model.data;

      // Build a list of scenes, one per category
      var scenes = Scene.buildScenesFlat(model).children;

      // The div where rendering takes place
      var container = d3.select(this.domContainer);
      container.selectAll("*").remove();

      this.domContainer.append(this.createTreemap(model, scenes, {
        path: d => d.vars.category.map(x => x.f).join("/"),
        value: d => d?.vars.measure.v, // size of each node (file); null for internal nodes (folders)
        group: d => d.vars.category[0].f,
        label: this.__buildLabel,
        title: this.__buildTitle, //`${d.name}\n${n.value.toLocaleString("en")}`, // text to show on hover
        //link: (d, n) => `https://github.com/prefuse/Flare/blob/master/flare/src${n.id}.as`,
        tile: d3[model.tilingMethod],
        width: this.domContainer.clientWidth,
        height: this.domContainer.clientHeight
      }));
      
    },
    
    __buildLabel: function (d, n, model) {
      var labels = d.vars.category.map(x => x.f);
      if (model.dataLabels)
        labels.push(d?.vars.measure.f);
      return labels.join("\n");
    },

    __buildTitle: function (d, n, model) {
      var items = model.category.fieldIndexes.map(function (fieldIndex) {
        return model.data.getColumnLabel(fieldIndex) + ": " + d.vars.category[fieldIndex].f;
      });
      items.push(model.measure.fieldIndexes.map(function (fieldIndex) {
        return model.data.getColumnLabel(fieldIndex) + ": " + d.vars.measure.f;
      }));
      if (model.application && model.application.getDoubleClickTooltip)
        items.push(model.application.getDoubleClickTooltip(d.createFilter()));
      return items.join("\n");
    }
    
  });
});
