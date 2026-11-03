const xCol        = options.x;
const groupCol    = options.group;
// r2d3 unboxes length-1 vectors, so normalize list-like options to arrays.
const toArray     = v => v == null ? [] : (Array.isArray(v) ? v : [v]);
const groupLevels = toArray(options.groupLevels).map(String);
const bwOption    = (typeof options.bandwidth === "number" && options.bandwidth > 0)
  ? options.bandwidth : null;
const kernelName  = options.kernel === "epanechnikov" ? "epanechnikov" : "gaussian";
const overlap     = (typeof options.overlap === "number" && options.overlap > 0)
  ? options.overlap : 1.5;
const fillOpt     = options.fill || "steelblue";
const fillOpacity = (typeof options.fillOpacity === "number") ? options.fillOpacity : 0.8;
const lineCol     = options.lineCol   || "#333333";
const lineWidth   = (typeof options.lineWidth === "number") ? options.lineWidth : 1;
const sortBy      = options.sort      || "none";   // "none" | "mean" | "median"
const stat        = options.stat      || "none";   // "none" | "mean" | "median"
const statCol     = options.statColor || "#d62728";
const hover       = options.hover === undefined ? true : options.hover;
const xtitle      = options.xtitle       || null;
const xtitleSize  = options.xtitleFontSize || 13;
const title       = options.title        || null;
const titleSize   = options.titleFontSize  || 16;
const xFontSize   = options.xFontSize    || 11;
const yFontSize   = options.yFontSize    || 11;
const fontFamily  = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol       = options.bgcol   || "white";
const axisCol     = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse data
const points = data
  .map(d => ({
    // `+null` is 0, so treat missing values explicitly before coercion
    value: (d[xCol] == null || d[xCol] === "") ? NaN : +d[xCol],
    group: (d[groupCol] == null || d[groupCol] === "NA") ? null : String(d[groupCol])
  }))
  .filter(d => isFinite(d.value) && d.group !== null);

if (!points.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for ridgeline_plot()");
  return;
}

// Split values by group (plain JS: d3.group is not available in every D3
// version r2d3 can load). Group order comes from R (factor levels or order of
// appearance); any group not listed there is appended in order of appearance.
const valuesByGroup = new Map();
groupLevels.forEach(gr => valuesByGroup.set(gr, []));
points.forEach(p => {
  if (!valuesByGroup.has(p.group)) valuesByGroup.set(p.group, []);
  valuesByGroup.get(p.group).push(p.value);
});

// Colors are assigned by the original group order so they stay attached to a
// group whatever the sorting.
const fillArray = Array.isArray(fillOpt) ? fillOpt : null;
let ridges = [];
let origIndex = 0;
valuesByGroup.forEach((vals, gr) => {
  const idx = origIndex++;
  if (!vals.length) return;
  const sorted = vals.slice().sort((a, b) => a - b);
  ridges.push({
    group:  gr,
    values: sorted,
    n:      sorted.length,
    mean:   d3.mean(sorted),
    median: d3.quantile(sorted, 0.5),
    fill:   fillArray ? fillArray[idx % fillArray.length] : fillOpt
  });
});

if (sortBy === "mean")   ridges.sort((a, b) => a.mean   - b.mean);
if (sortBy === "median") ridges.sort((a, b) => a.median - b.median);
ridges.forEach((r, i) => { r.index = i; });

// Bandwidth: user value, or a joint Silverman rule of thumb on the pooled
// data — identical to R's stats::bw.nrd0().
function bwNrd0(sortedVals) {
  const n = sortedVals.length;
  if (n < 2) return 1;
  const hi  = d3.deviation(sortedVals);
  const iqr = d3.quantile(sortedVals, 0.75) - d3.quantile(sortedVals, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (!(lo > 0)) lo = hi || Math.abs(sortedVals[0]) || 1;
  return 0.9 * lo * Math.pow(n, -0.2);
}

const pooled = points.map(p => p.value).sort((a, b) => a - b);
const bw     = bwOption || bwNrd0(pooled);

// Kernels are parameterised so that `bw` is the kernel's standard deviation,
// matching stats::density(). The Epanechnikov kernel then has support
// [-sqrt(5) * bw, sqrt(5) * bw].
const SQRT2PI = Math.sqrt(2 * Math.PI);
const epaA    = Math.sqrt(5) * bw;
const kernel  = kernelName === "epanechnikov"
  ? (u => { const t = u / epaA; return Math.abs(t) <= 1 ? 0.75 * (1 - t * t) / epaA : 0; })
  : (u => Math.exp(-0.5 * (u / bw) * (u / bw)) / (bw * SQRT2PI));
const reach   = kernelName === "epanechnikov" ? epaA : 4 * bw;

// Layout margins
const titleOffset  = title  ? titleSize + 14  : 0;
const xtitleOffset = xtitle ? xtitleSize + 10 : 0;

const margin = {
  top:    titleOffset + 10,
  right:  16,
  bottom: 28 + xtitleOffset,
  left:   Math.min(width * 0.26, 140)
};

const chartW = width  - margin.left - margin.right;
const chartH = height - margin.top  - margin.bottom;

// X scale: pooled range padded so tails are not chopped — the full kernel
// support for Epanechnikov, 3 bandwidths for Gaussian (as stats::density()).
const xPad   = kernelName === "epanechnikov" ? epaA : 3 * bw;
const xScale = d3.scaleLinear()
  .domain([pooled[0] - xPad, pooled[pooled.length - 1] + xPad])
  .range([0, chartW])
  .nice();

// Evaluate the KDE of each group on a common grid spanning the x domain
const nGrid  = 256;
const dom    = xScale.domain();
const grid   = d3.range(nGrid).map(i => dom[0] + (dom[1] - dom[0]) * i / (nGrid - 1));

ridges.forEach(r => {
  const vals = r.values;
  const n    = vals.length;
  let lo = 0;   // sliding window over the sorted values (only nearby points)
  r.density = grid.map(gx => {
    while (lo < n && vals[lo] < gx - reach) lo++;
    let s = 0;
    for (let j = lo; j < n && vals[j] <= gx + reach; j++) s += kernel(gx - vals[j]);
    return [gx, s / n];
  });
  r.peak = r.density.reduce((best, d) => d[1] > best[1] ? d : best, r.density[0]);
});

// Vertical layout: k baselines spaced by `step`; the tallest peak of the whole
// chart reaches `overlap` steps above its baseline.
const k       = ridges.length;
const step    = chartH / (k - 1 + overlap);
const ridgeH  = overlap * step;
const maxDens = d3.max(ridges, r => r.peak[1]) || 1;
const baseline = r => ridgeH + r.index * step;
const hScale  = d3.scaleLinear().domain([0, maxDens]).range([0, ridgeH]);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Clip so ridges never spill past the plotting area horizontally
const clipId = "ridgeline-clip-" + Math.random().toString(36).slice(2);
g.append("clipPath").attr("id", clipId)
  .append("rect")
  .attr("x", 0).attr("y", -margin.top)
  .attr("width", chartW).attr("height", chartH + margin.top);

// Subtle baseline grid lines
g.append("g").attr("class", "ridge-grid")
  .selectAll("line")
  .data(ridges)
  .join("line")
  .attr("x1", 0).attr("x2", chartW)
  .attr("y1", baseline).attr("y2", baseline)
  .attr("stroke", "#e6e6e6").attr("stroke-width", 1);

// Ridges, drawn top (back) to bottom (front)
const ridgeLayer = g.append("g").attr("clip-path", `url(#${clipId})`);

const ridgeG = ridgeLayer.selectAll("g.ridge")
  .data(ridges)
  .join("g")
  .attr("class", "ridge")
  .attr("data-group", d => d.group)
  .attr("transform", d => `translate(0,${baseline(d)})`);

const area = d3.area()
  .x(d => xScale(d[0]))
  .y0(0)
  .y1(d => -hScale(d[1]))
  .curve(d3.curveMonotoneX);

const line = d3.line()
  .x(d => xScale(d[0]))
  .y(d => -hScale(d[1]))
  .curve(d3.curveMonotoneX);

ridgeG.append("path")
  .attr("class", "ridge-area")
  .attr("d", d => area(d.density))
  .attr("fill", d => d.fill)
  .attr("fill-opacity", fillOpacity)
  .attr("stroke", "none");

ridgeG.append("path")
  .attr("class", "ridge-line")
  .attr("d", d => line(d.density))
  .attr("fill", "none")
  .attr("stroke", lineCol)
  .attr("stroke-width", lineWidth)
  .attr("pointer-events", "none");

// Density at an arbitrary x by linear interpolation on the grid
function densityAt(r, xv) {
  const pos = (xv - dom[0]) / (dom[1] - dom[0]) * (nGrid - 1);
  const i   = Math.max(0, Math.min(nGrid - 2, Math.floor(pos)));
  const t   = Math.max(0, Math.min(1, pos - i));
  return r.density[i][1] * (1 - t) + r.density[i + 1][1] * t;
}

// Statistical overlay — mean/median segment from baseline up to the curve
if (stat === "mean" || stat === "median") {
  ridgeG.append("line")
    .attr("class", "ridge-stat")
    .attr("x1", d => xScale(d[stat])).attr("x2", d => xScale(d[stat]))
    .attr("y1", 0)
    .attr("y2", d => -hScale(densityAt(d, d[stat])))
    .attr("stroke", statCol)
    .attr("stroke-width", 2)
    .attr("pointer-events", "none");
}

const fmt = d3.format(",.4~g");

// Group labels on the left, sitting just above each baseline
const labels = g.append("g").attr("class", "ridge-labels")
  .selectAll("text")
  .data(ridges)
  .join("text")
  .attr("x", -8)
  .attr("y", d => baseline(d) - 3)
  .attr("text-anchor", "end")
  .attr("font-size",   yFontSize)
  .attr("font-family", fontFamily)
  .attr("fill",        axisCol)
  .text(d => d.group);

// X axis
g.append("g")
  .attr("transform", `translate(0,${chartH})`)
  .call(d3.axisBottom(xScale).ticks(6).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   xFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

// Tooltip — an in-SVG group (not an HTML <div>) so it renders identically when
// the widget is embedded in R Markdown / pkgdown iframes.
const tip = svg.append("g")
  .attr("class", "ridgeline-tooltip")
  .style("pointer-events", "none")
  .style("opacity", 0);
const tipRect = tip.append("rect")
  .attr("rx", 4).attr("ry", 4)
  .attr("fill", "white")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 1);
const tipText = tip.append("text")
  .attr("font-family", fontFamily)
  .attr("font-size", 12)
  .attr("fill", "#222");

const tipPadX = 8, tipPadY = 6, tipLineH = 15;

function showTip(d) {
  const lines = [
    { name: null,     value: d.group },
    { name: "n",      value: d3.format(",")(d.n) },
    { name: "mean",   value: fmt(d.mean) }
  ];
  if (stat === "median") lines.push({ name: "median", value: fmt(d.median) });

  tipText.selectAll("tspan").remove();
  lines.forEach((l, i) => {
    const first = tipText.append("tspan")
      .attr("x", tipPadX)
      .attr("dy", i === 0 ? tipPadY + 11 : tipLineH)
      .attr("font-weight", "bold");
    if (l.name === null) {
      first.text(l.value);
    } else {
      first.text(l.name + ": ");
      tipText.append("tspan").attr("font-weight", "normal").text(l.value);
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

  // Anchor to the right of the ridge's peak, flipping/clamping to stay in view
  const px   = margin.left + xScale(d.peak[0]);
  const py   = margin.top  + baseline(d) - hScale(d.peak[1]);
  const yOff = bb.y - tipPadY;

  let tx = px + 10;
  if (tx + boxW > width) tx = px - 10 - boxW;
  tx = Math.max(2, tx);

  let ty = py - boxH / 2 - yOff;
  ty = Math.max(2 - yOff, Math.min(ty, height - boxH - 2 - yOff));

  tip.attr("transform", `translate(${tx},${ty})`)
    .raise()
    .interrupt()
    .transition().duration(120).style("opacity", 1);
}

function hideTip() {
  tip.interrupt().transition().duration(200).style("opacity", 0);
}

// Highlight one ridge (or none): raise it, dim the rest. Restoring re-orders
// the ridges in data order so the back-to-front stacking is recovered.
function focusRidge(grp) {
  if (grp === null) {
    ridgeG.order();
  } else {
    ridgeG.filter(d => d.group === grp).raise();
  }
  ridgeG.interrupt().transition().duration(150)
    .style("opacity", d => (grp === null || d.group === grp) ? 1 : 0.35);
  ridgeG.select(".ridge-area").interrupt().transition().duration(150)
    .attr("fill-opacity", d => (grp !== null && d.group === grp)
      ? Math.max(fillOpacity, 0.95) : fillOpacity);
  ridgeG.select(".ridge-line")
    .attr("stroke-width", d => (grp !== null && d.group === grp)
      ? lineWidth + 1 : lineWidth);
  labels
    .attr("font-weight", d => (grp !== null && d.group === grp) ? "bold" : "normal");
}

if (hover) {
  const onOver = function () {
    const d = d3.select(this).datum();
    focusRidge(d.group);
    showTip(d);
  };
  const onOut = function () {
    focusRidge(null);
    hideTip();
  };

  ridgeG.select(".ridge-area")
    .style("cursor", "pointer")
    .on("mouseover", onOver)
    .on("mouseout",  onOut);

  labels
    .style("cursor", "pointer")
    .style("user-select", "none")
    .on("mouseover", onOver)
    .on("mouseout",  onOut);
}

// Chart title
if (title) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", titleSize)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "bold")
    .attr("fill",         axisCol)
    .text(title);
}

// X axis title
if (xtitle) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", height - 6)
    .attr("text-anchor",  "middle")
    .attr("font-size",    xtitleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "normal")
    .attr("fill",         axisCol)
    .text(xtitle);
}
