const xCol        = options.x;
const groupCol    = options.group || null;
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

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse data
const points = data
  .map(d => ({
    value: +d[xCol],
    group: groupCol ? String(d[groupCol]) : "__single__"
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

// Points
g.append("g")
  .attr("clip-path", `url(#${clipId})`)
  .selectAll("circle")
  .data(simNodes)
  .join("circle")
  .attr("cx", d => d.x)
  .attr("cy", d => d.y)
  .attr("r",  radius)
  .attr("fill",         d => hasGroup ? colorScale(d.group) : col)
  .attr("fill-opacity", opacity)
  .attr("stroke",       strokeCol)
  .attr("stroke-width", strokeWidth);

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

// Y axis (group labels)
if (hasGroup) {
  g.append("g")
    .call(d3.axisLeft(yScale).tickSizeOuter(0).tickSize(0))
    .call(ag => ag.select(".domain").remove())
    .call(ag => ag.selectAll(".tick text")
      .attr("font-size",   yFontSize)
      .attr("font-family", fontFamily)
      .attr("fill",        axisCol)
      .attr("dx",          "-6"));
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
