// streamgraph() — stacked areas around a displaced (wiggle / silhouette /
// expand) baseline, with inline layer labels, hover highlighting, a snapping
// vertical crosshair with a multi-series tooltip, and an interactive legend.
// Look and feel inspired by the Highcharts streamgraph; plain D3 (v5/v6).

// ---------------------------------------------------------------- options --
const asArray = v => v == null ? [] : (Array.isArray(v) ? v : [v]);

const groups        = asArray(options.groups).map(String);
const xIsDate       = options.xType === "date";
const offsetName    = options.offset || "wiggle";
const orderName     = options.order  || "insideOut";
const curveName     = options.curve  || "basis";
const userColors    = asArray(options.colors);
const colorPalette  = options.colorPalette || "Tableau10";
const opacity       = options.opacity == null ? 0.9 : +options.opacity;
const strokeCol     = options.strokeCol || "white";
const strokeWidth   = options.strokeWidth == null ? 0.5 : +options.strokeWidth;
const showLabels    = options.labels  === undefined ? true : !!options.labels;
const labelSize     = options.labelFontSize || 11;
const labelColOpt   = options.labelCol || null;
const tooltipOn     = options.tooltip === undefined ? true : !!options.tooltip;
const hoverOn       = options.hover   === undefined ? true : !!options.hover;
const animate       = options.animate === undefined ? true : !!options.animate;
const legendOn      = options.legend  === undefined ? true : !!options.legend;
const legendSize    = options.legendFontSize || 11;
const valueFmt      = d3.format(options.valueFormat || ",.2~f");
const xFormatOpt    = options.xFormat || null;
const xticksOpt     = options.xticks || null;
const xFontSize     = options.xFontSize || 11;
const gridCol       = options.gridCol || "#e6e6e6";
const xtitle        = options.xtitle || null;
const xtitleSize    = options.xtitleFontSize || 13;
const title         = options.title || null;
const titleSize     = options.titleFontSize || 16;
const fontFamily    = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol || "white";
const axisCol       = options.axisCol || "black";
const isExpand      = offsetName === "expand";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// ------------------------------------------------------------ D3 helpers --
// D3 v6+ calls handlers with (event, datum); D3 v5 with (datum, i, nodes)
// and exposes the event as d3.event. Normalize both.
function evArgs(a, b) {
  if (typeof Event !== "undefined" && a instanceof Event) return { event: a, d: b };
  return { event: d3.event, d: a };
}
function pointerIn(event, node) {
  return d3.pointer ? d3.pointer(event, node) : d3.mouse(node);
}

// ------------------------------------------------------------------ data --
let rows = data;
if (!Array.isArray(rows) && rows && Array.isArray(rows.x)) {
  rows = rows.x.map((xv, i) => ({ x: xv, group: rows.group[i], value: rows.value[i] }));
}
rows = (rows || []).filter(d => isFinite(+d.x));

function noData(msg) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text(msg);
}

const xs = Array.from(new Set(rows.map(d => +d.x))).sort((a, b) => a - b);
if (xs.length < 2 || !groups.length) {
  noData("Not enough data for streamgraph()");
  return;
}
const nX = xs.length;
const xIndex = new Map(xs.map((v, i) => [v, i]));

// Dense wide table: one row per x, one column per group (missing = 0)
const table = xs.map(v => {
  const r = { __x: v };
  groups.forEach(g => { r[g] = 0; });
  return r;
});
rows.forEach(d => {
  const g = String(d.group);
  if (!(g in table[0])) return;
  const v = +d.value;
  table[xIndex.get(+d.x)][g] += isFinite(v) ? v : 0;
});

const totals = new Map(groups.map(g => [g, d3.sum(table, r => r[g])]));

// ---------------------------------------------------------------- colors --
let palette;
if (userColors.length) {
  palette = userColors;
} else {
  const sch = d3["scheme" + colorPalette];
  palette = Array.isArray(sch) && typeof sch[0] === "string" ? sch : (d3.schemeTableau10 || d3.schemeCategory10);
}
const color = d3.scaleOrdinal(palette).domain(groups);

function autoTextCol(fill) {
  const c = d3.rgb(fill);
  const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  return lum > 0.62 ? "#1f1f1f" : "#ffffff";
}
const labelColor = key => labelColOpt || autoTextCol(color(key));

// ------------------------------------------------------------ stack setup --
const offsetFn = {
  wiggle:     d3.stackOffsetWiggle,
  silhouette: d3.stackOffsetSilhouette,
  expand:     d3.stackOffsetExpand
}[offsetName] || d3.stackOffsetWiggle;

const orderFn = {
  insideOut:  d3.stackOrderInsideOut,
  none:       d3.stackOrderNone,
  reverse:    d3.stackOrderReverse,
  ascending:  d3.stackOrderAscending,
  descending: d3.stackOrderDescending
}[orderName] || d3.stackOrderInsideOut;

const curveFn = {
  basis:      d3.curveBasis,
  catmullRom: d3.curveCatmullRom,
  monotoneX:  d3.curveMonotoneX,
  linear:     d3.curveLinear,
  step:       d3.curveStep
}[curveName] || d3.curveBasis;

// The stacking order is computed once on the full data and then frozen, so
// hiding a layer collapses it in place instead of reshuffling the stream.
const fixedOrder = d3.stack().keys(groups).order(orderFn).offset(offsetFn)(table)
  .slice().sort((a, b) => a.index - b.index).map(s => groups.indexOf(s.key));

const hidden = new Set();

function computeSeries() {
  return d3.stack()
    .keys(groups)
    .value((r, key) => hidden.has(key) ? 0 : r[key])
    .order(() => fixedOrder)
    .offset(offsetFn)(table);
}

// --------------------------------------------------------------- formats --
const allInt = xs.every(v => Number.isInteger(v));
let xAxisFmt = null, xTipFmt;
if (xIsDate) {
  const midnight = xs.every(v => v % 86400000 === 0);
  xTipFmt  = d3.utcFormat(xFormatOpt || (midnight ? "%b %-d, %Y" : "%b %-d, %Y %H:%M"));
  xAxisFmt = xFormatOpt ? d3.utcFormat(xFormatOpt) : null;
} else {
  const f = xFormatOpt ? d3.format(xFormatOpt) : (allInt ? d3.format("d") : d3.format(",.3~f"));
  xTipFmt  = f;
  xAxisFmt = xFormatOpt || allInt ? f : null;
}

// ---------------------------------------------------------------- layout --
const pad      = 12;
const titleH   = title ? titleSize + 18 : 10;
const axisH    = xFontSize + 14;
const xtitleH  = xtitle ? xtitleSize + 10 : 0;

// Legend — measured first so the plot can reserve exactly the space it needs.
const legendG = legendOn ? svg.append("g").attr("class", "stream-legend") : null;
let legendItems = null, legendH = 0;
if (legendOn) {
  const sw = legendSize * 0.9;
  legendItems = legendG.selectAll("g.item")
    .data(groups)
    .join("g")
    .attr("class", "item")
    .style("cursor", "pointer")
    .style("user-select", "none");
  legendItems.append("circle")
    .attr("r", sw / 2)
    .attr("cx", sw / 2)
    .attr("cy", 0)
    .attr("fill", d => color(d));
  legendItems.append("text")
    .attr("x", sw + 5)
    .attr("dy", "0.35em")
    .attr("font-family", fontFamily)
    .attr("font-size", legendSize)
    .attr("fill", axisCol)
    .text(d => d);

  const gapX = 16, rowH = legendSize + 9, maxW = width - 2 * pad;
  const widths = [];
  legendItems.each(function () { widths.push(this.getBBox().width); });
  const lines = [[]];
  let lineW = 0;
  widths.forEach((w, i) => {
    const need = (lines[lines.length - 1].length ? gapX : 0) + w;
    if (lineW + need > maxW && lines[lines.length - 1].length) {
      lines.push([]); lineW = 0;
    }
    lineW += (lines[lines.length - 1].length ? gapX : 0) + w;
    lines[lines.length - 1].push(i);
  });
  const pos = [];
  lines.forEach((line, li) => {
    const total = d3.sum(line, i => widths[i]) + gapX * (line.length - 1);
    let cx = (width - total) / 2;
    line.forEach(i => { pos[i] = [cx, li * rowH]; cx += widths[i] + gapX; });
  });
  legendItems.attr("transform", (d, i) => `translate(${pos[i][0]},${pos[i][1]})`);
  legendH = lines.length * rowH + 6;
}

// Reserve enough side room for the outermost x tick labels (centred on their
// tick), using a provisional scale to find which ticks sit near the edges.
function tickInfo(w) {
  const sc = (xIsDate ? d3.scaleUtc() : d3.scaleLinear())
    .domain([xs[0], xs[nX - 1]]).range([0, w]);
  const n = xticksOpt || Math.max(2, Math.min(nX, Math.floor(w / 85)));
  let tv = sc.ticks(n);
  if (!xIsDate && allInt) tv = tv.filter(Number.isInteger);
  return { sc: sc, n: n, tv: tv, fmt: xAxisFmt || sc.tickFormat(n) };
}
const baseLeft  = isExpand ? 46 : pad + 4;
const baseRight = pad + 4;
let sideL = baseLeft, sideR = baseRight;
{
  const ti = tickInfo(Math.max(40, width - baseLeft - baseRight));
  if (ti.tv.length) {
    const tmp = svg.append("text")
      .attr("font-size", xFontSize).attr("font-family", fontFamily);
    const wOf = v => tmp.text(ti.fmt(v)).node().getComputedTextLength();
    const w0 = wOf(ti.tv[0]), w1 = wOf(ti.tv[ti.tv.length - 1]);
    const p0 = ti.sc(ti.tv[0]);
    const p1 = ti.sc.range()[1] - ti.sc(ti.tv[ti.tv.length - 1]);
    tmp.remove();
    sideL = Math.max(baseLeft,  Math.ceil(w0 / 2 - p0 + 4));
    sideR = Math.max(baseRight, Math.ceil(w1 / 2 - p1 + 4));
  }
}

const margin = {
  top:    titleH,
  right:  sideR,
  bottom: axisH + xtitleH + legendH + 6,
  left:   sideL
};
const chartW = Math.max(40, width  - margin.left - margin.right);
const chartH = Math.max(40, height - margin.top  - margin.bottom);

if (legendOn) {
  legendG.attr("transform",
    `translate(0,${margin.top + chartH + axisH + xtitleH + legendSize / 2 + 8})`);
}

// ---------------------------------------------------------------- scales --
const xScale = (xIsDate ? d3.scaleUtc() : d3.scaleLinear())
  .domain([xs[0], xs[nX - 1]])
  .range([0, chartW]);

const yScale = d3.scaleLinear().range([chartH, 0]);
function updateYDomain(series) {
  if (isExpand) { yScale.domain([0, 1]); return; }
  let lo = d3.min(series, s => d3.min(s, p => p[0]));
  let hi = d3.max(series, s => d3.max(s, p => p[1]));
  if (!(hi > lo)) { lo = -1; hi = 1; }
  const padY = (hi - lo) * 0.04;
  yScale.domain([lo - padY, hi + padY]);
}

let series = computeSeries();
updateYDomain(series);

const area = d3.area()
  .x(p => xScale(p.data.__x))
  .y0(p => yScale(p[0]))
  .y1(p => yScale(p[1]))
  .curve(curveFn);

// ------------------------------------------------------------ containers --
const plot = svg.append("g")
  .attr("class", "stream-plot")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Transparent hit area so the crosshair also follows the mouse over gaps.
plot.append("rect")
  .attr("class", "stream-bg")
  .attr("width", chartW).attr("height", chartH)
  .attr("fill", "transparent")
  .style("pointer-events", "all");

// Vertical grid lines at the x ticks
const tickVals = tickInfo(chartW).tv;

plot.append("g")
  .attr("class", "stream-grid")
  .style("pointer-events", "none")
  .selectAll("line")
  .data(tickVals)
  .join("line")
  .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
  .attr("y1", 0).attr("y2", chartH)
  .attr("stroke", gridCol)
  .attr("stroke-width", 1);

// Clip path — also used for the left-to-right entrance reveal.
const clipId = "stream-clip-" + Math.random().toString(36).slice(2);
const clipRect = plot.append("clipPath").attr("id", clipId)
  .append("rect")
  .attr("x", -2).attr("y", -2)
  .attr("height", chartH + 4)
  .attr("width", animate ? 0 : chartW + 4);

const layerG = plot.append("g")
  .attr("class", "stream-layers")
  .attr("clip-path", `url(#${clipId})`);

const baseOpacity = key => hidden.has(key) ? 0 : opacity;

const paths = layerG.selectAll("path.layer")
  .data(series, s => s.key)
  .join("path")
  .attr("class", "layer")
  .attr("data-key", s => s.key)
  .attr("fill", s => color(s.key))
  .attr("fill-opacity", s => baseOpacity(s.key))
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth)
  .attr("stroke-linejoin", "round")
  .attr("d", area);

// X axis
const xAxis = d3.axisBottom(xScale).tickValues(tickVals).tickSizeOuter(0).tickSize(5);
if (xAxisFmt) xAxis.tickFormat(xAxisFmt);
plot.append("g")
  .attr("class", "stream-xaxis")
  .attr("transform", `translate(0,${chartH})`)
  .call(xAxis)
  .call(ag => ag.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size", xFontSize)
    .attr("font-family", fontFamily)
    .attr("fill", axisCol))
  // Keep the outermost tick labels inside the SVG
  .call(ag => ag.selectAll(".tick text").each(function () {
    const bb = this.getBBox();
    const tx = +d3.select(this.parentNode).attr("transform").match(/translate\(([-\d.e]+)/)[1];
    if (tx + bb.x < -margin.left + 2) d3.select(this).attr("text-anchor", "start").attr("x", -4);
    else if (tx + bb.x + bb.width > chartW + margin.right - 2) d3.select(this).attr("text-anchor", "end").attr("x", 4);
  }));

// Percent axis for the expand offset (meaningless for wiggle/silhouette)
if (isExpand) {
  plot.append("g")
    .attr("class", "stream-yaxis")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")).tickSizeOuter(0))
    .call(ag => ag.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
    .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
    .call(ag => ag.selectAll(".tick text")
      .attr("font-size", xFontSize)
      .attr("font-family", fontFamily)
      .attr("fill", axisCol));
}

// ---------------------------------------------------------- inline labels --
// Each label goes where its layer is thickest *over the label's full width*:
// sample the rendered boundaries across the x range, slide a window as wide
// as the label, and keep the position with the most vertical room.
const labelG = plot.append("g")
  .attr("class", "stream-labels")
  .attr("clip-path", `url(#${clipId})`)
  .style("pointer-events", "none");

const labelText = labelG.selectAll("text")
  .data(groups)
  .join("text")
  .attr("text-anchor", "middle")
  .attr("dy", "0.35em")
  .attr("font-family", fontFamily)
  .attr("font-size", labelSize)
  .attr("font-weight", 600)
  .attr("fill", d => labelColor(d))
  .style("opacity", 0)
  .text(d => d);

const labelW = new Map();
labelText.each(function (d) { labelW.set(d, this.getComputedTextLength()); });

// Boundary value of a series as actually drawn at knot i (B-spline knots are
// a weighted average of their neighbours).
function knot(s, i, j) {
  if (curveName !== "basis" || i === 0 || i === nX - 1) return s[i][j];
  return (s[i - 1][j] + 4 * s[i][j] + s[i + 1][j]) / 6;
}

function layoutLabels(series) {
  const step = 3;
  const nS = Math.max(2, Math.floor(chartW / step) + 1);
  const knotsPx = xs.map(v => xScale(v));
  const out = new Map();

  series.forEach(s => {
    const key = s.key;
    if (hidden.has(key)) { out.set(key, null); return; }
    const top = xs.map((_, i) => yScale(knot(s, i, 1)));
    const bot = xs.map((_, i) => yScale(knot(s, i, 0)));

    // Sample the boundaries on a fine pixel grid
    const sx = [], st = [], sb = [];
    let k = 0;
    for (let j = 0; j < nS; j++) {
      const px = Math.min(chartW, j * step);
      while (k < nX - 2 && knotsPx[k + 1] < px) k++;
      let t;
      if (curveName === "step") {
        const mid = (knotsPx[k] + knotsPx[k + 1]) / 2;
        const idx = px < mid ? k : k + 1;
        sx.push(px); st.push(top[idx]); sb.push(bot[idx]);
        continue;
      }
      const span = knotsPx[k + 1] - knotsPx[k] || 1;
      t = Math.max(0, Math.min(1, (px - knotsPx[k]) / span));
      sx.push(px);
      st.push(top[k] + (top[k + 1] - top[k]) * t);
      sb.push(bot[k] + (bot[k + 1] - bot[k]) * t);
    }

    const half = labelW.get(key) / 2 + 4;
    const hw = Math.ceil(half / step);
    let best = null;
    for (let c = hw; c < nS - hw; c++) {
      let maxTop = -Infinity, minBot = Infinity;
      for (let j = c - hw; j <= c + hw; j++) {
        if (st[j] > maxTop) maxTop = st[j];
        if (sb[j] < minBot) minBot = sb[j];
      }
      const room = minBot - maxTop;
      // Slight preference for central positions breaks ties on flat layers.
      const score = room * (1 - 0.15 * Math.abs(sx[c] - chartW / 2) / (chartW / 2));
      if (!best || score > best.score) {
        best = { score: score, room: room, x: sx[c], y: (minBot + maxTop) / 2 };
      }
    }
    out.set(key, best && best.room >= labelSize * 1.2 ? best : null);
  });
  return out;
}

function placeLabels(series, duration) {
  if (!showLabels) return;
  const pos = layoutLabels(series);
  labelText.each(function (d) {
    const p = pos.get(d);
    const sel = d3.select(this);
    if (p) {
      const t = duration ? sel.transition("shape").duration(duration) : sel;
      t.attr("x", p.x).attr("y", p.y);
    }
    sel.attr("data-visible", p ? 1 : 0);
  });
  labelText.transition("fade").duration(duration || 0)
    .style("opacity", function () { return labelBaseOpacity(this); });
}

let focusKey = null;
function labelBaseOpacity(node) {
  if (+node.getAttribute("data-visible") !== 1) return 0;
  const d = d3.select(node).datum();
  return focusKey && d !== focusKey ? 0.25 : 1;
}

if (showLabels) {
  const pos = layoutLabels(series);
  labelText
    .attr("data-visible", d => pos.get(d) ? 1 : 0)
    .attr("x", d => pos.get(d) ? pos.get(d).x : 0)
    .attr("y", d => pos.get(d) ? pos.get(d).y : 0);
  labelText.transition("fade")
    .delay(animate ? 900 : 0)
    .duration(animate ? 400 : 0)
    .style("opacity", function () { return labelBaseOpacity(this); });
}

if (animate) {
  clipRect.transition()
    .duration(1200)
    .ease(d3.easeCubicInOut)
    .attr("width", chartW + 4);
}

// ------------------------------------------------------- crosshair & tip --
const crosshair = plot.append("line")
  .attr("class", "stream-crosshair")
  .attr("y1", 0).attr("y2", chartH)
  .attr("stroke", axisCol)
  .attr("stroke-opacity", 0.45)
  .attr("stroke-width", 1)
  .attr("stroke-dasharray", "4,3")
  .style("pointer-events", "none")
  .style("opacity", 0);

// Tooltip — an in-SVG group (not a <div> on <body>) so it renders the same
// standalone, in R Markdown, pkgdown and Shiny.
const tip = svg.append("g")
  .attr("class", "stream-tooltip")
  .style("pointer-events", "none")
  .style("opacity", 0);
const tipRect = tip.append("rect")
  .attr("rx", 4).attr("ry", 4)
  .attr("fill", "white")
  .attr("fill-opacity", 0.96)
  .attr("stroke", "#c8c8c8")
  .attr("stroke-width", 1)
  .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.18))");
const tipBody = tip.append("g");

const tipPadX = 10, tipPadY = 8, tipFont = 11.5, tipLineH = 16;
let tipIndex = -1, tipFocus = null;

function buildTip(i) {
  tipBody.selectAll("*").remove();
  const r = table[i];
  const vis = series.filter(s => !hidden.has(s.key))
    .sort((a, b) => b.index - a.index);           // top layer first
  const total = d3.sum(vis, s => r[s.key]);

  tipBody.append("text")
    .attr("x", 0).attr("y", tipFont)
    .attr("font-family", fontFamily)
    .attr("font-size", tipFont)
    .attr("font-weight", "bold")
    .attr("fill", "#222")
    .text(xTipFmt(xIsDate ? new Date(r.__x) : r.__x));

  vis.forEach((s, j) => {
    const y = tipFont + 8 + (j + 1) * tipLineH - 4;
    const isF = s.key === focusKey;
    tipBody.append("circle")
      .attr("cx", 4).attr("cy", y - 4)
      .attr("r", 4)
      .attr("fill", color(s.key));
    const tx = tipBody.append("text")
      .attr("x", 13).attr("y", y)
      .attr("font-family", fontFamily)
      .attr("font-size", tipFont)
      .attr("fill", "#222")
      .attr("font-weight", isF ? "bold" : "normal");
    tx.append("tspan").text(s.key + ": ");
    tx.append("tspan").attr("font-weight", "bold").text(valueFmt(r[s.key]));
    if (isExpand && total > 0) {
      tx.append("tspan").attr("fill", "#666")
        .text(" (" + d3.format(".1%")(r[s.key] / total) + ")");
    }
  });

  const yTot = tipFont + 8 + (vis.length + 1) * tipLineH;
  tipBody.append("line")
    .attr("x1", 0).attr("y1", yTot - tipLineH + 4)
    .attr("y2", yTot - tipLineH + 4)
    .attr("stroke", "#e2e2e2");
  const tt = tipBody.append("text")
    .attr("x", 0).attr("y", yTot)
    .attr("font-family", fontFamily)
    .attr("font-size", tipFont)
    .attr("fill", "#444");
  tt.append("tspan").text("Total: ");
  tt.append("tspan").attr("font-weight", "bold").text(valueFmt(total));

  const bb = tipBody.node().getBBox();
  tipBody.select("line").attr("x2", bb.width);
  tipBody.attr("transform", `translate(${tipPadX - bb.x},${tipPadY - bb.y})`);
  tipRect.attr("width", bb.width + 2 * tipPadX).attr("height", bb.height + 2 * tipPadY);
  return { w: bb.width + 2 * tipPadX, h: bb.height + 2 * tipPadY };
}

let tipSize = { w: 0, h: 0 };

function nearestIndex(mx) {
  const xv = xScale.invert(mx);
  const v = +xv;
  let i = d3.bisectLeft(xs, v);
  if (i >= nX) i = nX - 1;
  if (i > 0 && (v - xs[i - 1]) < (xs[i] - v)) i -= 1;
  return i;
}

function showCrosshair(mx, my) {
  const i = nearestIndex(Math.max(0, Math.min(chartW, mx)));
  const cx = xScale(xs[i]);
  crosshair.attr("x1", cx).attr("x2", cx).style("opacity", 1);

  if (i !== tipIndex || focusKey !== tipFocus) {
    tipSize = buildTip(i);
    tipIndex = i; tipFocus = focusKey;
  }
  const px = margin.left + cx;
  let tx = px + 14;
  if (tx + tipSize.w > width - 2) tx = px - 14 - tipSize.w;
  tx = Math.max(2, tx);
  let ty = margin.top + my - tipSize.h / 2;
  ty = Math.max(2, Math.min(ty, height - tipSize.h - 2));
  tip.attr("transform", `translate(${tx},${ty})`).raise();
  tip.interrupt("tip").style("opacity", 1);
}

function hideCrosshair() {
  crosshair.style("opacity", 0);
  tip.interrupt("tip").transition("tip").duration(150).style("opacity", 0);
  tipIndex = -1;
}

// --------------------------------------------------------------- focus --
function setFocus(key) {
  if (key && hidden.has(key)) key = null;
  if (key === focusKey) return;
  focusKey = key;
  paths.interrupt("focus").transition("focus").duration(180)
    .attr("fill-opacity", s => {
      if (hidden.has(s.key)) return 0;
      if (!focusKey) return opacity;
      return s.key === focusKey ? Math.min(1, opacity + 0.1) : opacity * 0.25;
    });
  if (showLabels) {
    labelText.interrupt("fade").transition("fade").duration(180)
      .style("opacity", function () { return labelBaseOpacity(this); });
  }
  if (legendOn) {
    legendItems.transition("focus").duration(180)
      .style("opacity", d => !focusKey || d === focusKey || hidden.has(d) ? 1 : 0.45);
  }
}

if (hoverOn) {
  paths.style("cursor", "pointer")
    .on("mouseenter", function (a, b) { setFocus(evArgs(a, b).d.key); });
}

plot
  .on("mousemove", function (a, b) {
    const ev = evArgs(a, b).event;
    if (!tooltipOn || !ev) return;
    const pt = pointerIn(ev, plot.node());
    showCrosshair(pt[0], pt[1]);
  })
  .on("mouseleave", function () {
    if (hoverOn) setFocus(null);
    if (tooltipOn) hideCrosshair();
  });

if (hoverOn) {
  plot.select("rect.stream-bg").on("mouseenter", function () { setFocus(null); });
}

// ---------------------------------------------------------- legend toggle --
function restack() {
  series = computeSeries();
  updateYDomain(series);
  paths.data(series, s => s.key)
    .interrupt("focus")
    .interrupt("shape").transition("shape").duration(650).ease(d3.easeCubicInOut)
    .attr("d", area)
    .attr("fill-opacity", s => {
      if (hidden.has(s.key)) return 0;
      return focusKey && s.key !== focusKey ? opacity * 0.25 : opacity;
    })
    .attr("stroke-opacity", s => hidden.has(s.key) ? 0 : 1);
  placeLabels(series, 650);
  tipIndex = -1;
}

if (legendOn) {
  legendItems
    .on("mouseenter", function (a, b) {
      if (hoverOn) setFocus(evArgs(a, b).d);
    })
    .on("mouseleave", function () {
      if (hoverOn) setFocus(null);
    })
    .on("click", function (a, b) {
      const key = evArgs(a, b).d;
      if (hidden.has(key)) {
        hidden.delete(key);
      } else {
        if (hidden.size >= groups.length - 1) return;   // keep one layer
        hidden.add(key);
        if (focusKey === key) focusKey = null;
      }
      d3.select(this).select("circle")
        .attr("fill", hidden.has(key) ? "#cccccc" : color(key));
      d3.select(this).select("text")
        .attr("fill", hidden.has(key) ? "#aaaaaa" : axisCol)
        .style("text-decoration", hidden.has(key) ? "line-through" : null);
      // Focus the clicked layer (if it is now visible) before re-stacking so
      // the shape transition animates straight to the final opacities.
      focusKey = hoverOn && !hidden.has(key) ? key : null;
      restack();
      legendItems.transition("focus").duration(180)
        .style("opacity", d => !focusKey || d === focusKey || hidden.has(d) ? 1 : 0.45);
    });
}

// ---------------------------------------------------------------- titles --
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", axisCol)
    .text(title)
    .each(function () {          // shrink a long title to fit narrow widgets
      const len = this.getComputedTextLength();
      if (len > width - 16) {
        d3.select(this).attr("font-size", Math.max(9, titleSize * (width - 16) / len));
      }
    });
}

if (xtitle) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", margin.top + chartH + axisH + xtitleSize)
    .attr("text-anchor", "middle")
    .attr("font-size", xtitleSize)
    .attr("font-family", fontFamily)
    .attr("fill", axisCol)
    .text(xtitle);
}

tip.raise();
