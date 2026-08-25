const xCol        = options.x;
const groupCol    = options.group || null;
// Tooltip columns: user passes one column name or a vector of them. r2d3
// unboxes a length-1 vector to a plain string, so normalize to an array.
const labelColsRaw = options.tooltip;
const labelCols    = labelColsRaw == null ? []
  : (Array.isArray(labelColsRaw) ? labelColsRaw : [labelColsRaw]);
const col         = options.col          || "steelblue";
const colorPalette= options.colorPalette || "Tableau10";
const radius      = options.radius       || 4;
const opacity     = options.opacity      || 0.75;
const strokeCol   = options.stroke       || "white";
const strokeWidth = options.strokeWidth  || 0.5;
const xtitle      = options.xtitle       || null;
const xtitleSize  = options.xtitleFontSize || 13;
const title       = options.title        || null;
const titleSize   = options.titleFontSize  || 16;
const xFontSize   = options.xFontSize    || 11;
const yFontSize   = options.yFontSize    || 11;
const fontFamily  = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol       = options.bgcol   || "white";
const axisCol     = options.axisCol || "black";
// Interactivity toggles (default on, backward compatible)
const hover       = options.hover   === undefined ? true : options.hover;
const animate     = options.animate === undefined ? true : options.animate;
// Tooltip is shown only when the user supplied one or more tooltip columns.
const tooltipOn   = labelCols.length > 0;
const stat        = options.stat || "none";   // "none" | "mean" | "median"
const statCol     = options.statColor || "#d62728";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse data
const points = data
  .map(d => ({
    value: +d[xCol],
    group: groupCol ? String(d[groupCol]) : "__single__",
    labels: labelCols.map(c => ({ name: c, value: d[c] }))
  }))
  .filter(d => isFinite(d.value));

if (!points.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for beeswarm_plot()");
  return;
}

const hasGroup = groupCol !== null;
const groups   = Array.from(new Set(points.map(d => d.group)));

// Layout margins
const titleOffset  = title  ? titleSize + 14  : 0;
const xtitleOffset = xtitle ? xtitleSize + 10 : 0;
const leftMargin   = hasGroup
  ? Math.min(width * 0.26, 140)
  : radius + 10;

const margin = {
  top:    titleOffset + radius + 10,
  right:  radius + 16,
  bottom: 28 + xtitleOffset,
  left:   leftMargin
};

const chartW = width  - margin.left - margin.right;
const chartH = height - margin.top  - margin.bottom;

// X scale (numeric)
const xExtent = d3.extent(points, d => d.value);
const xPad    = (xExtent[1] - xExtent[0]) * 0.04 || 1;
const xScale  = d3.scaleLinear()
  .domain([xExtent[0] - xPad, xExtent[1] + xPad])
  .range([0, chartW])
  .nice();

// Y scale (groups or center)
const yScale = hasGroup
  ? d3.scaleBand().domain(groups).range([0, chartH]).padding(0.25)
  : null;

const getTargetY = d => hasGroup
  ? yScale(d.group) + yScale.bandwidth() / 2
  : chartH / 2;

// Color scale
const schemeKey   = "scheme" + colorPalette;
const colorScheme = d3[schemeKey] || d3.schemeCategory10;
const colorScale  = d3.scaleOrdinal(colorScheme).domain(groups);

// Force simulation — runs synchronously before drawing
const simNodes = points.map(d => Object.assign({}, d));

d3.forceSimulation(simNodes)
  .force("x", d3.forceX(d => xScale(d.value)).strength(1))
  .force("y", d3.forceY(d => getTargetY(d)).strength(hasGroup ? 1.2 : 0.04))
  .force("collide", d3.forceCollide(radius + 0.8))
  .stop()
  .tick(300);

// Drawing group
const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Clip path so points don't spill outside the chart area
const clipId = "beeswarm-clip-" + Math.random().toString(36).slice(2);
g.append("clipPath").attr("id", clipId)
  .append("rect").attr("width", chartW).attr("height", chartH);

// Group separator lines (subtle)
if (hasGroup) {
  groups.forEach(grp => {
    const lineY = yScale(grp) + yScale.bandwidth();
    if (lineY < chartH) {
      g.append("line")
        .attr("x1", 0).attr("x2", chartW)
        .attr("y1", lineY).attr("y2", lineY)
        .attr("stroke", "#e0e0e0").attr("stroke-width", 1);
    }
  });
}

const fmt = d3.format(",.4~g");

// Tooltip — rendered as an in-SVG group, NOT an HTML <div> appended to <body>.
// A body <div> works standalone but gets clipped or hidden when the widget is
// embedded in R Markdown / pkgdown (iframe body + external CSS/z-index).
// Keeping the tooltip inside the SVG makes it render identically everywhere.
let tip = null, tipRect = null, tipText = null;
if (tooltipOn) {
  tip = svg.append("g")
    .attr("class", "beeswarm-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  tipText = tip.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", 12)
    .attr("fill", "#222");
}

const tipPadX = 8, tipPadY = 6, tipLineH = 15;

// Show the tooltip anchored to the hovered point, showing only the user's
// columns (one "name: value" per line), flipping/clamping to stay in view.
function showTip(d) {
  if (!tooltipOn) return;

  tipText.selectAll("tspan").remove();
  d.labels.forEach((l, i) => {
    tipText.append("tspan")
      .attr("x", tipPadX)
      .attr("dy", i === 0 ? tipPadY + 11 : tipLineH)
      .attr("font-weight", "bold")
      .text(l.name + ": ");
    tipText.append("tspan")
      .attr("font-weight", "normal")
      .text(String(l.value));
  });

  const bb   = tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX)
    .attr("y", bb.y - tipPadY)
    .attr("width",  boxW)
    .attr("height", boxH);

  const px   = margin.left + d.x;
  const py   = margin.top  + d.y;
  const yOff = bb.y - tipPadY;

  let tx = px + radius + 8;
  if (tx + boxW > width) tx = px - radius - 8 - boxW;   // flip to the left
  tx = Math.max(2, tx);

  let ty = py - boxH / 2 - yOff;
  ty = Math.max(2 - yOff, Math.min(ty, height - boxH - 2 - yOff));

  tip.attr("transform", `translate(${tx},${ty})`)
    .raise()
    .interrupt()
    .transition().duration(120).style("opacity", 1);
}

function hideTip() {
  if (!tooltipOn) return;
  tip.interrupt().transition().duration(200).style("opacity", 0);
}

// Points
const circles = g.append("g")
  .attr("clip-path", `url(#${clipId})`)
  .selectAll("circle")
  .data(simNodes)
  .join("circle")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r",  animate ? 0 : radius)
  .attr("fill",         d => hasGroup ? colorScale(d.group) : col)
  .attr("fill-opacity", opacity)
  .attr("stroke",       strokeCol)
  .attr("stroke-width", strokeWidth);

// Entry animation — points grow into place, staggered left-to-right
if (animate) {
  circles.transition()
    .duration(500)
    .delay(d => (d.x / chartW) * 400)
    .attr("r", radius);
}

// Base fill-opacity for a point, respecting groups the user has toggled off.
// Only called from event handlers, so `hiddenGroups` (declared below) is set.
const baseOpacity = d => hiddenGroups.has(d.group) ? 0 : opacity;

// Reset every circle to its resting state. Called on mouseout so the swarm
// always returns to base even if a mouseout event was missed mid-transition.
function resetCircles() {
  circles.interrupt().transition().duration(200)
    .attr("r", radius)
    .attr("fill-opacity", baseOpacity)
    .attr("stroke", strokeCol)
    .attr("stroke-width", strokeWidth);
}

// Hover interactions — highlight the hovered point, dim the rest, show tooltip.
// Every handler recomputes ALL circles from scratch (self-healing) rather than
// tracking per-node state, so points can never get stuck enlarged.
if (hover || tooltipOn) {
  circles
    .style("cursor", hover ? "pointer" : null)
    .on("mouseover", function (event, d) {
      if (hover) {
        circles.interrupt().transition().duration(150)
          .attr("r",            dd => dd === d ? radius * 1.6 : radius)
          .attr("fill-opacity", dd => hiddenGroups.has(dd.group) ? 0
                                     : (dd === d ? 1 : opacity * 0.25))
          .attr("stroke",       dd => dd === d ? axisCol : strokeCol)
          .attr("stroke-width", dd => dd === d ? Math.max(strokeWidth, 1) : strokeWidth);
      }
      if (tooltipOn) showTip(d);
    })
    .on("mouseout", function () {
      if (hover) resetCircles();
      if (tooltipOn) hideTip();
    });
}

// Statistical overlay — a mean/median reference line per swarm
let statLayer = null;
if (stat === "mean" || stat === "median") {
  const reducer = stat === "mean" ? d3.mean : d3.median;
  const statData = groups.map(grp => {
    const vals = points.filter(p => p.group === grp).map(p => p.value);
    return { group: grp, value: reducer(vals) };
  }).filter(d => isFinite(d.value));

  statLayer = g.append("g").attr("class", "stat-layer");

  const statG = statLayer.selectAll("g.stat")
    .data(statData)
    .join("g")
    .attr("class", "stat")
    .attr("data-group", d => d.group);

  const yTop = d => hasGroup ? yScale(d.group) : 0;
  const yBot = d => hasGroup ? yScale(d.group) + yScale.bandwidth() : chartH;

  statG.append("line")
    .attr("x1", d => xScale(d.value)).attr("x2", d => xScale(d.value))
    .attr("y1", yTop).attr("y2", yBot)
    .attr("stroke", statCol)
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,3")
    .attr("pointer-events", "none");

  statG.append("text")
    .attr("x", d => xScale(d.value))
    .attr("y", d => yTop(d) + 11)
    .attr("text-anchor", "middle")
    .attr("font-size", Math.max(9, yFontSize - 1))
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", statCol)
    .attr("pointer-events", "none")
    .text(d => `${stat}: ${fmt(d.value)}`);
}

// Group interaction — highlight / toggle a whole swarm.
// Hidden groups persist across hovers via this set.
const hiddenGroups = new Set();

function applyGroupState(focusGroup) {
  circles.transition().duration(150)
    .attr("fill-opacity", d => {
      if (hiddenGroups.has(d.group)) return 0;
      if (focusGroup && d.group !== focusGroup) return opacity * 0.15;
      return opacity;
    });
  if (statLayer) {
    statLayer.selectAll("g.stat").transition().duration(150)
      .style("opacity", d =>
        hiddenGroups.has(d.group) ? 0 :
        (focusGroup && d.group !== focusGroup ? 0.15 : 1));
  }
}

function toggleGroup(grp) {
  if (hiddenGroups.has(grp)) hiddenGroups.delete(grp);
  else hiddenGroups.add(grp);
  applyGroupState(null);
}

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

// Y axis (group labels) — interactive: hover to focus a swarm, click to toggle it
if (hasGroup) {
  const yAxisG = g.append("g")
    .call(d3.axisLeft(yScale).tickSizeOuter(0).tickSize(0))
    .call(ag => ag.select(".domain").remove())
    .call(ag => ag.selectAll(".tick text")
      .attr("font-size",   yFontSize)
      .attr("font-family", fontFamily)
      .attr("fill",        axisCol)
      .attr("dx",          "-6"));

  if (hover) {
    yAxisG.selectAll(".tick text")
      .style("cursor", "pointer")
      .style("user-select", "none")
      .on("mouseover", function (event, grp) {
        if (!hiddenGroups.has(grp)) applyGroupState(grp);
      })
      .on("mouseout", function () {
        applyGroupState(null);
      })
      .on("click", function (event, grp) {
        toggleGroup(grp);
        d3.select(this)
          .attr("fill", hiddenGroups.has(grp) ? "#bbb" : axisCol)
          .style("text-decoration", hiddenGroups.has(grp) ? "line-through" : null);
      });
  }
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
    .attr("fill",         axisCol)
    .text(xtitle);
}
