const x1Col        = options.x1;
const x2Col        = options.x2;
const yCol         = options.y;
const x1Label      = options.x1Label || x1Col;
const x2Label      = options.x2Label || x2Col;
const col1         = options.col1         || "steelblue";
const col2         = options.col2         || "crimson";
const lineCol      = options.lineCol      || "#aaaaaa";
const lineWidth    = options.lineWidth    || 2;
const circleRadius = options.circleRadius || 6;
const sortOrder    = options.sort         || "none";
const xtitle       = options.xtitle       || null;
const xtitleSize   = options.xtitleFontSize || 13;
const title        = options.title        || null;
const titleSize    = options.titleFontSize  || 16;
const xFontSize    = options.xFontSize    || 11;
const yFontSize    = options.yFontSize    || 11;
const showLegend   = options.legend !== false;
const legendSize   = options.legendFontSize || 11;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const axisCol      = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse and optionally sort rows
let rows = data
  .map(d => ({
    y:  String(d[yCol]),
    x1: +d[x1Col],
    x2: +d[x2Col]
  }))
  .filter(d => isFinite(d.x1) && isFinite(d.x2));

if (sortOrder === "ascending")  rows.sort((a, b) => a.x1 - b.x1);
if (sortOrder === "descending") rows.sort((a, b) => b.x1 - a.x1);

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for dumbbell_chart()");
  return;
}

const yDomain = rows.map(d => d.y);

// Legend height reservation
const legendH = showLegend ? legendSize + 16 : 0;

// Margins
const titleOffset  = title  ? titleSize + 14  : 0;
const xtitleOffset = xtitle ? xtitleSize + 10 : 0;

const margin = {
  top:    titleOffset + legendH + 14,
  right:  circleRadius + 20,
  bottom: 28 + xtitleOffset,
  left:   Math.min(width * 0.28, 160)
};

const chartW = width  - margin.left - margin.right;
const chartH = height - margin.top  - margin.bottom;

// Scales
const allValues = rows.flatMap(d => [d.x1, d.x2]);
const xExtent   = d3.extent(allValues);
const xPad      = (xExtent[1] - xExtent[0]) * 0.06 || 1;

const xScale = d3.scaleLinear()
  .domain([xExtent[0] - xPad, xExtent[1] + xPad])
  .range([0, chartW])
  .nice();

const yScale = d3.scaleBand()
  .domain(yDomain)
  .range([0, chartH])
  .padding(0.4);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Subtle horizontal grid lines aligned with each row
rows.forEach(d => {
  g.append("line")
    .attr("x1", 0).attr("x2", chartW)
    .attr("y1", yScale(d.y) + yScale.bandwidth() / 2)
    .attr("y2", yScale(d.y) + yScale.bandwidth() / 2)
    .attr("stroke", "#eeeeee")
    .attr("stroke-width", 1);
});

// Connecting lines
g.selectAll(".dumbbell-line")
  .data(rows)
  .join("line")
  .attr("class", "dumbbell-line")
  .attr("x1", d => xScale(d.x1))
  .attr("x2", d => xScale(d.x2))
  .attr("y1", d => yScale(d.y) + yScale.bandwidth() / 2)
  .attr("y2", d => yScale(d.y) + yScale.bandwidth() / 2)
  .attr("stroke",       lineCol)
  .attr("stroke-width", lineWidth);

// x1 dots (drawn first — sits behind x2)
g.selectAll(".dot-x1")
  .data(rows)
  .join("circle")
  .attr("class", "dot-x1")
  .attr("cx", d => xScale(d.x1))
  .attr("cy", d => yScale(d.y) + yScale.bandwidth() / 2)
  .attr("r",  circleRadius)
  .attr("fill", col1);

// x2 dots
g.selectAll(".dot-x2")
  .data(rows)
  .join("circle")
  .attr("class", "dot-x2")
  .attr("cx", d => xScale(d.x2))
  .attr("cy", d => yScale(d.y) + yScale.bandwidth() / 2)
  .attr("r",  circleRadius)
  .attr("fill", col2);

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

// Y axis
g.append("g")
  .call(d3.axisLeft(yScale).tickSizeOuter(0).tickSize(0))
  .call(ag => ag.select(".domain").remove())
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   yFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol)
    .attr("dx",          "-8"));

// Legend (top-left, inside chart area)
if (showLegend) {
  const legendY = titleOffset + 6;
  const dot1X   = margin.left;
  const dot2X   = margin.left + circleRadius * 2 + legendSize * 5;

  // x1 legend item
  svg.append("circle")
    .attr("cx", dot1X).attr("cy", legendY)
    .attr("r",  circleRadius * 0.8)
    .attr("fill", col1);

  svg.append("text")
    .attr("x", dot1X + circleRadius + 4)
    .attr("y", legendY)
    .attr("dominant-baseline", "middle")
    .attr("font-size",   legendSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol)
    .text(x1Label);

  // x2 legend item
  svg.append("circle")
    .attr("cx", dot2X).attr("cy", legendY)
    .attr("r",  circleRadius * 0.8)
    .attr("fill", col2);

  svg.append("text")
    .attr("x", dot2X + circleRadius + 4)
    .attr("y", legendY)
    .attr("dominant-baseline", "middle")
    .attr("font-size",   legendSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol)
    .text(x2Label);
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
