const startCol      = options.start;
const endCol        = options.end;
const groupCol      = options.group;
const startLabel    = typeof options.startLabel === "string" ? options.startLabel : String(startCol);
const endLabel      = typeof options.endLabel   === "string" ? options.endLabel   : String(endCol);
const byDirection   = options.colorByDirection !== false;
const upCol         = options.upCol    || "#1a9850";
const downCol       = options.downCol  || "#d73027";
const flatCol       = options.flatCol  || "#888888";
const lineCol       = options.lineCol  || "steelblue";
const highlightArr  = [].concat(Array.isArray(options.highlight) || typeof options.highlight === "string"
                                ? options.highlight : []).map(String);
const mutedCol      = options.mutedCol || "#cccccc";
const lineWidth     = options.lineWidth != null ? +options.lineWidth : 2;
const circleRadius  = options.circleRadius != null ? +options.circleRadius : 4;
const showValues    = options.showValues !== false;
const digits        = typeof options.digits === "number" ? options.digits : null;
const labelSize     = options.labelFontSize  || 11;
const headerSize    = options.headerFontSize || 13;
const title         = typeof options.title === "string" ? options.title : null;
const titleSize     = options.titleFontSize  || 16;
const fontFamily    = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol         = options.bgcol   || "white";
const axisCol       = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// Parse rows
const rows = (data || [])
  .map(d => ({
    group: String(d[groupCol]),
    start: (d[startCol] === null || d[startCol] === undefined || d[startCol] === "NA") ? NaN : +d[startCol],
    end:   (d[endCol]   === null || d[endCol]   === undefined || d[endCol]   === "NA") ? NaN : +d[endCol]
  }))
  .filter(d => isFinite(d.start) && isFinite(d.end));

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for slope_chart()");
  return;
}

const hasHighlight = highlightArr.length > 0;
const isHighlighted = d => !hasHighlight || highlightArr.indexOf(d.group) !== -1;

const fmt = v => digits !== null ? v.toFixed(digits) : String(+v.toPrecision(12));

function lineColor(d) {
  if (!isHighlighted(d)) return mutedCol;
  if (!byDirection) return lineCol;
  if (d.end > d.start) return upCol;
  if (d.end < d.start) return downCol;
  return flatCol;
}

function labelColor(d) {
  return (hasHighlight && isHighlighted(d)) ? lineColor(d) : axisCol;
}

// Non-highlighted labels stay readable but recede
const labelOpacity = d => isHighlighted(d) ? 1 : 0.45;

const leftText  = d => showValues ? d.group + "  " + fmt(d.start) : d.group;
const rightText = d => showValues ? fmt(d.end) + "  " + d.group : d.group;

// Measure label widths (fallback to an estimate if measurement is unavailable)
function measure(strings) {
  const tmp = svg.append("g").attr("visibility", "hidden");
  let maxW = 0;
  strings.forEach(s => {
    const t = tmp.append("text")
      .attr("font-family", fontFamily)
      .attr("font-size", labelSize)
      .text(s);
    let w = 0;
    try { w = t.node().getComputedTextLength(); } catch (e) { w = 0; }
    if (!w) w = s.length * labelSize * 0.62;
    if (w > maxW) maxW = w;
  });
  tmp.remove();
  return maxW;
}

// Bold labels (highlight / hover) are wider than the measured regular text
const boldFactor = 1.12;
const leftW  = measure(rows.map(leftText))  * boldFactor;
const rightW = measure(rows.map(rightText)) * boldFactor;
const labelPad = circleRadius + 6;

// Margins
const titleOffset  = title ? titleSize + 14 : 0;
const headerOffset = headerSize + 16;

const margin = {
  top:    titleOffset + headerOffset + 8,
  right:  Math.min(rightW + labelPad + 10, width * 0.4),
  bottom: Math.max(labelSize, 12),
  left:   Math.min(leftW + labelPad + 10, width * 0.4)
};

const chartW = Math.max(width  - margin.left - margin.right, 40);
const chartH = Math.max(height - margin.top  - margin.bottom, 40);

// Shared vertical scale for both axes
const allValues = rows.reduce((acc, d) => acc.concat([d.start, d.end]), []);
const yExtent   = d3.extent(allValues);
const yPad      = (yExtent[1] - yExtent[0]) * 0.03 || 1;

const yScale = d3.scaleLinear()
  .domain([yExtent[0] - yPad, yExtent[1] + yPad])
  .range([chartH, 0]);

// Label collision avoidance: keep labels at least `gap` pixels apart while
// staying as close as possible to their true positions and inside [0, chartH]
const gap = labelSize + 2;

function placeLabels(items) {
  const sorted = items.slice().sort((a, b) => a.y - b.y);
  // Group labels into clusters; each cluster is centred on the mean of its
  // members' true positions. Merge neighbouring clusters while they overlap.
  let clusters = sorted.map(it => ({ items: [it], sum: it.y, top: it.y }));
  let merged = true;
  while (merged) {
    merged = false;
    const next = [];
    clusters.forEach(c => {
      const prev = next[next.length - 1];
      if (prev && prev.top + prev.items.length * gap > c.top) {
        prev.items = prev.items.concat(c.items);
        prev.sum += c.sum;
        prev.top = prev.sum / prev.items.length - (prev.items.length - 1) * gap / 2;
        merged = true;
      } else {
        next.push(c);
      }
    });
    clusters = next;
  }
  clusters.forEach(c => {
    c.items.forEach((it, i) => { it.ly = c.top + i * gap; });
  });
  // Keep inside the chart: push down from the top, then up from the bottom
  const lo = -gap / 2;
  const hi = chartH + gap / 2;
  for (let i = 0; i < sorted.length; i++) {
    const min = i === 0 ? lo : sorted[i - 1].ly + gap;
    if (sorted[i].ly < min) sorted[i].ly = min;
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    const max = i === sorted.length - 1 ? hi : sorted[i + 1].ly - gap;
    if (sorted[i].ly > max) sorted[i].ly = max;
  }
  return sorted;
}

const nodes = rows.map((d, i) => ({
  d: d,
  idx: i,
  y1: yScale(d.start),
  y2: yScale(d.end)
}));

const leftPos  = placeLabels(nodes.map(n => ({ n: n, y: n.y1 })));
const rightPos = placeLabels(nodes.map(n => ({ n: n, y: n.y2 })));
leftPos.forEach(p  => { p.n.ly1 = p.ly; });
rightPos.forEach(p => { p.n.ly2 = p.ly; });

// Draw muted categories first so highlighted ones sit on top
nodes.sort((a, b) => (isHighlighted(a.d) ? 1 : 0) - (isHighlighted(b.d) ? 1 : 0));

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Vertical axes
[0, chartW].forEach(x => {
  g.append("line")
    .attr("class", "slope-axis")
    .attr("x1", x).attr("x2", x)
    .attr("y1", -6).attr("y2", chartH + 6)
    .attr("stroke", axisCol)
    .attr("stroke-opacity", 0.35)
    .attr("stroke-width", 1);
});

// Axis headers
g.append("text")
  .attr("class", "slope-header")
  .attr("x", 0).attr("y", -headerOffset + headerSize / 2)
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-size", headerSize)
  .attr("font-weight", "bold")
  .attr("fill", axisCol)
  .text(startLabel);

g.append("text")
  .attr("class", "slope-header")
  .attr("x", chartW).attr("y", -headerOffset + headerSize / 2)
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-size", headerSize)
  .attr("font-weight", "bold")
  .attr("fill", axisCol)
  .text(endLabel);

const baseOpacity = n => (hasHighlight && !isHighlighted(n.d)) ? 0.8 : 1;

const series = g.selectAll(".slope-series")
  .data(nodes)
  .join("g")
  .attr("class", "slope-series")
  .attr("opacity", baseOpacity)
  .style("cursor", "pointer");

// Native tooltip
series.append("title")
  .text(n => {
    const diff = n.d.end - n.d.start;
    return n.d.group + ": " + fmt(n.d.start) + " → " + fmt(n.d.end) +
      " (" + (diff > 0 ? "+" : "") + fmt(diff) + ")";
  });

// Wide invisible hit area for easier hovering
series.append("line")
  .attr("class", "slope-hit")
  .attr("x1", 0).attr("x2", chartW)
  .attr("y1", n => n.y1).attr("y2", n => n.y2)
  .attr("stroke", "transparent")
  .attr("stroke-width", Math.max(lineWidth + 8, 10));

series.append("line")
  .attr("class", "slope-line")
  .attr("x1", 0).attr("x2", chartW)
  .attr("y1", n => n.y1).attr("y2", n => n.y2)
  .attr("stroke", n => lineColor(n.d))
  .attr("stroke-width", n => (hasHighlight && isHighlighted(n.d)) ? lineWidth * 1.5 : lineWidth)
  .attr("stroke-linecap", "round");

if (circleRadius > 0) {
  series.append("circle")
    .attr("class", "slope-dot-start")
    .attr("cx", 0).attr("cy", n => n.y1)
    .attr("r", circleRadius)
    .attr("fill", n => lineColor(n.d));

  series.append("circle")
    .attr("class", "slope-dot-end")
    .attr("cx", chartW).attr("cy", n => n.y2)
    .attr("r", circleRadius)
    .attr("fill", n => lineColor(n.d));
}

// Labels
series.append("text")
  .attr("class", "slope-label-start")
  .attr("x", -labelPad)
  .attr("y", n => n.ly1)
  .attr("dy", "0.35em")
  .attr("text-anchor", "end")
  .attr("font-family", fontFamily)
  .attr("font-size", labelSize)
  .attr("font-weight", n => (hasHighlight && isHighlighted(n.d)) ? "bold" : "normal")
  .attr("fill", n => labelColor(n.d))
  .attr("fill-opacity", n => labelOpacity(n.d))
  .text(n => leftText(n.d));

series.append("text")
  .attr("class", "slope-label-end")
  .attr("x", chartW + labelPad)
  .attr("y", n => n.ly2)
  .attr("dy", "0.35em")
  .attr("text-anchor", "start")
  .attr("font-family", fontFamily)
  .attr("font-size", labelSize)
  .attr("font-weight", n => (hasHighlight && isHighlighted(n.d)) ? "bold" : "normal")
  .attr("fill", n => labelColor(n.d))
  .attr("fill-opacity", n => labelOpacity(n.d))
  .text(n => rightText(n.d));

// Hover: emphasise one line, fade the others.
// Uses `this` rather than event arguments so it works with D3 v5 and v6.
series
  .on("mouseover", function() {
    const self = this;
    series.attr("opacity", function() { return this === self ? 1 : 0.12; });
    const sel = d3.select(self);
    const n = sel.datum();
    sel.raise();
    sel.select(".slope-line")
      .attr("stroke", byDirection
        ? (n.d.end > n.d.start ? upCol : (n.d.end < n.d.start ? downCol : flatCol))
        : lineCol)
      .attr("stroke-width", lineWidth * 1.8);
    sel.selectAll("circle")
      .attr("fill", byDirection
        ? (n.d.end > n.d.start ? upCol : (n.d.end < n.d.start ? downCol : flatCol))
        : lineCol);
    sel.selectAll("text").attr("font-weight", "bold").attr("fill", axisCol).attr("fill-opacity", 1);
  })
  .on("mouseout", function() {
    series.attr("opacity", baseOpacity);
    const sel = d3.select(this);
    const n = sel.datum();
    sel.select(".slope-line")
      .attr("stroke", lineColor(n.d))
      .attr("stroke-width", (hasHighlight && isHighlighted(n.d)) ? lineWidth * 1.5 : lineWidth);
    sel.selectAll("circle").attr("fill", lineColor(n.d));
    sel.selectAll("text")
      .attr("font-weight", (hasHighlight && isHighlighted(n.d)) ? "bold" : "normal")
      .attr("fill", labelColor(n.d))
      .attr("fill-opacity", labelOpacity(n.d));
    // Restore draw order: muted lines behind highlighted ones
    series.filter(m => isHighlighted(m.d)).raise();
  });

// Chart title
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize)
    .attr("text-anchor", "middle")
    .attr("font-size",   titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill",        axisCol)
    .text(title);
}
