// Radar chart, inspired by the look and feel of the Chart.js radar chart and
// implemented in plain D3 (v5 / v6 compatible).

// r2d3 unboxes length-1 vectors to scalars, so normalize vector options.
const asArray = v => (v === null || v === undefined) ? []
  : (Array.isArray(v) ? v : (typeof v === "object" ? [] : [v]));

const groupCol      = options.group;
const axes          = asArray(options.axes).map(String);
const axisLabelsArr = asArray(options.axisLabels).map(String);
const maxValueArr   = asArray(options.maxValue).map(Number).filter(v => isFinite(v) && v > 0);
const eachAxis      = options.scaleEachAxis === true;
const levels        = Math.max(1, Math.round(+options.levels || 5));
const gridShape     = options.gridShape === "circle" ? "circle" : "polygon";
const userColors    = asArray(options.colors).map(String);
const fillOpacity   = options.fillOpacity != null ? +options.fillOpacity : 0.2;
const lineWidth     = options.lineWidth   != null ? +options.lineWidth   : 2;
const pointRadius   = options.pointRadius != null ? +options.pointRadius : 3;
const showTicks     = options.showTicks !== false;
const valueFormat   = typeof options.valueFormat === "string" ? options.valueFormat : ",";
const gridCol       = options.gridCol || "#dddddd";
const hover         = options.hover   !== false;
const animate       = options.animate !== false;
const showLegend    = options.legend  !== false;
const legendSize    = options.legendFontSize || 12;
const labelSize     = options.labelFontSize  || 12;
const tickSize      = options.tickFontSize   || 10;
const title         = typeof options.title === "string" ? options.title : null;
const titleSize     = options.titleFontSize  || 16;
const fontFamily    = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol   || "white";
const axisCol       = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Soft default palette in the spirit of Chart.js
const defaultPalette = [
  "#36a2eb", "#ff6384", "#ff9f40", "#4bc0c0",
  "#9966ff", "#ffcd56", "#2e7d32", "#c9cbcf",
  "#8d6e63", "#3949ab"
];
const palette = userColors.length ? userColors : defaultPalette;

let fmtFn;
try { fmtFn = d3.format(valueFormat); } catch (e) { fmtFn = d3.format(","); }
const fmt = v => fmtFn(v);

// Scale labels (ring ticks, per-axis maxima) use the same format with
// insignificant trailing zeros trimmed, e.g. ".1f" prints 400 not 400.0
let tickFmtFn;
try {
  const spec = d3.formatSpecifier(valueFormat);
  spec.trim = true;
  tickFmtFn = d3.format(spec.toString());
} catch (e) { tickFmtFn = fmtFn; }
const tickFmt = v => tickFmtFn(+(+v).toPrecision(12));

// Parse rows
const nAxes = axes.length;
const series = (data || []).map((d, i) => ({
  name:   String(d[groupCol]),
  index:  i,
  color:  palette[i % palette.length],
  values: axes.map(a => {
    const v = d[a];
    return (v === null || v === undefined || v === "NA") ? NaN : +v;
  }),
  t: animate ? 0 : 1   // growth factor (0 = collapsed to the center)
})).filter(s => s.values.every(v => isFinite(v)));

if (!series.length || nAxes < 3) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for radar_chart()");
  return;
}

// ---------------------------------------------------------------------------
// Scales: a "nice" maximum split into exactly `levels` rings
// ---------------------------------------------------------------------------
function niceMax(raw) {
  if (!(raw > 0)) return levels;
  const rawStep = raw / levels;
  const mag  = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
    .map(m => m * mag).find(s => s >= rawStep - 1e-12);
  return +(step * levels).toPrecision(12);
}

let axisMax;
if (eachAxis) {
  axisMax = axes.map((a, i) => {
    if (maxValueArr.length) return maxValueArr[maxValueArr.length === nAxes ? i : 0];
    // Rings carry no labels here, so any round maximum will do
    const raw = d3.max(series, s => s.values[i]);
    return raw > 0 ? d3.scaleLinear().domain([0, raw]).nice(5).domain()[1] : 1;
  });
} else {
  const shared = maxValueArr.length ? maxValueArr[0]
    : niceMax(d3.max(series, s => d3.max(s.values)));
  axisMax = axes.map(() => shared);
}

// Fraction of the radius for value v on axis i (clamped to the outer ring)
const frac = (v, i) => Math.max(0, Math.min(v / axisMax[i], 1));

// ---------------------------------------------------------------------------
// Text measurement
// ---------------------------------------------------------------------------
function measure(str, size, weight) {
  const t = svg.append("text")
    .attr("visibility", "hidden")
    .attr("font-family", fontFamily)
    .attr("font-size", size)
    .attr("font-weight", weight || "normal")
    .text(str);
  let w = 0;
  try { w = t.node().getComputedTextLength(); } catch (e) { w = 0; }
  t.remove();
  return w || str.length * size * 0.62;
}

// ---------------------------------------------------------------------------
// Layout: title, legend, then the radar
// ---------------------------------------------------------------------------
const titleOffset = title ? titleSize + 14 : 0;

// Legend (Chart.js style: centered rows of boxes + labels, wrapping)
const boxW = Math.round(legendSize * 2.4);
const boxH = Math.round(legendSize * 0.95);
const legendGap = 18;
let legendRows = [];
let legendH = 0;
if (showLegend) {
  const maxW = width - 20;
  let row = { items: [], w: 0 };
  series.forEach(s => {
    const w = boxW + 6 + measure(s.name, legendSize);
    if (row.items.length && row.w + legendGap + w > maxW) {
      legendRows.push(row);
      row = { items: [], w: 0 };
    }
    row.w += (row.items.length ? legendGap : 0);
    row.items.push({ s: s, x: row.w, w: w });
    row.w += w;
  });
  legendRows.push(row);
  legendH = legendRows.length * (legendSize + 10) + 6;
}

// Axis label lines (support "\n" in labels; per-axis scale adds the maximum)
const axisLabelLines = axes.map((a, i) => {
  const lab = axisLabelsArr[i] !== undefined ? axisLabelsArr[i] : a;
  const lines = lab.split("\n").map(txt => ({ text: txt, sub: false }));
  if (eachAxis) lines.push({ text: "max " + tickFmt(axisMax[i]), sub: true });
  return lines;
});
const subSize = Math.max(8, labelSize - 2);
const lineH   = labelSize * 1.2;

const angle = i => i * 2 * Math.PI / nAxes;  // 0 = 12 o'clock, clockwise

const labelInfo = axisLabelLines.map((lines, i) => {
  const a = angle(i);
  const w = d3.max(lines, l => measure(l.text, l.sub ? subSize : labelSize, "normal"));
  return { lines: lines, a: a, sin: Math.sin(a), cos: Math.cos(a), w: w, h: lines.length * lineH };
});

const pad = 10;
const labelGap = Math.max(10, pointRadius + 8);
const top    = titleOffset + legendH + pad;
const areaW  = Math.max(width - 2 * pad, 40);
const areaH  = Math.max(height - top - pad, 40);
const halfW  = areaW / 2;
const halfH  = areaH / 2;

// Largest radius for which every axis label still fits inside the area
let radius = Math.min(halfW, halfH) - labelGap;
labelInfo.forEach(L => {
  const s = Math.abs(L.sin), c = Math.abs(L.cos);
  if (s > 0.1)  radius = Math.min(radius, (halfW - L.w) / s - labelGap);
  else          radius = Math.min(radius, halfW - L.w / 2 - labelGap);
  if (c > 0.1)  radius = Math.min(radius, (halfH - L.h) / c - labelGap);
  else          radius = Math.min(radius, halfH - L.h / 2);
});
radius = Math.max(radius, 20);

const cx = pad + halfW;
const cy = top + halfH;

// Polar -> cartesian (matches d3.lineRadial: angle 0 at 12 o'clock)
const px = (r, i) =>  r * Math.sin(angle(i));
const py = (r, i) => -r * Math.cos(angle(i));

const g = svg.append("g")
  .attr("class", "radar-chart")
  .attr("transform", `translate(${cx},${cy})`);

// ---------------------------------------------------------------------------
// Grid: rings, spokes and tick labels
// ---------------------------------------------------------------------------
const grid = g.append("g").attr("class", "radar-grid");

const ringLine = d3.lineRadial()
  .angle((d, i) => angle(i))
  .radius(d => d)
  .curve(d3.curveLinearClosed);

d3.range(1, levels + 1).forEach(k => {
  const rr = radius * k / levels;
  if (gridShape === "circle") {
    grid.append("circle")
      .attr("class", "radar-ring")
      .attr("r", rr)
      .attr("fill", "none")
      .attr("stroke", gridCol)
      .attr("stroke-width", 1);
  } else {
    grid.append("path")
      .attr("class", "radar-ring")
      .attr("d", ringLine(axes.map(() => rr)))
      .attr("fill", "none")
      .attr("stroke", gridCol)
      .attr("stroke-width", 1);
  }
});

grid.selectAll("line.radar-spoke")
  .data(axes)
  .join("line")
  .attr("class", "radar-spoke")
  .attr("x1", 0).attr("y1", 0)
  .attr("x2", (d, i) => px(radius, i))
  .attr("y2", (d, i) => py(radius, i))
  .attr("stroke", gridCol)
  .attr("stroke-width", 1);

// Axis labels
const labels = g.append("g").attr("class", "radar-axis-labels");
labelInfo.forEach((L, i) => {
  const lx = px(radius + labelGap, i);
  const ly = py(radius + labelGap, i);
  const anchor = Math.abs(L.sin) < 0.1 ? "middle" : (L.sin > 0 ? "start" : "end");
  // Baseline of the first line, so the block sits above / below / centred on ly
  let y0;
  if (L.cos > 0.1)       y0 = ly - L.h + labelSize * 0.95;          // top half
  else if (L.cos < -0.1) y0 = ly + labelSize * 0.95;                // bottom half
  else                   y0 = ly - L.h / 2 + labelSize * 0.95;      // sides

  const txt = labels.append("text")
    .attr("class", "radar-axis-label")
    .attr("text-anchor", anchor)
    .attr("font-family", fontFamily)
    .attr("fill", axisCol);
  L.lines.forEach((l, j) => {
    txt.append("tspan")
      .attr("x", lx)
      .attr("y", y0 + j * lineH)
      .attr("font-size", l.sub ? subSize : labelSize)
      .attr("fill-opacity", l.sub ? 0.55 : 1)
      .text(l.text);
  });
});

// Tick labels along the top spoke (shared scale only), with a halo backdrop
if (showTicks && !eachAxis) {
  const ticks = g.append("g").attr("class", "radar-ticks").style("pointer-events", "none");
  d3.range(1, levels + 1).forEach(k => {
    ticks.append("text")
      .attr("x", 0)
      .attr("y", -radius * k / levels)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-family", fontFamily)
      .attr("font-size", tickSize)
      .attr("fill", axisCol)
      .attr("fill-opacity", 0.6)
      .attr("stroke", bgcol)
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .attr("paint-order", "stroke")
      .text(tickFmt(axisMax[0] * k / levels));
  });
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------
const hidden = new Set();

const seriesLayer = g.append("g").attr("class", "radar-series-layer");

const seriesG = seriesLayer.selectAll("g.radar-series")
  .data(series)
  .join("g")
  .attr("class", "radar-series")
  .attr("data-series", s => s.name);

const areaLine = d3.lineRadial()
  .angle((d, i) => angle(i))
  .radius(d => d)
  .curve(d3.curveLinearClosed);

const areaPath = seriesG.append("path")
  .attr("class", "radar-area")
  .attr("fill", s => s.color)
  .attr("fill-opacity", fillOpacity)
  .attr("stroke", s => s.color)
  .attr("stroke-width", lineWidth)
  .attr("stroke-linejoin", "round");

// Point markers plus a larger invisible hit area for each vertex
const pointData = s => s.values.map((v, i) => ({ s: s, i: i, v: v }));

const points = seriesG.selectAll("circle.radar-point")
  .data(pointData)
  .join("circle")
  .attr("class", "radar-point")
  .attr("r", pointRadius)
  .attr("fill", p => p.s.color)
  .attr("stroke", bgcol)
  .attr("stroke-width", pointRadius > 0 ? Math.min(1.5, pointRadius * 0.4) : 0)
  .style("pointer-events", "none");

// Hit circles live in their own layer above every polygon, so a series drawn
// on top never blocks hovering the vertices of the series underneath it.
const hitLayer = g.append("g").attr("class", "radar-hit-layer");
const hitG = hitLayer.selectAll("g.radar-hit-series")
  .data(series)
  .join("g")
  .attr("class", "radar-hit-series")
  .each(function (s) { s.hitNode = this; });

const hits = hitG.selectAll("circle.radar-hit")
  .data(pointData)
  .join("circle")
  .attr("class", "radar-hit")
  .attr("r", Math.max(pointRadius + 6, 9))
  .attr("fill", "transparent")
  .style("pointer-events", "all");

// Redraw one series' geometry at its current growth factor s.t
function drawSeries(node, s) {
  const sel = d3.select(node);
  sel.select("path.radar-area")
    .attr("d", areaLine(s.values.map((v, i) => radius * frac(v, i) * s.t)));
  sel.selectAll("circle.radar-point")
    .attr("cx", p => px(radius * frac(p.v, p.i) * s.t, p.i))
    .attr("cy", p => py(radius * frac(p.v, p.i) * s.t, p.i));
  d3.select(s.hitNode).selectAll("circle.radar-hit")
    .attr("cx", p => px(radius * frac(p.v, p.i) * s.t, p.i))
    .attr("cy", p => py(radius * frac(p.v, p.i) * s.t, p.i));
}

seriesG.each(function (s) { drawSeries(this, s); });

// Animate the growth factor of a series toward `target` (1 = shown, 0 = collapsed)
function grow(node, s, target, delay, duration) {
  d3.select(node)
    .interrupt("grow")
    .transition("grow")
    .delay(delay || 0)
    .duration(duration)
    .ease(d3.easeCubicOut)
    .tween("grow", function () {
      const interp = d3.interpolateNumber(s.t, target);
      return function (t) { s.t = interp(t); drawSeries(node, s); };
    })
    .on("end", function () {
      // A fully collapsed series would leave its markers piled at the center
      if (target === 0) d3.select(node).style("visibility", "hidden");
    });
  if (target > 0) d3.select(node).style("visibility", null);
}

if (animate) {
  seriesG.each(function (s, i) { grow(this, s, 1, i * 90, 1000); });
}

// ---------------------------------------------------------------------------
// Tooltip — an in-SVG group (not a <div> appended to <body>) so it renders
// the same standalone, in R Markdown and in pkgdown.
// ---------------------------------------------------------------------------
const tip = svg.append("g")
  .attr("class", "radar-tooltip")
  .style("pointer-events", "none")
  .style("opacity", 0);
const tipRect = tip.append("rect")
  .attr("rx", 4).attr("ry", 4)
  .attr("fill", "white")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 1);
const tipSwatch = tip.append("rect")
  .attr("width", 10).attr("height", 10)
  .attr("rx", 2)
  .attr("stroke-width", 1.5);
const tipText = tip.append("text")
  .attr("font-family", fontFamily)
  .attr("font-size", 12)
  .attr("fill", "#222");

const tipPadX = 8, tipPadY = 6, tipLineH = 16, swatchSpace = 16;

function showTip(p) {
  const lab = (axisLabelsArr[p.i] !== undefined ? axisLabelsArr[p.i] : axes[p.i]).replace(/\n/g, " ");
  tipText.selectAll("tspan").remove();
  tipText.append("tspan")
    .attr("x", 0).attr("y", 0)
    .attr("font-weight", "bold")
    .text(lab);
  tipText.append("tspan")
    .attr("x", swatchSpace).attr("y", tipLineH)
    .attr("font-weight", "normal")
    .text(p.s.name + ": ");
  tipText.append("tspan")
    .attr("font-weight", "bold")
    .text(fmt(p.v));

  tipSwatch
    .attr("x", 0).attr("y", tipLineH - 9)
    .attr("fill", d3.interpolateRgb(p.s.color, "white")(0.45))
    .attr("stroke", p.s.color);

  const bb   = tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX).attr("y", bb.y - tipPadY)
    .attr("width", boxW).attr("height", boxH);

  // Anchor beside the point, flipping / clamping to stay inside the SVG
  const r   = radius * frac(p.v, p.i) * p.s.t;
  const ax  = cx + px(r, p.i);
  const ay  = cy + py(r, p.i);
  const off = Math.max(pointRadius, 3) + 10;
  const x0  = bb.x - tipPadX, y0 = bb.y - tipPadY;

  let tx = ax + off - x0;
  if (tx + x0 + boxW > width - 2) tx = ax - off - boxW - x0;
  tx = Math.max(2 - x0, tx);
  let ty = ay - boxH / 2 - y0;
  ty = Math.max(2 - y0, Math.min(ty, height - boxH - 2 - y0));

  tip.attr("transform", `translate(${tx},${ty})`)
    .raise()
    .interrupt()
    .transition().duration(120).style("opacity", 1);
}

function hideTip() {
  tip.interrupt().transition().duration(200).style("opacity", 0);
}

// ---------------------------------------------------------------------------
// Focus / reset — recompute every series from scratch (self-healing)
// ---------------------------------------------------------------------------
function applyFocus(focus, focusPoint) {
  areaPath.interrupt("fade").transition("fade").duration(150)
    .attr("fill-opacity", s => !focus ? fillOpacity
      : (s === focus ? Math.min(1, fillOpacity + 0.15) : fillOpacity * 0.25))
    .attr("stroke-opacity", s => (!focus || s === focus) ? 1 : 0.2)
    .attr("stroke-width", s => (focus && s === focus) ? lineWidth + 1 : lineWidth);
  points.interrupt("fade").transition("fade").duration(150)
    .attr("opacity", p => (!focus || p.s === focus) ? 1 : 0.2)
    .attr("r", p => (focusPoint && p.s === focusPoint.s && p.i === focusPoint.i)
      ? Math.max(pointRadius * 1.7, 5) : pointRadius);
}

function raiseSeries(s) {
  seriesG.filter(d => d === s).each(function () {
    if (this.parentNode.lastChild !== this) d3.select(this).raise();
  });
  if (s.hitNode.parentNode.lastChild !== s.hitNode) d3.select(s.hitNode).raise();
}

if (hover) {
  areaPath.style("cursor", "pointer")
    .on("mouseover", function () {
      const s = d3.select(this).datum();
      raiseSeries(s);
      applyFocus(s, null);
    })
    .on("mouseout", function () { applyFocus(null, null); });

  hits.style("cursor", "pointer")
    .on("mouseover", function () {
      const p = d3.select(this).datum();
      raiseSeries(p.s);
      applyFocus(p.s, p);
      showTip(p);
    })
    .on("mouseout", function () {
      applyFocus(null, null);
      hideTip();
    });
}

// ---------------------------------------------------------------------------
// Legend — hover to focus a series, click to toggle it (Chart.js behaviour)
// ---------------------------------------------------------------------------
if (showLegend) {
  const legend = svg.append("g")
    .attr("class", "radar-legend")
    .attr("transform", `translate(0,${titleOffset + 6})`);

  const flat = [];
  legendRows.forEach((row, r) => {
    const x0 = (width - row.w) / 2;
    row.items.forEach(it => flat.push({ s: it.s, x: x0 + it.x, y: r * (legendSize + 10) }));
  });

  const items = legend.selectAll("g.radar-legend-item")
    .data(flat)
    .join("g")
    .attr("class", "radar-legend-item")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .style("cursor", "pointer")
    .style("user-select", "none");

  // Transparent hit rectangle covering box + text
  items.append("rect")
    .attr("x", -4).attr("y", -4)
    .attr("width", d => boxW + 6 + measure(d.s.name, legendSize) + 8)
    .attr("height", boxH + 8)
    .attr("fill", "transparent");

  items.append("rect")
    .attr("class", "radar-legend-box")
    .attr("width", boxW).attr("height", boxH)
    .attr("fill", d => d.s.color)
    .attr("fill-opacity", Math.max(fillOpacity, 0.35))
    .attr("stroke", d => d.s.color)
    .attr("stroke-width", 2);

  const legendText = items.append("text")
    .attr("class", "radar-legend-label")
    .attr("x", boxW + 6)
    .attr("y", boxH / 2)
    .attr("dy", "0.35em")
    .attr("font-family", fontFamily)
    .attr("font-size", legendSize)
    .attr("fill", axisCol)
    .text(d => d.s.name);

  items
    .on("mouseover", function () {
      const d = d3.select(this).datum();
      if (hover && !hidden.has(d.s.name)) { raiseSeries(d.s); applyFocus(d.s, null); }
    })
    .on("mouseout", function () {
      if (hover) applyFocus(null, null);
    })
    .on("click", function () {
      const d = d3.select(this).datum();
      const s = d.s;
      const node = seriesG.filter(x => x === s).node();
      if (hidden.has(s.name)) {
        hidden.delete(s.name);
        d3.select(node).style("pointer-events", null);
        d3.select(s.hitNode).style("display", null);
        grow(node, s, 1, 0, 600);
      } else {
        hidden.add(s.name);
        d3.select(node).style("pointer-events", "none");
        d3.select(s.hitNode).style("display", "none");
        grow(node, s, 0, 0, 500);
        hideTip();
      }
      applyFocus(hover && !hidden.has(s.name) ? s : null, null);
      legendText.filter(x => x.s === s)
        .attr("fill-opacity", hidden.has(s.name) ? 0.4 : 1)
        .style("text-decoration", hidden.has(s.name) ? "line-through" : null);
      items.filter(x => x.s === s).select(".radar-legend-box")
        .attr("opacity", hidden.has(s.name) ? 0.35 : 1);
    });
}

// Chart title
if (title) {
  svg.append("text")
    .attr("class", "radar-title")
    .attr("x", width / 2)
    .attr("y", titleSize)
    .attr("text-anchor", "middle")
    .attr("font-size",   titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill",        axisCol)
    .text(title);
}
