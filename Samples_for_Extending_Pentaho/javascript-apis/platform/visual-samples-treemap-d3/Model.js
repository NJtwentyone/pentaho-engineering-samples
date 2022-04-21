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
  "pentaho/visual/Model"
], function(module, BaseModel) {

  "use strict";

  return BaseModel.extend({
    $type: {
      id: module.id,

      // The label may show up in menus
      label: "Tree Map",

      // Properties
      props: [
        // General properties
        {
          name: "dataLabels",
          valueType: "boolean",
          defaultValue: false
        },
        {
          name: "tilingMethod",
          valueType: "string",
          domain: [
          {f: "Binary", v: "treemapBinary"},
            {f: "Squarify", v: "treemapSquarify"},
            {f: "Slice-Dice", v: "treemapSliceDice"},
            {f: "Slice", v: "treemapSlice"},
            {f: "Dice", v: "treemapDice"}
            ],
          isRequired: true,
          defaultValue: "treemapBinary"
        },

        // Visual role properties
        {
          name: "category",
          base: "pentaho/visual/role/Property",
          modes: [{dataType: "list"}],
          fields: {isRequired: true},
          ordinal: 10
        },
        {
          name: "measure",
          base: "pentaho/visual/role/Property",
          modes: [{dataType: "number"}],
          fields: {isRequired: true},
          ordinal: 20
        },

        // Palette property
        {
          name: "palette",
          base: "pentaho/visual/color/PaletteProperty",
          levels: "nominal",
          isRequired: true
        }
      ]
    }
  })
  .configure();
});
