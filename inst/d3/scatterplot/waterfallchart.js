const xCol         = options.x;
const yCol         = options.y;
const measureCol   = options.measure || null;
const positiveColor= options.positiveColor  || "#4CAF50";
const negativeColor= options.negativeColor  || "#F44336";
const totalColor   = options.totalColor     || "#5C85D6";
const drawConnector= options.connector !== false;
const connectorCol = options.connectorColor || "#aaaaaa";
const showLabels   = options.showLabels !== false;
const labelSize    = options.labelFontSize  || 10;
const title        = options.title          || null;
const titleSize    = options.titleFontSize  || 16;
const xtitle       = options.xtitle         || null;
const xtitleSize   = options.xtitleFontSize || 13;
const ytitle       = options.ytitle         || null;
const ytitleSize   = options.ytitleFontSize || 13;
const xFontSize    = options.xFontSize      || 11;
const yFontSize    = options.yFontSize      || 11;
const opacity      = options.opacity != null ? options.opacity : 1;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const axisCol      = options.axisCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// --- Compute waterfall positions ---
let cumulative = 0;
const rows = data.map(d => {
  const label   = String(d[xCol]);
  const value   = +d[yCol];
  const measure = measureCol ? String(d[measureCol]) : "relative";
  let start, end;

  if (measure === "total") {
    start = 0;
    end   = cumulative;
  } else {
    start      = cumulative;
    end        = cumulative + value;
    cumulative = end;
  }
  return { label, value, measure, start, end };
});

if (!rows.length) return;

// --- Layout ---
const titleOffset  = title  ? titleSize + 14  : 0;
const xtitleOffset = xtitle ? xtitleSize + 14 : 0;
const ytitleOffset = ytitle ? ytitleSize + 10 : 0;

const margin = {
  top:    titleOffset + 20,
  right:  20,
  bottom: 40 + xtitleOffset,
  left:   54 + ytitleOffset
};

const chartW = width  - margin.left - margin.right;
const chartH = height - margin.top  - margin.bottom;

// --- Scales ---
const allEnds  = rows.flatMap(d => [d.start, d.end]);
const yMin     = Math.min(0, ...allEnds);
const yMax     = Math.max(0, ...allEnds);
const yPad     = (yMax - yMin) * 0.12 || 10;

const xScale = d3.scaleBand()
  .domain(rows.map(d => d.label))
  .range([0, chartW])
  .padding(0.35);

const yScale = d3.scaleLinear()
  .domain([yMin - yPad, yMax + yPad])
  .range([chartH, 0])
  .nice();

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// --- Zero baseline ---
g.append("line")
  .attr("x1", 0).attr("x2", chartW)
  .attr("y1", yScale(0)).attr("y2", yScale(0))
  .attr("stroke", axisCol)
  .attr("stroke-width", 1)
  .attr("opacity", 0.35);

// --- Connector lines (dashed, drawn before bars so bars sit on top) ---
if (drawConnector) {
  for (let i = 0; i < rows.length - 1; i++) {
    const curr = rows[i];
    const x1   = xScale(curr.label) + xScale.bandwidth();
    const x2   = xScale(rows[i + 1].label);
    const lineY = yScale(curr.end);

    g.append("line")
      .attr("x1", x1).attr("x2", x2)
      .attr("y1", lineY).attr("y2", lineY)
      .attr("stroke",           connectorCol)
      .attr("stroke-width",     1)
      .attr("stroke-dasharray", "4,3");
  }
}

// --- Tooltip (HTML div, same pattern as parliament_chart) ---
const tooltip = d3.select("body")
  .append("div")
  .style("position",       "absolute")
  .style("padding",        "7px 11px")
  .style("background",     "white")
  .style("border",         "1px solid #ccc")
  .style("border-radius",  "5px")
  .style("font-family",    fontFamily)
  .style("font-size",      "12px")
  .style("pointer-events", "none")
  .style("box-shadow",     "0 2px 6px rgba(0,0,0,0.12)")
  .style("opacity",        0);

// --- Bars ---
const fmt = d3.format(",.2~f");

rows.forEach(d => {
  const bx   = xScale(d.label);
  const bw   = xScale.bandwidth();
  const yTop = yScale(Math.max(d.start, d.end));
  const bh   = Math.max(1, Math.abs(yScale(d.start) - yScale(d.end)));

  let fill;
  if (d.measure === "total")   fill = totalColor;
  else if (d.end >= d.start)   fill = positiveColor;
  else                         fill = negativeColor;

  // Bar — animated entry
  const bar = g.append("rect")
    .attr("x",      bx)
    .attr("width",  bw)
    .attr("y",      yScale(0))       // start at baseline
    .attr("height", 0)               // start collapsed
    .attr("fill",   fill)
    .attr("opacity", opacity)
    .attr("rx", 2);

  bar.transition()
    .duration(500)
    .delay((_, i) => rows.indexOf(d) * 60)
    .attr("y",      yTop)
    .attr("height", bh);

  // Hover interaction
  bar
    .style("cursor", "pointer")
    .on("mouseover", function(event) {
      d3.select(this)
        .transition().duration(80)
        .attr("opacity", Math.min(1, opacity + 0.2))
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);

      const sign    = d.end >= d.start ? "+" : "";
      const running = d.measure === "total" ? d.end : d.end;
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.label}</strong><br/>` +
          `Delta: <span style="color:${fill};font-weight:bold">${sign}${fmt(d.value)}</span><br/>` +
          `Total: ${fmt(running)}`
        );
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 14) + "px")
        .style("top",  (event.pageY - 36) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition().duration(120)
        .attr("opacity", opacity)
        .attr("stroke", "none");
      tooltip.style("opacity", 0);
    });

  // Value labels
  if (showLabels) {
    const isPositive = d.end >= d.start;
    const labelY     = isPositive ? yTop - 5 : yTop + bh + labelSize + 2;
    const prefix     = (d.measure === "relative" && isPositive) ? "+" : "";

    g.append("text")
      .attr("x",           bx + bw / 2)
      .attr("y",           labelY)
      .attr("text-anchor", "middle")
      .attr("font-size",   labelSize)
      .attr("font-family", fontFamily)
      .attr("fill",        axisCol)
      .attr("opacity",     0)
      .text(`${prefix}${fmt(d.value)}`)
      .transition()
      .duration(300)
      .delay(rows.indexOf(d) * 60 + 400)
      .attr("opacity", 1);
  }
});

// --- Axes ---
g.append("g")
  .attr("transform", `translate(0,${chartH})`)
  .call(d3.axisBottom(xScale).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   xFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

g.append("g")
  .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size",   yFontSize)
    .attr("font-family", fontFamily)
    .attr("fill",        axisCol));

// --- Chart title ---
if (title) {
  svg.append("text")
    .attr("x",            margin.left + chartW / 2)
    .attr("y",            titleSize)
    .attr("text-anchor",  "middle")
    .attr("font-size",    titleSize)
    .attr("font-family",  fontFamily)
    .attr("font-weight",  "bold")
    .attr("fill",         axisCol)
    .text(title);
}

// --- X axis title ---
if (xtitle) {
  svg.append("text")
    .attr("x",            margin.left + chartW / 2)
    .attr("y",            height - 6)
    .attr("text-anchor",  "middle")
    .attr("font-size",    xtitleSize)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(xtitle);
}

// --- Y axis title ---
if (ytitle) {
  svg.append("text")
    .attr("transform",    `translate(${ytitleSize},${margin.top + chartH / 2}) rotate(-90)`)
    .attr("text-anchor",  "middle")
    .attr("font-size",    ytitleSize)
    .attr("font-family",  fontFamily)
    .attr("fill",         axisCol)
    .text(ytitle);
}
