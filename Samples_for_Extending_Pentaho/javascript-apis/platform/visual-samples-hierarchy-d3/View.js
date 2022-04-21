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
    
    createTree: function (model, data, { // data is either tabular (array of objects) or hierarchy (nested objects)
      path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
      id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
      parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
      children, // if hierarchical data, given a d in data, returns its children
      tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
      separation = tree === d3.tree ? (a, b) => (a.parent == b.parent ? 1 : 2) / a.depth : (a, b) => a.parent == b.parent ? 1 : 2,
      sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
      label, // given a node d, returns the display name
      title, // given a node d, returns its hover text
      link, // given a node d, its link (if any)
      linkTarget = "_blank", // the target attribute for links (if any)
      width = 640, // outer width, in pixels
      height = 400, // outer height, in pixels
      margin = 60, // shorthand for margins
      marginTop = margin, // top margin, in pixels
      marginRight = margin, // right margin, in pixels
      marginBottom = margin, // bottom margin, in pixels
      marginLeft = margin, // left margin, in pixels
      radius = Math.min(width - marginLeft - marginRight, height - marginTop - marginBottom) / 2, // outer radius
      r = 3, // radius of nodes
      padding = 1, // horizontal padding for first and last column
      fill = "#999", // fill for nodes
      fillOpacity, // fill opacity for nodes
      stroke = "#555", // stroke for links
      strokeWidth = 1.5, // stroke width for links
      strokeOpacity = 0.4, // stroke opacity for links
      strokeLinejoin, // stroke line join for links
      strokeLinecap, // stroke line cap for links
      halo = "#fff", // color of label halo 
      haloWidth = 3, // padding around the labels
    }) {
      
      // If id and parentId options are specified, or the path option, use d3.stratify
      // to convert tabular data to a hierarchy; otherwise we assume that the data is
      // specified as an object {children} with nested objects (a.k.a. the “flare.json”
      // format), and use d3.hierarchy.
      const root = path != null ? d3.stratify().path(path)(data)
          : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
          : d3.hierarchy(data, children);

      // Sort the nodes.
      if (sort != null) root.sort(sort);

      // Compute labels and titles.
      const descendants = root.descendants();
      const L = label == null ? null : descendants.map(d => label(d, model));

      // Compute the layout.
      tree().size([2 * Math.PI, radius]).separation(separation)(root);

      const svg = d3.create("svg")
          .attr("viewBox", [-marginLeft - radius, -marginTop - radius, width, height])
          .attr("width", width)
          .attr("height", height)
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
          .attr("font-family", "sans-serif")
          .attr("font-size", 10);

      svg.append("g")
          .attr("fill", "none")
          .attr("stroke", stroke)
          .attr("stroke-opacity", strokeOpacity)
          .attr("stroke-linecap", strokeLinecap)
          .attr("stroke-linejoin", strokeLinejoin)
          .attr("stroke-width", strokeWidth)
        .selectAll("path")
        .data(root.links())
        .join("path")
          .attr("d", d3.linkRadial()
              .angle(d => d.x)
              .radius(d => d.y));

      const node = svg.append("g")
        .selectAll("a")
        .data(root.descendants())
        .join("a")
          .attr("xlink:href", link == null ? null : d => link(d.data, d))
          .attr("target", link == null ? null : linkTarget)
          .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);

      node.append("circle")
          .attr("fill", d => d.children ? stroke : fill)
          .attr("r", r);

      if (title != null) node.append("title")
          .text(d => title(d, model));

      if (L) node.append("text")
          .attr("transform", d => `rotate(${d.x >= Math.PI ? 180 : 0})`)
          .attr("dy", "0.32em")
          .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("paint-order", "stroke")
          .attr("stroke", halo)
          .attr("stroke-width", haloWidth)
          .text((d, i) => L[i]);

      return svg.node();
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

      this.domContainer.append(this.createTree(model, scenes, {
        path: d => d.vars.category.map(x => x.f).join("/"),
        value: d => d?.vars.measure.v, // size of each node (file); null for internal nodes (folders)
        group: d => d.vars.category[0].f,
        label: this.__buildLabel,
        title: this.__buildTitle, 
        width: this.domContainer.clientWidth,
        height: this.domContainer.clientHeight
      }));
      
    },
    
    __buildLabel: function (d, model) {
      return d.id.substring(d.id.lastIndexOf("/")+1);
    },

    __buildTitle: function (d, model) {
      return d.id;
    }
    
  });
});
