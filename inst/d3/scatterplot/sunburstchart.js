// Zoomable sunburst chart (inspired by the Apache ECharts sunburst series).
// Pure D3: d3.hierarchy + d3.partition + d3.arc, with in-SVG tooltip.

const levelsRaw    = options.levels;
const levelCols    = Array.isArray(levelsRaw) ? levelsRaw : [levelsRaw];
const valueCol     = options.value || null;
const userColors   = options.colors
  ? (Array.isArray(options.colors) ? options.colors : [options.colors])
  : null;
const valueFmtStr  = options.valueFormat || ",.0f";
const innerFrac    = options.innerRadius != null ? +options.innerRadius : 0.22;
const cornerRadius = options.cornerRadius != null ? +options.cornerRadius : 0;
const padAngle     = options.padAngle != null ? +options.padAngle : 0;
const strokeCol    = options.strokeCol || "white";
const strokeWidth  = options.strokeWidth != null ? +options.strokeWidth : 1;
const showLabels   = options.showLabels !== false;
const labelRotate  = options.labelRotate || "radial";
const labelSize    = options.labelFontSize || 11;
const labelColor   = options.labelCol || null;
const rootLabel    = options.rootLabel != null ? String(options.rootLabel) : "Total";
const centerSize   = options.centerFontSize || 13;
const zoomable     = options.zoom !== false;
const hover        = options.hover !== false;
const animate      = options.animate !== false;
const duration     = options.duration != null ? +options.duration : 750;
const title        = options.title || null;
const titleSize    = options.titleFontSize || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const textCol      = options.textCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

let fmt;
try { fmt = d3.format(valueFmtStr); } catch (e) { fmt = d3.format(",.0f"); }
const pctFmt = d3.format(".1%");

const isMissing = v => v === null || v === undefined || v === "" ||
  v === "NA" || (typeof v === "number" && isNaN(v));

// ---------------------------------------------------------------------------
// Build the hierarchy. Each row contributes its value to the path formed by
// its level columns; a missing level ends the path early (ragged hierarchy).
// Duplicate paths are summed.
// ---------------------------------------------------------------------------
const tree = { name: rootLabel, children: [], _map: new Map(), value: 0 };
let nRows = 0;

data.forEach(row => {
  const v = valueCol ? +row[valueCol] : 1;
  if (!isFinite(v) || v <= 0) return;
  let node = tree;
  let depth = 0;
  for (let i = 0; i < levelCols.length; i++) {
    const raw = row[levelCols[i]];
    if (isMissing(raw)) break;
    const key = String(raw);
    let child = node._map.get(key);
    if (!child) {
      child = { name: key, children: [], _map: new Map(), value: 0 };
      node._map.set(key, child);
      node.children.push(child);
    }
    node = child;
    depth++;
  }
  if (depth === 0) return;
  node.value += v;        // own value (leaf, or remainder of an internal node)
  nRows++;
});

if (!nRows) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", textCol)
    .text("No data available for sunburst_chart()");
  return;
}

const root = d3.hierarchy(tree, d => d.children && d.children.length ? d.children : null)
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

d3.partition().size([2 * Math.PI, 1])(root);

const total = root.value;
const nodes = root.descendants().filter(d => d.depth > 0);

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const titleOffset = title ? titleSize + 14 : 0;
const availW = Math.max(10, width - 12);
const availH = Math.max(10, height - titleOffset - 12);
const R  = Math.max(10, Math.min(availW, availH) / 2);
const r0 = Math.max(0, Math.min(0.9, innerFrac)) * R;
const cx = width / 2;
const cy = titleOffset + 6 + availH / 2;

const g = svg.append("g")
  .attr("class", "sunburst")
  .attr("transform", `translate(${cx},${cy})`);

// ---------------------------------------------------------------------------
// Colours: one base colour per top-level branch, lightened with depth.
// ---------------------------------------------------------------------------
const defaultPalette = [
  "#4e79c4", "#8cc56f", "#f6c445", "#e8605a", "#6cbcd8",
  "#3a9e6d", "#f28c4c", "#9467b8", "#e47fc4", "#7f8c99"
];
const palette = userColors && userColors.length ? userColors : defaultPalette;
const branchScale = d3.scaleOrdinal()
  .domain(root.children ? root.children.map(c => c.data.name) : [])
  .range(palette);

const lightStep = root.height > 1 ? Math.min(0.2, 0.55 / (root.height - 1)) : 0;

function nodeColor(d) {
  if (d.depth === 0) return "#f2f2f2";
  let top = d;
  while (top.depth > 1) top = top.parent;
  const base = branchScale(top.data.name);
  if (d.depth === 1) return base;
  // Lighter with depth; within a family, smaller siblings get slightly
  // lighter shades so neighbouring sectors stay distinguishable when zoomed.
  const sibs = d.parent.children;
  const idx  = sibs.indexOf(d);
  const vary = sibs.length > 1 ? 0.16 * idx / (sibs.length - 1) : 0;
  const amt  = Math.min(0.75, lightStep * (d.depth - 1) + vary);
  try { return d3.interpolateRgb(base, "#ffffff")(amt); }
  catch (e) { return base; }
}
nodes.forEach(d => { d.color = nodeColor(d); });

function autoTextColor(fill) {
  if (labelColor) return labelColor;
  const c = d3.rgb(fill);
  if (!c || isNaN(c.r)) return "#ffffff";
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return lum > 0.62 ? "#2b2b2b" : "#ffffff";
}

// ---------------------------------------------------------------------------
// Coordinates. Each node keeps a "current" state {x0, x1, y0, y1} where x is
// in radians and y is a 0..1 fraction of the ring area (r0 .. R). Zooming
// into node p maps p's angular span to the full circle and its sub-levels to
// the full ring area.
// ---------------------------------------------------------------------------
const rScale = y => r0 + Math.max(0, Math.min(1, y)) * (R - r0);

function targetFor(d, p) {
  const span = p.x1 - p.x0 || 1;
  const h = Math.max(1, p.height);
  const x0 = Math.max(0, Math.min(1, (d.x0 - p.x0) / span)) * 2 * Math.PI;
  const x1 = Math.max(0, Math.min(1, (d.x1 - p.x0) / span)) * 2 * Math.PI;
  const y0 = Math.max(0, (d.depth - p.depth - 1) / h);
  const y1 = Math.max(0, (d.depth - p.depth) / h);
  return { x0: x0, x1: x1, y0: y0, y1: y1 };
}

const isVisible = c => c.x1 - c.x0 > 1e-6 && c.y1 > c.y0 && c.y1 <= 1 + 1e-9;

const arc = d3.arc()
  .startAngle(c => c.x0)
  .endAngle(c => c.x1)
  .padAngle(c => Math.min((c.x1 - c.x0) / 2, padAngle))
  .padRadius(R / 2)
  .innerRadius(c => rScale(c.y0))
  .outerRadius(c => Math.max(rScale(c.y0), rScale(c.y1) - 0.5))
  .cornerRadius(cornerRadius);

let focus = root;
nodes.forEach(d => {
  d.target = targetFor(d, root);
  d.current = animate
    ? { x0: 0, x1: 0, y0: d.target.y0, y1: d.target.y1 }
    : Object.assign({}, d.target);
});

// ---------------------------------------------------------------------------
// Sectors
// ---------------------------------------------------------------------------
const sectorLayer = g.append("g").attr("class", "sunburst-sectors");

const paths = sectorLayer.selectAll("path")
  .data(nodes)
  .join("path")
  .attr("class", "sunburst-sector")
  .attr("fill", d => d.color)
  .attr("fill-opacity", 1)
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth)
  .attr("stroke-linejoin", "round")
  .attr("d", d => arc(d.current))
  .style("opacity", d => isVisible(d.target) ? 1 : 0)
  .style("pointer-events", d => isVisible(d.target) ? "auto" : "none")
  .style("cursor", d => zoomable && d.children ? "pointer" : "default");

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
const labelLayer = g.append("g")
  .attr("class", "sunburst-labels")
  .style("pointer-events", "none")
  .style("user-select", "none");

const labels = labelLayer.selectAll("text")
  .data(showLabels ? nodes : [])
  .join("text")
  .attr("class", "sunburst-label")
  .attr("dy", "0.35em")
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .attr("font-size", labelSize)
  .attr("fill", d => autoTextColor(d.color));

function labelTransform(c) {
  const a = (c.x0 + c.x1) / 2 * 180 / Math.PI;      // degrees, clockwise from 12 o'clock
  const r = (rScale(c.y0) + rScale(c.y1)) / 2;
  if (labelRotate === "tangential") {
    const flip = (a > 90 && a < 270) ? -90 : 90;
    return `rotate(${a - 90}) translate(${r},0) rotate(${flip})`;
  }
  return `rotate(${a - 90}) translate(${r},0) rotate(${a < 180 ? 0 : 180})`;
}

// Space available for a label in a given state: [along text, across text]
function labelRoom(c) {
  const ring = rScale(c.y1) - rScale(c.y0);
  const mid  = (rScale(c.y0) + rScale(c.y1)) / 2;
  const arcLen = (c.x1 - c.x0) * mid;
  return labelRotate === "tangential" ? [arcLen - 6, ring - 2] : [ring - 8, arcLen - 2];
}

// Fit the label text into the room of state c (truncate with an ellipsis);
// returns true when it fits.
function fitLabel(node, d, c) {
  const sel = d3.select(node);
  const room = labelRoom(c);
  if (!isVisible(c) || room[1] < labelSize * 1.05 || room[0] < labelSize * 1.2) {
    sel.text("");
    return false;
  }
  const str = d.data.name;
  sel.text(str);
  if (typeof node.getComputedTextLength !== "function") return true;
  if (node.getComputedTextLength() <= room[0]) return true;
  let s = str;
  while (s.length > 1) {
    s = s.slice(0, -1);
    sel.text(s.trim() + "…");
    if (node.getComputedTextLength() <= room[0]) return true;
  }
  sel.text("");
  return false;
}

labels.each(function (d) { d.labelOn = fitLabel(this, d, d.target); });
labels
  .attr("transform", d => labelTransform(d.target))
  .attr("fill-opacity", d => (d.labelOn && !animate) ? 1 : 0);

// ---------------------------------------------------------------------------
// Centre (current root of the view). Clicking it zooms out one level.
// ---------------------------------------------------------------------------
const center = g.append("g").attr("class", "sunburst-center");
const centerCircle = center.append("circle")
  .attr("r", Math.max(0, r0 - Math.max(1, strokeWidth)))
  .attr("fill", nodeColor(root))
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth);
const centerText = center.append("text")
  .attr("text-anchor", "middle")
  .attr("font-family", fontFamily)
  .style("pointer-events", "none")
  .style("user-select", "none");

function fitInto(node, str, maxW) {
  const sel = d3.select(node);
  sel.text(str);
  if (typeof node.getComputedTextLength !== "function") return;
  if (node.getComputedTextLength() <= maxW) return;
  let s = str;
  while (s.length > 1) {
    s = s.slice(0, -1);
    sel.text(s.trim() + "…");
    if (node.getComputedTextLength() <= maxW) return;
  }
}

function updateCenter(p) {
  centerText.selectAll("tspan").remove();
  if (r0 < 18) {
    center.style("display", r0 > 0 ? null : "none");
    centerCircle.attr("fill", p.depth ? p.color : nodeColor(root));
    return;
  }
  const fill = p.depth ? p.color : nodeColor(root);
  const tcol = p.depth ? autoTextColor(fill) : textCol;
  centerCircle.interrupt().transition().duration(duration / 2).attr("fill", fill);
  center.style("cursor", zoomable && p.depth ? "pointer" : "default");

  const maxW = r0 * 1.7;
  const nameSize = Math.min(centerSize, r0 / 2.6);
  const valSize  = Math.max(8, nameSize - 2);
  const lines = [
    { text: p.depth ? p.data.name : rootLabel, size: nameSize, weight: "bold" },
    { text: fmt(p.value), size: valSize, weight: "normal" }
  ];
  if (zoomable && p.depth && r0 >= 34) {
    lines.push({ text: "← back", size: Math.max(8, valSize - 2), weight: "normal", op: 0.75 });
  }
  const lineH = nameSize * 1.25;
  const y0 = -((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => {
    const t = centerText.append("tspan")
      .attr("x", 0)
      .attr("y", y0 + i * lineH)
      .attr("dy", "0.35em")
      .attr("font-size", l.size)
      .attr("font-weight", l.weight)
      .attr("fill", tcol)
      .attr("fill-opacity", l.op || 1);
    fitInto(t.node(), l.text, maxW);
  });
}
updateCenter(root);

// ---------------------------------------------------------------------------
// Tooltip — rendered inside the SVG (not a <div> on <body>) so it works in
// R Markdown / pkgdown and inside r2d3's shadow root.
// ---------------------------------------------------------------------------
let tip = null, tipRect = null, tipText = null;
if (hover) {
  tip = svg.append("g")
    .attr("class", "sunburst-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("fill-opacity", 0.96)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  tipText = tip.append("text")
    .attr("font-family", fontFamily)
    .attr("font-size", 12)
    .attr("fill", "#222");
}
const tipPadX = 8, tipPadY = 6, tipLineH = 15;

function tipLines(d) {
  const path = d.ancestors().reverse().slice(1).map(a => a.data.name);
  const lines = [{ name: null, value: path.join(" › ") }];
  lines.push({ name: "Value", value: fmt(d.value) });
  lines.push({ name: "Share of total", value: pctFmt(d.value / total) });
  if (d.depth > 1 && d.parent.value > 0) {
    lines.push({ name: "Share of " + d.parent.data.name, value: pctFmt(d.value / d.parent.value) });
  }
  if (focus.depth > 0 && focus !== d.parent && focus.value > 0) {
    lines.push({ name: "Share of " + focus.data.name, value: pctFmt(d.value / focus.value) });
  }
  return lines;
}

function pointerXY(evt) {
  if (typeof d3.pointer === "function" && evt) return d3.pointer(evt, svg.node());
  if (typeof d3.mouse === "function") return d3.mouse(svg.node());
  return [width / 2, height / 2];
}

function showTip(d, xy) {
  tipText.selectAll("tspan").remove();
  tipLines(d).forEach((l, i) => {
    const dy = i === 0 ? tipPadY + 11 : tipLineH;
    if (l.name === null) {
      tipText.append("tspan")
        .attr("x", tipPadX).attr("dy", dy)
        .attr("font-weight", "bold")
        .text(l.value);
    } else {
      tipText.append("tspan")
        .attr("x", tipPadX).attr("dy", dy)
        .attr("font-weight", "bold")
        .text(l.name + ": ");
      tipText.append("tspan")
        .attr("font-weight", "normal")
        .text(String(l.value));
    }
  });
  const bb = tipText.node().getBBox();
  const boxW = bb.width + 2 * tipPadX;
  const boxH = bb.height + 2 * tipPadY;
  tipRect
    .attr("x", bb.x - tipPadX).attr("y", bb.y - tipPadY)
    .attr("width", boxW).attr("height", boxH)
    .attr("stroke", d.color);
  tip.raise().interrupt().style("opacity", 1);
  moveTip(xy);
}

function moveTip(xy) {
  const r = tipRect.node();
  const boxW = +r.getAttribute("width"), boxH = +r.getAttribute("height");
  const xOff = +r.getAttribute("x"),     yOff = +r.getAttribute("y");
  let tx = xy[0] + 14;
  if (tx + boxW > width) tx = xy[0] - 14 - boxW;
  tx = Math.max(2, tx);
  let ty = xy[1] + 14;
  if (ty + boxH > height) ty = xy[1] - 14 - boxH;
  ty = Math.max(2, ty);
  tip.attr("transform", `translate(${tx - xOff},${ty - yOff})`);
}

function hideTip() {
  if (!tip) return;
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

// Emphasis: the hovered sector, its ancestors and its descendants stay
// bright; everything else fades.
function highlight(d) {
  const chain = new Set(d.ancestors().concat(d.descendants()));
  paths.interrupt("hover").transition("hover").duration(120)
    .attr("fill-opacity", n => chain.has(n) ? 1 : 0.3);
  labels.interrupt("hover").transition("hover").duration(120)
    .attr("opacity", n => chain.has(n) ? 1 : 0.35);
  paths.filter(n => n === d).raise();
}

function unhighlight() {
  paths.interrupt("hover").transition("hover").duration(150).attr("fill-opacity", 1);
  labels.interrupt("hover").transition("hover").duration(150).attr("opacity", 1);
}

// D3 v5 passes (d, i, nodes) with the event in d3.event; v6+ passes
// (event, d). Reading the datum from the element works for both.
function evtOf(e) { return d3.event || e; }

if (hover) {
  paths
    .on("mouseover", function (e) {
      const d = d3.select(this).datum();
      highlight(d);
      showTip(d, pointerXY(evtOf(e)));
    })
    .on("mousemove", function (e) { moveTip(pointerXY(evtOf(e))); })
    .on("mouseout", function () { unhighlight(); hideTip(); });
}

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------
function zoomTo(p, dur) {
  if (!p || (p !== root && !p.children)) return;
  focus = p;
  hideTip();
  unhighlight();

  nodes.forEach(d => {
    d.from = Object.assign({}, d.current);
    d.target = targetFor(d, p);
  });

  const t = g.transition("zoom").duration(dur).ease(d3.easeCubicInOut);

  paths
    .style("pointer-events", "none")
    .transition(t)
    .tween("data", d => {
      const i = d3.interpolate(d.from, d.target);
      return tt => { d.current = i(tt); };
    })
    .style("opacity", d => isVisible(d.target) ? 1 : 0)
    .attrTween("d", d => () => arc(d.current))
    .on("end", function (d) {
      d3.select(this).style("pointer-events", isVisible(d.target) ? "auto" : "none");
    });

  if (showLabels) {
    // Compute label text for the target geometry up front.
    labels.each(function (d) {
      const was = d.labelOn;
      d.labelOn = fitLabel(this, d, d.target);
      if (!d.labelOn && was) d3.select(this).text(d.data.name);
    });
    labels
      .transition(t)
      .attr("fill-opacity", d => d.labelOn ? 1 : 0)
      .attrTween("transform", d => {
        const i = d3.interpolate(d.from, d.target);
        return tt => labelTransform(i(tt));
      })
      .on("end", function (d) { if (!d.labelOn) d3.select(this).text(""); });
  }

  updateCenter(p);
}

if (zoomable) {
  paths.on("click", function (e) {
    const ev = evtOf(e);
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const d = d3.select(this).datum();
    if (d.children) zoomTo(d, duration);
    else if (focus !== d.parent && d.parent) zoomTo(d.parent, duration);
  });
  center.on("click", function (e) {
    const ev = evtOf(e);
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (focus.parent) zoomTo(focus.parent, duration);
  });
  // Clicking the empty background also zooms out (useful when innerRadius = 0)
  svg.on("click", function () {
    if (focus.parent) zoomTo(focus.parent, duration);
  });
}

// ---------------------------------------------------------------------------
// Entrance animation — sectors sweep clockwise from 12 o'clock.
// ---------------------------------------------------------------------------
if (animate) {
  nodes.forEach(d => { d.from = Object.assign({}, d.current); });
  const t0 = g.transition("zoom").duration(Math.max(300, duration * 1.3)).ease(d3.easeCubicOut);
  paths.transition(t0)
    .tween("data", d => {
      const i = d3.interpolate(d.from, d.target);
      return tt => { d.current = i(tt); };
    })
    .attrTween("d", d => () => arc(d.current));
  if (showLabels) {
    labels.transition(t0).delay(Math.max(300, duration * 1.3) * 0.6).duration(300)
      .attr("fill-opacity", d => d.labelOn ? 1 : 0);
  }
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", titleSize)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", textCol)
    .text(title);
}
