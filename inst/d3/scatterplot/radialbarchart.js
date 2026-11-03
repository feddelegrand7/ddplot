// radial_bar_chart() — concentric circular progress tracks.
// Look and feel inspired by the ApexCharts radialBar chart, written in plain
// D3 (v5/v6 compatible). Angles: degrees, clockwise from 12 o'clock.

const maxVal       = options.max != null ? +options.max : 100;
const startDeg     = options.startAngle != null ? +options.startAngle : 0;
const endDeg       = options.endAngle   != null ? +options.endAngle   : 270;
const userColors   = options.colors
  ? (Array.isArray(options.colors) ? options.colors : [options.colors])
  : null;
const trackCol     = options.trackCol || "#ececec";
const hollowFrac   = options.hollow  != null ? +options.hollow  : 0.35;
const ringGap      = options.ringGap != null ? +options.ringGap : 0.3;
const roundedCaps  = options.roundedCaps !== false;
const showLabels   = options.showLabels  !== false;
const showValues   = options.showValues  !== false;
const labelFontReq = options.labelFontSize || 12;
const centerMode   = options.centerValue || "average";
const centerLabel  = options.centerLabel != null ? String(options.centerLabel) : "";
const centerSizeReq= options.centerFontSize || null;
const valueFmtStr  = options.valueFormat || ",.0f";
const suffix       = options.suffix != null ? String(options.suffix) : "";
const hover        = options.hover   !== false;
const animate      = options.animate !== false;
const duration     = options.duration != null ? +options.duration : 1200;
const title        = options.title         || null;
const titleSize    = options.titleFontSize || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const textCol      = options.textCol || "#333333";

// Default palette (bright, saturated hues in the spirit of ApexCharts)
const defaultPalette = [
  "#008FFB", "#00E396", "#FEB019", "#FF4560", "#775DD0",
  "#3F51B5", "#26A69A", "#F86624", "#D4526E", "#546E7A"
];
const palette = userColors && userColors.length ? userColors : defaultPalette;

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

let fmtNum;
try {
  fmtNum = d3.format(valueFmtStr);
} catch (e) {
  fmtNum = d3.format(",.0f");
}
const fmt    = v => fmtNum(v) + suffix;
const pctFmt = d3.format(".1%");

// Rows: first row = outermost ring
const rows = data
  .map((d, i) => ({
    label: String(d.label),
    value: +d.value
  }))
  .filter(d => isFinite(d.value));

rows.forEach((d, i) => {
  d.index = i;
  d.color = palette[i % palette.length];
  d.frac  = Math.max(0, Math.min(1, d.value / maxVal));
});

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", textCol)
    .text("No data available for radial_bar_chart()");
  return;
}

const n      = rows.length;
const TAU    = 2 * Math.PI;
const a0     = startDeg * Math.PI / 180;
const a1     = endDeg   * Math.PI / 180;
const sweep  = Math.min(TAU, a1 - a0);
const isFull = sweep >= TAU - 1e-6;
const gapAng = TAU - sweep;

const uid = "radialbar-" + Math.random().toString(36).slice(2);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const pt = (r, a) => [r * Math.sin(a), -r * Math.cos(a)];

// Stroked circular arc path along radius r from angle s to e (clockwise).
// With reverse = true the same arc is drawn from e back to s.
function arcPath(r, s, e, reverse) {
  const span = e - s;
  if (!(span > 1e-6) || r <= 0) return "";
  if (span >= TAU - 1e-6) {
    const p0 = pt(r, s), p1 = pt(r, s + Math.PI);
    return `M${p0[0]},${p0[1]}A${r},${r} 0 1 1 ${p1[0]},${p1[1]}` +
           `A${r},${r} 0 1 1 ${p0[0]},${p0[1]}`;
  }
  const p0 = pt(r, s), p1 = pt(r, e);
  const large = span > Math.PI ? 1 : 0;
  if (reverse) {
    return `M${p1[0]},${p1[1]}A${r},${r} 0 ${large} 0 ${p0[0]},${p0[1]}`;
  }
  return `M${p0[0]},${p0[1]}A${r},${r} 0 ${large} 1 ${p1[0]},${p1[1]}`;
}

// Bounding box (unit circle) of the origin plus the outer arc over [s, e].
function unitBBox(s, e) {
  const xs = [0], ys = [0];
  const add = a => { const p = pt(1, a); xs.push(p[0]); ys.push(p[1]); };
  add(s); add(e);
  for (let k = Math.ceil(s / (Math.PI / 2)); k * Math.PI / 2 <= e; k++) {
    add(k * Math.PI / 2);
  }
  return { x0: d3.min(xs), x1: d3.max(xs), y0: d3.min(ys), y1: d3.max(ys) };
}

// Label placement: horizontal labels in the gap when the tracks start near
// 12 or 6 o'clock and the gap is wide; otherwise labels follow each track.
const cosA0 = Math.cos(a0);
const horizLabels = showLabels && !isFull && gapAng >= Math.PI / 3 &&
                    Math.abs(cosA0) > 0.85;
const curvedLabels = showLabels && !horizLabels;
// Direction in which horizontal labels extend (backwards along the tangent)
const labelDir = cosA0 > 0 ? -1 : 1;

const labelText = d => showValues ? `${d.label}: ${fmt(d.value)}` : d.label;

// Measure label widths once at the requested font size.
const measureText = svg.append("text")
  .attr("font-family", fontFamily)
  .attr("font-size", labelFontReq)
  .attr("font-weight", 600)
  .style("visibility", "hidden");
rows.forEach(d => {
  measureText.text(labelText(d));
  d.labelW = measureText.node().getComputedTextLength();
});
measureText.remove();

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const pad      = 10;
const titleOff = title ? titleSize + 16 : 0;
const availW   = Math.max(10, width  - 2 * pad);
const availH   = Math.max(10, height - titleOff - 2 * pad);
// Partial sweeps that never reach below the center (e.g. semicircles) put
// the center text above the center point.
const baseBox  = unitBBox(a0, a0 + sweep);
const textAbove = !isFull && baseBox.y1 < 0.35;

function ringGeometry(R) {
  const inner0 = hollowFrac * R;
  const band   = (R - inner0) / n;
  const thick  = Math.max(1, band * (1 - ringGap));
  return { inner0, band, thick };
}

function layoutFor(extAng) {
  const b = unitBBox(a0 - extAng, a0 + sweep);
  if (textAbove) b.y1 = Math.max(b.y1, 0.1);
  const bw = Math.max(b.x1 - b.x0, 1e-3), bh = Math.max(b.y1 - b.y0, 1e-3);
  let R = Math.min(availW / bw, availH / bh);
  // round caps poke out by half a stroke: shrink a little to keep them in
  const capAllowance = roundedCaps ? ringGeometry(R).thick / 2 : 0;
  R = Math.max(5, R - capAllowance - 2);
  return {
    R,
    cx: pad + (availW - R * bw) / 2 - R * b.x0,
    cy: titleOff + pad + (availH - R * bh) / 2 - R * b.y0
  };
}

let L = layoutFor(0);
let labelSize = labelFontReq;
if (curvedLabels && !isFull) {
  // Make room for the curved labels in the gap before the track start.
  for (let it = 0; it < 3; it++) {
    const g0 = ringGeometry(L.R);
    labelSize = Math.max(7, Math.min(labelFontReq, g0.thick * 0.85));
    const scale = labelSize / labelFontReq;
    let ext = 0;
    rows.forEach((d, i) => {
      const rc = L.R - i * g0.band - g0.thick / 2;
      if (rc > 0) ext = Math.max(ext, (d.labelW * scale + g0.thick / 2 + 8) / rc);
    });
    L = layoutFor(Math.min(gapAng * 0.95, ext));
  }
}

const R  = L.R, cx = L.cx, cy = L.cy;
const G  = ringGeometry(R);
rows.forEach((d, i) => {
  d.rOuter = R - i * G.band;
  d.rc     = d.rOuter - G.thick / 2;
  d.endAng = a0 + sweep * d.frac;
});
const cap = roundedCaps ? G.thick / 2 : 0;
const hollowR = G.inner0 + G.band * ringGap;   // inner edge of innermost ring

if (horizLabels) {
  labelSize = Math.max(7, Math.min(labelFontReq, G.band * 0.85));
} else if (curvedLabels) {
  labelSize = Math.max(7, Math.min(labelFontReq, G.thick * 0.85));
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const root = svg.append("g").attr("transform", `translate(${cx},${cy})`);
const defs = svg.append("defs");

const ringsG = root.append("g").attr("class", "radialbar-rings");

const ring = ringsG.selectAll("g.radialbar-ring")
  .data(rows)
  .join("g")
  .attr("class", "radialbar-ring");

// Background tracks
ring.append("path")
  .attr("class", "radialbar-track")
  .attr("d", d => arcPath(d.rc, a0, a0 + sweep))
  .attr("fill", "none")
  .attr("stroke", trackCol)
  .attr("stroke-width", G.thick)
  .attr("stroke-linecap", roundedCaps && !isFull ? "round" : "butt");

// Value arcs
const bars = ring.append("path")
  .attr("class", "radialbar-bar")
  .attr("fill", "none")
  .attr("stroke", d => d.color)
  .attr("stroke-width", G.thick)
  .attr("stroke-linecap", roundedCaps ? "round" : "butt")
  .attr("d", d => animate ? "" : arcPath(d.rc, a0, d.endAng));

if (animate) {
  bars.transition("sweep")
    .delay(d => d.index * 90)
    .duration(duration)
    .ease(d3.easeCubicOut)
    .attrTween("d", d => t => arcPath(d.rc, a0, a0 + (d.endAng - a0) * t));
}

// Ring labels at the start of each track
let labels = null;
if (horizLabels) {
  labels = ring.append("text")
    .attr("class", "radialbar-label")
    .attr("x", d => pt(d.rc, a0)[0] + labelDir * (cap + 6))
    .attr("y", d => pt(d.rc, a0)[1])
    .attr("dy", "0.35em")
    .attr("text-anchor", labelDir < 0 ? "end" : "start")
    .text(labelText);
} else if (curvedLabels) {
  const span = isFull ? Math.PI * 1.6 : gapAng * 0.98;
  // Keep the text upright: in the top half of the circle the label runs
  // clockwise and ends at the track start; in the bottom half it runs
  // counter-clockwise and begins at the track start.
  const upright = Math.cos(a0 - 0.3) >= 0;
  rows.forEach(d => {
    const off = (cap + 6) / Math.max(d.rc, 1);
    defs.append("path")
      .attr("id", `${uid}-lp-${d.index}`)
      .attr("d", arcPath(d.rc, a0 - span, a0 - off, !upright));
  });
  labels = ring.append("text")
    .attr("class", "radialbar-label")
    .attr("dominant-baseline", "central");
  labels.append("textPath")
    .attr("href", d => `#${uid}-lp-${d.index}`)
    .attr("xlink:href", d => `#${uid}-lp-${d.index}`)
    .attr("startOffset", upright ? "100%" : "0%")
    .attr("text-anchor", upright ? "end" : "start")
    .text(labelText);
}

if (labels) {
  labels
    .attr("font-family", fontFamily)
    .attr("font-size", labelSize)
    .attr("font-weight", 600)
    .attr("fill", textCol)
    .attr("stroke", bgcol)
    .attr("stroke-width", 3)
    .attr("stroke-linejoin", "round")
    .style("paint-order", "stroke")
    .style("pointer-events", "none");

  // Horizontal labels: shrink any label that would overflow the SVG edge.
  if (horizLabels) {
    labels.each(function (d) {
      const el = d3.select(this);
      let fs = labelSize;
      const x0 = cx + (+el.attr("x"));
      const room = labelDir < 0 ? x0 - 2 : width - x0 - 2;
      let w = this.getComputedTextLength();
      while (w > room && fs > 6) {
        fs -= 0.5;
        el.attr("font-size", fs);
        w = this.getComputedTextLength();
      }
    });
  }
  if (animate) {
    labels.attr("opacity", 0)
      .transition("fadein").delay(d => d.index * 90).duration(500)
      .attr("opacity", 1);
  }
}

// ---------------------------------------------------------------------------
// Center text: big total / average, replaced by the hovered ring
// ---------------------------------------------------------------------------
const centerAgg = centerMode === "total"   ? d3.sum(rows, d => d.value)
                : centerMode === "average" ? d3.mean(rows, d => d.value)
                : null;

const centerG = root.append("g")
  .attr("class", "radialbar-center")
  .style("pointer-events", "none");

let valueSize = centerSizeReq || Math.max(12, Math.min(44, hollowR * 0.5));
let nameSize  = Math.max(9, Math.min(16, valueSize * 0.42));
const hasCenterRoom = hollowR >= 18 || centerSizeReq;

const nameText = centerG.append("text")
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("fill", textCol);
const valueText = centerG.append("text")
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-weight", "bold")
  .attr("fill", textCol);

function placeCenter() {
  nameText.attr("font-size", nameSize);
  valueText.attr("font-size", valueSize);
  if (textAbove) {
    valueText.attr("y", -Math.max(4, hollowR * 0.06));
    nameText.attr("y", -Math.max(4, hollowR * 0.06) - valueSize * 0.78 - 6);
  } else {
    const total = nameSize + 6 + valueSize * 0.72;
    nameText.attr("y", -total / 2 + nameSize * 0.78);
    valueText.attr("y", total / 2);
  }
}

// Shrink a center text element until it fits inside the hollow.
function fitWidth(el, base, maxW) {
  let fs = base;
  el.attr("font-size", fs);
  let w = el.node().getComputedTextLength();
  while (w > maxW && fs > 8) {
    fs -= 1;
    el.attr("font-size", fs);
    w = el.node().getComputedTextLength();
  }
}

const maxCenterW = textAbove ? hollowR * 1.7 : hollowR * 1.6;
let hovered = null;

function setCenter(name, val, col) {
  nameText.text(name).attr("fill", col || textCol)
    .attr("opacity", col ? 1 : 0.75);
  valueText.text(val);
  fitWidth(nameText, nameSize, maxCenterW);
  fitWidth(valueText, valueSize, maxCenterW);
}

function defaultCenter() {
  if (centerAgg == null || !hasCenterRoom) {
    nameText.text(""); valueText.text("");
    return;
  }
  setCenter(centerLabel, fmt(centerAgg), null);
}

placeCenter();
if (hasCenterRoom && centerAgg != null) {
  defaultCenter();
  if (animate) {
    // Count up with the sweep animation
    valueText.transition("count")
      .delay((n - 1) * 45)
      .duration(duration)
      .ease(d3.easeCubicOut)
      .tween("text", function () {
        const ip = d3.interpolateNumber(0, centerAgg);
        return t => { if (!hovered) valueText.text(fmt(ip(t))); };
      });
  }
}

// ---------------------------------------------------------------------------
// Tooltip — SVG-embedded (see beeswarmplot.js for why not a body <div>)
// ---------------------------------------------------------------------------
let tip = null, tipRect = null, tipText = null;
if (hover) {
  tip = svg.append("g")
    .attr("class", "radialbar-tooltip")
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

function pointerXY(event) {
  if (d3.pointer) return d3.pointer(event, svg.node());
  return d3.mouse(svg.node());
}

function showTip(d, event) {
  tipText.selectAll("tspan").remove();
  tip.selectAll("circle").remove();
  const lines = [
    { name: d.label, value: "" },
    { name: "Value: ", value: fmt(d.value) },
    { name: "Progress: ", value: pctFmt(d.value / maxVal) + " of " + fmt(maxVal) }
  ];
  // Color swatch before the ring name
  tip.append("circle")
    .attr("cx", tipPadX + 5).attr("cy", tipPadY + 7).attr("r", 5)
    .attr("fill", d.color);
  lines.forEach((l, i) => {
    tipText.append("tspan")
      .attr("x", i === 0 ? tipPadX + 15 : tipPadX)
      .attr("dy", i === 0 ? tipPadY + 11 : tipLineH)
      .attr("font-weight", "bold")
      .text(l.name);
    if (l.value) {
      tipText.append("tspan")
        .attr("font-weight", "normal")
        .text(l.value);
    }
  });
  const bb = tipText.node().getBBox();
  tipRect
    .attr("x", bb.x - tipPadX)
    .attr("y", bb.y - tipPadY)
    .attr("width",  bb.width  + 2 * tipPadX)
    .attr("height", bb.height + 2 * tipPadY);
  tip.raise().interrupt().transition().duration(120).style("opacity", 1);
  moveTip(event, bb);
}

function moveTip(event, bbIn) {
  const bb   = bbIn || tipText.node().getBBox();
  const boxW = bb.width  + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  const yOff = bb.y - tipPadY;
  const p    = pointerXY(event);
  // Push the tooltip radially outward (away from the center readout).
  const right = p[0] >= cx, below = p[1] >= cy;
  let tx = right ? p[0] + 14 : p[0] - 14 - boxW;
  let ty = below ? p[1] + 14 : p[1] - 14 - boxH;
  tx = Math.max(2, Math.min(tx, width - boxW - 2));
  ty = Math.max(2, Math.min(ty, height - boxH - 2));
  tip.attr("transform", `translate(${tx},${ty - yOff})`);
}

function hideTip() {
  tip.interrupt().transition().duration(200).style("opacity", 0);
}

// ---------------------------------------------------------------------------
// Hover interaction
// ---------------------------------------------------------------------------
if (hover) {
  ring.style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      if (typeof d3.pointer !== "function") { d = event; event = d3.event; }
      hovered = d;
      ring.selectAll(".radialbar-bar")
        .transition("hover").duration(150)
        .attr("stroke-opacity", dd => dd === d ? 1 : 0.25);
      if (labels) {
        labels.transition("hover").duration(150)
          .attr("fill-opacity", dd => dd === d ? 1 : 0.35);
      }
      if (hasCenterRoom) {
        valueText.interrupt("count");
        setCenter(d.label, fmt(d.value), d.color);
      }
      showTip(d, event);
    })
    .on("mousemove", function (event, d) {
      if (typeof d3.pointer !== "function") { d = event; event = d3.event; }
      moveTip(event);
    })
    .on("mouseleave", function () {
      hovered = null;
      ring.selectAll(".radialbar-bar")
        .transition("hover").duration(200)
        .attr("stroke-opacity", 1);
      if (labels) {
        labels.transition("hover").duration(200).attr("fill-opacity", 1);
      }
      defaultCenter();
      hideTip();
    });
}

// Chart title
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize + 6)
    .attr("text-anchor", "middle")
    .attr("font-size",   titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill",        textCol)
    .text(title);
}
