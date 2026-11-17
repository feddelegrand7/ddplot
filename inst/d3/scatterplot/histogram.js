// histogram(): interactive histogram.
//
// data: rows {v, g} (value, group or missing). The bins are computed here so
// the number of bins can be changed from the chart. Groups are stacked or
// overlaid; a density curve, mean / median lines, reference lines and a rug
// can be drawn. Dragging across the bars selects a range (snapped to the bin
// edges) that can be zoomed into. The number of bins, the layout, the hidden
// groups and the zoom are kept in r2d3.ddplotState so a Shiny update or a
// resize keeps them. Works with D3 v5 and v6.

const o = options;
const isV6 = typeof d3.pointer === "function";
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const gridCol = o.gridCol || null;
const bgcol = o.bgcol || "white";
const ACCENT = "#4269d0";
const uid = "ddhi" + Math.random().toString(36).slice(2, 9);
const arr = v => (v === null || v === undefined) ? [] : [].concat(v);
const evOf = a => isV6 ? a : d3.event;
const ptr = (a, node) => isV6 ? d3.pointer(a, node) : d3.mouse(node);

svg.style("background-color", bgcol).style("font-family", font);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!state.hist || state.hist.key !== o.stateKey) state.hist = { key: o.stateKey };
const st = state.hist;

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

// ---- data ---------------------------------------------------------------------
const groupNames = arr(o.groups).map(String);
const hasGroup = groupNames.length > 0;
const gColors = arr(o.colors);
const groups = hasGroup
  ? groupNames.map((name, k) => ({ name, k, color: gColors[k % gColors.length] || ACCENT, vals: [] }))
  : [{ name: "", k: 0, color: o.fill || ACCENT, vals: [] }];
const gIndex = new Map(groups.map(g => [g.name, g]));
(data || []).forEach(r => {
  const v = +r.v;
  if (r.v === null || r.v === undefined || !isFinite(v)) return;
  const g = hasGroup ? gIndex.get(String(r.g)) : groups[0];
  if (g) g.vals.push(v);
});
groups.forEach(g => g.vals.sort((a, b) => a - b));
const allVals = groups.flatMap(g => g.vals);

if (!allVals.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}
let fullLo = d3.min(allVals), fullHi = d3.max(allVals);
const isInt = allVals.every(v => Number.isInteger(v));

const hidden = new Set(arr(st.hidden).filter(n => groupNames.indexOf(n) >= 0));
if (hidden.size >= groups.length) hidden.clear();
let position = hasGroup ? (st.position || o.position || "stacked") : "stacked";
const breaks = arr(o.breaks).map(Number).filter(isFinite);
const useBreaks = breaks.length >= 2;
const unequal = useBreaks && (function () {
  const w0 = breaks[1] - breaks[0];
  for (let k = 2; k < breaks.length; k++) if (Math.abs(breaks[k] - breaks[k - 1] - w0) > 1e-9 * Math.max(1, Math.abs(w0))) return true;
  return false;
})();
let stat = unequal ? "density" : (st.stat || o.stat || "count");
let view = null;
if (st.zoom && !useBreaks && st.zoom[0] < st.zoom[1] && st.zoom[1] > fullLo && st.zoom[0] < fullHi) {
  view = [Math.max(fullLo, st.zoom[0]), Math.min(fullHi, st.zoom[1])];
}
const firstRender = !st.drawn;
st.drawn = true;
const visGroups = () => groups.filter(g => !hidden.has(g.name));
const opacity0 = (o.opacity === null || o.opacity === undefined) ? null : +o.opacity;
const barOpacity = () => opacity0 !== null ? opacity0 : (position === "overlay" && visGroups().length > 1 ? 0.5 : 1);

// ---- formats ----------------------------------------------------------------------
const xCore = o.xFormat ? d3.format(o.xFormat) : null;
const xPre = o.xPrefix || "", xSuf = o.xSuffix || "";
const fmtCount = d3.format(",");
const fmtPct1 = d3.format(".1%");
function decimalsOf(step) {
  if (!(step > 0)) return 2;
  let d = 0;
  while (d < 8 && Math.abs(Math.round(step * Math.pow(10, d)) - step * Math.pow(10, d)) > 1e-6) d++;
  return d;
}
function fmtNum(v, dec) {
  if (v === null || v === undefined || !isFinite(v)) return "–";
  const a = Math.abs(v);
  let s;
  if (xCore) s = xCore(a);
  else if (a >= 1e6) s = d3.format(".3~s")(a).replace("G", "B");
  else s = d3.format(",." + Math.max(0, Math.min(8, dec)) + "~f")(a);
  return (v < 0 && +s.replace(/[^0-9.]/g, "") !== 0 ? "−" : "") + xPre + s + xSuf;
}

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

// ---- binning ---------------------------------------------------------------------------
const round12 = v => +v.toPrecision(12);
const off = isInt ? 0.5 : 0; // integer data: bins centred on the integers
function edgesFor(step, lo, hi) {
  const intStep = isInt && Math.abs(step - Math.round(step)) < 1e-9;
  const sh = intStep ? off : 0;
  const k0 = Math.floor((lo + sh) / step + 1e-9);
  let k1 = intStep ? Math.floor((hi + sh) / step + 1e-9) + 1 : Math.ceil((hi + sh) / step - 1e-9);
  if (k1 <= k0) k1 = k0 + 1;
  const out = [];
  for (let k = k0; k <= k1 && out.length < 1002; k++) out.push(round12(k * step - sh));
  return out;
}
function candidates(lo, hi) {
  const span = Math.max(hi - lo, isInt ? 1 : Math.abs(hi) * 1e-6 || 1e-6);
  const out = [];
  const e0 = Math.floor(Math.log10(span / 300)) - 1, e1 = Math.ceil(Math.log10(span)) + 1;
  for (let e = e0; e <= e1; e++) {
    [1, 2, 2.5, 5].forEach(m => {
      const s = round12(m * Math.pow(10, e));
      if (isInt && (s < 1 || Math.abs(s - Math.round(s)) > 1e-9)) return;
      const n = edgesFor(s, lo, hi).length - 1;
      if (n >= 1 && n <= 250) out.push({ step: s, n });
    });
  }
  out.sort((a, b) => b.step - a.step);
  // one candidate per number of bins
  return out.filter((c, k) => k === 0 || c.n !== out[k - 1].n);
}
function viewRange() {
  if (view) return view;
  return fullLo === fullHi ? [fullLo - (isInt ? 0 : 0.5), fullHi + (isInt ? 0 : 0.5)] : [fullLo, fullHi];
}
let step = null;     // the current bin width (null with explicit breaks)
let cands = [];
function pickStep(target) {
  const [lo, hi] = viewRange();
  cands = candidates(lo, hi);
  if (!cands.length) cands = [{ step: (hi - lo) || 1, n: 1 }];
  let best = cands[0];
  cands.forEach(c => { if (Math.abs(c.n - target) < Math.abs(best.n - target)) best = c; });
  step = best.step;
}
if (!useBreaks) {
  if (o.binWidth && !st.nb && !view) {
    step = +o.binWidth;
    const [lo, hi] = viewRange();
    cands = candidates(lo, hi);
    if (edgesFor(step, lo, hi).length > 1001) pickStep(+o.bins || 30);
  } else pickStep(st.nb || +o.bins || 30);
}

let edges = [], bins = [];
function computeBins() {
  if (useBreaks) edges = breaks.slice();
  else { const [lo, hi] = viewRange(); edges = edgesFor(step, lo, hi); }
  const nb = edges.length - 1;
  const lo = edges[0], hi = edges[nb];
  bins = d3.range(nb).map(i => ({ i, x0: edges[i], x1: edges[i + 1] }));
  bins.forEach(b => { b.cells = groups.map(g => ({ bin: b, g, n: 0 })); });
  groups.forEach(g => {
    g.inView = [];
    g.vals.forEach(v => {
      if (v < lo || v > hi) return;
      let k = d3.bisectRight(edges, v) - 1;
      if (k >= nb) k = nb - 1;
      if (k < 0) return;
      bins[k].cells[g.k].n++;
      g.inView.push(v);
    });
    g.N = g.inView.length;
  });
}
function computeHeights() {
  const vis = visGroups();
  const Ntot = d3.sum(vis, g => g.N) || 1;
  bins.forEach(b => {
    const w = b.x1 - b.x0;
    let acc = 0;
    b.total = 0;
    b.cells.forEach(c => {
      c.visible = !hidden.has(c.g.name);
      const norm = (position === "overlay" && hasGroup) ? (c.g.N || 1) : Ntot;
      let h = c.visible ? c.n : 0;
      if (stat === "percent") h = h / norm;
      else if (stat === "density") h = h / (norm * w);
      c.h = h;
      if (c.visible) b.total += c.n;
      if (position === "overlay") { c.y0 = 0; c.y1 = h; }
      else { c.y0 = acc; c.y1 = acc + h; acc += h; }
    });
    // the top segment gets the rounded corners
    const top = b.cells.filter(c => c.visible && c.h > 0);
    b.cells.forEach(c => { c.outer = position === "overlay" || c === top[top.length - 1]; });
  });
}

// ---- density curves and summary lines --------------------------------------------------
function bwNrd0(s) {
  const n = s.length;
  if (n < 2) return 1;
  const hi = d3.deviation(s);
  const iqr = d3.quantile(s, 0.75) - d3.quantile(s, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (!(lo > 0)) lo = hi || Math.abs(s[0]) || 1;
  return 0.9 * lo * Math.pow(n, -0.2);
}
const SQRT2PI = Math.sqrt(2 * Math.PI);
function curveSets() {
  // one curve per visible group when overlaid, otherwise one for the pooled data
  const vis = visGroups();
  if (position === "overlay" && hasGroup) {
    return vis.map(g => ({ key: g.name, color: g.color, vals: g.inView, group: g.name }));
  }
  const pooled = vis.length === 1 ? vis[0].inView : vis.flatMap(g => g.inView).sort((a, b) => a - b);
  const color = hasGroup ? (vis.length === 1 ? vis[0].color : axisCol) : (d3.color(o.fill || ACCENT) || d3.color(ACCENT)).darker(0.9).formatHex();
  return [{ key: "all", color, vals: pooled, group: null }];
}
function curveScale(n) {
  // converts a probability density into the units of the bars
  const w = useBreaks ? breaks[1] - breaks[0] : step;
  if (stat === "density") return 1;
  if (stat === "percent") return w;
  return n * w;
}
const GRID = 160;
function curvePoints(set) {
  const s = set.vals, n = s.length;
  const lo = edges[0], hi = edges[edges.length - 1];
  if (n < 2) return null;
  const k = curveScale(n);
  const pts = [];
  if (o.density === "normal") {
    const m = d3.mean(s), sd = d3.deviation(s);
    if (!(sd > 0)) return null;
    for (let j = 0; j <= GRID; j++) {
      const xx = lo + (hi - lo) * j / GRID;
      const z = (xx - m) / sd;
      pts.push([xx, k * Math.exp(-0.5 * z * z) / (sd * SQRT2PI)]);
    }
    return pts;
  }
  const bw = bwNrd0(s), reach = 4 * bw;
  for (let j = 0; j <= GRID; j++) {
    const xx = lo + (hi - lo) * j / GRID;
    let sum = 0;
    for (let i = d3.bisectLeft(s, xx - reach); i < n && s[i] <= xx + reach; i++) {
      const u = (xx - s[i]) / bw;
      sum += Math.exp(-0.5 * u * u);
    }
    pts.push([xx, k * sum / (n * bw * SQRT2PI)]);
  }
  return pts;
}
function summaryOf(s) {
  const n = s.length;
  return n ? { n, mean: d3.mean(s), median: d3.quantile(s, 0.5), sd: n > 1 ? d3.deviation(s) : null } : { n: 0 };
}

// ---- layout: title, legend and controls -------------------------------------------------
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

const ctlGroups = [];
if (o.controls && !useBreaks) ctlGroups.push({ id: "bins", items: [
  { k: "less", t: "−", tip: "Fewer bins" },
  { k: "label", t: "", passive: true, tip: "Number of bins" },
  { k: "more", t: "+", tip: "More bins" }] });
if (o.controls && !unequal) {
  const its = [{ k: "count", t: "Count", tip: "Number of observations" }, { k: "percent", t: "%", tip: "Share of the observations" }];
  if (o.stat === "density") its.push({ k: "density", t: "Density", tip: "Probability density" });
  ctlGroups.push({ id: "stat", items: its });
}
if (o.controls && hasGroup) ctlGroups.push({ id: "position", items: [
  { k: "stacked", t: "Stacked", tip: "Groups stacked" },
  { k: "overlay", t: "Overlay", tip: "Groups drawn on top of each other" }] });
const ctlH = 22, ctlGap = 8;
const binLabelW = tw("888 bins", 11, 600) + 14;
ctlGroups.forEach(cg => {
  cg.items.forEach(it => { it.w = it.k === "label" ? binLabelW : tw(it.t, 11, 600) + (it.t.length <= 1 ? 16 : 18); });
  cg.w = d3.sum(cg.items, it => it.w);
});
const ctlW = ctlGroups.length ? d3.sum(ctlGroups, cg => cg.w) + ctlGap * (ctlGroups.length - 1) : 0;

const legendOn = o.legend && hasGroup;
const legendItems = legendOn ? groups.map(g => ({ g, w: 22 + tw(g.name, 12) + 14 })) : [];
let ctlOwnRow = false;
let legendAvail = W - padL - padR - (ctlW ? ctlW + 16 : 0);
if (legendOn && ctlW && legendAvail < Math.min(160, d3.sum(legendItems, d => d.w))) {
  ctlOwnRow = true;
  legendAvail = W - padL - padR;
}
let lx = 0, lrow = 0;
legendItems.forEach(it => {
  if (lx > 0 && lx + it.w > legendAvail) { lrow++; lx = 0; }
  it.x = lx; it.row = lrow; lx += it.w;
});
const legendRows = legendOn ? lrow + 1 : 0;
let headerTop = top, legendTop = top;
if (ctlW || legendRows) {
  top += 2;
  headerTop = top;
  if (ctlOwnRow) { legendTop = top + ctlH + 6; top = legendTop + legendRows * 22; }
  else { legendTop = top; top += Math.max(legendRows * 22, ctlW ? ctlH : 0); }
  top += 8;
}

const xFs = o.xFontSize || 11, yFs = o.yFontSize || 11;
const yTitleDefault = { count: "Count", percent: "Percent", density: "Density" };
const yTitleFs = o.ytitleFontSize || 13;
const showYTitle = o.ytitle !== "";
const sumFs = 11.5;
// the y-axis title and the summary share a row (the summary moves to its own
// row when both do not fit)
const yTitleMaxW = showYTitle ? Math.max(tw(o.ytitle || "Percent", yTitleFs, 600), o.ytitle ? 0 : tw("Density", yTitleFs, 600)) : 0;
const sumNeed = o.summary ? tw("n = 88,888 · mean 888.88 · median 888.88 · sd 88.88", sumFs) : 0;
const sumOwnRow = o.summary && showYTitle && yTitleMaxW + 24 + Math.min(sumNeed, 260) > W - padL - padR;
let yTitleY = null, sumY = null;
if (showYTitle || o.summary) {
  if (sumOwnRow) { sumY = top + sumFs * 0.8; top += sumFs + 8; }
  const rowFs = showYTitle ? yTitleFs : sumFs;
  yTitleY = top + rowFs * 0.8;
  if (!sumOwnRow) sumY = yTitleY;
  top += rowFs + 10;
}
top += 4;

const rugH = o.rug ? 9 : 0;
const showXTitle = !!o.xtitle;
let bottom = 8 + xFs + 10 + rugH;
if (showXTitle) bottom += (o.xtitleFontSize || 13) + 8;
const py0 = top, py1 = H - bottom;
let px0 = padL + 40;
const px1 = W - padR;
const plotH = Math.max(30, py1 - py0);

// ---- scales ----------------------------------------------------------------------------
const x = d3.scaleLinear();
const y = d3.scaleLinear().range([py1, py0 + 6]);
const nYTicks = o.yticks || Math.max(2, Math.round(plotH / 55));
function yTickFmt() {
  if (stat === "percent") {
    const m = y.domain()[1];
    return d3.format(m < 0.03 ? ".1%" : ".0%");
  }
  if (stat === "density") return y.tickFormat(nYTicks, "~g");
  const m = y.domain()[1];
  return m >= 1e4 ? d3.format("~s") : d3.format(",~f");
}

// ---- static chrome ----------------------------------------------------------------
const defs = svg.append("defs");
const shadow = defs.append("filter").attr("id", uid + "-shadow")
  .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
  .attr("flood-color", "#000").attr("flood-opacity", 0.14);
const clipRect = defs.append("clipPath").attr("id", uid + "-clip").append("rect")
  .attr("y", py0 - 2).attr("height", py1 - py0 + 2 + rugH + 2);

const yTitleSel = (showYTitle && yTitleY !== null)
  ? svg.append("text").attr("x", padL).attr("y", yTitleY)
    .style("font-size", yTitleFs + "px").style("font-weight", 600).style("fill", axisCol)
  : null;
const sumSel = o.summary
  ? svg.append("text").attr("x", W - padR).attr("y", sumY).attr("text-anchor", "end")
    .style("font-size", sumFs + "px").style("fill", axisCol)
  : null;
const xTitleSel = showXTitle
  ? svg.append("text").attr("y", H - 10).attr("text-anchor", "middle")
    .style("font-size", (o.xtitleFontSize || 13) + "px").style("font-weight", 600)
    .style("fill", axisCol).text(o.xtitle)
  : null;

const gGrid = svg.append("g");
const gYAxis = svg.append("g");
const gXAxis = svg.append("g");
const gBandHi = svg.append("g");
const gPlot = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gBars = gPlot.append("g");
const gCurves = gPlot.append("g").style("pointer-events", "none");
const gRug = gPlot.append("g").style("pointer-events", "none");
const gStats = svg.append("g").style("pointer-events", "none");
const gBrush = svg.append("g");
const gTools = svg.append("g");
const gLegend = svg.append("g");
const gCtl = svg.append("g");
const gTip = svg.append("g").style("pointer-events", "none").style("display", "none");
const baseLine = svg.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.55)
  .attr("stroke-width", 1).style("pointer-events", "none");
const bandHi = gBandHi.append("rect").attr("fill", axisCol).attr("fill-opacity", 0.05)
  .attr("rx", 3).style("display", "none");

// ---- geometry ------------------------------------------------------------------------------
function rpath(x0, y0, x1, y1, r) {
  r = Math.max(0, Math.min(r, (x1 - x0) / 2, y1 - y0));
  return `M${x0},${y1}L${x0},${y0 + r}Q${x0},${y0} ${x0 + r},${y0}L${x1 - r},${y0}Q${x1},${y0} ${x1},${y0 + r}L${x1},${y1}Z`;
}
function barGap(b) {
  const w = x(b.x1) - x(b.x0);
  return w > 6 ? 1 : (w > 3 ? 0.5 : 0);
}
function cellPath(c, collapsed) {
  const b = c.bin, g = barGap(b);
  const x0 = x(b.x0) + g / 2, x1 = Math.max(x0, x(b.x1) - g / 2);
  if (!c.visible || collapsed) {
    const yb = y(collapsed && position !== "overlay" ? 0 : c.y0);
    return rpath(x0, yb, x1, yb, 0);
  }
  const ya = y(c.y1), yb = y(c.y0);
  return rpath(x0, ya, x1, yb, c.outer ? (+o.cornerRadius || 0) : 0);
}

let focusGroup = null, hoverBin = null, hoverCell = null;
let selRange = null; // the selected range [from, to] (snapped to the bin edges)
function inSel(b) { return !selRange || (b.x0 >= selRange[0] - 1e-9 && b.x1 <= selRange[1] + 1e-9); }
function cellOpacity(c) {
  let op = barOpacity();
  if (focusGroup !== null && c.g.name !== focusGroup) op *= 0.22;
  if (!inSel(c.bin)) op *= 0.3;
  if (hoverBin && c.bin !== hoverBin && !selRange) op *= 0.75;
  return op;
}
const strokeW = () => (o.strokeWidth === null || o.strokeWidth === undefined) ? (o.stroke ? 1 : 0) : +o.strokeWidth;
function styleBars(sel) {
  (sel || gBars.selectAll("path.bar:not(.exiting)"))
    .attr("fill", c => c.g.color)
    .attr("fill-opacity", cellOpacity)
    .attr("stroke", c => (hoverCell === c && hasGroup) ? axisCol : (o.stroke || "none"))
    .attr("stroke-width", c => (hoverCell === c && hasGroup) ? 1.25 : strokeW());
}

// ---- drawing ------------------------------------------------------------------------------
function allCells() { return bins.flatMap(b => b.cells); }
let binsVersion = 0; // changes when the edges change, so the bars are re-created
function drawBars(dur, intro) {
  const cells = allCells();
  const keyOf = c => binsVersion + "|" + c.bin.i + "|" + c.g.k;
  const sel = gBars.selectAll("path.bar:not(.exiting)").data(cells, keyOf);
  sel.exit().classed("exiting", true).interrupt()
    .transition().duration(dur ? Math.min(250, dur) : 0).attr("fill-opacity", 0).remove();
  const ent = sel.enter().append("path").attr("class", "bar")
    .attr("d", c => cellPath(c, true));
  // in front: the order of the groups (overlay draws the first group at the back)
  const all = ent.merge(sel);
  all.sort((a, b) => (a.g.k - b.g.k) || (a.bin.i - b.bin.i));
  styleBars(all);
  if (intro) {
    const n = bins.length;
    all.transition().duration(650).delay(c => c.bin.i * Math.min(18, 450 / n) + c.g.k * 40)
      .ease(d3.easeCubicOut).attr("d", c => cellPath(c, false));
  } else if (dur) {
    all.transition().duration(dur).ease(d3.easeCubicInOut).attr("d", c => cellPath(c, false));
  } else all.attr("d", c => cellPath(c, false));
}
const line = d3.line().x(p => x(p[0])).y(p => y(p[1])).curve(d3.curveBasis);
let curveData = [];
function drawCurves(dur, intro) {
  const show = o.density === "kde" || o.density === "normal";
  const data = show ? curveData : [];
  const sel = gCurves.selectAll("path").data(data, d => d.key);
  sel.exit().remove();
  const ent = sel.enter().append("path").attr("fill", "none").attr("stroke-width", 2)
    .attr("stroke-linejoin", "round").attr("d", d => line(d.pts));
  const all = ent.merge(sel).attr("stroke", d => d.color)
    .attr("stroke-opacity", d => (focusGroup !== null && d.group !== null && d.group !== focusGroup) ? 0.15 : 0.95);
  if (intro) {
    all.attr("d", d => line(d.pts)).style("opacity", 0)
      .transition().delay(Math.min(900, 500 + bins.length * 10)).duration(400).style("opacity", 1);
  } else (dur ? all.transition().duration(dur) : all).style("opacity", 1).attr("d", d => line(d.pts));
}
function drawRug() {
  if (!o.rug) return;
  const vis = visGroups();
  let pts = vis.flatMap(g => g.inView.map(v => ({ v, g })));
  if (pts.length > 5000) {
    const k = pts.length / 5000;
    pts = d3.range(5000).map(i => pts[Math.floor(i * k)]);
  }
  const sel = gRug.selectAll("line").data(pts);
  sel.exit().remove();
  sel.enter().append("line").merge(sel)
    .attr("x1", p => x(p.v)).attr("x2", p => x(p.v))
    .attr("y1", py1 + 2).attr("y2", py1 + rugH - 1)
    .attr("stroke", p => p.g.color).attr("stroke-width", 1)
    .attr("stroke-opacity", pts.length > 1000 ? 0.25 : 0.5);
}
function drawAxes(dur) {
  const nx = o.xticks || Math.max(2, Math.round((px1 - px0) / 80));
  let xt = x.ticks(nx);
  if (isInt) xt = xt.filter(t => Number.isInteger(t));
  const xdec = d3.max(xt, t => decimalsOf(t)) || 0;
  const xAxis = d3.axisBottom(x).tickValues(xt).tickFormat(t => fmtNum(t, xdec)).tickSize(4).tickPadding(5);
  gXAxis.attr("transform", `translate(0,${py1 + rugH})`);
  (dur ? gXAxis.transition().duration(dur) : gXAxis).call(xAxis);
  gXAxis.select("path.domain").remove();
  gXAxis.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.4);
  gXAxis.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("font-size", xFs + "px").style("font-family", font);

  const yt = y.ticks(nYTicks);
  const f = yTickFmt();
  const yAxis = d3.axisLeft(y).tickValues(yt).tickFormat(f).tickSize(0).tickPadding(8);
  gYAxis.attr("transform", `translate(${px0},0)`);
  (dur ? gYAxis.transition().duration(dur) : gYAxis).call(yAxis);
  gYAxis.select("path.domain").remove();
  gYAxis.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("font-size", yFs + "px").style("font-family", font);
  if (gridCol) {
    const gl = gGrid.selectAll("line").data(yt.filter(t => t !== 0), t => t);
    gl.exit().remove();
    const m = gl.enter().append("line").attr("stroke", gridCol).attr("y1", t => y(t)).attr("y2", t => y(t)).merge(gl);
    (dur ? m.transition().duration(dur) : m).attr("x1", px0).attr("x2", px1).attr("y1", t => y(t)).attr("y2", t => y(t));
  }
  baseLine.attr("x1", px0).attr("x2", px1).attr("y1", py1).attr("y2", py1);
  if (yTitleSel) yTitleSel.text(o.ytitle || yTitleDefault[stat]);
  if (xTitleSel) xTitleSel.attr("x", px0 + (px1 - px0) / 2);
}
function statLines() {
  const want = arr(o.stats);
  const out = [];
  if (want.length) curveSets().forEach(set => {
    if (!set.vals.length) return;
    const s = summaryOf(set.vals);
    want.forEach(k => out.push({
      key: set.key + "|" + k, value: s[k], color: hasGroup && set.group !== null ? set.color : axisCol,
      label: (k === "mean" ? "Mean " : "Median ") + fmtNum(s[k], decimalsOf(useBreaks ? 0.01 : step) + 1),
      dash: k === "mean" ? "5,4" : "2,3", group: set.group
    }));
  });
  arr(o.refLines).forEach((r, k) => {
    if (!isFinite(+r.value)) return;
    out.push({ key: "ref|" + k, value: +r.value, color: axisCol, dash: "6,3",
      label: (r.label ? r.label + " " : "") + fmtNum(+r.value, decimalsOf(+r.value)), group: null, ref: true });
  });
  return out;
}
function drawStats(dur) {
  const [lo, hi] = x.domain();
  const lines = statLines().filter(d => d.value >= lo && d.value <= hi);
  lines.sort((a, b) => a.value - b.value);
  // stagger the labels that would overlap
  const lfs = 10.5, rows = [];
  lines.forEach(d => {
    const w = tw(d.label, lfs, 600) + 8;
    const px = x(d.value);
    d.anchor = px + w > px1 ? "end" : "start";
    const a = d.anchor === "end" ? px - w : px, b = d.anchor === "end" ? px : px + w;
    let r = 0;
    while (rows[r] !== undefined && rows[r] > a) r++;
    rows[r] = b;
    d.row = r;
  });
  const sel = gStats.selectAll("g").data(lines, d => d.key);
  sel.exit().remove();
  const ent = sel.enter().append("g");
  ent.append("line").attr("stroke-width", 1.25);
  ent.append("text").style("font-size", lfs + "px").style("font-weight", 600)
    .style("paint-order", "stroke").style("stroke", bgcol).style("stroke-width", 3).attr("dy", "0.35em");
  const m = ent.merge(sel);
  m.style("opacity", d => (focusGroup !== null && d.group !== null && d.group !== focusGroup) ? 0.2 : 1);
  const ln = m.select("line").attr("stroke", d => d.color).attr("stroke-dasharray", d => d.dash).attr("stroke-opacity", 0.85);
  const tx = m.select("text").style("fill", d => d.color).attr("text-anchor", d => d.anchor).text(d => d.label);
  (dur ? ln.transition().duration(dur) : ln)
    .attr("x1", d => x(d.value)).attr("x2", d => x(d.value)).attr("y1", d => py0 + 4 + d.row * 14).attr("y2", py1);
  (dur ? tx.transition().duration(dur) : tx)
    .attr("x", d => x(d.value) + (d.anchor === "end" ? -4 : 4)).attr("y", d => py0 + 4 + d.row * 14);
}
function selValues() {
  const vis = visGroups();
  return vis.flatMap(g => g.inView.filter(v => v >= selRange[0] && (v < selRange[1] || (selRange[1] >= edges[edges.length - 1] && v <= selRange[1]))))
    .sort((a, b) => a - b);
}
function drawSummary() {
  if (!sumSel) return;
  const vis = visGroups();
  let s, head = "";
  const dec = (useBreaks ? 2 : decimalsOf(step)) + 1;
  if (selRange) {
    const sv = selValues();
    s = summaryOf(sv);
    const tot = d3.sum(vis, g => g.N) || 1;
    head = rangeLabel(selRange[0], selRange[1]) + ": ";
    s.extra = " (" + fmtPct1(s.n / tot) + ")";
  } else {
    s = summaryOf(vis.length === 1 ? vis[0].inView : vis.flatMap(g => g.inView).sort((a, b) => a - b));
  }
  const parts = [head + "n = " + fmtCount(s.n) + (s.extra || "")];
  if (s.n) {
    parts.push("mean " + fmtNum(s.mean, dec));
    parts.push("median " + fmtNum(s.median, dec));
    if (s.sd !== null) parts.push("sd " + fmtNum(s.sd, dec).replace(xPre, ""));
  }
  if (!selRange && !view && o.nMissing > 0) parts.push(fmtCount(o.nMissing) + " missing");
  if (view && !selRange) {
    const outside = d3.sum(vis, g => g.vals.length - g.N);
    if (outside > 0) parts.push(fmtCount(outside) + " outside the zoom");
  }
  const avail = (W - padR) - (sumOwnRow || !yTitleSel ? padL : padL + yTitleMaxW + 24);
  // drop the least important parts until the line fits
  let txt = parts.join(" · ");
  while (parts.length > 1 && tw(txt, sumFs) > avail) { parts.pop(); txt = parts.join(" · "); }
  sumSel.text(truncate(txt, avail, sumFs)).style("fill-opacity", selRange ? 1 : 0.75)
    .style("font-weight", selRange ? 600 : 400);
}

// ---- tooltip ---------------------------------------------------------------------------
const tipRect = gTip.append("rect").attr("rx", 6).attr("fill", bgcol)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("filter", `url(#${uid}-shadow)`);
const tipBody = gTip.append("g");
function binLabel(b) { return rangeLabel(b.x0, b.x1); }
const intBins = () => isInt && !useBreaks && Math.abs(step - Math.round(step)) < 1e-9;
function upTo(b) {
  return "Up to " + (intBins() ? fmtNum(Math.round(b.x1 - off), 0) : fmtNum(b.x1, useBreaks ? d3.max(edges, decimalsOf) : decimalsOf(step)));
}
// a range of bins [a, b), as shown to the reader
function rangeLabel(a, b) {
  if (intBins()) {
    const p = Math.round(a + off), q = Math.round(b - off);
    return p === q ? fmtNum(p, 0) : fmtNum(p, 0) + " – " + fmtNum(q, 0);
  }
  const dec = useBreaks ? d3.max(edges, decimalsOf) : decimalsOf(step);
  return fmtNum(a, dec) + " – " + fmtNum(b, dec);
}
function buildTip(b, focusCell) {
  tipBody.selectAll("*").remove();
  const pad = 10, lh = 18, fs = 11.5;
  const vis = visGroups();
  const Ntot = d3.sum(vis, g => g.N) || 1;
  const below = d3.sum(bins.filter(q => q.i <= b.i), q => q.total);
  const rows = [];
  const hval = c => stat === "density" ? d3.format(".3~g")(c.h) : null;
  if (!hasGroup) {
    const c = b.cells[0];
    rows.push({ name: "Count", value: fmtCount(c.n), bold: true });
    rows.push({ name: "Share", value: fmtPct1(c.n / Ntot) });
    rows.push({ name: upTo(b), value: fmtPct1(below / Ntot) });
    if (stat === "density") rows.push({ name: "Density", value: hval(c) });
  } else {
    vis.forEach(g => {
      const c = b.cells[g.k];
      const share = position === "overlay" ? c.n / (g.N || 1) : (b.total ? c.n / b.total : 0);
      rows.push({ name: g.name, value: fmtCount(c.n), color: g.color, bold: c === focusCell,
        extra: c.n ? fmtPct1(share) : "" });
    });
    if (vis.length > 1) rows.push({ name: "Total", value: fmtCount(b.total), bold: true, sep: true, extra: fmtPct1(b.total / Ntot) });
    rows.push({ name: upTo(b), value: fmtPct1(below / Ntot) });
  }
  const head = binLabel(b);
  let yy = pad + 9;
  tipBody.append("text").attr("x", pad).attr("y", yy).style("font-size", fs + "px").style("font-weight", 700)
    .style("fill", axisCol).text(head);
  let w = pad + tw(head, fs, 700) + pad;
  if (hasGroup) {
    const note = position === "overlay" ? "% of each group" : "% of the bin";
    tipBody.append("text").attr("x", pad).attr("y", yy + 14).style("font-size", "10px")
      .style("fill", axisCol).style("fill-opacity", 0.55).text(note);
    w = Math.max(w, pad + tw(note, 10) + pad);
    yy += 12;
  }
  yy += lh + 2;
  let maxName = 0, maxVal = 0, maxExtra = 0;
  rows.forEach(r => {
    r.n = truncate(r.name, 170, fs, r.bold ? 700 : 400);
    maxName = Math.max(maxName, tw(r.n, fs, r.bold ? 700 : 400));
    maxVal = Math.max(maxVal, tw(r.value, fs, 700));
    maxExtra = Math.max(maxExtra, r.extra ? tw(r.extra, 10.5) + 8 : 0);
  });
  const hasSw = rows.some(r => r.color);
  const nameX = pad + (hasSw ? 14 : 0);
  const colVal = nameX + maxName + 18 + maxVal;
  let extraOff = 0;
  rows.forEach((r, k) => {
    if (r.sep) extraOff += 4;
    const ry = yy + k * lh + extraOff;
    if (r.sep) tipBody.append("line").attr("x1", pad).attr("x2", colVal + maxExtra)
      .attr("y1", ry - 13).attr("y2", ry - 13).attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    if (r.color) tipBody.append("circle").attr("cx", pad + 4).attr("cy", ry - 4).attr("r", 4).attr("fill", r.color);
    tipBody.append("text").attr("x", r.color ? nameX : pad).attr("y", ry).style("font-size", fs + "px")
      .style("font-weight", r.bold ? 700 : 400).style("fill", axisCol)
      .style("fill-opacity", r.bold ? 1 : 0.75).text(r.n);
    tipBody.append("text").attr("x", colVal).attr("y", ry).attr("text-anchor", "end")
      .style("font-size", fs + "px").style("font-weight", 700).style("fill", axisCol).text(r.value);
    if (r.extra) tipBody.append("text").attr("x", colVal + 8).attr("y", ry)
      .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.55).text(r.extra);
  });
  w = Math.max(w, colVal + maxExtra + pad);
  const h = yy + (rows.length - 1) * lh + extraOff + pad + 2;
  tipRect.attr("width", w).attr("height", h);
}
function placeTip(mx, my) {
  const tipW = +tipRect.attr("width"), tipH = +tipRect.attr("height");
  let tx = mx + 16;
  if (tx + tipW > W - 4) tx = mx - 16 - tipW;
  if (tx < 4) tx = 4;
  const ty = Math.max(4, Math.min(H - tipH - 4, my - tipH / 2));
  gTip.attr("transform", `translate(${tx},${ty})`).style("display", null);
}
function binAt(mx) {
  if (mx < px0 || mx > px1) return null;
  const v = x.invert(mx);
  let k = d3.bisectRight(edges, v) - 1;
  if (k >= bins.length) k = bins.length - 1;
  return k >= 0 ? bins[k] : null;
}
function cellAt(b, my) {
  if (!hasGroup) return b.cells[0];
  const v = y.invert(my);
  const vis = b.cells.filter(c => c.visible && c.h > 0);
  if (position === "overlay") {
    // the smallest bar under the pointer (drawn on top of the larger ones)
    const under = vis.filter(c => v <= c.y1).sort((p, q) => p.y1 - q.y1);
    return under[0] || null;
  }
  return vis.find(c => v >= c.y0 && v <= c.y1) || null;
}
let lastTipKey = null, brushing = false;
function onHover(mx, my) {
  if (brushing) return;
  const b = binAt(mx);
  if (!b) { clearHover(); return; }
  const c = cellAt(b, my);
  const changed = hoverBin !== b || hoverCell !== c;
  hoverBin = b; hoverCell = c;
  if (changed) {
    bandHi.style("display", null).attr("x", x(b.x0)).attr("width", Math.max(1, x(b.x1) - x(b.x0)))
      .attr("y", py0).attr("height", py1 - py0);
    styleBars();
  }
  if (o.tooltip === false) return;
  const key = binsVersion + "|" + b.i + "|" + (c ? c.g.name : "") + "|" + position + "|" + stat + "|" + hidden.size;
  if (key !== lastTipKey) { lastTipKey = key; buildTip(b, c); }
  placeTip(mx, my);
}
function clearHover() {
  if (!hoverBin && gTip.style("display") === "none") return;
  hoverBin = null; hoverCell = null; lastTipKey = null;
  bandHi.style("display", "none");
  gTip.style("display", "none");
  styleBars();
}

// ---- brush (range selection), zoom ---------------------------------------------------------
let brush = null;
// programmatic brush moves: on D3 v5 their events carry the outer event as
// sourceEvent, so the handlers ignore them through this flag
let progMove = false;
function moveBrush(px) {
  progMove = true;
  try { gBrush.call(brush.move, px); } finally { progMove = false; }
}
function snapRange(s0, s1) {
  const v0 = x.invert(s0), v1 = x.invert(s1);
  let a = 0, b = edges.length - 1;
  edges.forEach((e, k) => { if (Math.abs(e - v0) < Math.abs(edges[a] - v0)) a = k; });
  edges.forEach((e, k) => { if (Math.abs(e - v1) < Math.abs(edges[b] - v1)) b = k; });
  if (b <= a) { const bn = binAt((s0 + s1) / 2); if (!bn) return null; a = bn.i; b = bn.i + 1; }
  return [edges[a], edges[b]];
}
function setSelection(range, send) {
  selRange = range;
  if (brush) moveBrush(range ? [x(range[0]), x(range[1])] : null);
  styleBars(); drawSummary(); renderTools();
  if (send) sendShiny("selected", range ? { from: range[0], to: range[1], count: selValues().length } : null);
}
function zoomTo(range) {
  // integer data: the view covers the integers inside the bins
  view = intBins() ? [range[0] + off, range[1] - off] : [range[0], range[1]];
  st.zoom = view.slice();
  const nb = bins.length;
  selRange = null;
  if (brush) moveBrush(null);
  sendShiny("selected", null);
  pickStep(Math.max(nb, 10));
  st.nb = edgesFor(step, view[0], view[1]).length - 1;
  binsVersion++;
  clearHover();
  update(550);
}
function resetZoom() {
  if (!view) return;
  view = null; st.zoom = null;
  selRange = null;
  if (brush) moveBrush(null);
  pickStep(st.nbFull || +o.bins || 30);
  binsVersion++;
  clearHover();
  update(550);
}
function setupBrush() {
  brush = d3.brushX().extent([[px0, py0], [px1, py1]])
    .on("start", function (a) {
      const ev = evOf(a);
      if (progMove) return;
      if (ev && ev.sourceEvent) { brushing = true; clearHover(); }
    })
    .on("brush", function (a) {
      const ev = evOf(a);
      if (progMove || !ev || !ev.sourceEvent || !ev.selection) return;
      selRange = snapRange(ev.selection[0], ev.selection[1]);
      styleBars(); drawSummary();
    })
    .on("end", function (a) {
      const ev = evOf(a);
      if (progMove) return;
      brushing = false;
      if (!ev || !ev.sourceEvent) return; // programmatic move
      if (!ev.selection) {
        // a click without a drag: report the clicked bin, clear the selection
        const se = ev.sourceEvent;
        const [mx, my] = ptr(se, svg.node());
        const b = binAt(mx);
        if (b) {
          const c = cellAt(b, my);
          sendShiny("clicked", { from: b.x0, to: b.x1, count: c && hasGroup ? c.n : b.total, group: hasGroup && c ? c.g.name : null });
        }
        if (selRange) setSelection(null, true); else renderTools();
        return;
      }
      const r = snapRange(ev.selection[0], ev.selection[1]);
      setSelection(r, true);
    });
  gBrush.call(brush);
  gBrush.select(".selection").attr("fill", ACCENT).attr("fill-opacity", 0.07)
    .attr("stroke", ACCENT).attr("stroke-opacity", 0.5).attr("shape-rendering", "crispEdges");
  gBrush.select(".overlay").style("cursor", "crosshair");
}
gBrush
  .on("mousemove.tip", function (a) { const [mx, my] = ptr(a, svg.node()); onHover(mx, my); })
  .on("mouseleave.tip", function () { clearHover(); })
  .on("dblclick.zoom", function () { if (selRange) setSelection(null, true); resetZoom(); });

function renderTools() {
  gTools.selectAll("*").remove();
  const items = [];
  if (selRange && !useBreaks) items.push({ text: "Zoom", act: () => zoomTo(selRange) });
  if (selRange) items.push({ text: "Clear", act: () => setSelection(null, true) });
  if (view) items.push({ text: "Reset zoom", act: resetZoom });
  if (!items.length) return;
  const h = 22, gap = 4;
  items.forEach(it => { it.w = tw(it.text, 11, 600) + 16; });
  const total = d3.sum(items, it => it.w) + gap * (items.length - 1);
  let bx = px1 - total - 4;
  items.forEach(it => {
    const g = gTools.append("g").attr("transform", `translate(${bx},${py0 + 4})`).style("cursor", "pointer");
    bx += it.w + gap;
    g.append("rect").attr("width", it.w).attr("height", h).attr("rx", 5)
      .attr("fill", bgcol).attr("fill-opacity", 0.92)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.2);
    g.on("mouseenter", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.5); })
      .on("mouseleave", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.2); })
      .on("click", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); it.act(); })
      .on("mousedown", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); })
      .on("dblclick", function (a) { const ev = evOf(a); if (ev) ev.stopPropagation(); });
    g.append("text").attr("x", it.w / 2).attr("y", h / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", 600).style("fill", ACCENT).text(it.text);
  });
}

// ---- legend ---------------------------------------------------------------------------------
gLegend.attr("transform", `translate(${padL},${legendTop})`);
[gLegend, gCtl, gTools].forEach(g => g.style("user-select", "none").style("-webkit-user-select", "none"));
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`)
  .style("cursor", "pointer");
legendSel.append("rect").attr("class", "bg").attr("x", -4).attr("width", d => d.w - 6).attr("height", 22)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legendSel.append("rect").attr("x", 1).attr("y", 5).attr("width", 12).attr("height", 12).attr("rx", 3)
  .attr("fill", d => d.g.color);
legendSel.append("text").attr("x", 19).attr("y", 11).attr("dy", "0.35em")
  .style("font-size", "12px").style("fill", axisCol).text(d => d.g.name);
function styleLegend() {
  legendSel.style("opacity", d => hidden.has(d.g.name) ? 0.4 : 1);
  legendSel.select("text").style("text-decoration", d => hidden.has(d.g.name) ? "line-through" : null);
}
function setFocus(name) {
  if (focusGroup === name) return;
  focusGroup = name;
  styleBars(); drawCurves(0); drawStats(0);
}
function afterVisibilityChange() {
  st.hidden = Array.from(hidden);
  focusGroup = null;
  lastTipKey = null;
  update(500);
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g.name)) setFocus(d.g.name);
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    setFocus(null);
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.g.name)) {
        if (groups.length - hidden.size <= 1) return;
        hidden.add(d.g.name);
      } else hidden.delete(d.g.name);
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

// ---- controls (bins, count / %, layout) -------------------------------------------------------
gCtl.attr("transform", `translate(${W - padR - ctlW},${headerTop})`);
let cx = 0;
function stepIndex() {
  let k = cands.findIndex(c => Math.abs(c.step - step) < 1e-12 * Math.max(1, step));
  if (k < 0) {
    const n = edges.length - 1;
    k = 0;
    cands.forEach((c, j) => { if (Math.abs(c.n - n) < Math.abs(cands[k].n - n)) k = j; });
  }
  return k;
}
function changeBins(dir) {
  const k = stepIndex();
  const n = edges.length - 1;
  let j = k;
  // move to the next number of bins in that direction
  while (j >= 0 && j < cands.length && (dir > 0 ? cands[j].n <= n : cands[j].n >= n)) j += dir;
  if (j < 0 || j >= cands.length) return;
  step = cands[j].step;
  st.nb = cands[j].n;
  if (!view) st.nbFull = st.nb;
  if (selRange) { selRange = null; if (brush) moveBrush(null); sendShiny("selected", null); }
  binsVersion++;
  clearHover();
  update(450);
}
ctlGroups.forEach(cg => {
  const g = gCtl.append("g").attr("transform", `translate(${cx},0)`).attr("class", "ctl-" + cg.id);
  cx += cg.w + ctlGap;
  g.append("rect").attr("width", cg.w).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  cg.items.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = g.append("g").attr("transform", `translate(${it.x},0)`).attr("class", "ctl")
      .style("cursor", it.passive ? "default" : "pointer").datum(it);
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", ACCENT).attr("fill-opacity", 0);
    if (k > 0) g.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", it.t.length === 1 && cg.id === "bins" ? "14px" : "11px")
      .style("font-weight", 600).style("fill", axisCol).text(it.t);
    if (it.passive) return;
    b.on("mouseenter", function () { if (!isActive(cg, it)) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", function () { styleControls(); })
      .on("click", function () {
        if (cg.id === "bins") { changeBins(it.k === "more" ? 1 : -1); return; }
        if (cg.id === "stat") { if (stat === it.k) return; stat = it.k; st.stat = stat; }
        else { if (position === it.k) return; position = it.k; st.position = position; }
        lastTipKey = null;
        gTip.style("display", "none");
        update(550);
      });
  });
});
function isActive(cg, it) {
  if (cg.id === "stat") return stat === it.k;
  if (cg.id === "position") return position === it.k;
  return false;
}
function styleControls() {
  ctlGroups.forEach(cg => cg.items.forEach(it => {
    if (it.k === "label") {
      const n = edges.length - 1;
      it.text.text(n + (n === 1 ? " bin" : " bins")).style("fill-opacity", 0.8);
      return;
    }
    if (cg.id === "bins") {
      const n = edges.length - 1;
      const can = it.k === "more" ? cands.some(c => c.n > n) : cands.some(c => c.n < n);
      it.text.style("fill-opacity", can ? 1 : 0.3);
      it.bg.attr("fill-opacity", 0);
      return;
    }
    const on = isActive(cg, it);
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? ACCENT : axisCol);
  }));
}

// ---- update ---------------------------------------------------------------------------------
let brushReady = false;
function update(dur, intro) {
  computeBins();
  computeHeights();
  curveData = (o.density === "kde" || o.density === "normal")
    ? curveSets().map(s => ({ key: s.key, color: s.color, group: s.group, pts: curvePoints(s) })).filter(d => d.pts)
    : [];
  let yMax = d3.max(bins, b => d3.max(b.cells, c => c.visible ? c.y1 : 0)) || 0;
  curveData.forEach(d => { yMax = Math.max(yMax, d3.max(d.pts, p => p[1])); });
  if (!(yMax > 0)) yMax = 1;
  y.domain([0, yMax]).nice(nYTicks);
  // the y-axis labels decide the left margin
  const f = yTickFmt();
  const maxTick = d3.max(y.ticks(nYTicks), t => tw(f(t), yFs)) || 20;
  const newPx0 = padL + maxTick + 10;
  const moved = Math.abs(newPx0 - px0) > 0.5;
  px0 = newPx0;
  x.domain([edges[0], edges[edges.length - 1]]).range([px0, px1]);
  clipRect.attr("x", px0).attr("width", px1 - px0);
  if (!brushReady || moved) {
    if (brushReady) brush.extent([[px0, py0], [px1, py1]]), gBrush.call(brush);
    else { setupBrush(); brushReady = true; }
  }
  if (selRange) moveBrush([x(selRange[0]), x(selRange[1])]);
  drawAxes(intro ? 0 : dur);
  drawBars(dur, intro);
  drawCurves(dur, intro);
  drawStats(intro ? 0 : dur);
  drawRug();
  drawSummary();
  styleLegend();
  styleControls();
  renderTools();
  gTip.raise();
}

if (!st.nbFull && !view) st.nbFull = edgesFor(step || 1, viewRange()[0], viewRange()[1]).length - 1;
update(o.animate && firstRender ? 650 : 0, o.animate && firstRender);
