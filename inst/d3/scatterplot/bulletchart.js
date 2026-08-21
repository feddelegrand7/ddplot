const value       = data;
const ranges      = options.ranges;       // array of upper bounds, ascending
const target      = options.target != null ? options.target : null;
const rangeColors = options.rangeColors;
const title       = options.title    || "";
const subtitle    = options.subtitle || "";
const minVal      = options.min      != null ? options.min : 0;
const valueColor  = options.valueColor  || "#1a1a2e";
const targetColor = options.targetColor || "#e63946";
const tickCount   = options.tickCount   || 5;
const fontSize    = options.fontSize    || 12;
const fontFamily  = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol       = options.bgcol || "white";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

const maxVal = ranges[ranges.length - 1];

// Layout
const titleAreaWidth = (title || subtitle)
  ? Math.min(width * 0.28, 130)
  : 10;
const margin = {
  top:    12,
  right:  16,
  bottom: 28,
  left:   titleAreaWidth + 12
};

const chartW = width  - margin.left - margin.right;
const chartH = height - margin.top  - margin.bottom;

const xScale = d3.scaleLinear()
  .domain([minVal, maxVal])
  .range([0, chartW]);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// --- Qualitative range bands (back layer) ---
const rangeBounds = [minVal, ...ranges];
for (let i = 0; i < ranges.length; i++) {
  g.append("rect")
    .attr("x",      xScale(rangeBounds[i]))
    .attr("y",      0)
    .attr("width",  xScale(ranges[i]) - xScale(rangeBounds[i]))
    .attr("height", chartH)
    .attr("fill",   rangeColors[i] || "#eee");
}

// --- Actual value bar (middle layer) ---
const barH = chartH * 0.38;
const barY = (chartH - barH) / 2;
const clampedValue = Math.min(Math.max(value, minVal), maxVal);

g.append("rect")
  .attr("x",      xScale(minVal))
  .attr("y",      barY)
  .attr("width",  xScale(clampedValue) - xScale(minVal))
  .attr("height", barH)
  .attr("fill",   valueColor)
  .attr("rx",     2);

// --- Target marker (front layer) ---
if (target !== null) {
  const markerH = chartH * 0.72;
  const markerY = (chartH - markerH) / 2;
  const markerW = Math.max(3, chartW * 0.007);
  const clampedTarget = Math.min(Math.max(target, minVal), maxVal);

  g.append("rect")
    .attr("x",      xScale(clampedTarget) - markerW / 2)
    .attr("y",      markerY)
    .attr("width",  markerW)
    .attr("height", markerH)
    .attr("fill",   targetColor);
}

// --- Axis ---
const axis = d3.axisBottom(xScale)
  .ticks(tickCount)
  .tickSizeOuter(0);

g.append("g")
  .attr("transform", `translate(0,${chartH})`)
  .call(axis)
  .call(ag => ag.select(".domain").attr("stroke", "#aaa"))
  .call(ag => ag.selectAll(".tick line").attr("stroke", "#aaa"))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   fontSize * 0.9)
    .attr("font-family", fontFamily)
    .attr("fill",        "#555"));

// --- Title and subtitle (left of chart) ---
if (title) {
  const titleX = margin.left - 10;
  const midY   = margin.top + chartH / 2;

  svg.append("text")
    .attr("x",                titleX)
    .attr("y",                subtitle ? midY - fontSize * 0.6 : midY)
    .attr("text-anchor",      "end")
    .attr("dominant-baseline","middle")
    .attr("font-size",        fontSize)
    .attr("font-weight",      "bold")
    .attr("font-family",      fontFamily)
    .attr("fill",             "#333")
    .text(title);

  if (subtitle) {
    svg.append("text")
      .attr("x",                titleX)
      .attr("y",                midY + fontSize * 0.8)
      .attr("text-anchor",      "end")
      .attr("dominant-baseline","middle")
      .attr("font-size",        fontSize * 0.82)
      .attr("font-family",      fontFamily)
      .attr("fill",             "#777")
      .text(subtitle);
  }
}
