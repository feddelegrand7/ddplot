// scatter_plot(): interactive scatter / bubble plot.
//
// data: rows {x, y, i, g?, s?, l?, a?, t0..tk?}
//   i = row number in the R data frame, g = group (category or number),
//   s = size variable, l = label, a = draw the label, t* = extra tooltip cells.
// Works with D3 v5 and v6. Hidden groups and the zoom are kept in
// r2d3.ddplotState so a Shiny update or a resize keeps the view.

const o = options;
const isV6 = typeof d3.pointer === "function";
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const gridCol = o.gridCol || null;
const bgcol = o.bgcol || "white";
const ACCENT = "#4269d0";
const uid = "ddsp" + Math.random().toString(36).slice(2, 9);
const arr = v => (v === null || v === undefined) ? [] : [].concat(v);
const num = v => (v === null || v === undefined || v === "NA" || v === "" || !isFinite(+v)) ? null : +v;
const evOf = a => isV6 ? a : d3.event;
const ptr = (a, node) => isV6 ? d3.pointer(a, node) : d3.mouse(node);
const xLog = o.xScale === "log", yLog = o.yScale === "log";

svg.style("background-color", bgcol).style("font-family", font);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
const stKey = o.x + "|" + o.y + "|" + o.xScale + "|" + o.yScale;
if (!state.scatter || state.scatter.key !== stKey) state.scatter = { key: stKey };
const st = state.scatter;

// Shiny output id (the widget element hosts r2d3's shadow root)
let hostId = null;
(function () {
  let el = svg.node();
  while (el) {
    if (el.classList && el.classList.contains("html-widget")) { hostId = el.id || null; break; }
    el = el.parentNode || el.host || null;
  }
})();
function sendShiny(suffix, value) {
  if (hostId && window.Shiny && typeof window.Shiny.setInputValue === "function") {
    window.Shiny.setInputValue(hostId + "_" + suffix, value, { priority: "event" });
  }
}

// ---- points -------------------------------------------------------------------
const groupType = o.groupType || "none";
const levels = arr(o.levels).map(String);
const lvColors = arr(o.colors);
const tipNames = arr(o.tipNames).map(String);
const groups = levels.map((name, k) => ({ name, color: lvColors[k % lvColors.length] || ACCENT }));
const groupBy = new Map(groups.map(g => [g.name, g]));

const pts = (data || []).map(r => ({
  x: +r.x, y: +r.y, i: r.i,
  g: groupType === "categorical" ? String(r.g) : (groupType === "continuous" ? num(r.g) : null),
  s: o.sizeBy ? num(r.s) : null,
  l: (r.l === null || r.l === undefined) ? null : String(r.l),
  a: !!r.a,
  tips: tipNames.map((_, k) => r["t" + k])
})).filter(p => isFinite(p.x) && isFinite(p.y));

if (!pts.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}

// colour
let contScale = null, gExt = null;
if (groupType === "continuous") {
  const gv = pts.map(p => p.g).filter(v => v !== null);
  gExt = gv.length ? d3.extent(gv) : [0, 1];
  if (gExt[0] === gExt[1]) gExt = [gExt[0] - 1, gExt[1] + 1];
  const stops = lvColors;
  if (stops.length >= 2) {
    contScale = d3.scaleLinear()
      .domain(stops.map((_, k) => gExt[0] + k * (gExt[1] - gExt[0]) / (stops.length - 1)))
      .range(stops).interpolate(d3.interpolateRgb).clamp(true);
  } else {
    contScale = d3.scaleSequential(d3.interpolateViridis).domain(gExt).clamp(true);
  }
}
function colorOf(p) {
  if (groupType === "categorical") return (groupBy.get(p.g) || { color: ACCENT }).color;
  if (groupType === "continuous") return p.g === null ? "#b4b4b4" : contScale(p.g);
  return o.col || ACCENT;
}

// size: area grows linearly with the value, from sizeRange[0] to sizeRange[1]
const sizeRange = arr(o.sizeRange).map(Number);
const r0 = sizeRange[0] || 3, r1 = sizeRange[1] || 16;
let sExt = null;
if (o.sizeBy) {
  const sv = pts.map(p => p.s).filter(v => v !== null);
  sExt = sv.length ? d3.extent(sv) : [0, 1];
}
function radiusOf(s) {
  if (!o.sizeBy) return +o.size || 4;
  if (s === null) return r0;
  if (sExt[0] === sExt[1]) return (r0 + r1) / 2;
  const t = (s - sExt[0]) / (sExt[1] - sExt[0]);
  return Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * t);
}
pts.forEach(p => { p.r = radiusOf(p.s); p.color = colorOf(p); });
pts.sort((a, b) => b.r - a.r); // big bubbles first, small ones stay on top

// trends
const trends = arr(o.trends).map(t => {
  const xs = arr(t.x), ys = arr(t.y), lo = arr(t.lo), hi = arr(t.hi);
  const g = (t.group === null || t.group === undefined) ? null : String(t.group);
  return {
    group: g,
    method: t.method,
    stats: t.stats || {},
    color: g !== null && groupBy.has(g) ? groupBy.get(g).color : axisCol,
    line: xs.map((xv, k) => ({ x: +xv, y: +ys[k], lo: lo.length ? +lo[k] : null, hi: hi.length ? +hi[k] : null }))
  };
});
const hlines = arr(o.hlines), vlines = arr(o.vlines);

// hidden groups survive re-renders
const hidden = new Set(arr(st.hidden).filter(n => groupBy.has(n)));
if (hidden.size >= groups.length) hidden.clear();
const isVisible = p => !(groupType === "categorical" && hidden.has(p.g));

// ---- formats --------------------------------------------------------------------
const fmtAuto = d3.format(",.6~r");
const fmtX = o.xFormat ? d3.format(o.xFormat) : fmtAuto;
const fmtY = o.yFormat ? d3.format(o.yFormat) : fmtAuto;
const fmtShort = d3.format(",.3~r");
const fmtCell = v => (typeof v === "number" && isFinite(v)) ? fmtAuto(v) : (v === null || v === undefined || v === "" ? "–" : String(v));

// ---- text measurement ----------------------------------------------------------
const measurer = svg.append("text").attr("x", -9999).attr("y", -9999).style("font-family", font);
function tw(str, size, weight) {
  measurer.style("font-size", size + "px").style("font-weight", weight || 400).text(str);
  const w = measurer.node().getComputedTextLength();
  measurer.text("");
  return w > 0 ? w : String(str).length * size * 0.6;
}
function truncate(str, maxW, size, weight) {
  str = String(str);
  if (tw(str, size, weight) <= maxW) return str;
  let s = str;
  while (s.length > 1 && tw(s + "…", size, weight) > maxW) s = s.slice(0, -1);
  return s + "…";
}

// ---- domains --------------------------------------------------------------------
function padDomain(ext, isLog) {
  let [a, b] = ext;
  if (isLog) {
    let la = Math.log10(a), lb = Math.log10(b);
    if (la === lb) { la -= 0.5; lb += 0.5; }
    const pad = (lb - la) * 0.04;
    return [Math.pow(10, la - pad), Math.pow(10, lb + pad)];
  }
  if (a === b) { const d = Math.abs(a) * 0.1 || 1; a -= d; b += d; }
  const pad = (b - a) * 0.04;
  return [a - pad, b + pad];
}
const xVals = pts.map(p => p.x).concat(vlines.map(l => +l.value).filter(v => isFinite(v) && (!xLog || v > 0)));
const yVals = pts.map(p => p.y).concat(hlines.map(l => +l.value).filter(v => isFinite(v) && (!yLog || v > 0)));
const fullX = padDomain(d3.extent(xVals), xLog);
const fullY = padDomain(d3.extent(yVals), yLog);
const mkScale = isLog => isLog ? d3.scaleLog() : d3.scaleLinear();
(function () { // nice the linear domains once, so the full view has round ends
  if (!xLog) { const s = d3.scaleLinear().domain(fullX).nice(); fullX[0] = s.domain()[0]; fullX[1] = s.domain()[1]; }
  if (!yLog) { const s = d3.scaleLinear().domain(fullY).nice(); fullY[0] = s.domain()[0]; fullY[1] = s.domain()[1]; }
})();
let viewX = fullX.slice(), viewY = fullY.slice();
if (st.view && st.view.x && st.view.y) {
  const vx = st.view.x, vy = st.view.y;
  const inside = (v, f) => v[0] < v[1] && v[1] > f[0] && v[0] < f[1];
  if (inside(vx, fullX) && inside(vy, fullY)) { viewX = vx.slice(); viewY = vy.slice(); }
}
const isZoomed = () => !(viewX[0] === fullX[0] && viewX[1] === fullX[1] && viewY[0] === fullY[0] && viewY[1] === fullY[1]);

// ---- layout ---------------------------------------------------------------------
const padL = 14, padR = 16;
let top = 14;
if (o.title) {
  svg.append("text").attr("x", padL).attr("y", top + o.titleFontSize * 0.8)
    .style("font-size", o.titleFontSize + "px").style("font-weight", 700)
    .style("fill", axisCol).text(o.title);
  top += o.titleFontSize + 6;
}
if (o.subtitle) {
  svg.append("text").attr("x", padL).attr("y", top + o.subtitleFontSize * 0.8)
    .style("font-size", o.subtitleFontSize + "px").style("fill", axisCol)
    .style("opacity", 0.65).text(o.subtitle);
  top += o.subtitleFontSize + 6;
}

// legend items laid out in wrapped rows
const legendItems = [];
if (o.legend) {
  if (groupType === "categorical") {
    groups.forEach(g => legendItems.push({ type: "cat", g, w: 20 + tw(g.name, 12) + 14, h: 22 }));
  } else if (groupType === "continuous") {
    const lbl = String(o.group || "");
    const lw = lbl ? tw(lbl, 11.5, 600) + 8 : 0;
    const a = fmtShort(gExt[0]), b = fmtShort(gExt[1]);
    legendItems.push({ type: "grad", lbl, lw, a, b, aw: tw(a, 11), w: lw + tw(a, 11) + 6 + 110 + 6 + tw(b, 11) + 18, h: 22 });
  }
  if (o.sizeBy && sExt) {
    const vals = sExt[0] === sExt[1] ? [sExt[0]] : [sExt[0], (sExt[0] + sExt[1]) / 2, sExt[1]];
    const lbl = String(o.sizeBy);
    const lw = tw(lbl, 11.5, 600) + 8;
    let w = lw;
    const circles = vals.map(v => {
      const r = radiusOf(v), t = fmtShort(v);
      const c = { v, r, t, x: w + r };
      w += 2 * r + 4 + tw(t, 11) + 12;
      return c;
    });
    const h = Math.max(22, 2 * r1 + 6);
    legendItems.push({ type: "size", lbl, lw, circles, w: w + 6, h });
  }
}
const legendRows = [];
if (legendItems.length) {
  const availW = W - padL - padR;
  let row = { items: [], w: 0, h: 22 };
  legendItems.forEach(it => {
    if (row.items.length && row.w + it.w > availW) { legendRows.push(row); row = { items: [], w: 0, h: 22 }; }
    it.x = row.w;
    row.items.push(it);
    row.w += it.w;
    row.h = Math.max(row.h, it.h);
  });
  legendRows.push(row);
  top += 2;
}
const legendTop = top;
legendRows.forEach(r => { r.y = top; top += r.h + 2; });
if (legendRows.length) top += 6;
if (o.ytitle) top += o.ytitleFontSize + 8;
top += 6;

let bottom = 8 + 22;                          // x axis
if (o.xtitle) bottom += o.xtitleFontSize + 8;

const plotH0 = Math.max(60, H - top - bottom);
const nTicksY = o.yticks || Math.max(2, Math.round(plotH0 / 55));

// y axis width from the labels of the full and current domain
const yTickFmt = (scale) => {
  if (yLog) return scale.tickFormat(nTicksY, o.yFormat || "~s");
  return o.yFormat ? d3.format(o.yFormat) : scale.tickFormat(nTicksY);
};
function yLabelWidth(dom) {
  const s = mkScale(yLog).domain(dom);
  const f = yTickFmt(s);
  return d3.max(s.ticks(nTicksY).map(t => tw(f(t), 11))) || 20;
}
const yAxisW = Math.max(yLabelWidth(fullY), yLabelWidth(viewY)) + 10;

const px0 = padL + yAxisW + 4, px1 = W - padR;
const py0 = top, py1 = H - bottom;
const plotW = Math.max(40, px1 - px0), plotH = Math.max(40, py1 - py0);
const nTicksX = o.xticks || Math.max(2, Math.round(plotW / 95));

const x = mkScale(xLog).domain(viewX).range([px0, px1]);
const y = mkScale(yLog).domain(viewY).range([py1, py0]);

// ---- static chrome ----------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "-clip").append("rect")
  .attr("x", px0).attr("y", py0).attr("width", plotW).attr("height", plotH);
const shadow = defs.append("filter").attr("id", uid + "-shadow")
  .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
  .attr("flood-color", "#000").attr("flood-opacity", 0.14);

if (o.ytitle) {
  svg.append("text").attr("x", padL).attr("y", py0 - 10)
    .style("font-size", o.ytitleFontSize + "px").style("font-weight", 600)
    .style("fill", axisCol).text(o.ytitle);
}
if (o.xtitle) {
  svg.append("text").attr("x", px0 + plotW / 2).attr("y", H - 10).attr("text-anchor", "middle")
    .style("font-size", o.xtitleFontSize + "px").style("font-weight", 600)
    .style("fill", axisCol).text(o.xtitle);
}

const gGridY = svg.append("g");
const gGridX = svg.append("g");
const gAxisX = svg.append("g").attr("transform", `translate(0,${py1})`);
const gAxisY = svg.append("g").attr("transform", `translate(${px0},0)`);
const gPlot = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gBand = gPlot.append("g");
const gRef = gPlot.append("g");
const gPts = gPlot.append("g");
const gTrend = gPlot.append("g");
const gLabels = gPlot.append("g");
const gHover = svg.append("g").style("pointer-events", "none").style("display", "none");
const gBrush = svg.append("g");
const gTools = svg.append("g");
const gTip = svg.append("g").style("pointer-events", "none").style("display", "none");

// ---- axes and grid ----------------------------------------------------------------
function axisX() {
  const a = d3.axisBottom(x).tickSizeOuter(0).tickSize(5).tickPadding(6);
  if (xLog) a.ticks(nTicksX, o.xFormat || "~s");
  else { a.ticks(nTicksX); if (o.xFormat) a.tickFormat(d3.format(o.xFormat)); }
  return a;
}
function axisY() {
  const a = d3.axisLeft(y).tickSizeOuter(0).tickSize(0).tickPadding(8);
  if (yLog) a.ticks(nTicksY, o.yFormat || "~s");
  else { a.ticks(nTicksY); if (o.yFormat) a.tickFormat(d3.format(o.yFormat)); }
  return a;
}
function gridTicks(scale, n, isLog) {
  const t = scale.ticks(n);
  if (!isLog) return t;
  return t.filter(v => { const m = v / Math.pow(10, Math.floor(Math.log10(v) + 1e-9)); return Math.abs(m - 1) < 1e-6 || Math.abs(m - 2) < 1e-6 || Math.abs(m - 5) < 1e-6; });
}
function styleAxis(g) {
  g.selectAll("path.domain").attr("stroke", axisCol).attr("stroke-opacity", 0.35);
  g.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.35);
  g.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.8)
    .style("font-size", "11px").style("font-family", font);
}
function drawAxes(dur) {
  const tx = d => dur ? d.transition().duration(dur) : d;
  tx(gAxisX).call(axisX());
  tx(gAxisY).call(axisY());
  styleAxis(gAxisX); styleAxis(gAxisY);
  gAxisY.select("path.domain").remove();
  if (gridCol) {
    const gy = gGridY.selectAll("line").data(gridTicks(y, nTicksY, yLog), d => d);
    gy.exit().remove();
    tx(gy.enter().append("line").attr("stroke", gridCol).merge(gy))
      .attr("x1", px0).attr("x2", px1).attr("y1", d => y(d)).attr("y2", d => y(d));
    const gx = gGridX.selectAll("line").data(gridTicks(x, nTicksX, xLog), d => d);
    gx.exit().remove();
    tx(gx.enter().append("line").attr("stroke", gridCol).attr("stroke-opacity", 0.7).merge(gx))
      .attr("y1", py0).attr("y2", py1).attr("x1", d => x(d)).attr("x2", d => x(d));
  }
}

// ---- reference lines ----------------------------------------------------------------
function drawRefs(dur) {
  const tx = d => dur ? d.transition().duration(dur) : d;
  const hs = gRef.selectAll("g.h").data(hlines.filter(l => isFinite(+l.value) && (!yLog || +l.value > 0)));
  const hsE = hs.enter().append("g").attr("class", "h");
  hsE.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.55).attr("stroke-dasharray", "4,4");
  hsE.append("text").attr("text-anchor", "end").attr("dy", "-0.35em")
    .style("font-size", "11px").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("paint-order", "stroke").style("stroke", bgcol).style("stroke-width", 3);
  const hsM = hsE.merge(hs);
  tx(hsM.select("line")).attr("x1", px0).attr("x2", px1).attr("y1", d => y(+d.value)).attr("y2", d => y(+d.value));
  tx(hsM.select("text")).attr("x", px1 - 4).attr("y", d => y(+d.value)).text(d => d.label || fmtY(+d.value));

  const vs = gRef.selectAll("g.v").data(vlines.filter(l => isFinite(+l.value) && (!xLog || +l.value > 0)));
  const vsE = vs.enter().append("g").attr("class", "v");
  vsE.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.55).attr("stroke-dasharray", "4,4");
  vsE.append("text").attr("dx", "0.4em").attr("dy", "1em")
    .style("font-size", "11px").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("paint-order", "stroke").style("stroke", bgcol).style("stroke-width", 3);
  const vsM = vsE.merge(vs);
  tx(vsM.select("line")).attr("y1", py0).attr("y2", py1).attr("x1", d => x(+d.value)).attr("x2", d => x(+d.value));
  tx(vsM.select("text")).attr("x", d => x(+d.value)).attr("y", py0 + 2).text(d => d.label || fmtX(+d.value));
}

// ---- points ---------------------------------------------------------------------
const baseOpacity = (o.opacity === null || o.opacity === undefined) ? 0.8 : +o.opacity;
const strokeCol = o.stroke || bgcol;
const strokeW = (o.strokeWidth === null || o.strokeWidth === undefined) ? (o.sizeBy ? 1 : 0.75) : +o.strokeWidth;
const circles = gPts.selectAll("circle").data(pts).enter().append("circle")
  .attr("fill", p => p.color)
  .attr("stroke", strokeCol).attr("stroke-width", strokeW)
  .attr("cx", p => x(p.x)).attr("cy", p => y(p.y));

const firstRender = !st.drawn;
st.drawn = true;
if (o.animate && firstRender) {
  circles.attr("r", 0).transition()
    .delay(p => Math.max(0, Math.min(1, (x(p.x) - px0) / plotW)) * 450)
    .duration(500).ease(d3.easeBackOut ? d3.easeBackOut.overshoot(1.4) : d3.easeCubicOut)
    .attr("r", p => p.r);
} else {
  circles.attr("r", p => p.r);
}

let focusGroup = null;   // group highlighted from the legend
let selected = null;     // Set of selected points (brush)
function stylePoints() {
  circles
    .style("display", p => isVisible(p) ? null : "none")
    .attr("fill-opacity", p => {
      let op = baseOpacity;
      if (selected && !selected.has(p)) op *= 0.15;
      if (focusGroup !== null && p.g !== focusGroup) op *= 0.15;
      return op;
    })
    .attr("stroke-opacity", p => (selected && !selected.has(p)) || (focusGroup !== null && p.g !== focusGroup) ? 0.2 : 1);
}

// ---- trend lines ------------------------------------------------------------------
const lineGen = d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveMonotoneX);
const bandGen = d3.area().x(d => x(d.x)).y0(d => y(d.lo)).y1(d => y(d.hi)).curve(d3.curveMonotoneX);
const trendVisible = t => !(t.group !== null && hidden.has(t.group));
const bands = gBand.selectAll("path").data(trends.filter(t => t.line.length && t.line[0].lo !== null)).enter()
  .append("path").attr("fill", t => t.color).attr("fill-opacity", 0.12);
const trendHalo = gTrend.selectAll("path.halo").data(trends).enter().append("path").attr("class", "halo")
  .attr("fill", "none").attr("stroke", bgcol).attr("stroke-width", 5).attr("stroke-opacity", 0.8);
const trendLines = gTrend.selectAll("path.line").data(trends).enter().append("path").attr("class", "line")
  .attr("fill", "none").attr("stroke", t => t.color).attr("stroke-width", 2.25).attr("stroke-linecap", "round");
function styleTrends() {
  const op = t => focusGroup !== null && t.group !== null && t.group !== focusGroup ? 0.15 : 1;
  bands.style("display", t => trendVisible(t) ? null : "none").attr("fill-opacity", t => 0.12 * op(t));
  trendHalo.style("display", t => trendVisible(t) ? null : "none");
  trendLines.style("display", t => trendVisible(t) ? null : "none").attr("stroke-opacity", op);
}
function drawTrends(dur) {
  const tx = d => dur ? d.transition().duration(dur) : d;
  tx(bands).attr("d", t => bandGen(t.line));
  tx(trendHalo).attr("d", t => lineGen(t.line));
  tx(trendLines).attr("d", t => lineGen(t.line));
  trends.forEach(t => { t.px = t.line.map(d => [x(d.x), y(d.y)]); });
}

// ---- labels (greedy placement, no overlaps) ------------------------------------------
const labelled = pts.filter(p => p.a && p.l !== null);
function drawLabels() {
  gLabels.selectAll("*").remove();
  if (!labelled.length) return;
  const boxes = [];
  const overlaps = b => boxes.some(c => b.x0 < c.x1 && b.x1 > c.x0 && b.y0 < c.y1 && b.y1 > c.y0);
  const fs = 11;
  labelled.filter(isVisible).forEach(p => {
    const cx = x(p.x), cy = y(p.y);
    if (cx < px0 || cx > px1 || cy < py0 || cy > py1) return;
    const text = truncate(p.l, 160, fs, 600);
    const w = tw(text, fs, 600), h = fs + 2, d = p.r + 3;
    const cands = [
      [cx + d, cy - h / 2, "start"], [cx - d - w, cy - h / 2, "end"],
      [cx - w / 2, cy - d - h, "middle"], [cx - w / 2, cy + d, "middle"],
      [cx + d * 0.7, cy - d * 0.7 - h, "start"], [cx - d * 0.7 - w, cy - d * 0.7 - h, "end"],
      [cx + d * 0.7, cy + d * 0.7, "start"], [cx - d * 0.7 - w, cy + d * 0.7, "end"]
    ];
    let pick = null;
    for (const c of cands) {
      const b = { x0: c[0], y0: c[1], x1: c[0] + w, y1: c[1] + h };
      if (b.x0 < px0 || b.x1 > px1 || b.y0 < py0 || b.y1 > py1) continue;
      if (!overlaps(b)) { pick = b; break; }
    }
    if (!pick) return;
    boxes.push(pick);
    gLabels.append("text").attr("x", pick.x0).attr("y", pick.y0 + h / 2).attr("dy", "0.35em")
      .style("font-size", fs + "px").style("font-weight", 600).style("fill", axisCol)
      .style("paint-order", "stroke").style("stroke", bgcol).style("stroke-width", 3)
      .style("stroke-linejoin", "round")
      .style("opacity", focusGroup !== null && p.g !== focusGroup ? 0.2 : 1)
      .text(text);
  });
}

// ---- hover lookup ---------------------------------------------------------------------
let qt = null;
function rebuildIndex() {
  qt = d3.quadtree().x(p => x(p.x)).y(p => y(p.y))
    .addAll(pts.filter(p => isVisible(p) && x(p.x) >= px0 - 1 && x(p.x) <= px1 + 1 && y(p.y) >= py0 - 1 && y(p.y) <= py1 + 1));
}

// ---- update -------------------------------------------------------------------------
function update(dur) {
  x.domain(viewX); y.domain(viewY);
  st.view = isZoomed() ? { x: viewX.slice(), y: viewY.slice() } : null;
  drawAxes(dur);
  drawRefs(dur);
  const c = dur ? circles.transition().duration(dur) : circles;
  c.attr("cx", p => x(p.x)).attr("cy", p => y(p.y));
  drawTrends(dur);
  stylePoints();
  styleTrends();
  rebuildIndex();
  if (dur) { gLabels.style("opacity", 0); ddplotTrack(d3.timeout(() => { drawLabels(); gLabels.transition().duration(200).style("opacity", 1); }, dur)); }
  else drawLabels();
  renderTools();
}

// ---- legend -----------------------------------------------------------------------------
const gLegend = svg.append("g");
legendRows.forEach(row => {
  row.items.forEach(it => {
    const g = gLegend.append("g").attr("transform", `translate(${padL + it.x},${row.y + (row.h - it.h) / 2})`);
    if (it.type === "cat") {
      g.datum(it).attr("class", "item").style("cursor", "pointer");
      g.append("rect").attr("x", -4).attr("width", it.w - 6).attr("height", 22).attr("rx", 4)
        .attr("fill", axisCol).attr("fill-opacity", 0);
      g.append("circle").attr("cx", 6).attr("cy", 11).attr("r", 5).attr("fill", it.g.color);
      g.append("text").attr("x", 18).attr("y", 11).attr("dy", "0.35em")
        .style("font-size", "12px").style("fill", axisCol).text(it.g.name);
    } else if (it.type === "grad") {
      const gid = uid + "-grad";
      const lg = defs.append("linearGradient").attr("id", gid);
      d3.range(0, 1.0001, 0.1).forEach(t => lg.append("stop").attr("offset", t)
        .attr("stop-color", contScale(gExt[0] + t * (gExt[1] - gExt[0]))));
      if (it.lbl) g.append("text").attr("y", 11).attr("dy", "0.35em").style("font-size", "11.5px")
        .style("font-weight", 600).style("fill", axisCol).text(it.lbl);
      g.append("text").attr("x", it.lw).attr("y", 11).attr("dy", "0.35em").style("font-size", "11px")
        .style("fill", axisCol).style("fill-opacity", 0.75).text(it.a);
      const gx = it.lw + it.aw + 6;
      g.append("rect").attr("x", gx).attr("y", 6).attr("width", 110).attr("height", 10).attr("rx", 3)
        .attr("fill", `url(#${gid})`);
      it.markerX = gx;
      it.marker = g.append("path").attr("d", "M-5,0L5,0L0,6Z").attr("fill", axisCol).style("display", "none");
      g.append("text").attr("x", gx + 116).attr("y", 11).attr("dy", "0.35em").style("font-size", "11px")
        .style("fill", axisCol).style("fill-opacity", 0.75).text(it.b);
    } else if (it.type === "size") {
      const cy = it.h / 2;
      g.append("text").attr("y", cy).attr("dy", "0.35em").style("font-size", "11.5px")
        .style("font-weight", 600).style("fill", axisCol).text(it.lbl);
      it.circles.forEach(c => {
        g.append("circle").attr("cx", it.lw + c.x).attr("cy", cy).attr("r", c.r)
          .attr("fill", axisCol).attr("fill-opacity", 0.12).attr("stroke", axisCol).attr("stroke-opacity", 0.45);
        g.append("text").attr("x", it.lw + c.x + c.r + 4).attr("y", cy).attr("dy", "0.35em")
          .style("font-size", "11px").style("fill", axisCol).style("fill-opacity", 0.75).text(c.t);
      });
    }
  });
});
const gradItem = legendItems.find(it => it.type === "grad");
const legendCat = gLegend.selectAll("g.item");
function styleLegend() {
  legendCat.style("opacity", d => hidden.has(d.g.name) ? 0.4 : 1);
  legendCat.select("text").style("text-decoration", d => hidden.has(d.g.name) ? "line-through" : null);
}
function setFocus(name) {
  if (focusGroup === name) return;
  focusGroup = name;
  stylePoints(); styleTrends(); drawLabels();
}
function afterVisibilityChange() {
  st.hidden = Array.from(hidden);
  setFocus(null);
  styleLegend();
  stylePoints(); styleTrends(); drawLabels();
  if (selected) applySelection(lastBox);
  rebuildIndex();
  hideHover();
}
let clickTimer = null;
legendCat
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g.name)) setFocus(d.g.name);
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect").attr("fill-opacity", 0);
    setFocus(null);
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      const name = d.g.name;
      if (!hidden.has(name)) {
        if (groups.length - hidden.size <= 1) return;
        hidden.add(name);
      } else hidden.delete(name);
      afterVisibilityChange();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = groups.length - hidden.size === 1 && !hidden.has(d.g.name);
    hidden.clear();
    if (!onlyThis) groups.forEach(g => { if (g.name !== d.g.name) hidden.add(g.name); });
    afterVisibilityChange();
  });

// ---- hover: point / trend tooltip -------------------------------------------------------
const hoverRing = gHover.append("circle").attr("fill", "none").attr("stroke-width", 2);
const guideX = gHover.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "3,3");
const guideY = gHover.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "3,3");
function pill() {
  const g = gHover.append("g");
  const rect = g.append("rect").attr("rx", 4).attr("height", 20).attr("fill", axisCol);
  const text = g.append("text").attr("y", 10).attr("dy", "0.35em").attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", bgcol).style("font-weight", 600);
  return { g, rect, text };
}
const pillX = pill(), pillY = pill();
const trendDot = gHover.append("circle").attr("r", 4.5).attr("stroke", bgcol).attr("stroke-width", 2);
const tipRect = gTip.append("rect").attr("rx", 6).attr("fill", bgcol)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("filter", `url(#${uid}-shadow)`);
const tipBody = gTip.append("g");

function hideHover() {
  gHover.style("display", "none");
  gTip.style("display", "none");
  hovered = null;
  if (gradItem) gradItem.marker.style("display", "none");
}

function buildTip(head, headColor, rows) {
  tipBody.selectAll("*").remove();
  const pad = 10, lh = 18, fs = 11.5;
  let yy = pad + 9;
  let w = 0;
  if (head) {
    const h = truncate(head, 220, fs, 700);
    if (headColor) tipBody.append("circle").attr("cx", pad + 4).attr("cy", yy - 4).attr("r", 4).attr("fill", headColor);
    const hx = headColor ? pad + 14 : pad;
    tipBody.append("text").attr("x", hx).attr("y", yy).style("font-size", fs + "px").style("font-weight", 700)
      .style("fill", axisCol).text(h);
    w = hx + tw(h, fs, 700) + pad;
    yy += lh + 2;
  }
  let maxName = 0, maxVal = 0;
  rows.forEach(r => {
    r.n = truncate(r.name, 150, fs);
    r.v = truncate(r.value, 160, fs, 700);
    maxName = Math.max(maxName, tw(r.n, fs));
    maxVal = Math.max(maxVal, tw(r.v, fs, 700));
  });
  const colVal = pad + maxName + 18 + maxVal;
  rows.forEach((r, k) => {
    const ry = yy + k * lh;
    if (r.color) tipBody.append("circle").attr("cx", pad + 4).attr("cy", ry - 4).attr("r", 4).attr("fill", r.color);
    tipBody.append("text").attr("x", r.color ? pad + 14 : pad).attr("y", ry).style("font-size", fs + "px")
      .style("fill", axisCol).style("fill-opacity", 0.7).text(r.n);
    tipBody.append("text").attr("x", colVal + (r.color ? 10 : 0)).attr("y", ry).attr("text-anchor", "end")
      .style("font-size", fs + "px").style("font-weight", 700).style("fill", axisCol).text(r.v);
  });
  w = Math.max(w, colVal + pad + (rows.some(r => r.color) ? 10 : 0));
  const h = yy + (rows.length - 1) * lh + pad + 2 - (rows.length ? 0 : lh);
  tipRect.attr("width", w).attr("height", Math.max(h, 30));
}
function placeTip(cx, cy) {
  const tipW = +tipRect.attr("width"), tipH = +tipRect.attr("height");
  let tx = cx + 16;
  if (tx + tipW > W - 4) tx = cx - 16 - tipW;
  if (tx < 4) tx = 4;
  let ty = cy - tipH / 2;
  ty = Math.max(4, Math.min(H - tipH - 4, ty));
  gTip.attr("transform", `translate(${tx},${ty})`).style("display", null);
}
function setPill(p, label, cx, cy, axis) {
  p.text.text(label);
  const pw = tw(label, 11, 600) + 14;
  p.rect.attr("width", pw);
  p.text.attr("x", pw / 2);
  if (axis === "x") p.g.attr("transform", `translate(${Math.max(px0 - 10, Math.min(px1 + 10 - pw, cx - pw / 2))},${py1 + 3})`);
  else p.g.attr("transform", `translate(${Math.max(2, px0 - pw - 3)},${cy - 10})`);
}

let hovered = null;
function showPoint(p) {
  const cx = x(p.x), cy = y(p.y);
  gHover.style("display", null);
  trendDot.style("display", "none");
  hoverRing.style("display", null).attr("cx", cx).attr("cy", cy).attr("r", p.r + 3).attr("stroke", p.color);
  guideX.style("display", null).attr("x1", cx).attr("x2", cx).attr("y1", cy + p.r + 3).attr("y2", py1);
  guideY.style("display", null).attr("y1", cy).attr("y2", cy).attr("x1", px0).attr("x2", cx - p.r - 3);
  pillX.g.style("display", null); pillY.g.style("display", null);
  setPill(pillX, fmtX(p.x), cx, cy, "x");
  setPill(pillY, fmtY(p.y), cx, cy, "y");
  if (gradItem && p.g !== null) {
    const t = (p.g - gExt[0]) / (gExt[1] - gExt[0]);
    gradItem.marker.style("display", null).attr("transform", `translate(${gradItem.markerX + Math.max(0, Math.min(1, t)) * 110},0)`);
  }
  if (o.tooltip === false) return;
  if (hovered !== p) {
    let head = p.l, headColor = null;
    const rows = [];
    if (groupType === "categorical") {
      if (head === null) { head = p.g; headColor = p.color; }
      else rows.push({ name: String(o.group), value: p.g, color: p.color });
    }
    if (head === null) head = "Row " + p.i;
    rows.push({ name: String(o.xtitle || o.x), value: fmtX(p.x) });
    rows.push({ name: String(o.ytitle || o.y), value: fmtY(p.y) });
    if (groupType === "continuous") rows.push({ name: String(o.group), value: fmtCell(p.g), color: p.color });
    if (o.sizeBy) rows.push({ name: String(o.sizeBy), value: fmtCell(p.s) });
    tipNames.forEach((nm, k) => rows.push({ name: nm, value: fmtCell(p.tips[k]) }));
    buildTip(head, headColor, rows);
  }
  hovered = p;
  placeTip(cx, cy);
}
function trendAt(t, mx) {
  const px = t.px;
  if (!px || px.length < 2 || mx < px[0][0] || mx > px[px.length - 1][0]) return null;
  let k = 1;
  while (k < px.length - 1 && px[k][0] < mx) k++;
  const a = px[k - 1], b = px[k];
  const f = b[0] === a[0] ? 0 : (mx - a[0]) / (b[0] - a[0]);
  const d = t.line[k - 1], e = t.line[k];
  return { py: a[1] + f * (b[1] - a[1]), x: x.invert(mx), y: d.y + f * (e.y - d.y) };
}
function showTrend(t, at, mx) {
  gHover.style("display", null);
  hoverRing.style("display", "none");
  guideX.style("display", "none"); guideY.style("display", "none");
  pillX.g.style("display", "none"); pillY.g.style("display", "none");
  trendDot.style("display", null).attr("cx", mx).attr("cy", at.py).attr("fill", t.color);
  if (o.tooltip === false) return;
  const s = t.stats || {};
  const rows = [];
  rows.push({ name: String(o.xtitle || o.x), value: fmtX(at.x) });
  rows.push({ name: "Fitted " + String(o.ytitle || o.y), value: fmtY(at.y) });
  if (t.method === "lm") {
    if (xLog || yLog) rows.push({ name: "Fit on", value: (yLog ? "log10(y)" : "y") + " ~ " + (xLog ? "log10(x)" : "x") });
    if (isFinite(s.slope)) rows.push({ name: "Slope", value: fmtShort(s.slope) });
    if (isFinite(s.intercept)) rows.push({ name: "Intercept", value: fmtShort(s.intercept) });
    if (isFinite(s.r2)) rows.push({ name: "R²", value: d3.format(".3f")(s.r2) });
  } else if (isFinite(s.span)) rows.push({ name: "Span", value: fmtShort(s.span) });
  if (isFinite(s.n)) rows.push({ name: "Points", value: d3.format(",")(s.n) });
  const name = (t.method === "lm" ? "Linear fit" : "LOESS fit") + (t.group !== null ? " · " + t.group : "");
  buildTip(name, t.color, rows);
  hovered = t;
  placeTip(mx, at.py);
}
function onMove(mx, my) {
  if (brushing) return;
  if (mx < px0 || mx > px1 || my < py0 || my > py1) { hideHover(); return; }
  let p = qt ? qt.find(mx, my, 40) : null;
  if (p && Math.hypot(x(p.x) - mx, y(p.y) - my) > Math.max(p.r + 6, 10)) p = null;
  if (p) { showPoint(p); return; }
  let best = null;
  trends.filter(trendVisible).forEach(t => {
    const at = trendAt(t, mx);
    if (at && Math.abs(at.py - my) <= 7 && (!best || Math.abs(at.py - my) < Math.abs(best.at.py - my))) best = { t, at };
  });
  if (best) { showTrend(best.t, best.at, mx); return; }
  hideHover();
}

// ---- brush, selection and zoom ---------------------------------------------------------
let brushing = false, lastBox = null, pressed = null;
let brush = null;
function applySelection(box) {
  if (!box) { selected = null; stylePoints(); return; }
  const [[bx0, by0], [bx1, by1]] = box;
  selected = new Set(pts.filter(p => {
    if (!isVisible(p)) return false;
    const cx = x(p.x), cy = y(p.y);
    return cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1;
  }));
  stylePoints();
}
function selectionRows() {
  return selected ? Array.from(selected).map(p => p.i).sort((a, b) => a - b) : null;
}
function clearSelection(send) {
  lastBox = null;
  selected = null;
  stylePoints();
  if (brush) gBrush.call(brush.move, null);
  if (send) sendShiny("selected", null);
  renderTools();
}
function zoomTo(box) {
  const [[bx0, by0], [bx1, by1]] = box;
  if (bx1 - bx0 < 4 || by1 - by0 < 4) return;
  viewX = [x.invert(bx0), x.invert(bx1)];
  viewY = [y.invert(by1), y.invert(by0)];
  clearSelection(true);
  hideHover();
  update(650);
}
function resetZoom() {
  if (!isZoomed()) return;
  viewX = fullX.slice(); viewY = fullY.slice();
  hideHover();
  update(650);
}

const overlay = gBrush;
if (o.brush !== false) {
  brush = d3.brush().extent([[px0, py0], [px1, py1]])
    .on("start", function (a) {
      const ev = evOf(a);
      if (ev && ev.sourceEvent) { pressed = hovered && hovered.x !== undefined ? hovered : null; brushing = true; hideHover(); }
    })
    .on("brush", function (a) {
      const ev = evOf(a);
      if (!ev || !ev.sourceEvent) return;
      applySelection(ev.selection);
    })
    .on("end", function (a) {
      const ev = evOf(a);
      brushing = false;
      if (!ev || !ev.sourceEvent) return;   // programmatic move
      if (!ev.selection) {
        // a click without a drag: report the clicked point, clear the selection
        const se = ev.sourceEvent;
        if (se && pressed) sendShiny("clicked", pressed.i);
        if (selected) clearSelection(true); else renderTools();
        return;
      }
      lastBox = ev.selection;
      applySelection(lastBox);
      sendShiny("selected", selectionRows());
      renderTools();
    });
  gBrush.call(brush);
  gBrush.select(".selection").attr("fill", ACCENT).attr("fill-opacity", 0.08)
    .attr("stroke", ACCENT).attr("stroke-opacity", 0.6).attr("shape-rendering", "crispEdges");
} else {
  gBrush.append("rect").attr("x", px0).attr("y", py0).attr("width", plotW).attr("height", plotH)
    .attr("fill", "none").style("pointer-events", "all")
    .on("click", function () { if (hovered && hovered.x !== undefined) sendShiny("clicked", hovered.i); });
}
overlay
  .on("mousemove.tip", function (a) { const [mx, my] = ptr(a, svg.node()); onMove(mx, my); })
  .on("mouseleave.tip", function () { hideHover(); })
  .on("dblclick.zoom", function () { clearSelection(!!selected); resetZoom(); });

// ---- toolbar (selection count, zoom, clear, reset) --------------------------------------
function renderTools() {
  gTools.selectAll("*").remove();
  const items = [];
  if (selected) {
    items.push({ text: d3.format(",")(selected.size) + " selected", passive: true });
    if (selected.size > 0) items.push({ text: "Zoom", act: () => zoomTo(lastBox) });
    items.push({ text: "Clear", act: () => clearSelection(true) });
  }
  if (isZoomed()) items.push({ text: "Reset zoom", act: resetZoom });
  if (!items.length) return;
  const h = 22, gap = 4;
  items.forEach(it => { it.w = tw(it.text, 11, 600) + (it.passive ? 10 : 16); });
  const total = d3.sum(items, it => it.w) + gap * (items.length - 1);
  let bx = px1 - total - 6;
  items.forEach(it => {
    const g = gTools.append("g").attr("transform", `translate(${bx},${py0 + 6})`);
    bx += it.w + gap;
    if (!it.passive) {
      g.style("cursor", "pointer");
      g.append("rect").attr("width", it.w).attr("height", h).attr("rx", 5)
        .attr("fill", bgcol).attr("fill-opacity", 0.92)
        .attr("stroke", axisCol).attr("stroke-opacity", 0.2);
      g.on("mouseenter", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.5); })
        .on("mouseleave", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.2); })
        .on("click", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); it.act(); })
        .on("mousedown", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); })
        .on("dblclick", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); });
    } else {
      g.append("rect").attr("width", it.w).attr("height", h).attr("rx", 5)
        .attr("fill", bgcol).attr("fill-opacity", 0.85);
    }
    g.append("text").attr("x", it.w / 2).attr("y", h / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", 600)
      .style("fill", it.passive ? axisCol : ACCENT).text(it.text);
  });
}

// ---- first draw ---------------------------------------------------------------------------
styleLegend();
update(0);
if (o.animate && firstRender && labelled.length) {
  gLabels.style("opacity", 0).transition().delay(700).duration(300).style("opacity", 1);
}
