// Nightingale rose (polar-interval) chart for ddplot::rose_chart()
// Equal-angle wedges whose RADIUS follows a square-root scale, so that the
// AREA of each wedge (or of each stacked segment) is proportional to its value.

const categoryCol  = options.category;
const valueCol     = options.value;
const groupCol     = options.group || null;
const toArray      = x => x == null ? null : (Array.isArray(x) ? x : [x]);
const catLevels    = toArray(options.categoryLevels);
const grpLevels    = toArray(options.groupLevels);
const userColors   = toArray(options.colors);
const sortMode     = options.sort || "none";
const innerFrac    = options.innerRadius != null ? +options.innerRadius : 0;
const startDeg     = options.startAngle  != null ? +options.startAngle  : 0;
const padAngle     = options.padAngle    != null ? +options.padAngle    : 0;
const cornerRadius = options.cornerRadius != null ? +options.cornerRadius : 0;
const opacity      = options.opacity     != null ? +options.opacity     : 0.9;
const strokeCol    = options.strokeCol   || "white";
const strokeWidth  = options.strokeWidth != null ? +options.strokeWidth : 1;
const gridLines    = options.gridLines   != null ? +options.gridLines   : 4;
const gridCol      = options.gridCol     || "#e0e0e0";
const gridFontSize = options.gridFontSize  || 10;
const showLabels   = options.showLabels !== false;
const labelSize    = options.labelFontSize || 11;
const valueFmtStr  = options.valueFormat   || ",.0f";
const hover        = options.hover   !== false;
const animate      = options.animate !== false;
const showLegend   = options.legend  !== false;
const legendSize   = options.legendFontSize || 11;
const title        = options.title          || null;
const titleSize    = options.titleFontSize  || 16;
const fontFamily   = options.font    || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol        = options.bgcol   || "white";
const axisCol      = options.axisCol || "black";

const hasGroup = groupCol !== null;

svg.selectAll("*").remove();
svg.style("background-color", bgcol);

// AntV-style categorical palette (default when no colors are supplied)
const defaultPalette = [
  "#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16", "#E86452",
  "#6DC8EC", "#945FB9", "#FF9845", "#1E9493", "#FF99C3"
];

let fmt;
try { fmt = d3.format(valueFmtStr); } catch (e) { fmt = d3.format(",.0f"); }
const pctFmt = d3.format(".1%");

// ---------------------------------------------------------------------------
// Data: aggregate (sum) value per category x group
// ---------------------------------------------------------------------------
const rows = data
  .map(d => ({
    cat:   d[categoryCol] == null ? null : String(d[categoryCol]),
    grp:   hasGroup ? (d[groupCol] == null ? null : String(d[groupCol])) : "__single__",
    value: +d[valueCol]
  }))
  .filter(d => d.cat !== null && d.grp !== null && isFinite(d.value) && d.value >= 0);

if (!rows.length) {
  svg.append("text")
    .attr("x", width / 2).attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", fontFamily).attr("font-size", 14).attr("fill", axisCol)
    .text("No data available for rose_chart()");
  return;
}

// Category / group order: factor levels from R if given, else first appearance
function orderOf(levels, values) {
  const seen = Array.from(new Set(values));
  if (!levels) return seen;
  const present = new Set(seen);
  const ordered = levels.map(String).filter(l => present.has(l));
  seen.forEach(v => { if (ordered.indexOf(v) < 0) ordered.push(v); });
  return ordered;
}

let categories = orderOf(catLevels, rows.map(r => r.cat));
const groups   = hasGroup ? orderOf(grpLevels, rows.map(r => r.grp)) : ["__single__"];

const valueMap = new Map();   // "cat\u0001grp" -> summed value
rows.forEach(r => {
  const k = r.cat + "\u0001" + r.grp;
  valueMap.set(k, (valueMap.get(k) || 0) + r.value);
});
const valOf = (c, g) => valueMap.get(c + "\u0001" + g) || 0;

if (sortMode === "desc" || sortMode === "asc") {
  const tot = c => d3.sum(groups, g => valOf(c, g));
  categories = categories.slice().sort((a, b) =>
    sortMode === "desc" ? tot(b) - tot(a) : tot(a) - tot(b));
}

const nCat = categories.length;

// Colors: one per group when stacked, one per category otherwise
const palette    = userColors && userColors.length ? userColors : defaultPalette;
const colorKeys  = hasGroup ? groups : categories;
const colorScale = d3.scaleOrdinal().domain(colorKeys).range(palette);
const fillOf     = seg => colorScale(hasGroup ? seg.grp : seg.cat);

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const titleOffset = title ? titleSize + 14 : 0;

let legendItems = [];
let legendH     = 0;
if (hasGroup && showLegend) {
  const maxW = width - 24;
  let lx = 0, ly = 0;
  const rowsOfItems = [[]];
  groups.forEach(gname => {
    const estW = legendSize + 6 + gname.length * legendSize * 0.62 + 18;
    if (lx > 0 && lx + estW > maxW) { lx = 0; ly += legendSize + 9; rowsOfItems.push([]); }
    const it = { name: gname, x: lx, y: ly, w: estW };
    legendItems.push(it);
    rowsOfItems[rowsOfItems.length - 1].push(it);
    lx += estW;
  });
  // center every legend row
  rowsOfItems.forEach(r => {
    if (!r.length) return;
    const rowW = r[r.length - 1].x + r[r.length - 1].w - 18;
    const shift = (width - rowW) / 2;
    r.forEach(it => { it.x += shift; });
  });
  legendH = ly + legendSize + 14;
}

const topY   = 8 + titleOffset + legendH;
const pad    = 8;
const chartW = Math.max(10, width - 2 * pad);
const chartH = Math.max(10, height - topY - pad);
const cx     = width / 2;
const cy     = topY + chartH / 2;

const maxLabelW = showLabels
  ? d3.max(categories, c => c.length) * labelSize * 0.6
  : 0;
const labelGap  = showLabels ? 10 : 0;
const popOffset = 8;

const R = Math.max(20, Math.min(
  chartW / 2 - maxLabelW - labelGap - popOffset - 4,
  chartH / 2 - (showLabels ? labelSize + labelGap : 0) - popOffset - 2
));
const baseR = Math.max(0, Math.min(0.9, innerFrac)) * R;

const step   = (2 * Math.PI) / nCat;
const start0 = startDeg * Math.PI / 180;
const a0Of   = i => start0 + i * step;
const midOf  = i => start0 + (i + 0.5) * step;

// ---------------------------------------------------------------------------
// Segments (one per category x group). Hidden groups collapse to zero height
// so that every element persists and can animate smoothly.
// ---------------------------------------------------------------------------
const hiddenGroups = new Set();

const wedges = categories.map((c, i) => ({
  cat: c, i: i,
  a0: a0Of(i), a1: a0Of(i) + step, mid: midOf(i),
  segs: groups.map(g => ({ cat: c, grp: g, i: i, value: valOf(c, g), lo: 0, hi: 0 }))
}));

// scale state, recomputed on every layout
let maxV  = 1;
let ticks = [];

// area-honest radius: annulus area between baseR and rOf(v) is proportional to v
const rOf = v => Math.sqrt(baseR * baseR + (R * R - baseR * baseR) * Math.max(0, v) / maxV);

function computeLayout() {
  let maxTotal = 0;
  wedges.forEach(w => {
    let cum = 0;
    w.segs.forEach(s => {
      const v = hiddenGroups.has(s.grp) ? 0 : s.value;
      s.lo = cum; cum += v; s.hi = cum;
    });
    w.total = cum;
    if (cum > maxTotal) maxTotal = cum;
  });
  // The largest wedge reaches the outer rim exactly (no wasted space)
  const lin = d3.scaleLinear().domain([0, maxTotal > 0 ? maxTotal : 1]);
  maxV  = lin.domain()[1];
  tickFmt = lin.tickFormat(Math.max(1, gridLines));
  // Value rings: linear "nice" ticks, thinned so that rings (which crowd
  // toward the rim on a sqrt scale) keep their labels legible.
  const minGap = gridFontSize + 4;
  ticks = [];
  let lastR = baseR;
  (gridLines > 0 ? lin.ticks(gridLines) : []).forEach(t => {
    if (t <= 0 || t > maxV) return;
    const r = rOf(t);
    if (r - lastR >= minGap) { ticks.push(t); lastR = r; }
  });
}
let tickFmt = d3.format(",");

const arcGen = d3.arc().cornerRadius(cornerRadius);
function arcPath(seg, r) {
  const w = wedges[seg.i];
  return arcGen({
    startAngle: w.a0, endAngle: w.a1,
    innerRadius: r.lo, outerRadius: Math.max(r.lo, r.hi),
    padAngle: padAngle
  });
}
const targetRadii = s => ({ lo: rOf(s.lo), hi: rOf(s.hi) });

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------
const root       = svg.append("g").attr("transform", `translate(${cx},${cy})`);
const gridLayer  = root.append("g").attr("class", "rose-grid").style("pointer-events", "none");
const wedgeLayer = root.append("g").attr("class", "rose-wedges");
const labelLayer = root.append("g").attr("class", "rose-labels").style("pointer-events", "none");
const gridLabelLayer = root.append("g").attr("class", "rose-grid-labels").style("pointer-events", "none");
const hitLayer   = root.append("g").attr("class", "rose-hit");

// Radial spokes at each wedge boundary (static)
gridLayer.selectAll("line.spoke")
  .data(wedges)
  .join("line")
  .attr("class", "spoke")
  .attr("x1", w => Math.sin(w.a0) * baseR)
  .attr("y1", w => -Math.cos(w.a0) * baseR)
  .attr("x2", w => Math.sin(w.a0) * R)
  .attr("y2", w => -Math.cos(w.a0) * R)
  .attr("stroke", gridCol)
  .attr("stroke-width", 1);

const circleLayer = gridLayer.append("g");

// Outer rim (and inner rim when there is a hole)
[R].concat(baseR > 0 ? [baseR] : []).forEach(r => {
  gridLayer.append("circle")
    .attr("r", r).attr("fill", "none")
    .attr("stroke", gridCol).attr("stroke-width", 1);
});

// Grid value labels run along the spoke closest to 12 o'clock
const gridLabelAngle = wedges.reduce(
  (best, w) => Math.cos(w.a0) > Math.cos(best) ? w.a0 : best, wedges[0].a0);

function drawGrid(dur) {
  const circles = circleLayer.selectAll("circle")
    .data(ticks, t => t)
    .join(
      enter => enter.append("circle")
        .attr("fill", "none")
        .attr("stroke", gridCol)
        .attr("stroke-width", 1)
        .attr("r", t => rOf(t))
        .attr("opacity", 0),
      update => update,
      exit => exit.transition().duration(dur).attr("opacity", 0).remove()
    );
  circles.transition().duration(dur)
    .attr("r", t => rOf(t))
    .attr("opacity", 1)
    .attr("stroke-dasharray", "3,3");

  // value labels along one spoke, with a background halo
  const la = gridLabelAngle;
  const lbls = gridLabelLayer.selectAll("text")
    .data(ticks, t => t)
    .join(
      enter => enter.append("text")
        .attr("font-family", fontFamily)
        .attr("font-size", gridFontSize)
        .attr("fill", axisCol)
        .attr("fill-opacity", 0.65)
        .attr("stroke", bgcol)
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .style("paint-order", "stroke")
        .attr("text-anchor", "start")
        .attr("x", t => Math.sin(la) * rOf(t) + 3)
        .attr("y", t => -Math.cos(la) * rOf(t) - 3)
        .attr("opacity", 0),
      update => update,
      exit => exit.transition().duration(dur).attr("opacity", 0).remove()
    );
  lbls.text(t => tickFmt(t))
    .transition().duration(dur)
    .attr("x", t => Math.sin(la) * rOf(t) + 3)
    .attr("y", t => -Math.cos(la) * rOf(t) - 3)
    .attr("opacity", 1);
}

// Category labels just outside the outer grid circle
let catLabels = null;
if (showLabels) {
  const lr = R + popOffset + labelGap;
  catLabels = labelLayer.selectAll("text")
    .data(wedges)
    .join("text")
    .attr("font-family", fontFamily)
    .attr("font-size", labelSize)
    .attr("fill", axisCol)
    .attr("x", w => Math.sin(w.mid) * lr)
    .attr("y", w => -Math.cos(w.mid) * lr)
    .attr("text-anchor", w => {
      const s = Math.sin(w.mid);
      return Math.abs(s) < 0.2 ? "middle" : (s > 0 ? "start" : "end");
    })
    .attr("dy", w => {
      const c = Math.cos(w.mid);
      return c > 0.5 ? "0" : (c < -0.5 ? "0.75em" : "0.35em");
    })
    .text(w => w.cat);
}

// Visible wedges: one <g> per category (so the whole wedge can pop out)
const wedgeG = wedgeLayer.selectAll("g.wedge")
  .data(wedges)
  .join("g")
  .attr("class", "wedge");

const segPaths = wedgeG.selectAll("path")
  .data(w => w.segs)
  .join("path")
  .attr("fill", fillOf)
  .attr("fill-opacity", opacity)
  .attr("stroke", strokeCol)
  .attr("stroke-width", strokeWidth)
  .style("pointer-events", "none");

// Invisible hit areas that never move (prevents hover flicker when popping)
const hitPaths = hitLayer.selectAll("path")
  .data(wedges.flatMap(w => w.segs))
  .join("path")
  .attr("fill", "transparent")
  .style("cursor", hover ? "pointer" : null);

function update(dur, initial) {
  computeLayout();
  drawGrid(initial ? 0 : dur);

  segPaths.each(function (s) {
    if (!this._cur) this._cur = initial && animate ? { lo: baseR, hi: baseR } : targetRadii(s);
  });

  const t = segPaths.transition()
    .duration(initial && !animate ? 0 : dur)
    .delay(s => initial && animate ? s.i * (500 / Math.max(1, nCat)) : 0)
    .ease(d3.easeCubicOut);

  t.attrTween("d", function (s) {
    const node = this;
    const interp = d3.interpolate(node._cur, targetRadii(s));
    return function (k) {
      node._cur = interp(k);
      return arcPath(s, node._cur);
    };
  });

  // hit areas: full wedge (from baseR to the stack top) per segment, final geometry
  hitPaths.attr("d", s => arcPath(s, targetRadii(s)))
    .style("display", s => hiddenGroups.has(s.grp) || s.hi <= s.lo ? "none" : null);
}

// ---------------------------------------------------------------------------
// Tooltip (in-SVG group, see beeswarmplot.js for rationale)
// ---------------------------------------------------------------------------
const tip = svg.append("g")
  .attr("class", "rose-tooltip")
  .style("pointer-events", "none")
  .style("opacity", 0);
const tipRect = tip.append("rect")
  .attr("rx", 4).attr("ry", 4)
  .attr("fill", "white")
  .attr("fill-opacity", 0.96)
  .attr("stroke", "#ccc")
  .attr("stroke-width", 1);
const tipBody = tip.append("g");
const tipPadX = 10, tipPadY = 8, tipLineH = 17;

function tipLines(seg) {
  const w = wedges[seg.i];
  const lines = [{ text: w.cat, bold: true }];
  if (hasGroup) {
    w.segs.forEach(s => {
      if (hiddenGroups.has(s.grp)) return;
      lines.push({
        swatch: colorScale(s.grp),
        label: s.grp + ": ",
        text: fmt(s.value),
        bold: s.grp === seg.grp
      });
    });
    lines.push({ label: "Total: ", text: fmt(w.total), bold: false, muted: true });
  } else {
    const grand = d3.sum(wedges, ww => ww.total);
    lines.push({ swatch: fillOf(seg), label: valueCol + ": ", text: fmt(seg.value), bold: false });
    lines.push({ label: "Share: ", text: grand > 0 ? pctFmt(seg.value / grand) : "-", muted: true });
  }
  return lines;
}

function showTip(seg) {
  tipBody.selectAll("*").remove();
  tipLines(seg).forEach((l, i) => {
    const y = tipPadY + 12 + i * tipLineH;
    let x = tipPadX;
    if (l.swatch) {
      tipBody.append("circle")
        .attr("cx", x + 4).attr("cy", y - 4).attr("r", 4)
        .attr("fill", l.swatch);
      x += 14;
    }
    const txt = tipBody.append("text")
      .attr("x", x).attr("y", y)
      .attr("font-family", fontFamily)
      .attr("font-size", i === 0 ? 12.5 : 12)
      .attr("fill", l.muted ? "#666" : "#222");
    if (l.label) {
      txt.append("tspan").attr("font-weight", l.bold ? "bold" : "normal").text(l.label);
    }
    txt.append("tspan").attr("font-weight", "bold").text(l.text);
  });
  const bb = tipBody.node().getBBox();
  tipRect
    .attr("x", 0).attr("y", 0)
    .attr("width",  bb.x + bb.width  + tipPadX)
    .attr("height", bb.y + bb.height + tipPadY);
  tip.raise().interrupt().style("opacity", 1);
}

function moveTip(xy) {
  const r  = tipRect.node();
  const bw = +r.getAttribute("width"), bh = +r.getAttribute("height");
  let tx = xy[0] + 14, ty = xy[1] + 14;
  if (tx + bw > width - 2)  tx = xy[0] - 14 - bw;
  if (ty + bh > height - 2) ty = xy[1] - 14 - bh;
  tx = Math.max(2, tx); ty = Math.max(2, ty);
  tip.attr("transform", `translate(${tx},${ty})`);
}

function hideTip() {
  tip.interrupt().transition().duration(150).style("opacity", 0);
}

function pointerOf(event) {
  if (d3.pointer) return d3.pointer(event, svg.node());
  return d3.mouse(svg.node());
}

// ---------------------------------------------------------------------------
// Hover / focus state
// ---------------------------------------------------------------------------
function applyState(activeSeg, focusGroup) {
  wedgeG.interrupt("pop").transition("pop").duration(180)
    .attr("transform", w => {
      if (!activeSeg || w.i !== activeSeg.i) return "translate(0,0)";
      return `translate(${Math.sin(w.mid) * popOffset},${-Math.cos(w.mid) * popOffset})`;
    });
  segPaths
    .attr("fill-opacity", s => {
      if (activeSeg) return s.i === activeSeg.i ? (s.grp === activeSeg.grp || !hasGroup ? 1 : opacity) : opacity * 0.4;
      if (focusGroup) return s.grp === focusGroup ? 1 : opacity * 0.2;
      return opacity;
    })
    .attr("stroke-width", s =>
      activeSeg && s.i === activeSeg.i && s.grp === activeSeg.grp ? strokeWidth + 1 : strokeWidth);
  if (catLabels) {
    catLabels
      .attr("font-weight", w => activeSeg && w.i === activeSeg.i ? "bold" : "normal")
      .attr("fill-opacity", w => activeSeg && w.i !== activeSeg.i ? 0.5 : 1);
  }
}

if (hover) {
  hitPaths
    .on("mouseover", function (event, d) {
      if (typeof d3.pointer !== "function") { d = event; event = d3.event; }
      applyState(d, null);
      showTip(d);
      moveTip(pointerOf(event));
    })
    .on("mousemove", function (event, d) {
      if (typeof d3.pointer !== "function") { d = event; event = d3.event; }
      moveTip(pointerOf(event));
    })
    .on("mouseout", function () {
      applyState(null, null);
      hideTip();
    });
}

// ---------------------------------------------------------------------------
// Legend (stacked mode): hover to focus a group, click to toggle it
// ---------------------------------------------------------------------------
if (hasGroup && showLegend) {
  const legend = svg.append("g")
    .attr("class", "rose-legend")
    .attr("transform", `translate(0,${8 + titleOffset})`);

  const items = legend.selectAll("g.item")
    .data(legendItems)
    .join("g")
    .attr("class", "item")
    .attr("transform", it => `translate(${it.x},${it.y})`)
    .style("cursor", "pointer")
    .style("user-select", "none");

  items.append("rect")   // generous transparent hit box
    .attr("x", -2).attr("y", -2)
    .attr("width", it => it.w - 12).attr("height", legendSize + 6)
    .attr("fill", "transparent");

  items.append("circle")
    .attr("class", "swatch")
    .attr("cx", legendSize / 2).attr("cy", legendSize / 2 + 1)
    .attr("r", legendSize / 2 - 0.5)
    .attr("fill", it => colorScale(it.name));

  items.append("text")
    .attr("x", legendSize + 6)
    .attr("y", legendSize / 2 + 1)
    .attr("dy", "0.35em")
    .attr("font-family", fontFamily)
    .attr("font-size", legendSize)
    .attr("fill", axisCol)
    .text(it => it.name);

  function paintLegend() {
    items.select("circle.swatch")
      .attr("fill", it => hiddenGroups.has(it.name) ? "#cccccc" : colorScale(it.name));
    items.select("text")
      .attr("fill", it => hiddenGroups.has(it.name) ? "#aaaaaa" : axisCol)
      .style("text-decoration", it => hiddenGroups.has(it.name) ? "line-through" : null);
  }

  items
    .on("mouseover", function (event, it) {
      if (typeof d3.pointer !== "function") { it = event; event = d3.event; }
      if (!hiddenGroups.has(it.name)) applyState(null, it.name);
    })
    .on("mouseout", function () { applyState(null, null); })
    .on("click", function (event, it) {
      if (typeof d3.pointer !== "function") { it = event; event = d3.event; }
      if (hiddenGroups.has(it.name)) {
        hiddenGroups.delete(it.name);
      } else if (hiddenGroups.size < groups.length - 1) {
        hiddenGroups.add(it.name);          // always keep at least one group
      }
      paintLegend();
      update(600, false);
      applyState(null, hiddenGroups.has(it.name) ? null : it.name);
    });
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------
if (title) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 8 + titleSize)
    .attr("text-anchor", "middle")
    .attr("font-size", titleSize)
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .attr("fill", axisCol)
    .text(title);
}

update(animate ? 900 : 0, true);
