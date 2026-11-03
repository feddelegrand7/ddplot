// Mosaic / Marimekko chart, after the Vega-Lite gallery's mosaic example.
// The R side aggregates the data into rows of { x, fill, value } and passes
// the category orders as options.xLevels / options.fillLevels.

const asArray = v => v == null ? [] : (Array.isArray(v) ? v : [v]);

const xLevels      = asArray(options.xLevels).map(String);
const fillLevels   = asArray(options.fillLevels).map(String);
const xName        = options.xName     || "x";
const fillName     = options.fillName  || "fill";
const valueName    = options.valueName || "Count";
const userColors   = options.colors ? asArray(options.colors) : null;
const gapOpt       = options.gap != null ? +options.gap : 2;
const labelType    = options.labelType || "percent";
const valueFmtStr  = options.valueFormat || ",.0f";
const labelSize    = options.labelFontSize  || 11;
const labelColor   = options.labelCol       || null;
const colSize      = options.columnFontSize || 12;
const hover        = options.hover   !== false;
const animate      = options.animate !== false;
const showLegend   = options.legend  !== false;
const legendTitle  = options.legendTitle != null ? String(options.legendTitle) : fillName;
const legendSize   = options.legendFontSize || 11;
const xtitle       = options.xtitle || null;
const ytitle       = options.ytitle || null;
const axisTitleSz  = options.axisTitleFontSize || 12;
const xFontSize    = options.xFontSize || 10;
const yFontSize    = options.yFontSize || 10;
const title        = options.title         || null;
const titleSize    = options.titleFontSize || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const axisCol      = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

let fmt;
try {
  fmt = d3.format(valueFmtStr);
} catch (e) {
  fmt = d3.format(",.0f");
}
const pctFmt    = d3.format(".1%");
const pctFmt0   = d3.format(".0%");

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const cellMap = new Map();
data.forEach(d => {
  const v = +d.value;
  if (!isFinite(v) || v <= 0) return;
  const key = String(d.x) + "\u0000" + String(d.fill);
  cellMap.set(key, (cellMap.get(key) || 0) + v);
});

// Fall back to first-appearance order if levels were not supplied
const xOrder = xLevels.length ? xLevels
  : Array.from(new Set(data.map(d => String(d.x))));
const fillOrder = fillLevels.length ? fillLevels
  : Array.from(new Set(data.map(d => String(d.fill))));

const columns = xOrder.map(xv => {
  const segs = fillOrder
    .map(fv => ({ x: xv, fill: fv, value: cellMap.get(xv + "\u0000" + fv) || 0 }))
    .filter(s => s.value > 0);
  return { x: xv, segs: segs, total: d3.sum(segs, s => s.value) };
}).filter(c => c.total > 0);

const total = d3.sum(columns, c => c.total);

if (!columns.length || !(total > 0)) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for mosaic_chart()");
  return;
}

// Colors, one per fill category in level order
const palette = userColors && userColors.length ? userColors : (d3.schemeTableau10 || d3.schemeCategory10);
const colorScale = d3.scaleOrdinal().domain(fillOrder).range(palette);

function fade(c) {
  try { return d3.interpolateRgb(c, bgcol)(0.65); } catch (e) { return c; }
}

function autoTextColor(fill) {
  if (labelColor) return labelColor;
  const c = d3.rgb(fill);
  if (!c || isNaN(c.r)) return "#ffffff";
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return lum > 0.6 ? "#222222" : "#ffffff";
}

// Width of a string in pixels, measured in the live SVG (estimate as fallback)
function textWidth(str, size, weight) {
  const t = svg.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", size)
    .attr("font-weight", weight || "normal")
    .style("visibility", "hidden")
    .text(str);
  let w = 0;
  try { w = t.node().getComputedTextLength(); } catch (e) { w = 0; }
  t.remove();
  return w > 0 ? w : String(str).length * size * 0.6;
}

// Truncate a <text> to fit maxW with an ellipsis; false if nothing fits
function fitText(node, str, maxW) {
  const sel = d3.select(node);
  sel.text(str);
  if (typeof node.getComputedTextLength !== "function") return true;
  let len = node.getComputedTextLength();
  if (len === 0) return true;
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

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const titleOffset = title ? titleSize + 14 : 0;
const swatch      = legendSize + 1;
const legendRowH  = legendSize + 9;
const hasLegTitle = showLegend && legendTitle.length > 0;

// Legend on the right when there is room, otherwise wrapped under the title
let legendPos = "none", legendW = 0, legendH = 0, legendItems = [];
if (showLegend) {
  const labelWs = fillOrder.map(f => textWidth(f, legendSize));
  const titleW  = hasLegTitle ? textWidth(legendTitle, legendSize, "bold") : 0;
  const rightW  = Math.max(titleW, swatch + 6 + d3.max(labelWs)) + 18;
  if (width >= 460 && rightW <= width * 0.3) {
    legendPos = "right";
    legendW   = rightW;
    legendItems = fillOrder.map((f, i) => ({
      name: f, x: 0, y: (hasLegTitle ? legendRowH + 2 : 0) + i * legendRowH
    }));
  } else {
    legendPos = "top";
    const maxW = width - 16;
    let lx = hasLegTitle ? titleW + 10 : 0, ly = 0;
    fillOrder.forEach((f, i) => {
      const w = swatch + 6 + labelWs[i] + 16;
      if (lx > 0 && lx + w > maxW) { lx = 0; ly += legendRowH; }
      legendItems.push({ name: f, x: lx, y: ly });
      lx += w;
    });
    legendH = ly + legendRowH + 4;
  }
}

const yTickW = textWidth("100%", yFontSize) + 8;

const margin = {
  top:    titleOffset + legendH + colSize + 14,
  right:  legendW > 0 ? 12 + legendW
                      : Math.max(12, textWidth("100%", xFontSize) / 2 + 6),
  bottom: 24 + xFontSize + (xtitle ? axisTitleSz + 10 : 0),
  left:   10 + yTickW + (ytitle ? axisTitleSz + 10 : 0)
};

const chartW = Math.max(10, width  - margin.left - margin.right);
const chartH = Math.max(10, height - margin.top  - margin.bottom);

// Gaps are real space between cells (not strokes), clamped so they can never
// eat more than a third of the plotting area.
const nCols = columns.length;
const gapX  = nCols > 1 ? Math.min(gapOpt, (chartW / 3) / (nCols - 1)) : 0;
const availW = chartW - gapX * (nCols - 1);

const cells = [];
let cx = 0;
columns.forEach((col, ci) => {
  col.share = col.total / total;
  col.x0 = cx;
  col.x1 = cx + col.share * availW;
  col.index = ci;
  cx = col.x1 + gapX;

  const m    = col.segs.length;
  const gapY = m > 1 ? Math.min(gapOpt, (chartH / 3) / (m - 1)) : 0;
  const availH = chartH - gapY * (m - 1);
  let cy = 0;
  col.segs.forEach((s, si) => {
    s.within = s.value / col.total;
    s.share  = s.value / total;
    s.colShare = col.share;
    s.col = col;
    s.index = si;
    s.x0 = col.x0;
    s.x1 = col.x1;
    s.y0 = cy;
    s.y1 = cy + s.within * availH;
    cy = s.y1 + gapY;
    cells.push(s);
  });
});

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// ---------------------------------------------------------------------------
// Axes (percentages)
// ---------------------------------------------------------------------------
const xScale = d3.scaleLinear().domain([0, 1]).range([0, chartW]);
const yScale = d3.scaleLinear().domain([0, 1]).range([chartH, 0]);

const xTicks = chartW < 260 ? 4 : 5;
const yTicks = chartH < 160 ? 4 : 5;

g.append("g")
  .attr("class", "mosaic-x-axis")
  .attr("transform", `translate(0,${chartH + 4})`)
  .call(d3.axisBottom(xScale).ticks(xTicks).tickFormat(pctFmt0).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   xFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

g.append("g")
  .attr("class", "mosaic-y-axis")
  .attr("transform", "translate(-4,0)")
  .call(d3.axisLeft(yScale).ticks(yTicks).tickFormat(pctFmt0).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   yFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------
const cellG = g.append("g").attr("class", "mosaic-cells");

const cellNodes = cellG.selectAll("g.mosaic-cell")
  .data(cells)
  .join("g")
  .attr("class", "mosaic-cell");

const cellRects = cellNodes.append("rect")
  .attr("x",      d => d.x0)
  .attr("width",  d => Math.max(0, d.x1 - d.x0))
  .attr("y",      d => animate ? chartH : d.y0)
  .attr("height", d => animate ? 0 : Math.max(0, d.y1 - d.y0))
  .attr("fill",   d => colorScale(d.fill))
  .attr("stroke", "none");

// In-cell labels, drawn only when they fit inside the cell
const lineH = labelSize + 3;
function labelLines(d) {
  if (labelType === "percent") return [pctFmt0(d.within)];
  if (labelType === "count")   return [fmt(d.value)];
  if (labelType === "both")    return [pctFmt0(d.within), fmt(d.value)];
  return [];
}

const cellLabels = cellNodes.append("text")
  .attr("class", "mosaic-label")
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-size",   labelSize)
  .attr("fill", d => autoTextColor(colorScale(d.fill)))
  .attr("opacity", animate ? 0 : 1)
  .style("pointer-events", "none")
  .each(function (d) {
    const lines = labelLines(d);
    const w = d.x1 - d.x0, h = d.y1 - d.y0;
    if (!lines.length) return;
    // Drop the second line if the cell is not tall enough for both
    let use = lines;
    if (use.length > 1 && h < use.length * lineH + 4) use = use.slice(0, 1);
    if (h < lineH + 2) return;
    const maxLen = d3.max(use, s => textWidth(s, labelSize, "bold"));
    if (maxLen > w - 6) return;
    const cxm = (d.x0 + d.x1) / 2;
    const top = (d.y0 + d.y1) / 2 - (use.length * lineH) / 2 + labelSize * 0.85;
    const txt = d3.select(this);
    use.forEach((s, i) => {
      txt.append("tspan")
        .attr("x", cxm)
        .attr("y", top + i * lineH)
        .attr("font-weight", i === 0 ? "bold" : "normal")
        .attr("fill-opacity", i === 0 ? 1 : 0.9)
        .text(s);
    });
  });

if (animate) {
  cellRects.transition()
    .duration(650)
    .delay(d => d.col.index * 90 + d.index * 50)
    .ease(d3.easeCubicOut)
    .attr("y",      d => d.y0)
    .attr("height", d => Math.max(0, d.y1 - d.y0));

  cellLabels.transition()
    .duration(300)
    .delay(d => d.col.index * 90 + d.index * 50 + 550)
    .attr("opacity", 1);
}

// ---------------------------------------------------------------------------
// Column labels across the top
// ---------------------------------------------------------------------------
const colLabels = g.append("g")
  .attr("class", "mosaic-column-labels")
  .selectAll("text")
  .data(columns)
  .join("text")
  .attr("x", d => (d.x0 + d.x1) / 2)
  .attr("y", -8)
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-size",   colSize)
  .attr("font-weight", "bold")
  .attr("fill",        axisCol)
  .each(function (d) {
    fitText(this, d.x, Math.max(0, d.x1 - d.x0 - 2));
  });

// ---------------------------------------------------------------------------
// Tooltip (in-SVG group, so it renders inside R Markdown / pkgdown too)
// ---------------------------------------------------------------------------
let tip = null, tipRect = null, tipText = null;
if (hover) {
  tip = svg.append("g")
    .attr("class", "mosaic-tooltip")
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
  return [
    { name: xName,           value: d.x },
    { name: fillName,        value: d.fill },
    { name: valueName,       value: fmt(d.value) },
    { name: "Column share",  value: pctFmt(d.colShare) },
    { name: "Within column", value: pctFmt(d.within) },
    { name: "Share of total", value: pctFmt(d.share) }
  ];
}

function pointerXY(evt) {
  if (typeof d3.pointer === "function" && evt) return d3.pointer(evt, svg.node());
  if (typeof d3.mouse === "function") return d3.mouse(svg.node());
  return [width / 2, height / 2];
}

function showTip(d, xy) {
  tipText.selectAll("tspan").remove();
  tipLines(d).forEach((l, i) => {
    tipText.append("tspan")
      .attr("x", tipPadX)
      .attr("dy", i === 0 ? tipPadY + 11 : tipLineH)
      .attr("font-weight", "bold")
      .text(l.name + ": ");
    tipText.append("tspan")
      .attr("font-weight", "normal")
      .text(String(l.value));
  });
  const bb  = tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX)
    .attr("y", bb.y - tipPadY)
    .attr("width",  boxW)
    .attr("height", boxH)
    .attr("stroke", colorScale(d.fill))
    .attr("stroke-width", 1.5);
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
  if (tx + boxW > width) tx = xy[0] - 14 - boxW;
  tx = Math.max(2, tx);
  let ty = xy[1] + 14;
  if (ty + boxH > height) ty = xy[1] - 14 - boxH;
  ty = Math.max(2, ty);
  tip.attr("transform", `translate(${tx - xOff},${ty - yOff})`);
}

function hideTip() {
  if (!tip) return;
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

// Highlight the cells for which keep(d) is true and fade the others.
// Every call recomputes all cells, so nothing can get stuck highlighted.
function highlight(keep, outline) {
  cellRects
    .attr("fill", d => keep(d) ? colorScale(d.fill) : fade(colorScale(d.fill)))
    .attr("stroke",       d => outline && keep(d) ? axisCol : "none")
    .attr("stroke-width", d => outline && keep(d) ? 1.5 : 0);
  cellLabels.attr("opacity", d => keep(d) ? 1 : 0.35);
  colLabels.attr("fill-opacity", c => cells.some(d => d.col === c && keep(d)) ? 1 : 0.35);
  if (legendSel) {
    legendSel.attr("opacity", n => cells.some(d => d.fill === n && keep(d)) ? 1 : 0.35);
  }
}

function resetHighlight() {
  cellRects
    .attr("fill", d => colorScale(d.fill))
    .attr("stroke", "none")
    .attr("stroke-width", 0);
  cellLabels.attr("opacity", 1);
  colLabels.attr("fill-opacity", 1);
  if (legendSel) legendSel.attr("opacity", 1);
}

let legendSel = null;

if (hover) {
  cellNodes
    .style("cursor", "pointer")
    .on("mouseover", function (evt) {
      const d  = d3.select(this).datum();
      const ev = d3.event || evt;
      // Finish the entrance animation immediately if the user hovers early
      cellRects.interrupt()
        .attr("y",      dd => dd.y0)
        .attr("height", dd => Math.max(0, dd.y1 - dd.y0));
      cellLabels.interrupt();
      d3.select(this).raise();
      highlight(dd => dd === d, true);
      showTip(d, pointerXY(ev));
    })
    .on("mousemove", function (evt) {
      const ev = d3.event || evt;
      moveTip(pointerXY(ev));
    })
    .on("mouseout", function () {
      resetHighlight();
      hideTip();
    });

  colLabels
    .style("cursor", "pointer")
    .on("mouseover", function () {
      const c = d3.select(this).datum();
      highlight(d => d.col === c, false);
    })
    .on("mouseout", resetHighlight);
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
if (legendPos !== "none") {
  const lx = legendPos === "right" ? margin.left + chartW + 18 : 8;
  const ly = legendPos === "right" ? margin.top : titleOffset + 6;

  const legend = svg.append("g")
    .attr("class", "mosaic-legend")
    .attr("transform", `translate(${lx},${ly})`);

  if (hasLegTitle) {
    legend.append("text")
      .attr("x", 0)
      .attr("y", swatch / 2)
      .attr("dominant-baseline", "central")
      .attr("font-family", fontFamily)
      .attr("font-size",   legendSize)
      .attr("font-weight", "bold")
      .attr("fill",        axisCol)
      .text(legendTitle);
  }

  legendSel = legend.selectAll("g.mosaic-legend-item")
    .data(legendItems.map(d => d.name))
    .join("g")
    .attr("class", "mosaic-legend-item")
    .attr("transform", (n, i) => `translate(${legendItems[i].x},${legendItems[i].y})`);

  legendSel.append("rect")
    .attr("width",  swatch)
    .attr("height", swatch)
    .attr("rx", 2)
    .attr("fill", n => colorScale(n));

  legendSel.append("text")
    .attr("x", swatch + 6)
    .attr("y", swatch / 2)
    .attr("dominant-baseline", "central")
    .attr("font-family", fontFamily)
    .attr("font-size",   legendSize)
    .attr("fill",        axisCol)
    .text(n => n);

  if (hover) {
    legendSel
      .style("cursor", "pointer")
      .on("mouseover", function () {
        const n = d3.select(this).datum();
        highlight(d => d.fill === n, false);
      })
      .on("mouseout", resetHighlight);
  }
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------
if (title) {
  // Centre over the plot, but never let the title spill out of the SVG
  const maxTitleW = width - 12;
  const tW = textWidth(title, titleSize, "bold");
  let tx = margin.left + chartW / 2;
  tx = Math.max(6 + Math.min(tW, maxTitleW) / 2,
                Math.min(tx, width - 6 - Math.min(tW, maxTitleW) / 2));
  const titleNode = svg.append("text")
    .attr("x", tx)
    .attr("y", titleSize)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "bold")
    .attr("fill",         axisCol)
    .text(title);
  if (tW > maxTitleW) fitText(titleNode.node(), title, maxTitleW);
}

if (xtitle) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", height - 6)
    .attr("text-anchor",  "middle")
    .attr("font-size",    axisTitleSz)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(xtitle);
}

if (ytitle) {
  svg.append("text")
    .attr("transform",
      `translate(${axisTitleSz},${margin.top + chartH / 2}) rotate(-90)`)
    .attr("text-anchor",  "middle")
    .attr("font-size",    axisTitleSz)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(ytitle);
}

if (tip) tip.raise();
