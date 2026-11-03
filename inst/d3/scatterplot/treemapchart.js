const valueCol     = options.value;
const labelCol     = options.label;
const groupCol     = options.group || null;
const tileName     = options.tile  || "squarify";
const padding      = options.padding     != null ? +options.padding     : 2;
const userColors   = options.colors
  ? (Array.isArray(options.colors) ? options.colors : [options.colors])
  : null;
const valueFmtStr  = options.valueFormat || ",.0f";
const showValues   = options.showValues !== false;
const labelSize    = options.labelFontSize  || 11;
const labelColor   = options.labelCol       || null;
const groupSize    = options.groupFontSize  || 12;
const strokeCol    = options.strokeCol      || "white";
const strokeWidth  = options.strokeWidth != null ? +options.strokeWidth : 1;
const hover        = options.hover  !== false;
const showLegend   = options.legend !== false;
const legendSize   = options.legendFontSize || 11;
const title        = options.title          || null;
const titleSize    = options.titleFontSize  || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const textCol      = options.textCol || "black";

const hasGroup = groupCol !== null;

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Value formatter — fall back to ",.0f" if the user's specifier is invalid
let fmt;
try {
  fmt = d3.format(valueFmtStr);
} catch (e) {
  fmt = d3.format(",.0f");
}
const pctFmt = d3.format(".1%");

// Parse rows, keeping only finite, strictly positive values (zero-area tiles
// are invisible anyway).
const rows = data
  .map(d => ({
    label: String(d[labelCol]),
    group: hasGroup ? String(d[groupCol]) : null,
    value: +d[valueCol]
  }))
  .filter(d => isFinite(d.value) && d.value > 0);

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", textCol)
    .text("No data available for treemap_chart()");
  return;
}

// Build the nested tree. Only leaves carry a `value` so that .sum() does not
// double-count internal nodes.
let tree;
const groupOrder = [];
if (hasGroup) {
  const byGroup = new Map();
  rows.forEach(r => {
    if (!byGroup.has(r.group)) {
      byGroup.set(r.group, []);
      groupOrder.push(r.group);
    }
    byGroup.get(r.group).push({ name: r.label, group: r.group, value: r.value });
  });
  tree = {
    name: "root",
    children: groupOrder.map(gname => ({ name: gname, children: byGroup.get(gname) }))
  };
} else {
  tree = {
    name: "root",
    children: rows.map(r => ({ name: r.label, group: null, value: r.value }))
  };
}

const root = d3.hierarchy(tree)
  .sum(d => d.children ? 0 : d.value)
  .sort((a, b) => b.value - a.value);

const total = root.value;

// Colors — one per group, or one per leaf when there is no group
const palette = userColors && userColors.length ? userColors : d3.schemeTableau10;
const colorKeys = hasGroup
  ? root.children.map(c => c.data.name)          // largest group first
  : root.leaves().map(l => l.data.name);
const colorScale = d3.scaleOrdinal()
  .domain(colorKeys)
  .range(palette);

const leafColor = d => colorScale(hasGroup ? d.data.group : d.data.name);

// Darker shade of a color (used for group frames); tolerant of invalid colors
function darken(c) {
  const col = d3.color(c);
  return col ? col.darker(0.7).toString() : c;
}

// Faded version of a color, blended toward the background (hover dimming)
function fade(c) {
  try { return d3.interpolateRgb(c, bgcol)(0.6); } catch (e) { return c; }
}

// Pick white or near-black text for contrast against a fill
function autoTextColor(fill) {
  if (labelColor) return labelColor;
  const c = d3.rgb(fill);
  if (!c || isNaN(c.r)) return "#ffffff";
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return lum > 0.6 ? "#222222" : "#ffffff";
}

// Legend layout (wraps onto several rows if needed)
const titleOffset = title ? titleSize + 14 : 0;
const swatch      = legendSize;
let legendItems   = [];
let legendH       = 0;
if (hasGroup && showLegend) {
  const maxW  = width - 16;
  let lx = 0, ly = 0;
  root.children.forEach(c => {
    const name  = c.data.name;
    const estW  = swatch + 6 + name.length * legendSize * 0.62 + 16;
    if (lx > 0 && lx + estW > maxW) { lx = 0; ly += legendSize + 8; }
    legendItems.push({ name: name, x: lx, y: ly });
    lx += estW;
  });
  legendH = ly + legendSize + 12;
}

const margin = {
  top:    titleOffset + legendH + 6,
  right:  6,
  bottom: 6,
  left:   6
};

const chartW = Math.max(0, width  - margin.left - margin.right);
const chartH = Math.max(0, height - margin.top  - margin.bottom);

// Tiling method
const tiles = {
  squarify:  d3.treemapSquarify,
  binary:    d3.treemapBinary,
  slice:     d3.treemapSlice,
  dice:      d3.treemapDice,
  sliceDice: d3.treemapSliceDice
};
const tileFn = tiles[tileName] || d3.treemapSquarify;

const headerH = hasGroup ? groupSize + 6 : 0;

const layout = d3.treemap()
  .tile(tileFn)
  .size([chartW, chartH])
  .round(true)
  .paddingInner(padding)
  .paddingOuter(d => d.depth === 0 ? 0 : padding);
// paddingTop must come after paddingOuter (which sets all four sides)
layout.paddingTop(d => d.depth === 0 ? 0 : (hasGroup && d.depth === 1 ? headerH : padding));

layout(root);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Group frames and headers
if (hasGroup) {
  const groupNodes = g.selectAll(".treemap-group")
    .data(root.children)
    .join("g")
    .attr("class", "treemap-group")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);

  groupNodes.append("rect")
    .attr("width",  d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill",   d => darken(colorScale(d.data.name)))
    .attr("stroke", strokeCol)
    .attr("stroke-width", strokeWidth);

  groupNodes.append("text")
    .attr("class", "treemap-group-label")
    .attr("x", 4)
    .attr("y", headerH / 2)
    .attr("dominant-baseline", "central")
    .attr("font-family", fontFamily)
    .attr("font-size",   groupSize)
    .attr("font-weight", "bold")
    .attr("fill", d => autoTextColor(darken(colorScale(d.data.name))))
    .style("pointer-events", "none")
    .each(function (d) {
      const w = d.x1 - d.x0, h = d.y1 - d.y0;
      if (h < headerH || w < groupSize * 2) {
        d3.select(this).remove();
        return;
      }
      const full = d.data.name + " \u00b7 " + fmt(d.value);
      d3.select(this).text(full);
      const len = this.getComputedTextLength ? this.getComputedTextLength() : 0;
      if (len > w - 8 && !fitText(this, d.data.name, w - 8)) d3.select(this).remove();
    });
}

// Truncate a <text> (or <tspan>) to fit maxW, adding an ellipsis. Returns
// false if not even the first character + ellipsis fits.
function fitText(node, str, maxW) {
  const sel = d3.select(node);
  sel.text(str);
  if (typeof node.getComputedTextLength !== "function") return true;
  let len = node.getComputedTextLength();
  if (len === 0) return true;          // not rendered yet — leave as is
  if (len <= maxW) return true;
  let s = str;
  while (s.length > 1) {
    s = s.slice(0, -1);
    sel.text(s.trim() + "…");
    if (node.getComputedTextLength() <= maxW) return true;
  }
  sel.text("");
  return false;
}

// Leaves
const leaves = root.leaves().filter(d => d.x1 > d.x0 && d.y1 > d.y0);

const leafNodes = g.selectAll(".treemap-leaf")
  .data(leaves)
  .join("g")
  .attr("class", "treemap-leaf")
  .attr("transform", d => `translate(${d.x0},${d.y0})`);

const leafRects = leafNodes.append("rect")
  .attr("width",  d => d.x1 - d.x0)
  .attr("height", d => d.y1 - d.y0)
  .attr("fill",   leafColor)
  .attr("fill-opacity", 1)
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth);

// Labels: bold label on the first line, formatted value on the second.
// Hidden when the tile cannot fit even one line; truncated when too narrow.
const lineH = labelSize + 3;
leafNodes.each(function (d) {
  const w = d.x1 - d.x0, h = d.y1 - d.y0;
  if (h < labelSize + 6 || w < labelSize * 2.5) return;

  const fill = autoTextColor(leafColor(d));
  const txt  = d3.select(this).append("text")
    .attr("class", "treemap-label")
    .attr("font-family", fontFamily)
    .attr("font-size",   labelSize)
    .attr("fill",        fill)
    .style("pointer-events", "none");

  const t1 = txt.append("tspan")
    .attr("x", 4)
    .attr("y", 4 + labelSize)
    .attr("font-weight", "bold");
  if (!fitText(t1.node(), d.data.name, w - 8)) {
    txt.remove();
    return;
  }

  if (showValues && h >= 4 + labelSize + lineH + 2) {
    const t2 = txt.append("tspan")
      .attr("x", 4)
      .attr("y", 4 + labelSize + lineH)
      .attr("font-weight", "normal")
      .attr("fill-opacity", 0.9);
    if (!fitText(t2.node(), fmt(d.data.value), w - 8)) t2.remove();
  }
});

// Tooltip — rendered as an in-SVG group, NOT an HTML <div> appended to <body>,
// so it is visible when the widget is embedded in R Markdown / pkgdown.
let tip = null, tipRect = null, tipText = null;
if (hover) {
  tip = svg.append("g")
    .attr("class", "treemap-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("fill-opacity", 0.96)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  tipText = tip.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", 12)
    .attr("fill", "#222");
}

const tipPadX = 8, tipPadY = 6, tipLineH = 15;

function tipLines(d) {
  const lines = [{ name: null, value: d.data.name }];
  if (hasGroup) lines.push({ name: "Group", value: d.data.group });
  lines.push({ name: "Value", value: fmt(d.data.value) });
  lines.push({ name: "Share of total", value: pctFmt(d.value / total) });
  if (hasGroup && d.parent && d.parent.value > 0) {
    lines.push({ name: "Share of group", value: pctFmt(d.value / d.parent.value) });
  }
  return lines;
}

// Mouse position relative to the SVG, compatible with D3 v5 and v6+
function pointerXY(evt) {
  if (typeof d3.pointer === "function" && evt) return d3.pointer(evt, svg.node());
  if (typeof d3.mouse === "function") return d3.mouse(svg.node());
  return [width / 2, height / 2];
}

function showTip(d, xy) {
  tipText.selectAll("tspan").remove();
  tipLines(d).forEach((l, i) => {
    const dy = i === 0 ? tipPadY + 11 : tipLineH;
    if (l.name === null) {
      tipText.append("tspan")
        .attr("x", tipPadX).attr("dy", dy)
        .attr("font-weight", "bold")
        .text(l.value);
    } else {
      tipText.append("tspan")
        .attr("x", tipPadX).attr("dy", dy)
        .attr("font-weight", "bold")
        .text(l.name + ": ");
      tipText.append("tspan")
        .attr("font-weight", "normal")
        .text(String(l.value));
    }
  });

  const bb   = tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX)
    .attr("y", bb.y - tipPadY)
    .attr("width",  boxW)
    .attr("height", boxH);
  tip.raise().interrupt().style("opacity", 1);
  moveTip(xy, boxW, boxH, bb.x - tipPadX, bb.y - tipPadY);
}

function moveTip(xy, boxW, boxH, xOff, yOff) {
  if (boxW === undefined) {
    const r = tipRect.node();
    boxW = +r.getAttribute("width");
    boxH = +r.getAttribute("height");
    xOff = +r.getAttribute("x");
    yOff = +r.getAttribute("y");
  }
  let tx = xy[0] + 14;
  if (tx + boxW > width) tx = xy[0] - 14 - boxW;   // flip to the left
  tx = Math.max(2, tx);
  let ty = xy[1] + 14;
  if (ty + boxH > height) ty = xy[1] - 14 - boxH;  // flip above
  ty = Math.max(2, ty);
  tip.attr("transform", `translate(${tx - xOff},${ty - yOff})`);
}

function hideTip() {
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

function resetLeaves() {
  leafRects.interrupt()
    .attr("fill", leafColor)
    .attr("stroke", strokeCol)
    .attr("stroke-width", strokeWidth);
  leafNodes.selectAll("text.treemap-label").attr("opacity", 1);
}

// Hover interactions — highlight the hovered tile, dim the rest, show tooltip.
// The datum is read from the element itself so this works with both the D3 v5
// (d, i, nodes) and D3 v6+ (event, d) handler signatures.
if (hover) {
  leafNodes
    .style("cursor", "pointer")
    .on("mouseover", function (evt) {
      const d  = d3.select(this).datum();
      const ev = d3.event || evt;
      leafRects.interrupt()
        .attr("fill", dd => dd === d ? leafColor(dd) : fade(leafColor(dd)))
        .attr("stroke",       dd => dd === d ? textCol : strokeCol)
        .attr("stroke-width", dd => dd === d ? Math.max(2, strokeWidth) : strokeWidth);
      leafNodes.selectAll("text.treemap-label")
        .attr("opacity", function () {
          return d3.select(this.parentNode).datum() === d ? 1 : 0.35;
        });
      showTip(d, pointerXY(ev));
    })
    .on("mousemove", function (evt) {
      const ev = d3.event || evt;
      moveTip(pointerXY(ev));
    })
    .on("mouseout", function () {
      resetLeaves();
      hideTip();
    });
}

// Legend
if (legendItems.length) {
  const legend = svg.append("g")
    .attr("class", "treemap-legend")
    .attr("transform", `translate(${margin.left + 2},${titleOffset + 6})`);

  const items = legend.selectAll("g")
    .data(legendItems)
    .join("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  items.append("rect")
    .attr("width",  swatch)
    .attr("height", swatch)
    .attr("rx", 2)
    .attr("fill", d => colorScale(d.name));

  items.append("text")
    .attr("x", swatch + 6)
    .attr("y", swatch / 2)
    .attr("dominant-baseline", "central")
    .attr("font-size",   legendSize)
    .attr("font-family", fontFamily)
    .attr("fill",        textCol)
    .text(d => d.name);
}

// Chart title
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "bold")
    .attr("fill",         textCol)
    .text(title);
}
