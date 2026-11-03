// violin_plot() — mirrored kernel density per group, inspired by the look and
// feel of Plotly.js violin traces. Plain D3 (works with D3 v5 and v6).

const yCol        = options.y;
const groupCol    = options.group || null;
// r2d3 unboxes length-1 vectors, so normalize list-like options to arrays.
const toArray     = v => v == null ? [] : (Array.isArray(v) ? v : [v]);
const isNum       = v => typeof v === "number" && isFinite(v);
const groupLevels = toArray(options.groupLevels).map(String);
const bwOption    = (isNum(options.bandwidth) && options.bandwidth > 0) ? options.bandwidth : null;
const spanMode    = options.span  === "hard"  ? "hard"  : "soft";
const scaleMode   = options.scale === "count" ? "count" : "width";
const showBox     = options.box === undefined ? true : !!options.box;
const meanline    = !!options.meanline;
const pointsMode  = ["none", "outliers", "all"].indexOf(options.points) >= 0
  ? options.points : "outliers";
const jitter      = isNum(options.jitter)       ? Math.max(0, Math.min(1, options.jitter)) : 0.6;
const pointRadius = isNum(options.pointRadius)  && options.pointRadius > 0 ? options.pointRadius : 2.5;
const pointOpac   = isNum(options.pointOpacity) ? options.pointOpacity : 0.7;
const sortBy      = options.sort || "none";      // "none" | "mean" | "median"
const paletteOpt  = options.colorPalette || "Category10";
const fillOpacity = isNum(options.fillOpacity)  ? options.fillOpacity : 0.5;
const lineWidth   = isNum(options.lineWidth)    ? options.lineWidth : 1.5;
const violinFrac  = isNum(options.violinWidth)  && options.violinWidth > 0
  ? Math.min(1, options.violinWidth) : 0.8;
const hover       = options.hover   === undefined ? true : !!options.hover;
const animate     = options.animate === undefined ? true : !!options.animate;
const ytitle      = options.ytitle  || null;
const ytitleSize  = options.ytitleFontSize || 13;
const xtitle      = options.xtitle  || null;
const xtitleSize  = options.xtitleFontSize || 13;
const title       = options.title   || null;
const titleSize   = options.titleFontSize  || 16;
const xFontSize   = options.xFontSize || 11;
const yFontSize   = options.yFontSize || 11;
const fontFamily  = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol       = options.bgcol   || "white";
const axisCol     = options.axisCol || "black";
const gridCol     = options.gridCol || "#e6e6e6";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

const hasGroup = groupCol !== null;
const SINGLE   = "__single__";

// ---------------------------------------------------------------------------
// Parse data
// ---------------------------------------------------------------------------
const rows = data
  .map(d => ({
    // `+null` is 0, so treat missing values explicitly before coercion
    value: (d[yCol] == null || d[yCol] === "" || d[yCol] === "NA") ? NaN : +d[yCol],
    group: hasGroup
      ? ((d[groupCol] == null || d[groupCol] === "NA") ? null : String(d[groupCol]))
      : SINGLE
  }))
  .filter(d => isFinite(d.value) && d.group !== null);

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for violin_plot()");
  return;
}

// Split values by group (plain JS Map: d3.group is v6+ only). Order comes from
// R (factor levels / appearance); unknown groups are appended.
const valuesByGroup = new Map();
groupLevels.forEach(gr => valuesByGroup.set(gr, []));
rows.forEach(p => {
  if (!valuesByGroup.has(p.group)) valuesByGroup.set(p.group, []);
  valuesByGroup.get(p.group).push(p.value);
});

// ---------------------------------------------------------------------------
// Colors: a D3 scheme name, a single color, or one color per group (from R)
// ---------------------------------------------------------------------------
let colorFor;
if (Array.isArray(paletteOpt)) {
  colorFor = idx => paletteOpt[idx % paletteOpt.length];
} else {
  const scheme = d3["scheme" + paletteOpt];
  if (Array.isArray(scheme) && typeof scheme[0] === "string") {
    colorFor = idx => scheme[idx % scheme.length];
  } else if (d3.color(paletteOpt)) {
    colorFor = () => paletteOpt;
  } else {
    colorFor = idx => d3.schemeCategory10[idx % 10];
  }
}
const darker = (c, k) => { const col = d3.color(c); return col ? col.darker(k).toString() : c; };

// ---------------------------------------------------------------------------
// Summary statistics + bandwidth (Silverman, identical to stats::bw.nrd0())
// ---------------------------------------------------------------------------
function bwNrd0(sortedVals) {
  const n = sortedVals.length;
  if (n < 2) return NaN;
  const hi  = d3.deviation(sortedVals);
  const iqr = d3.quantile(sortedVals, 0.75) - d3.quantile(sortedVals, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (!(lo > 0)) lo = hi;
  if (!(lo > 0)) return NaN;
  return 0.9 * lo * Math.pow(n, -0.2);
}

const pooled   = rows.map(p => p.value).sort((a, b) => a - b);
const pooledBw = bwNrd0(pooled) ||
  0.9 * (Math.abs(pooled[0]) || 1) * Math.pow(pooled.length, -0.2);

let violins = [];
let origIndex = 0;
valuesByGroup.forEach((vals, gr) => {
  const idx = origIndex++;
  if (!vals.length) return;
  const s   = vals.slice().sort((a, b) => a - b);
  const n   = s.length;
  const q1  = d3.quantile(s, 0.25);
  const med = d3.quantile(s, 0.5);
  const q3  = d3.quantile(s, 0.75);
  const iqr = q3 - q1;
  const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
  // Whiskers reach the most extreme observations within the fences
  let wLo = s[0], wHi = s[n - 1];
  for (let i = 0; i < n; i++) { if (s[i] >= loF) { wLo = s[i]; break; } }
  for (let i = n - 1; i >= 0; i--) { if (s[i] <= hiF) { wHi = s[i]; break; } }
  const color = colorFor(idx);
  violins.push({
    group: gr, label: gr === SINGLE ? "" : gr,
    values: s, n: n,
    min: s[0], max: s[n - 1], q1: q1, median: med, q3: q3,
    mean: d3.mean(s), wLo: wLo, wHi: wHi,
    bw: bwOption || bwNrd0(s) || pooledBw,
    color: color, stroke: darker(color, 0.5)
  });
});

if (sortBy === "mean")   violins.sort((a, b) => a.mean   - b.mean);
if (sortBy === "median") violins.sort((a, b) => a.median - b.median);

// ---------------------------------------------------------------------------
// Kernel density (Gaussian) on a per-violin grid
// ---------------------------------------------------------------------------
const SQRT2PI = Math.sqrt(2 * Math.PI);
const nGrid   = 120;

violins.forEach(v => {
  const bw = v.bw;
  let lo = spanMode === "soft" ? v.min - 2 * bw : v.min;
  let hi = spanMode === "soft" ? v.max + 2 * bw : v.max;
  if (!(hi > lo)) { lo -= bw; hi += bw; }   // degenerate group (all values equal)
  v.spanLo = lo; v.spanHi = hi;

  const vals = v.values, n = v.n, reach = 4 * bw;
  let start = 0;   // sliding window over the sorted values (only nearby points)
  v.density = d3.range(nGrid).map(i => {
    const gy = lo + (hi - lo) * i / (nGrid - 1);
    while (start < n && vals[start] < gy - reach) start++;
    let sum = 0;
    for (let j = start; j < n && vals[j] <= gy + reach; j++) {
      const u = (gy - vals[j]) / bw;
      sum += Math.exp(-0.5 * u * u);
    }
    return [gy, sum / (n * bw * SQRT2PI)];
  });
  v.peak = d3.max(v.density, d => d[1]) || 1;
});

// Density at an arbitrary value by linear interpolation on the grid
function densityAt(v, val) {
  if (val < v.spanLo || val > v.spanHi) return 0;
  const pos = (val - v.spanLo) / (v.spanHi - v.spanLo) * (nGrid - 1);
  const i   = Math.max(0, Math.min(nGrid - 2, Math.floor(pos)));
  const t   = Math.max(0, Math.min(1, pos - i));
  return v.density[i][1] * (1 - t) + v.density[i + 1][1] * t;
}

// ---------------------------------------------------------------------------
// Text measurement (used to size the margins before the layout is built)
// ---------------------------------------------------------------------------
function measure(texts, fontSize) {
  const probe = svg.append("text")
    .attr("font-family", fontFamily).attr("font-size", fontSize)
    .style("visibility", "hidden");
  const widths = texts.map(t => {
    probe.text(t);
    const w = probe.node().getComputedTextLength ? probe.node().getComputedTextLength() : 0;
    return w > 0 ? w : String(t).length * fontSize * 0.6;
  });
  probe.remove();
  return widths;
}

const fmt = v => Math.abs(v) >= 1000 ? d3.format(",.1~f")(v) : d3.format(".4~g")(v);

// y domain: union of the violin spans
const yDomain = [d3.min(violins, v => v.spanLo), d3.max(violins, v => v.spanHi)];
const yScale  = d3.scaleLinear().domain(yDomain).nice(6);
const yTicks  = yScale.ticks(6);
const yTickFmt = yScale.tickFormat(6);
const yLabelW  = d3.max(measure(yTicks.map(yTickFmt), yFontSize)) || 20;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const titleOffset  = title  ? titleSize + 16  : 0;
const xtitleOffset = xtitle ? xtitleSize + 10 : 0;
const ytitleOffset = ytitle ? ytitleSize + 10 : 0;

const marginLeft  = 14 + ytitleOffset + yLabelW + 8;
const marginRight = 16;
const chartW0     = Math.max(40, width - marginLeft - marginRight);
const bandW0      = chartW0 / violins.length;

// Rotate group labels when they do not fit in their band
const labelWs   = hasGroup ? measure(violins.map(v => v.label), xFontSize) : [0];
const maxLabelW = d3.max(labelWs) || 0;
const rotate    = hasGroup && maxLabelW > bandW0 * 0.92;
const ANGLE     = 35;
const xLabelH   = !hasGroup ? 4
  : rotate ? maxLabelW * Math.sin(ANGLE * Math.PI / 180) + xFontSize + 12
  : xFontSize + 12;

const margin = {
  top:    titleOffset + 12,
  right:  marginRight,
  bottom: xLabelH + 8 + xtitleOffset,
  left:   marginLeft
};

const chartW = width  - margin.left - margin.right;
const chartH = Math.max(40, height - margin.top - margin.bottom);
yScale.range([chartH, 0]);

const xScale = d3.scaleBand()
  .domain(violins.map(v => v.group))
  .range([0, chartW])
  .paddingInner(0.05)
  .paddingOuter(0.05);

const halfMax = Math.max(4, Math.min(xScale.bandwidth() * violinFrac / 2, 170));
const center  = v => xScale(v.group) + xScale.bandwidth() / 2;

// Half-width of a violin for a density value
const countMax = d3.max(violins, v => v.peak * v.n) || 1;
const halfW = (v, dens) => scaleMode === "count"
  ? dens * v.n / countMax * halfMax
  : dens / v.peak * halfMax;

const boxHalf = Math.max(3, Math.min(halfMax * 0.14, 14));

// Deterministic jitter (mulberry32) so re-renders and resizes are stable
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

violins.forEach((v, vi) => {
  const rand = rng(1234 + vi * 7919);
  const pts  = pointsMode === "all" ? v.values
    : pointsMode === "outliers" ? v.values.filter(x => x < v.wLo || x > v.wHi)
    : [];
  v.points = pts.map(val => ({
    value: val,
    dx: (rand() * 2 - 1) * jitter * Math.max(0, halfW(v, densityAt(v, val)) - pointRadius * 0.5),
    v: v
  }));
});

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Horizontal grid lines
if (gridCol !== "none") {
  g.append("g").attr("class", "violin-grid")
    .selectAll("line")
    .data(yTicks)
    .join("line")
    .attr("x1", 0).attr("x2", chartW)
    .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
    .attr("stroke", gridCol).attr("stroke-width", 1);
}

// Violin outline: a vertical area from -w to +w, grid sorted by pixel y.
const violinPath = (v, k) => d3.area()
  .y(d => yScale(d[0]))
  .x0(d => -halfW(v, d[1]) * k)
  .x1(d =>  halfW(v, d[1]) * k)
  .curve(d3.curveCatmullRom)(v.density.slice().reverse());

const violinG = g.append("g").attr("class", "violins")
  .selectAll("g.violin")
  .data(violins)
  .join("g")
  .attr("class", "violin")
  .attr("data-group", d => d.group)
  .attr("transform", d => `translate(${center(d)},0)`);

const shapes = violinG.append("path")
  .attr("class", "violin-shape")
  .attr("d", d => violinPath(d, animate ? 0 : 1))
  .attr("fill", d => d.color)
  .attr("fill-opacity", fillOpacity)
  .attr("stroke", d => d.color)
  .attr("stroke-width", lineWidth)
  .attr("stroke-linejoin", "round");

if (animate) {
  shapes.transition()
    .duration(750)
    .delay((d, i) => i * 60)
    .ease(d3.easeCubicOut)
    .attrTween("d", d => t => violinPath(d, t));
}

// Inner box plot: whiskers, IQR box, median line
const innerG = violinG.append("g").attr("class", "violin-inner")
  .attr("pointer-events", "none");

if (showBox) {
  innerG.append("line")
    .attr("class", "violin-whisker")
    .attr("x1", 0).attr("x2", 0)
    .attr("y1", d => yScale(d.wLo)).attr("y2", d => yScale(d.wHi))
    .attr("stroke", d => d.stroke)
    .attr("stroke-width", 1.5);

  innerG.append("rect")
    .attr("class", "violin-box")
    .attr("x", -boxHalf)
    .attr("width", boxHalf * 2)
    .attr("y", d => yScale(d.q3))
    .attr("height", d => Math.max(1, yScale(d.q1) - yScale(d.q3)))
    .attr("rx", 1.5)
    .attr("fill", d => d.stroke)
    .attr("fill-opacity", 0.85)
    .attr("stroke", d => d.stroke)
    .attr("stroke-width", 1);

  innerG.append("line")
    .attr("class", "violin-median")
    .attr("x1", -boxHalf).attr("x2", boxHalf)
    .attr("y1", d => yScale(d.median)).attr("y2", d => yScale(d.median))
    .attr("stroke", "white")
    .attr("stroke-width", 2);
}

if (meanline) {
  innerG.append("line")
    .attr("class", "violin-mean")
    .attr("x1", d => -halfW(d, densityAt(d, d.mean)))
    .attr("x2", d =>  halfW(d, densityAt(d, d.mean)))
    .attr("y1", d => yScale(d.mean)).attr("y2", d => yScale(d.mean))
    .attr("stroke", d => d.stroke)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "5,3");
}

if (animate) {
  innerG.style("opacity", 0)
    .transition().duration(400).delay((d, i) => 450 + i * 60)
    .style("opacity", 1);
}

// Raw points (outliers or all), jittered inside the violin
const pointSel = violinG.append("g").attr("class", "violin-points")
  .selectAll("circle")
  .data(d => d.points)
  .join("circle")
  .attr("class", "violin-point")
  .attr("cx", d => d.dx)
  .attr("cy", d => yScale(d.value))
  .attr("r", pointRadius)
  .attr("fill", d => d.v.color)
  .attr("fill-opacity", animate ? 0 : pointOpac)
  .attr("stroke", d => d.v.stroke)
  .attr("stroke-opacity", animate ? 0 : 0.9)
  .attr("stroke-width", 0.6);

if (animate) {
  pointSel.transition().duration(400)
    .delay(d => 500 + Math.random() * 300)
    .attr("fill-opacity", pointOpac)
    .attr("stroke-opacity", 0.9);
}

// ---------------------------------------------------------------------------
// Axes
// ---------------------------------------------------------------------------
g.append("g")
  .attr("class", "violin-y-axis")
  .call(d3.axisLeft(yScale).tickValues(yTicks).tickFormat(yTickFmt).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   yFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

const labelOf = new Map(violins.map(v => [v.group, v.label]));
const xAxisG = g.append("g")
  .attr("class", "violin-x-axis")
  .attr("transform", `translate(0,${chartH})`)
  .call(d3.axisBottom(xScale).tickSize(hasGroup ? 5 : 0).tickSizeOuter(0)
    .tickFormat(gr => labelOf.get(gr)))
  .call(ag => ag.select(".domain").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   xFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

if (rotate) {
  xAxisG.selectAll(".tick text")
    .attr("text-anchor", "end")
    .attr("dy", "0.35em")
    .attr("transform", `translate(-4,8) rotate(-${ANGLE})`);
}

// ---------------------------------------------------------------------------
// Titles
// ---------------------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", titleSize + 4)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "bold")
    .attr("fill",         axisCol)
    .text(title);
}

if (xtitle) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", height - 6)
    .attr("text-anchor",  "middle")
    .attr("font-size",    xtitleSize)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(xtitle);
}

if (ytitle) {
  svg.append("text")
    .attr("transform", `translate(${12 + ytitleSize * 0.8},${margin.top + chartH / 2}) rotate(-90)`)
    .attr("text-anchor",  "middle")
    .attr("font-size",    ytitleSize)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(ytitle);
}

// ---------------------------------------------------------------------------
// Hover: spike line + y-axis value tag + in-SVG tooltip
// ---------------------------------------------------------------------------
if (hover) {
  // Spike line across the violin at the cursor, and a value tag on the y-axis
  const spike = g.append("g").attr("class", "violin-spike")
    .style("pointer-events", "none").style("display", "none");
  const spikeLine = spike.append("line")
    .attr("stroke", axisCol).attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,2").attr("stroke-opacity", 0.7);
  const spikeGuide = spike.append("line")
    .attr("stroke", axisCol).attr("stroke-width", 0.75)
    .attr("stroke-dasharray", "1,3").attr("stroke-opacity", 0.45);
  const tag = spike.append("g");
  const tagRect = tag.append("rect").attr("rx", 3).attr("ry", 3).attr("fill", axisCol);
  const tagText = tag.append("text")
    .attr("font-family", fontFamily).attr("font-size", Math.max(9, yFontSize - 1))
    .attr("fill", bgcol).attr("text-anchor", "start").attr("dy", "0.35em");

  // Tooltip — an in-SVG group (not an HTML <div>) so it renders identically
  // when the widget is embedded in R Markdown / pkgdown iframes.
  const tip = svg.append("g")
    .attr("class", "violin-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  const tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  const tipSwatch = tip.append("rect")
    .attr("width", 10).attr("height", 10).attr("rx", 2);
  const tipText = tip.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", 12)
    .attr("fill", "#222");

  const tipPadX = 8, tipPadY = 6, tipLineH = 15;
  let tipKey = null, tipBox = null;

  function buildTip(key, header, color, lines) {
    if (key === tipKey) return;
    tipKey = key;
    tipText.selectAll("tspan").remove();
    const indent = header !== null ? 16 : 0;
    let first = true;
    if (header !== null) {
      tipText.append("tspan")
        .attr("x", tipPadX + indent).attr("dy", tipPadY + 11)
        .attr("font-weight", "bold").attr("fill", darker(color, 0.8))
        .text(header);
      first = false;
    }
    lines.forEach(l => {
      tipText.append("tspan")
        .attr("x", tipPadX)
        .attr("dy", first ? tipPadY + 11 : tipLineH)
        .attr("font-weight", "bold")
        .attr("fill", "#222")
        .text(l.name + ": ");
      tipText.append("tspan").attr("font-weight", "normal").text(l.value);
      first = false;
    });
    const bb = tipText.node().getBBox();
    tipBox = { w: bb.width + 2 * tipPadX, h: bb.height + 2 * tipPadY, yOff: bb.y - tipPadY };
    tipRect
      .attr("x", bb.x - tipPadX).attr("y", bb.y - tipPadY)
      .attr("width", tipBox.w).attr("height", tipBox.h);
    tipSwatch
      .style("display", header !== null ? null : "none")
      .attr("x", tipPadX).attr("y", tipPadY + 2)
      .attr("fill", color).attr("fill-opacity", Math.max(fillOpacity, 0.6))
      .attr("stroke", darker(color, 0.5));
  }

  // Anchor the tooltip next to (ax, ay) in SVG coordinates, flipping/clamping
  // so it always stays in view.
  function placeTip(axRight, axLeft, ay) {
    let tx = axRight + 10;
    if (tx + tipBox.w > width - 2) tx = axLeft - 10 - tipBox.w;
    tx = Math.max(2, Math.min(tx, width - tipBox.w - 2));
    let ty = ay - tipBox.h / 2 - tipBox.yOff;
    ty = Math.max(2 - tipBox.yOff, Math.min(ty, height - tipBox.h - 2 - tipBox.yOff));
    tip.attr("transform", `translate(${tx},${ty})`).raise();
  }

  function showTip() {
    tip.interrupt().transition().duration(120).style("opacity", 1);
  }

  function hideAll() {
    tipKey = null;
    tip.interrupt().transition().duration(200).style("opacity", 0);
    spike.style("display", "none");
  }

  function focus(grp) {
    violinG.interrupt("focus").transition("focus").duration(150)
      .style("opacity", d => (grp === null || d.group === grp) ? 1 : 0.3);
    shapes.attr("fill-opacity", d => (grp !== null && d.group === grp)
      ? Math.min(1, fillOpacity + 0.2) : fillOpacity);
    xAxisG.selectAll(".tick text")
      .attr("font-weight", gr => (grp !== null && gr === grp) ? "bold" : "normal");
  }

  // D3 v6 calls listeners with (event, datum); v5 with (datum, index, nodes)
  // and exposes the event as d3.event. d3.pointer only exists from v6 on.
  const isV6 = typeof d3.pointer === "function";

  // Pointer position in the chart group's coordinates (D3 v6 & v5)
  function pointerIn(event, node) {
    return isV6 ? d3.pointer(event, node) : d3.mouse(node);
  }

  const statLines = v => [
    { name: "n",      value: d3.format(",")(v.n) },
    { name: "max",    value: fmt(v.max) },
    { name: "q3",     value: fmt(v.q3) },
    { name: "median", value: fmt(v.median) },
    { name: "q1",     value: fmt(v.q1) },
    { name: "min",    value: fmt(v.min) },
    { name: "mean",   value: fmt(v.mean) }
  ];

  violinG
    .style("cursor", "crosshair")
    .on("mouseenter", function (event, d) {
      if (!isV6) { d = event; event = d3.event; }
      focus(d.group);
    })
    .on("mousemove", function (event, d) {
      if (!isV6) { d = event; event = d3.event; }
      const [, my] = pointerIn(event, g.node());
      const cx  = center(d);
      const val = yScale.invert(my);

      // Spike line at the cursor, as wide as the violin at that value
      const w = halfW(d, densityAt(d, val));
      spike.style("display", null).raise();
      spikeLine.attr("x1", cx - w).attr("x2", cx + w).attr("y1", my).attr("y2", my);
      // Value tag just inside the y-axis, guide line from the tag to the violin
      tagText.attr("x", 8).attr("y", my).text(fmt(val));
      const tb = tagText.node().getBBox();
      spikeGuide.attr("x1", tb.x + tb.width + 4).attr("x2", Math.max(tb.x + tb.width + 4, cx - w))
        .attr("y1", my).attr("y2", my);
      tagRect.attr("x", tb.x - 4).attr("y", tb.y - 2)
        .attr("width", tb.width + 8).attr("height", tb.height + 4);

      const target = event && event.target;
      const pd = target && target.tagName && target.tagName.toLowerCase() === "circle"
        ? d3.select(target).datum() : null;
      if (pd) {
        buildTip("pt:" + d.group + ":" + pd.value + ":" + pd.dx,
          hasGroup ? d.label : null, d.color,
          [{ name: yCol, value: fmt(pd.value) }]);
        placeTip(margin.left + cx + pd.dx + pointRadius + 4,
                 margin.left + cx + pd.dx - pointRadius - 4,
                 margin.top + yScale(pd.value));
      } else {
        buildTip("v:" + d.group, hasGroup ? d.label : yCol, d.color, statLines(d));
        placeTip(margin.left + cx + halfMax, margin.left + cx - halfMax, margin.top + my);
      }
      showTip();
    })
    .on("mouseleave", function () {
      focus(null);
      hideAll();
    });

  pointSel
    .style("cursor", "pointer")
    .on("mouseover", function () {
      d3.select(this).attr("r", pointRadius * 1.8)
        .attr("fill-opacity", 1).attr("stroke-width", 1.2);
    })
    .on("mouseout", function () {
      d3.select(this).attr("r", pointRadius)
        .attr("fill-opacity", pointOpac).attr("stroke-width", 0.6);
    });
}
