// Chord diagram — outer arcs per entity, ribbons between entities.
// Look and feel inspired by Nivo's chord chart, reimplemented in plain D3.
// Works with the D3 v5 and v6 builds shipped with r2d3.

const names        = [].concat(options.names == null ? [] : options.names).map(String);
const directed     = options.directed !== false;
const userColors   = options.colors == null ? null : [].concat(options.colors);
const colorPalette = options.colorPalette || "Tableau10";
const ribbonMode   = options.ribbonColor || "source";        // source | target | gradient
const sortGroups   = options.sortGroups  || "none";          // none | descending | ascending
const padAngleOpt  = options.padAngle != null ? +options.padAngle : 0.03;
const innerRatio   = options.innerRadiusRatio != null ? +options.innerRadiusRatio : 0.92;
const arcOpacity   = options.arcOpacity    != null ? +options.arcOpacity    : 1;
const ribbonOpac   = options.ribbonOpacity != null ? +options.ribbonOpacity : 0.6;
const fadeOpacity  = options.fadeOpacity   != null ? +options.fadeOpacity   : 0.1;
const strokeWidth  = options.strokeWidth   != null ? +options.strokeWidth   : 0.5;
const showLabels   = options.showLabels !== false;
const rotateLabels = options.rotateLabels === true;
const labelSize    = options.labelFontSize || 11;
const labelOffset  = options.labelOffset != null ? +options.labelOffset : 10;
const valueFormat  = typeof options.valueFormat === "string" ? options.valueFormat : ",~f";
const hover        = options.hover   !== false;
const animate      = options.animate !== false;
const title        = typeof options.title === "string" ? options.title : null;
const titleSize    = options.titleFontSize || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const textCol      = options.textCol || "black";

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// ---------------------------------------------------------------------------
// Data: rebuild the square matrix from the (source, target, value) edge table
// ---------------------------------------------------------------------------
const n = names.length;
const matrix = names.map(() => names.map(() => 0));
(data || []).forEach(d => {
  const i = +d.source, j = +d.target, v = +d.value;
  if (i >= 0 && i < n && j >= 0 && j < n && isFinite(v) && v > 0) {
    matrix[i][j] += v;
  }
});
const grandTotal = d3.sum(matrix, row => d3.sum(row));

if (!n || !(grandTotal > 0)) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", textCol)
    .text("No data available for chord_diagram()");
  return;
}

let fmt;
try { fmt = d3.format(valueFormat); } catch (e) { fmt = d3.format(",~f"); }

const outTotal = matrix.map(row => d3.sum(row));
const inTotal  = names.map((_, j) => d3.sum(matrix, row => row[j]));
const connected = (a, b) => a === b || matrix[a][b] > 0 || matrix[b][a] > 0;

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------
function paletteColors(k) {
  let s = d3["scheme" + colorPalette];
  if (Array.isArray(s) && s.length && typeof s[0] !== "string") {
    // Sequential schemes are indexed by size (3..9 or 3..11)
    let size = Math.max(3, k);
    while (size > 3 && !s[size]) size--;
    s = s[size];
  }
  if (!Array.isArray(s) || !s.length || typeof s[0] !== "string") {
    s = d3.schemeTableau10 || d3.schemeCategory10;
  }
  return s;
}
const palette = paletteColors(n);
const colorOf = names.map((_, i) =>
  (userColors && userColors[i]) ? String(userColors[i]) : palette[i % palette.length]);
const darker = (c, k) => {
  const col = d3.color(c);
  return col ? col.darker(k).toString() : c;
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const tau = 2 * Math.PI;
const padAngle = Math.min(padAngleOpt, (tau * 0.3) / n);

const chordGen = d3.chord()
  .padAngle(padAngle)
  .sortSubgroups(d3.descending);
if (sortGroups === "descending") chordGen.sortGroups(d3.descending);
if (sortGroups === "ascending")  chordGen.sortGroups(d3.ascending);

const chords = chordGen(matrix);
const groups = chords.groups;

const titleOffset = title ? titleSize + 16 : 0;
const edgePad = 8;
const availW = Math.max(width  - 2 * edgePad, 60);
const availH = Math.max(height - titleOffset - 2 * edgePad, 60);
const cx = width / 2;
const cy = titleOffset + edgePad + availH / 2;

// Measure label widths once (fallback to an estimate)
const labelW = names.map(() => 0);
if (showLabels) {
  const tmp = svg.append("g").attr("visibility", "hidden");
  names.forEach((s, i) => {
    const t = tmp.append("text")
      .attr("font-family", fontFamily)
      .attr("font-size", labelSize)
      .attr("font-weight", "bold")       // labels turn bold on hover
      .text(s);
    let w = 0;
    try { w = t.node().getComputedTextLength(); } catch (e) { w = 0; }
    labelW[i] = w || s.length * labelSize * 0.62;
  });
  tmp.remove();
}
const labelH = labelSize * 1.2;

const midAngle = g => (g.startAngle + g.endAngle) / 2;
const hasRoom  = (g, r) => g.value > 0 && (g.endAngle - g.startAngle) * (r + labelOffset) >= labelSize * 0.8;

// Largest outer radius such that every label fits inside the drawing area
const maxR = Math.min(availW, availH) / 2;
let outerR = maxR;
if (showLabels) {
  groups.forEach(g => {
    if (!hasRoom(g, maxR)) return;
    const w = labelW[g.index];
    const a = midAngle(g);
    const s = Math.sin(a), c = Math.abs(Math.cos(a));
    const halfW = availW / 2, halfH = availH / 2;
    if (rotateLabels) {
      // The label runs along the radius: its far end sits at R + offset + w
      const lim = Math.min(
        Math.abs(s) > 1e-6 ? (halfW - c * labelH / 2) / Math.abs(s) : Infinity,
        c > 1e-6 ? (halfH - Math.abs(s) * labelH / 2) / c : Infinity
      );
      outerR = Math.min(outerR, lim - labelOffset - w);
      return;
    }
    // Horizontal extent
    if (Math.abs(s) > 0.1) {
      outerR = Math.min(outerR, (halfW - w) / Math.abs(s) - labelOffset);
    } else {
      outerR = Math.min(outerR, halfW - w / 2 - labelOffset);
    }
    // Vertical extent (the label is pushed half a line away from the arc)
    if (c > 1e-6) {
      outerR = Math.min(outerR, (halfH - labelH / 2 - c * labelH / 2) / c - labelOffset);
    }
  });
}
outerR = Math.max(outerR, Math.min(maxR, Math.max(40, maxR * 0.35)));
const innerR  = outerR * innerRatio;
const ribbonR = Math.max(innerR - 1, 1);

const arcGen = d3.arc().innerRadius(innerR).outerRadius(outerR);
const ribbonGen = d3.ribbon().radius(ribbonR);

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
const uid = "chord-" + Math.random().toString(36).slice(2);

// Transparent background: clicking it releases a pinned arc
const bgRect = svg.append("rect")
  .attr("class", "chord-bg")
  .attr("width", width).attr("height", height)
  .attr("fill", "transparent");

const root = svg.append("g")
  .attr("class", "chord-root")
  .attr("transform", `translate(${cx},${cy})`);

const defs = root.append("defs");
const pointAt = (a, r) => [Math.sin(a) * r, -Math.cos(a) * r];

function ribbonFill(c, k) {
  if (ribbonMode === "target") return colorOf[c.target.index];
  if (ribbonMode === "gradient" && c.source.index !== c.target.index) {
    return `url(#${uid}-grad-${k})`;
  }
  return colorOf[c.source.index];
}

if (ribbonMode === "gradient") {
  chords.forEach((c, k) => {
    if (c.source.index === c.target.index) return;
    const p1 = pointAt((c.source.startAngle + c.source.endAngle) / 2, ribbonR);
    const p2 = pointAt((c.target.startAngle + c.target.endAngle) / 2, ribbonR);
    const lg = defs.append("linearGradient")
      .attr("id", `${uid}-grad-${k}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", p1[0]).attr("y1", p1[1])
      .attr("x2", p2[0]).attr("y2", p2[1]);
    lg.append("stop").attr("offset", "0%").attr("stop-color", colorOf[c.source.index]);
    lg.append("stop").attr("offset", "100%").attr("stop-color", colorOf[c.target.index]);
  });
}

// Ribbons (largest drawn first so small ones stay visible on top)
const chordData = chords.map((c, k) => ({ c: c, k: k }))
  .sort((a, b) => (b.c.source.value + b.c.target.value) - (a.c.source.value + a.c.target.value));

const ribbonG = root.append("g").attr("class", "chord-ribbons");
const ribbons = ribbonG.selectAll("path")
  .data(chordData)
  .join("path")
  .attr("class", "chord-ribbon")
  .attr("d", d => ribbonGen(d.c))
  .attr("fill", d => ribbonFill(d.c, d.k))
  .attr("fill-opacity", ribbonOpac)
  .attr("stroke", d => darker(colorOf[d.c.source.index], 0.6))
  .attr("stroke-width", strokeWidth)
  .attr("stroke-opacity", Math.min(1, ribbonOpac + 0.2))
  .attr("opacity", animate ? 0 : 1);

// Arcs
const arcG = root.append("g").attr("class", "chord-arcs");
const arcs = arcG.selectAll("path")
  .data(groups)
  .join("path")
  .attr("class", "chord-arc")
  .attr("fill", g => colorOf[g.index])
  .attr("fill-opacity", arcOpacity)
  .attr("stroke", g => darker(colorOf[g.index], 0.5))
  .attr("stroke-width", strokeWidth)
  .attr("d", g => animate
    ? arcGen({ startAngle: g.startAngle, endAngle: g.startAngle })
    : arcGen(g));

// Labels
const labelData = showLabels ? groups.filter(g => hasRoom(g, outerR)) : [];
const labelG = root.append("g").attr("class", "chord-labels");
const labels = labelG.selectAll("text")
  .data(labelData)
  .join("text")
  .attr("class", "chord-label")
  .attr("font-family", fontFamily)
  .attr("font-size", labelSize)
  .attr("fill", textCol)
  .attr("dy", "0.35em")
  .style("user-select", "none")
  .attr("opacity", animate ? 0 : 1)
  .text(g => names[g.index]);

if (rotateLabels) {
  labels
    .attr("transform", g => {
      const a = midAngle(g);
      const deg = a * 180 / Math.PI - 90;
      return `rotate(${deg}) translate(${outerR + labelOffset},0)` + (a > Math.PI ? " rotate(180)" : "");
    })
    .attr("text-anchor", g => midAngle(g) > Math.PI ? "end" : "start");
} else {
  labels
    .attr("x", g => pointAt(midAngle(g), outerR + labelOffset)[0])
    .attr("y", g => {
      const a = midAngle(g);
      return pointAt(a, outerR + labelOffset)[1] - Math.cos(a) * labelH / 2;
    })
    .attr("text-anchor", g => {
      const s = Math.sin(midAngle(g));
      return s > 0.1 ? "start" : (s < -0.1 ? "end" : "middle");
    });
}

// Entrance animation — arcs sweep in, then ribbons and labels fade in.
// Named transitions keep it independent from the hover transitions.
if (animate) {
  arcs.transition("enter")
    .duration(800)
    .delay((g, i) => i * 50)
    .ease(d3.easeCubicOut)
    .attrTween("d", g => {
      const end = d3.interpolate(g.startAngle, g.endAngle);
      return t => arcGen({ startAngle: g.startAngle, endAngle: end(t) });
    });
  const ribbonDelay = 450 + Math.min(n, 12) * 30;
  ribbons.transition("enter")
    .duration(700)
    .delay((d, i) => ribbonDelay + Math.min(i, 40) * 12)
    .attr("opacity", 1);
  labels.transition("enter")
    .duration(500)
    .delay(ribbonDelay)
    .attr("opacity", 1);
}

// ---------------------------------------------------------------------------
// Tooltip — an in-SVG group (not a body <div>) so it renders identically in
// R Markdown, pkgdown and Shiny.
// ---------------------------------------------------------------------------
let tip = null, tipRect = null, tipBody = null, tipW = 0, tipH = 0;
if (hover) {
  tip = svg.append("g")
    .attr("class", "chord-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0);
  tipRect = tip.append("rect")
    .attr("rx", 4).attr("ry", 4)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1);
  tipBody = tip.append("g");
}
const tipPadX = 9, tipPadY = 7, tipLineH = 16, swatch = 10, maxFlowRows = 8;

// rows: [{ color, left, right, bold, muted }]
function renderTip(rows) {
  tipBody.selectAll("*").remove();
  const anySwatch = rows.some(r => r.color);
  const leftX = tipPadX + (anySwatch ? swatch + 6 : 0);
  let maxL = 0, maxRt = 0;
  const rights = [];
  rows.forEach((r, k) => {
    const base = tipPadY + k * tipLineH + 11;
    if (r.color) {
      tipBody.append("rect")
        .attr("x", tipPadX).attr("y", base - 9)
        .attr("width", swatch).attr("height", swatch)
        .attr("rx", 2)
        .attr("fill", r.color);
    }
    const lt = tipBody.append("text")
      .attr("x", leftX).attr("y", base)
      .attr("font-family", fontFamily).attr("font-size", 12)
      .attr("font-weight", r.bold ? "bold" : "normal")
      .attr("fill", r.muted ? "#777" : "#222")
      .text(r.left);
    maxL = Math.max(maxL, lt.node().getComputedTextLength() || r.left.length * 7);
    if (r.right) {
      const rt = tipBody.append("text")
        .attr("y", base)
        .attr("text-anchor", "end")
        .attr("font-family", fontFamily).attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("fill", "#222")
        .text(r.right);
      maxRt = Math.max(maxRt, rt.node().getComputedTextLength() || r.right.length * 7);
      rights.push(rt);
    }
  });
  tipW = leftX + maxL + (maxRt ? 18 + maxRt : 0) + tipPadX;
  tipH = 2 * tipPadY + rows.length * tipLineH - 2;
  rights.forEach(rt => rt.attr("x", tipW - tipPadX));
  tipRect.attr("width", tipW).attr("height", tipH);
}

function pointerXY(ev) {
  try {
    if (d3.pointer) return d3.pointer(ev, svg.node());
    if (d3.mouse)   return d3.mouse(svg.node());
  } catch (e) { /* fall through */ }
  return [width / 2, height / 2];
}

function moveTip(xy) {
  let tx = xy[0] + 16;
  if (tx + tipW > width - 2) tx = xy[0] - 16 - tipW;
  tx = Math.max(2, Math.min(tx, width - tipW - 2));
  let ty = xy[1] - tipH / 2;
  ty = Math.max(2, Math.min(ty, height - tipH - 2));
  tip.attr("transform", `translate(${tx},${ty})`);
}

function showTip(rows, xy) {
  renderTip(rows);
  moveTip(xy);
  tip.raise().interrupt().style("opacity", 1);
}

function hideTip() {
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

function arcRows(i) {
  const rows = [{ color: colorOf[i], left: names[i], bold: true }];
  const flows = [];
  if (directed) {
    rows.push({ left: "Outgoing", right: fmt(outTotal[i]), muted: true });
    rows.push({ left: "Incoming", right: fmt(inTotal[i]),  muted: true });
    names.forEach((nm, j) => {
      if (matrix[i][j] > 0) flows.push({ j: j, left: "→ " + nm, v: matrix[i][j] });
      if (j !== i && matrix[j][i] > 0) flows.push({ j: j, left: "← " + nm, v: matrix[j][i] });
    });
  } else {
    rows.push({ left: "Total", right: fmt(outTotal[i]), muted: true });
    names.forEach((nm, j) => {
      if (matrix[i][j] > 0) flows.push({ j: j, left: nm, v: matrix[i][j] });
    });
  }
  flows.sort((a, b) => b.v - a.v);
  flows.slice(0, maxFlowRows).forEach(f =>
    rows.push({ color: colorOf[f.j], left: f.left, right: fmt(f.v) }));
  if (flows.length > maxFlowRows) {
    rows.push({ left: "+ " + (flows.length - maxFlowRows) + " more", muted: true });
  }
  return rows;
}

function ribbonRows(c) {
  const a = c.source.index, b = c.target.index;
  if (!directed || a === b) {
    const sep = a === b ? "" : " ↔ " + names[b];
    return [{ color: colorOf[a], left: names[a] + sep, right: fmt(matrix[a][b]), bold: true }];
  }
  const rows = [];
  [[a, b], [b, a]]
    .filter(p => matrix[p[0]][p[1]] > 0)
    .sort((p, q) => matrix[q[0]][q[1]] - matrix[p[0]][p[1]])
    .forEach(p => rows.push({
      color: colorOf[p[0]],
      left: names[p[0]] + " → " + names[p[1]],
      right: fmt(matrix[p[0]][p[1]])
    }));
  return rows;
}

// ---------------------------------------------------------------------------
// Focus: fade every ribbon/arc not related to the focused element
// ---------------------------------------------------------------------------
let pinned = null;          // index of the clicked arc, or null
const activeRibbon = Math.max(ribbonOpac, 0.85);

function applyFocus(state) {
  // state: null | { arc: i } | { chord: c }
  const ribbonOn = c => !state ? null
    : (state.arc != null
        ? (c.source.index === state.arc || c.target.index === state.arc)
        : c === state.chord);
  const arcOn = g => !state ? null
    : (state.arc != null
        ? connected(state.arc, g.index)
        : (g.index === state.chord.source.index || g.index === state.chord.target.index));
  const focusArc = g => state && (state.arc != null
    ? g.index === state.arc
    : (g.index === state.chord.source.index || g.index === state.chord.target.index));

  ribbons.interrupt("hover").transition("hover").duration(200)
    .attr("fill-opacity", d => {
      const on = ribbonOn(d.c);
      return on === null ? ribbonOpac : (on ? activeRibbon : fadeOpacity);
    })
    .attr("stroke-opacity", d => {
      const on = ribbonOn(d.c);
      return on === null ? Math.min(1, ribbonOpac + 0.2) : (on ? 1 : fadeOpacity);
    });

  arcs.interrupt("hover").transition("hover").duration(200)
    .attr("fill-opacity", g => {
      const on = arcOn(g);
      return on === null ? arcOpacity : (on ? 1 : Math.max(fadeOpacity, 0.2));
    })
    .attr("stroke-width", g => focusArc(g) ? Math.max(1.5, strokeWidth * 2) : strokeWidth);

  labels.interrupt("hover").transition("hover").duration(200)
    .attr("fill-opacity", g => {
      const on = arcOn(g);
      return on === null || on ? 1 : 0.3;
    });
  labels.attr("font-weight", g => focusArc(g) ? "bold" : "normal");
}

const restState = () => pinned === null ? null : { arc: pinned };

if (hover) {
  // Handlers read the datum from the element and the event from d3.event
  // (v5) or the first argument (v6), so they work with both versions.
  const onArcOver = function (evt) {
    const g  = d3.select(this).datum();
    const ev = d3.event || evt;
    applyFocus({ arc: g.index });
    showTip(arcRows(g.index), pointerXY(ev));
  };
  const onMove = function (evt) {
    const ev = d3.event || evt;
    moveTip(pointerXY(ev));
  };
  const onOut = function () {
    ribbons.order();          // restore the draw order after a ribbon.raise()
    applyFocus(restState());
    hideTip();
  };
  const onArcClick = function (evt) {
    const g  = d3.select(this).datum();
    const ev = d3.event || evt;
    if (ev && ev.stopPropagation) ev.stopPropagation();
    pinned = pinned === g.index ? null : g.index;
    applyFocus({ arc: g.index });
  };

  arcs.style("cursor", "pointer")
    .on("mouseover", onArcOver)
    .on("mousemove", onMove)
    .on("mouseout", onOut)
    .on("click", onArcClick);

  labels.style("cursor", "pointer")
    .on("mouseover", onArcOver)
    .on("mousemove", onMove)
    .on("mouseout", onOut)
    .on("click", onArcClick);

  ribbons.style("cursor", "pointer")
    .on("mouseover", function (evt) {
      const d  = d3.select(this).datum();
      const ev = d3.event || evt;
      d3.select(this).raise();
      applyFocus({ chord: d.c });
      showTip(ribbonRows(d.c), pointerXY(ev));
    })
    .on("mousemove", onMove)
    .on("mouseout", onOut);

  bgRect.on("click", function () {
    if (pinned === null) return;
    pinned = null;
    applyFocus(null);
  });
}

// Chart title
if (title) {
  svg.append("text")
    .attr("class", "chord-title")
    .attr("x", width / 2)
    .attr("y", titleSize + 4)
    .attr("text-anchor", "middle")
    .attr("font-size",   titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill",        textCol)
    .text(title);
}

if (tip) tip.raise();
