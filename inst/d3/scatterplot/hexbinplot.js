// hexbin_plot() — 2D hexagonal binning, inspired by Observable Plot's hexbin.
// d3-hexbin is not bundled with r2d3, so the binning and the hexagon path
// generator are implemented below (standard odd-row-offset, pointy-top grid).

const num = (v, dflt) => (v === null || v === undefined || v === "" || isNaN(+v)) ? dflt : +v;
const str = (v, dflt) => (typeof v === "string" && v.length) ? v : dflt;
const bool = (v, dflt) => (v === undefined || v === null) ? dflt : !!v;

const xName        = str(options.xName, "x");
const yName        = str(options.yName, "y");
const binR         = Math.max(1, num(options.binWidth, 12));
const sizeByCount  = bool(options.sizeByCount, false);
const paletteName  = str(options.colorPalette, "YlGnBu");
const reverseCols  = bool(options.reverseColors, false);
const scaleType    = str(options.colorScale, "linear");
const showLegend   = bool(options.legend, true);
const legendTitle  = typeof options.legendTitle === "string" ? options.legendTitle : "Count";
const tooltipOn    = bool(options.tooltip, true);
const hover        = bool(options.hover, true);
const animate      = bool(options.animate, true);
const opacity      = num(options.opacity, 1);
const strokeCol    = str(options.stroke, "white");
const strokeWidth  = num(options.strokeWidth, 0.5);
const showGrid     = bool(options.grid, true);
const gridCol      = str(options.gridCol, "#e5e5e5");
const xtitle       = typeof options.xtitle === "string" ? options.xtitle : null;
const ytitle       = typeof options.ytitle === "string" ? options.ytitle : null;
const xtitleSize   = num(options.xtitleFontSize, 13);
const ytitleSize   = num(options.ytitleFontSize, 13);
const title        = typeof options.title === "string" ? options.title : null;
const titleSize    = num(options.titleFontSize, 16);
const xFontSize    = num(options.xFontSize, 11);
const yFontSize    = num(options.yFontSize, 11);
const fontFamily   = str(options.font, "Verdana, Geneva, Tahoma, sans-serif");
const bgcol        = str(options.bgcol, "white");
const axisCol      = str(options.axisCol, "black");

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const points = (data || [])
  .map(d => ({ x: +d.x, y: +d.y }))
  .filter(d => isFinite(d.x) && isFinite(d.y));

if (!points.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for hexbin_plot()");
  return;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const uid = Math.random().toString(36).slice(2);

const titleOffset  = title ? titleSize + 12 : 0;
const legendBand   = showLegend ? 44 : 0;
const ytitleBand   = ytitle ? ytitleSize + 10 : 6;
const xtitleOffset = xtitle ? xtitleSize + 8 : 0;

const margin = {
  top:    8 + titleOffset + legendBand + ytitleBand,
  right:  18,
  bottom: 12 + xFontSize + 8 + xtitleOffset,
  left:   0                      // computed from the y tick labels below
};

const chartH = Math.max(height - margin.top - margin.bottom, 40);

// Pad a data extent so the outermost hexagons (about one radius wide) are
// not cut in half at the plot edges.
function paddedDomain(ext, pixels) {
  let lo = ext[0], hi = ext[1];
  if (lo === hi) { lo -= 1; hi += 1; }
  const usable = Math.max(pixels - 2 * binR, pixels * 0.5);
  const pad = (hi - lo) * (binR / usable);
  return [lo - pad, hi + pad];
}

const yScale = d3.scaleLinear()
  .domain(paddedDomain(d3.extent(points, d => d.y), chartH))
  .range([chartH, 0])
  .nice();

const yTickCount = Math.max(2, Math.round(chartH / 55));
const yTicks     = yScale.ticks(yTickCount);
const yFmt       = yScale.tickFormat(yTickCount);

function textWidth(strings, size) {
  const tmp = svg.append("g").attr("visibility", "hidden");
  let maxW = 0;
  strings.forEach(s => {
    const t = tmp.append("text")
      .attr("font-family", fontFamily).attr("font-size", size).text(s);
    let w = 0;
    try { w = t.node().getComputedTextLength(); } catch (e) { w = 0; }
    if (!w) w = String(s).length * size * 0.62;
    if (w > maxW) maxW = w;
  });
  tmp.remove();
  return maxW;
}

margin.left = Math.ceil(textWidth(yTicks.map(yFmt), yFontSize)) + 16;

const chartW = Math.max(width - margin.left - margin.right, 40);

const xScale = d3.scaleLinear()
  .domain(paddedDomain(d3.extent(points, d => d.x), chartW))
  .range([0, chartW])
  .nice();

const xTickCount = Math.max(2, Math.round(chartW / 85));

// ---------------------------------------------------------------------------
// Hexagonal binning (pixel space)
// ---------------------------------------------------------------------------
const dx = binR * 2 * Math.sin(Math.PI / 3);   // horizontal centre spacing
const dy = binR * 1.5;                         // vertical centre spacing

const binMap = new Map();
points.forEach(p => {
  const px0 = xScale(p.x), py0 = yScale(p.y);
  let py = py0 / dy, pj = Math.round(py);
  let px = px0 / dx - (pj & 1) / 2, pi = Math.round(px);
  const py1 = py - pj;

  // Near a row boundary the point may belong to the neighbouring row's hex:
  // pick the closer of the two candidate centres.
  if (Math.abs(py1) * 3 > 1) {
    const px1 = px - pi;
    const pi2 = pi + (px < pi ? -1 : 1) / 2;
    const pj2 = pj + (py < pj ? -1 : 1);
    const px2 = px - pi2;
    const py2 = py - pj2;
    if (px1 * px1 + py1 * py1 > px2 * px2 + py2 * py2) {
      pi = pi2 + (pj & 1 ? 1 : -1) / 2;
      pj = pj2;
    }
  }

  const key = pi + "," + pj;
  let bin = binMap.get(key);
  if (!bin) {
    bin = { i: pi, j: pj, cx: (pi + (pj & 1) / 2) * dx, cy: pj * dy, count: 0 };
    binMap.set(key, bin);
  }
  bin.count++;
});

const bins  = Array.from(binMap.values());
const total = points.length;
const maxCount = d3.max(bins, b => b.count);

// Data range covered by each hexagon (its bounding box in data units),
// clamped to the observed data extent so edge bins never report impossible
// values (e.g. a negative price).
const xExt = d3.extent(points, d => d.x), yExt = d3.extent(points, d => d.y);
const clampTo = (v, ext) => Math.max(ext[0], Math.min(ext[1], v));
bins.forEach(b => {
  const xa = xScale.invert(b.cx - dx / 2), xb = xScale.invert(b.cx + dx / 2);
  const ya = yScale.invert(b.cy + binR),   yb = yScale.invert(b.cy - binR);
  b.x0 = clampTo(Math.min(xa, xb), xExt); b.x1 = clampTo(Math.max(xa, xb), xExt);
  b.y0 = clampTo(Math.min(ya, yb), yExt); b.y1 = clampTo(Math.max(ya, yb), yExt);
});

// Hexagon path generator (pointy top), centred on the origin
function hexPath(r) {
  if (!(r > 0)) return "M0,0Z";
  let p = "";
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    p += (k ? "L" : "M") + (r * Math.sin(a)).toFixed(3) + "," + (-r * Math.cos(a)).toFixed(3);
  }
  return p + "Z";
}

// ---------------------------------------------------------------------------
// Color (and optional size) scales
// ---------------------------------------------------------------------------
const interp = d3["interpolate" + paletteName] || d3.interpolateYlGnBu;
// Keep the lightest end of the palette off pure white so single-point bins
// stay visible on a light background.
const LO = 0.12;
const adj = t => reverseCols ? (1 - LO) * (1 - t) : LO + (1 - LO) * t;

let norm;
if (scaleType === "log") {
  norm = d3.scaleLog().domain([1, Math.max(2, maxCount)]);
} else if (scaleType === "sqrt") {
  norm = d3.scaleSqrt().domain([0, Math.max(1, maxCount)]);
} else {
  norm = d3.scaleLinear().domain([0, Math.max(1, maxCount)]);
}
norm.range([0, 1]).clamp(true);

const colorOf = c => interp(adj(norm(c)));

const rScale = d3.scaleSqrt().domain([0, Math.max(1, maxCount)]).range([0, binR]);
const radiusOf = b => sizeByCount ? Math.max(rScale(b.count), Math.min(1.5, binR)) : binR;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const clipId = "hexbin-clip-" + uid;
g.append("clipPath").attr("id", clipId)
  .append("rect").attr("width", chartW).attr("height", chartH);

// Gridlines
if (showGrid) {
  const gridG = g.append("g").attr("class", "hexbin-grid").attr("pointer-events", "none");
  gridG.selectAll("line.gx")
    .data(xScale.ticks(xTickCount))
    .join("line").attr("class", "gx")
    .attr("x1", d => xScale(d)).attr("x2", d => xScale(d))
    .attr("y1", 0).attr("y2", chartH)
    .attr("stroke", gridCol).attr("stroke-width", 1);
  gridG.selectAll("line.gy")
    .data(yTicks)
    .join("line").attr("class", "gy")
    .attr("x1", 0).attr("x2", chartW)
    .attr("y1", d => yScale(d)).attr("y2", d => yScale(d))
    .attr("stroke", gridCol).attr("stroke-width", 1);
}

// X axis
g.append("g")
  .attr("class", "hexbin-x-axis")
  .attr("transform", `translate(0,${chartH})`)
  .call(d3.axisBottom(xScale).ticks(xTickCount).tickSize(5).tickSizeOuter(0))
  .call(ag => ag.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.5))
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size", xFontSize).attr("font-family", fontFamily).attr("fill", axisCol));

// Y axis
g.append("g")
  .attr("class", "hexbin-y-axis")
  .call(d3.axisLeft(yScale).ticks(yTickCount).tickSize(5).tickSizeOuter(0))
  .call(ag => ag.select(".domain").remove())
  .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.6))
  .call(ag => ag.selectAll(".tick text")
    .attr("font-size", yFontSize).attr("font-family", fontFamily).attr("fill", axisCol));

// Hexagons
const hexLayer = g.append("g")
  .attr("class", "hexbin-hexes")
  .attr("clip-path", `url(#${clipId})`);

// Draw sparse bins first so dense bins sit on top
bins.sort((a, b) => a.count - b.count);

const hexes = hexLayer.selectAll("path.hex")
  .data(bins)
  .join("path")
  .attr("class", "hex")
  .attr("transform", b => `translate(${b.cx},${b.cy})`)
  .attr("d", b => hexPath(animate ? 0 : radiusOf(b)))
  .attr("fill", b => colorOf(b.count))
  .attr("fill-opacity", opacity)
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth)
  .attr("stroke-linejoin", "round");

if (animate) {
  hexes.transition()
    .duration(550)
    .delay(b => (b.cx / chartW) * 450 + (b.cy / chartH) * 150)
    .ease(d3.easeCubicOut)
    .attrTween("d", function (b) {
      const r = radiusOf(b);
      return t => hexPath(r * t);
    });
}

// Hover outline (a separate overlay path, so hexagons never get re-ordered)
// A background-colored halo under the outline keeps it visible even when the
// hovered hexagon is as dark as the axis color.
const highlight = g.append("g")
  .attr("class", "hexbin-highlight")
  .attr("pointer-events", "none")
  .style("opacity", 0);
const highlightHalo = highlight.append("path")
  .attr("fill", "none")
  .attr("stroke", bgcol)
  .attr("stroke-width", 5)
  .attr("stroke-linejoin", "round");
const highlightLine = highlight.append("path")
  .attr("fill", "none")
  .attr("stroke", axisCol)
  .attr("stroke-width", 2)
  .attr("stroke-linejoin", "round");

// ---------------------------------------------------------------------------
// Color legend (continuous ramp)
// ---------------------------------------------------------------------------
let legendMarker = null, legendScale = null;
if (showLegend) {
  const legendW = Math.max(80, Math.min(220, chartW * 0.45));
  const barH    = 10;
  const lx      = margin.left + chartW - legendW;
  const ly      = 8 + titleOffset + 14;

  const gradId = "hexbin-grad-" + uid;
  const grad = svg.append("defs").append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");
  d3.range(0, 1.0001, 1 / 16).forEach(t => {
    grad.append("stop")
      .attr("offset", (t * 100).toFixed(2) + "%")
      .attr("stop-color", interp(adj(t)));
  });

  const lg = svg.append("g")
    .attr("class", "hexbin-legend")
    .attr("transform", `translate(${lx},${ly})`);

  lg.append("text")
    .attr("x", 0).attr("y", -5)
    .attr("font-family", fontFamily)
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .attr("fill", axisCol)
    .text(legendTitle);

  lg.append("rect")
    .attr("width", legendW).attr("height", barH)
    .attr("fill", `url(#${gradId})`);

  legendScale = norm.copy().range([0, legendW]);

  const nTicks = Math.max(2, Math.floor(legendW / 45));
  let ticks = legendScale.ticks(nTicks).filter(v => Number.isInteger(v));
  if (scaleType === "log") {
    ticks = ticks.filter(v => /^[125]0*$/.test(String(v)));
    if (ticks.length > nTicks + 1) ticks = ticks.filter(v => /^10*$/.test(String(v)));
  }
  if (!ticks.length) ticks = legendScale.domain();
  const cFmt = v => v >= 10000 ? d3.format("~s")(v) : d3.format(",d")(v);

  lg.append("g")
    .attr("transform", `translate(0,${barH})`)
    .call(d3.axisBottom(legendScale).tickValues(ticks).tickFormat(cFmt).tickSize(4).tickSizeOuter(0))
    .call(ag => ag.select(".domain").remove())
    .call(ag => ag.selectAll(".tick line").attr("stroke", axisCol).attr("y1", -barH))
    .call(ag => ag.selectAll(".tick text")
      .attr("font-size", 10).attr("font-family", fontFamily).attr("fill", axisCol));

  // Marker that points at the hovered hexagon's count
  legendMarker = lg.append("rect")
    .attr("x", -2).attr("y", -3)
    .attr("width", 4).attr("height", barH + 6)
    .attr("rx", 1)
    .attr("fill", axisCol)
    .attr("stroke", bgcol)
    .attr("stroke-width", 1)
    .attr("pointer-events", "none")
    .style("opacity", 0);
}

// ---------------------------------------------------------------------------
// Tooltip — an in-SVG group (not a body <div>) so it renders identically in
// standalone pages, R Markdown and pkgdown.
// ---------------------------------------------------------------------------
const tip = svg.append("g")
  .attr("class", "hexbin-tooltip")
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
const vFmt = d3.format(",.4~r");
const pFmt = v => v < 0.0001 ? "<0.01%" : d3.format(v < 0.01 ? ".2~%" : ".1%")(v);
const rangeTxt = (a, b) => a === b ? vFmt(a) : vFmt(a) + " – " + vFmt(b);

function showTip(b) {
  const lines = [
    { name: "Count", value: d3.format(",d")(b.count) },
    { name: "Share", value: pFmt(b.count / total) },
    { name: xName,   value: rangeTxt(b.x0, b.x1) },
    { name: yName,   value: rangeTxt(b.y0, b.y1) }
  ];

  tipText.selectAll("tspan").remove();
  lines.forEach((l, i) => {
    tipText.append("tspan")
      .attr("x", tipPadX)
      .attr("dy", i === 0 ? tipPadY + 11 : tipLineH)
      .attr("font-weight", "bold")
      .text(l.name + ": ");
    tipText.append("tspan")
      .attr("font-weight", "normal")
      .text(l.value);
  });

  const bb   = tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX).attr("y", bb.y - tipPadY)
    .attr("width", boxW).attr("height", boxH);

  const px   = margin.left + b.cx;
  const py   = margin.top  + b.cy;
  const yOff = bb.y - tipPadY;

  let tx = px + binR + 8;
  if (tx + boxW > width) tx = px - binR - 8 - boxW;   // flip to the left
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

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
if (hover || tooltipOn) {
  hexes
    .style("cursor", "pointer")
    .on("mouseover", function (event, b) {
      if (typeof d3.pointer !== "function") { b = event; event = d3.event; }   // D3 v5 signature
      if (hover) {
        const hp = hexPath(radiusOf(b) + 1.5);
        highlightHalo.attr("d", hp);
        highlightLine.attr("d", hp);
        highlight
          .attr("transform", `translate(${b.cx},${b.cy})`)
          .raise()
          .interrupt().style("opacity", 1);
        if (legendMarker) {
          legendMarker
            .attr("transform", `translate(${legendScale(Math.max(norm.domain()[0], b.count))},0)`)
            .interrupt().style("opacity", 1);
        }
      }
      if (tooltipOn) showTip(b);
    })
    .on("mouseout", function () {
      if (hover) {
        highlight.interrupt().transition().duration(150).style("opacity", 0);
        if (legendMarker) legendMarker.interrupt().transition().duration(150).style("opacity", 0);
      }
      if (tooltipOn) hideTip();
    });
}

// ---------------------------------------------------------------------------
// Titles (Observable Plot style: "↑ y" above the y axis, "x →" bottom right)
// ---------------------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", margin.left + chartW / 2)
    .attr("y", 8 + titleSize * 0.85)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", axisCol)
    .text(title);
}

if (ytitle) {
  svg.append("text")
    .attr("x", 4)
    .attr("y", margin.top - 10)
    .attr("text-anchor", "start")
    .attr("font-size", ytitleSize)
    .attr("font-family", fontFamily)
    .attr("fill", axisCol)
    .text("↑ " + ytitle);
}

if (xtitle) {
  svg.append("text")
    .attr("x", margin.left + chartW)
    .attr("y", height - 6)
    .attr("text-anchor", "end")
    .attr("font-size", xtitleSize)
    .attr("font-family", fontFamily)
    .attr("fill", axisCol)
    .text(xtitle + " →");
}
