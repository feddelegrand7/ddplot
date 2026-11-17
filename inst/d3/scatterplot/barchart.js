// bar_chart() and horz_bar_chart(): interactive bar charts.
//
// data: rows {c, g, v, n} (category, group or "", aggregated value, number of
// rows aggregated). options.orientation is "vertical" or "horizontal".
// Groups can be drawn grouped, stacked or stacked to 100%; the layout, the
// sort order and the hidden groups are kept in r2d3.ddplotState so a Shiny
// update or a resize keeps them. Works with D3 v5 and v6.

const o = options;
const isV6 = typeof d3.pointer === "function";
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const gridCol = o.gridCol || null;
const bgcol = o.bgcol || "white";
const ACCENT = "#4269d0", GREY = "#cdd2d8";
const horiz = o.orientation === "horizontal";
const uid = "ddbc" + Math.random().toString(36).slice(2, 9);
const arr = v => (v === null || v === undefined) ? [] : [].concat(v);
const num = v => (v === null || v === undefined || v === "NA" || !isFinite(+v)) ? null : +v;
const evOf = a => isV6 ? a : d3.event;
const ptr = (a, node) => isV6 ? d3.pointer(a, node) : d3.mouse(node);

svg.style("background-color", bgcol).style("font-family", font);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!state.bar || state.bar.key !== o.stateKey) state.bar = { key: o.stateKey };
const st = state.bar;

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
const cats = arr(o.categories).map(String);
const groupNames = arr(o.groups).map(String);
const hasGroup = groupNames.length > 0;
const gColors = arr(o.colors);
const groups = hasGroup
  ? groupNames.map((name, k) => ({ name, color: gColors[k % gColors.length] || ACCENT }))
  : [{ name: "", color: o.fill || ACCENT }];
const catColors = arr(o.catColors);
const hl = new Set(arr(o.highlight).map(String));
const cellMap = new Map();
(data || []).forEach(r => {
  const g = (r.g === null || r.g === undefined) ? "" : String(r.g);
  cellMap.set(String(r.c) + "\u0001" + g, { v: num(r.v), n: +r.n || 0 });
});
const items = cats.map((name, ci) => ({
  name, ci,
  color: catColors.length ? catColors[ci % catColors.length] : (o.fill || ACCENT)
}));
items.forEach(it => {
  it.cells = groups.map((g, gi) => {
    const c = cellMap.get(it.name + "\u0001" + g.name);
    return { item: it, g, gi, v: c ? c.v : null, n: c ? c.n : 0, key: it.name + "\u0001" + g.name };
  });
});
const allCells = items.flatMap(it => it.cells);

if (!items.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}

const hidden = new Set(arr(st.hidden).filter(n => groupNames.indexOf(n) >= 0));
if (hidden.size >= groups.length) hidden.clear();
let mode = hasGroup ? (st.mode || o.position || "grouped") : "grouped";
let sortMode = st.sort || o.sort || "none";
const firstRender = !st.drawn;
st.drawn = true;
const visGroups = () => groups.filter(g => !hidden.has(g.name));

// ---- formats ----------------------------------------------------------------------
const fmtCore = o.valueFormat ? d3.format(o.valueFormat) : null;
const pre = o.valuePrefix || "", suf = o.valueSuffix || "";
function autoFmt(a) {
  if (a >= 1e6) return d3.format(".3~s")(a).replace("G", "B");
  if (Number.isInteger(a)) return d3.format(",")(a);
  return d3.format(a >= 100 ? ",.1~f" : ",.2~f")(a);
}
const fmtV = v => (v === null || v === undefined) ? "–"
  : (v < 0 ? "−" : "") + pre + (fmtCore ? fmtCore(Math.abs(v)) : autoFmt(Math.abs(v))) + suf;
const fmtPct = d3.format(".0%"), fmtPct1 = d3.format(".1%");

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
function textOn(color) {
  const c = d3.rgb(color);
  const lin = u => { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  return L > 0.36 ? "#222222" : "#ffffff";
}

// ---- values per layout ------------------------------------------------------------
function computeValues() {
  items.forEach(it => {
    let pos = 0, neg = 0;
    const tot = d3.sum(it.cells, c => hidden.has(c.g.name) ? 0 : Math.abs(c.v || 0)) || 1;
    it.cells.forEach(c => {
      c.visible = !hidden.has(c.g.name) && c.v !== null;
      const v = c.visible ? c.v : 0;
      c.share = c.visible ? Math.abs(c.v) / tot : 0;
      if (mode === "grouped") {
        c.v0 = Math.min(0, v); c.v1 = Math.max(0, v);
      } else {
        const vv = mode === "percent" ? v / tot : v;
        if (vv >= 0) { c.v0 = pos; c.v1 = pos + vv; pos += vv; }
        else { c.v1 = neg; c.v0 = neg + vv; neg += vv; }
      }
      c.outer = mode === "grouped";
    });
    it.total = d3.sum(it.cells, c => c.visible ? c.v : 0);
    it.pos = pos; it.neg = neg;
    if (mode !== "grouped") {
      const vis = it.cells.filter(c => c.visible && c.v !== 0);
      const p = vis.filter(c => c.v > 0), n = vis.filter(c => c.v < 0);
      if (p.length) p[p.length - 1].outer = true;
      if (n.length) n[n.length - 1].outer = true;
    }
  });
}
function valueDomain() {
  let lo = 0, hi = 0;
  allCells.forEach(c => { if (c.visible) { lo = Math.min(lo, c.v0); hi = Math.max(hi, c.v1); } });
  if (mode !== "percent") arr(o.refLines).forEach(r => {
    const v = +r.value;
    if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  });
  if (lo === hi) hi = lo + 1;
  return [lo, hi];
}
function orderedItems() {
  const list = items.slice();
  if (sortMode === "ascending") list.sort((a, b) => (a.total - b.total) || (a.ci - b.ci));
  else if (sortMode === "descending") list.sort((a, b) => (b.total - a.total) || (a.ci - b.ci));
  else list.sort((a, b) => a.ci - b.ci);
  return list;
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
if (o.controls && hasGroup) ctlGroups.push({ id: "mode", items: [
  { k: "grouped", t: "Grouped", tip: "Bars side by side" },
  { k: "stacked", t: "Stacked", tip: "Bars stacked" },
  { k: "percent", t: "100%", tip: "Stacked to 100%" }] });
if (o.controls && items.length > 1) ctlGroups.push({ id: "sort", items: [
  { k: "none", t: "Original", tip: "Original order" },
  { k: "descending", t: "↓", tip: "Largest first" },
  { k: "ascending", t: "↑", tip: "Smallest first" }] });
const ctlH = 22, ctlGap = 8;
ctlGroups.forEach(cg => {
  cg.items.forEach(it => { it.w = tw(it.t, 11, 600) + (it.t.length <= 1 ? 16 : 18); });
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

const valTitle = o.valTitle, catTitle = o.catTitle;
const topTitle = horiz ? catTitle : valTitle;
const topTitleFs = horiz ? o.catTitleFontSize : o.valTitleFontSize;
if (topTitle) top += topTitleFs + 8;
top += 4;

const catFs = o.catFontSize || 11, valFs = o.valFontSize || 11, lblFs = Math.max(9, Math.min(catFs, 11));

// ---- scales ----------------------------------------------------------------------------
const val = d3.scaleLinear();
const band = d3.scaleBand().paddingInner(o.paddingWidth).paddingOuter(Math.min(0.5, o.paddingWidth / 2 + 0.05));
const inner = d3.scaleBand().padding(0.08);
const nTicksDefault = horiz ? Math.max(2, Math.round((W - 200) / 90)) : Math.max(2, Math.round((H - top - 60) / 55));
const nTicks = o.valTicks || nTicksDefault;

function tickFmt() {
  if (mode === "percent") return d3.format(".0%");
  const d = val.domain();
  const m = Math.max(Math.abs(d[0]), Math.abs(d[1]));
  const base = fmtCore || (m >= 1e4 ? d3.format("~s") : val.tickFormat(nTicks));
  return v => (v < 0 ? "−" : "") + pre + String(base(Math.abs(v))).replace("G", "B") + suf;
}

// measure the widest value labels over every layout the chart can switch to
const modes = hasGroup ? (o.controls ? ["grouped", "stacked", "percent"] : [mode]) : ["grouped"];
let maxTickW = 0, maxValLabelW = 0;
(function () {
  const keep = mode;
  modes.forEach(m => {
    mode = m;
    computeValues();
    val.domain(valueDomain()).nice(nTicks);
    const f = tickFmt();
    val.ticks(nTicks).forEach(t => { maxTickW = Math.max(maxTickW, tw(f(t), valFs)); });
    if (m !== "percent") {
      allCells.forEach(c => { if (c.visible) maxValLabelW = Math.max(maxValLabelW, tw(fmtV(c.v), lblFs, 600)); });
      if (m === "stacked") items.forEach(it => { maxValLabelW = Math.max(maxValLabelW, tw(fmtV(it.total), lblFs, 700)); });
    }
  });
  mode = keep;
})();

let px0, px1, py0, py1, catRot = false, catEvery = 1, catLabelMax = 0;
if (horiz) {
  catLabelMax = Math.min(W * 0.38, d3.max(items, it => tw(it.name, catFs)) || 0);
  px0 = padL + catLabelMax + 10;
  px1 = W - padR - (o.labels ? Math.min(110, maxValLabelW + 10) : 0);
  py0 = top;
  let bottom = 8 + 20;
  if (valTitle) bottom += o.valTitleFontSize + 8;
  py1 = H - bottom;
  const step = (py1 - py0) / items.length;
  catEvery = Math.max(1, Math.ceil((catFs + 2) / step));
} else {
  px0 = padL + maxTickW + 10;
  px1 = W - padR;
  const step = (px1 - px0) / items.length;
  const widest = d3.max(items, it => Math.min(130, tw(it.name, catFs))) || 0;
  catRot = widest + 8 > step;
  catLabelMax = catRot ? 130 : step - 4;
  if (catRot) catEvery = Math.max(1, Math.ceil(1.6 * catFs / step));
  const sin = Math.sin(Math.PI * 40 / 180);
  if (catRot) {
    const need = padL + Math.min(130, widest) * Math.cos(Math.PI * 40 / 180) - step / 2;
    if (need > px0) px0 = need;
  }
  let bottom = catRot ? Math.min(130, widest) * sin + catFs * 0.8 + 14 : catFs + 14;
  if (catTitle) bottom += o.catTitleFontSize + 8;
  py0 = top;
  py1 = H - bottom;
}
const plotW = Math.max(30, px1 - px0), plotH = Math.max(30, py1 - py0);
const headroom = (!horiz && o.labels) ? lblFs + 6 : 0;
if (horiz) { band.range([py0, py1]); val.range([px0, px1]); }
else { band.range([px0, px1]); val.range([py1, py0 + headroom]); }

// ---- static chrome ----------------------------------------------------------------
const defs = svg.append("defs");
const shadow = defs.append("filter").attr("id", uid + "-shadow")
  .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
  .attr("flood-color", "#000").attr("flood-opacity", 0.14);

let valTitleSel = null;
if (topTitle) {
  const s = svg.append("text").attr("x", padL).attr("y", py0 - 10)
    .style("font-size", topTitleFs + "px").style("font-weight", 600)
    .style("fill", axisCol).text(topTitle);
  if (!horiz) valTitleSel = s;
}
if (horiz && valTitle) {
  valTitleSel = svg.append("text").attr("x", px0 + plotW / 2).attr("y", H - 10).attr("text-anchor", "middle")
    .style("font-size", o.valTitleFontSize + "px").style("font-weight", 600)
    .style("fill", axisCol).text(valTitle);
}
function valTitleText() {
  if (mode !== "percent") return valTitle;
  const t = String(valTitle);
  const low = t.length > 1 && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t;
  return "Share of " + low;
}
if (!horiz && catTitle) {
  svg.append("text").attr("x", px0 + plotW / 2).attr("y", H - 10).attr("text-anchor", "middle")
    .style("font-size", o.catTitleFontSize + "px").style("font-weight", 600)
    .style("fill", axisCol).text(catTitle);
}

const gBandHi = svg.append("g");
const gGrid = svg.append("g");
const gValAxis = svg.append("g");
const gCatAxis = svg.append("g");
const gBars = svg.append("g");
const gZero = svg.append("g");
const gRef = svg.append("g");
const gLabels = svg.append("g").style("pointer-events", "none");
const gHit = svg.append("g");
const gLegend = svg.append("g");
const gCtl = svg.append("g");
const gTip = svg.append("g").style("pointer-events", "none").style("display", "none");

const bandHi = gBandHi.append("rect").attr("fill", axisCol).attr("fill-opacity", 0.05)
  .attr("rx", 4).style("display", "none");
const zeroLine = gZero.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.55)
  .attr("stroke-width", 1).style("pointer-events", "none");

// ---- geometry ------------------------------------------------------------------------------
function rpath(x0, y0, x1, y1, tl, tr, br, bl) {
  return `M${x0 + tl},${y0}L${x1 - tr},${y0}Q${x1},${y0} ${x1},${y0 + tr}` +
    `L${x1},${y1 - br}Q${x1},${y1} ${x1 - br},${y1}L${x0 + bl},${y1}Q${x0},${y1} ${x0},${y1 - bl}` +
    `L${x0},${y0 + tl}Q${x0},${y0} ${x0 + tl},${y0}Z`;
}
function cellBand(c) {
  const b = band(c.item.name);
  if (mode === "grouped" && hasGroup) {
    const present = c.item.cells.filter(x => x.visible);
    const k = present.indexOf(c);
    if (k < 0) { const mid = b + band.bandwidth() / 2; return [mid, mid]; }
    const step = inner.step(), bw = inner.bandwidth();
    const s = b + (band.bandwidth() - present.length * step) / 2 + (step - bw) / 2 + k * step;
    return [s, s + bw];
  }
  return [b, b + band.bandwidth()];
}
function geom(c, collapsed) {
  const [b0, b1] = cellBand(c);
  const v0 = collapsed ? 0 : c.v0, v1 = collapsed ? 0 : c.v1;
  const a = val(collapsed && mode !== "grouped" ? 0 : v0), b = val(v1);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const thick = b1 - b0, len = hi - lo;
  const r = c.outer ? Math.max(0, Math.min(+o.cornerRadius || 0, thick / 2, len)) : 0;
  const positive = c.visible ? c.v >= 0 : true;
  let g;
  if (horiz) g = { x0: lo, x1: hi, y0: b0, y1: b1, tl: positive ? 0 : r, tr: positive ? r : 0, br: positive ? r : 0, bl: positive ? 0 : r };
  else g = { x0: b0, x1: b1, y0: lo, y1: hi, tl: positive ? r : 0, tr: positive ? r : 0, br: positive ? 0 : r, bl: positive ? 0 : r };
  g.d = rpath(g.x0, g.y0, g.x1, g.y1, g.tl, g.tr, g.br, g.bl);
  return g;
}
function cellColor(c) {
  if (hasGroup) return c.g.color;
  if (c.v !== null && c.v < 0 && o.negativeFill) return o.negativeFill;
  if (hl.size && !hl.has(c.item.name)) return GREY;
  return c.item.color;
}

let focusGroup = null, hoverItem = null, hoverCell = null;
function cellOpacity(c) {
  let op = (o.opacity === null || o.opacity === undefined) ? 1 : +o.opacity;
  if (hasGroup && hl.size && !hl.has(c.item.name)) op *= 0.3;
  if (focusGroup !== null && c.g.name !== focusGroup) op *= 0.22;
  if (hoverItem && c.item !== hoverItem) op *= 0.55;
  return op;
}

// ---- bars ------------------------------------------------------------------------------------
const bars = gBars.selectAll("path").data(allCells, c => c.key).enter().append("path")
  .attr("fill", cellColor)
  .attr("stroke", o.stroke || "none")
  .attr("stroke-width", (o.strokeWidth === null || o.strokeWidth === undefined) ? (o.stroke ? 1 : 0) : +o.strokeWidth);
function styleBars() {
  bars.attr("fill-opacity", cellOpacity)
    .attr("stroke", c => (hoverCell === c && hasGroup) ? axisCol : (o.stroke || "none"))
    .attr("stroke-width", c => (hoverCell === c && hasGroup) ? 1.5
      : ((o.strokeWidth === null || o.strokeWidth === undefined) ? (o.stroke ? 1 : 0) : +o.strokeWidth));
}

// ---- value labels ------------------------------------------------------------------------------
function labelData() {
  if (!o.labels) return [];
  const out = [];
  const add = (key, x, y, text, anchor, color, weight, item, group) =>
    out.push({ key, x, y, text, anchor, color, weight, item, group });
  allCells.forEach(c => {
    if (!c.visible) return;
    const g = geom(c, false);
    const thick = horiz ? g.y1 - g.y0 : g.x1 - g.x0;
    const len = horiz ? g.x1 - g.x0 : g.y1 - g.y0;
    if (mode === "grouped") {
      const text = fmtV(c.v), w = tw(text, lblFs, 600);
      if (horiz) {
        if (thick < lblFs - 1) return;
        if (c.v >= 0) add(c.key, g.x1 + 5, (g.y0 + g.y1) / 2, text, "start", axisCol, 600, c.item, c.g.name);
        else add(c.key, g.x0 - 5, (g.y0 + g.y1) / 2, text, "end", axisCol, 600, c.item, c.g.name);
      } else {
        if (w > thick + 8) return;
        if (c.v >= 0) add(c.key, (g.x0 + g.x1) / 2, g.y0 - 5 - lblFs * 0.4, text, "middle", axisCol, 600, c.item, c.g.name);
        else add(c.key, (g.x0 + g.x1) / 2, g.y1 + 5 + lblFs * 0.4, text, "middle", axisCol, 600, c.item, c.g.name);
      }
    } else {
      const text = mode === "percent" ? fmtPct(c.share) : fmtV(c.v);
      const w = tw(text, lblFs, 600);
      const fits = horiz ? (len >= w + 8 && thick >= lblFs + 2) : (len >= lblFs + 4 && thick >= w + 6);
      if (!fits) return;
      add(c.key, (g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2, text, "middle", textOn(cellColor(c)), 600, c.item, c.g.name);
    }
  });
  if (mode === "grouped" && out.length) {
    const vis = allCells.filter(c => c.visible);
    const fitsAll = vis.every(c => {
      const g = geom(c, false);
      const thick = horiz ? g.y1 - g.y0 : g.x1 - g.x0;
      return horiz ? thick >= lblFs - 1 : tw(fmtV(c.v), lblFs, 600) <= thick + 8;
    });
    if (!fitsAll) out.length = 0;
  }
  if (mode === "stacked" && visGroups().length > 1) {
    items.forEach(it => {
      if (!it.cells.some(c => c.visible)) return;
      const text = fmtV(it.total);
      const b = band(it.name), bw = band.bandwidth();
      const end = it.total >= 0 ? val(it.pos) : val(it.neg);
      if (horiz) {
        if (bw < lblFs - 1) return;
        add("total\u0001" + it.name, it.total >= 0 ? end + 5 : end - 5, b + bw / 2, text, it.total >= 0 ? "start" : "end", axisCol, 700, it, null);
      } else {
        if (tw(text, lblFs, 700) > bw + 8) return;
        add("total\u0001" + it.name, b + bw / 2, it.total >= 0 ? end - 5 - lblFs * 0.4 : end + 5 + lblFs * 0.4, text, "middle", axisCol, 700, it, null);
      }
    });
  }
  return out;
}
function drawLabels(dur) {
  const ld = labelData();
  const sel = gLabels.selectAll("text:not(.exiting)").data(ld, d => d.key);
  sel.exit().classed("exiting", true).interrupt("op")
    .transition().duration(dur ? 150 : 0).style("opacity", 0).remove();
  const ent = sel.enter().append("text")
    .attr("dy", "0.35em").style("font-size", lblFs + "px").style("opacity", 0)
    .attr("x", d => d.x).attr("y", d => d.y);
  const all = ent.merge(sel)
    .attr("text-anchor", d => d.anchor)
    .style("font-weight", d => d.weight)
    .style("fill", d => d.color)
    .text(d => d.text);
  (dur ? all.transition().duration(dur) : all)
    .attr("x", d => d.x).attr("y", d => d.y);
  styleLabels(dur);
}
function styleLabels(dur) {
  const sel = gLabels.selectAll("text:not(.exiting)");
  const op = d => {
    let v = 1;
    if (focusGroup !== null && d.group !== null && d.group !== focusGroup) v = 0.15;
    if (focusGroup !== null && d.group === null) v = 0.35;
    if (hoverItem && d.item !== hoverItem) v *= 0.55;
    return v;
  };
  (dur ? sel.transition("op").duration(dur) : sel).style("opacity", op);
}

// ---- category axis ---------------------------------------------------------------------------
const catSel = gCatAxis.selectAll("text").data(items, it => it.name).enter().append("text")
  .style("font-size", catFs + "px").style("fill", axisCol)
  .text(it => truncate(it.name, catLabelMax, catFs));
catSel.append("title").text(it => it.name);
function catPos(it) {
  const b = band(it.name) + band.bandwidth() / 2;
  return horiz ? [px0 - 8, b] : [b, py1 + 8];
}
function drawCatAxis(dur, order) {
  const rank = new Map(order.map((it, k) => [it.name, k]));
  const s = dur ? catSel.transition().duration(dur) : catSel;
  if (horiz) {
    s.attr("text-anchor", "end").attr("dy", "0.35em")
      .attr("transform", it => `translate(${catPos(it)[0]},${catPos(it)[1]})`);
  } else if (catRot) {
    s.attr("text-anchor", "end").attr("dy", "0.35em")
      .attr("transform", it => `translate(${catPos(it)[0]},${catPos(it)[1] + 2}) rotate(-40)`);
  } else {
    s.attr("text-anchor", "middle").attr("dy", "0.8em")
      .attr("transform", it => `translate(${catPos(it)[0]},${catPos(it)[1]})`);
  }
  catSel.style("display", it => rank.get(it.name) % catEvery === 0 ? null : "none")
    .style("font-weight", it => hoverItem === it ? 700 : 400)
    .style("fill-opacity", it => hl.size && !hl.has(it.name) ? 0.6 : 0.9);
}

// ---- value axis, grid, reference lines ----------------------------------------------------------
function drawValueAxis(dur) {
  const f = tickFmt();
  const ticks = val.ticks(nTicks);
  const axis = (horiz ? d3.axisBottom(val) : d3.axisLeft(val))
    .tickValues(ticks).tickFormat(f).tickSize(0).tickPadding(horiz ? 8 : 8);
  gValAxis.attr("transform", horiz ? `translate(0,${py1})` : `translate(${px0},0)`);
  (dur ? gValAxis.transition().duration(dur) : gValAxis).call(axis);
  gValAxis.select("path.domain").remove();
  gValAxis.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("font-size", valFs + "px").style("font-family", font);
  if (gridCol) {
    const gl = gGrid.selectAll("line").data(ticks.filter(t => t !== 0), t => t);
    gl.exit().remove();
    const m = gl.enter().append("line").attr("stroke", gridCol).merge(gl);
    const s = dur ? m.transition().duration(dur) : m;
    if (horiz) s.attr("x1", t => val(t)).attr("x2", t => val(t)).attr("y1", py0).attr("y2", py1);
    else s.attr("y1", t => val(t)).attr("y2", t => val(t)).attr("x1", px0).attr("x2", px1);
  }
  const z = dur ? zeroLine.transition().duration(dur) : zeroLine;
  if (horiz) z.attr("x1", val(0)).attr("x2", val(0)).attr("y1", py0).attr("y2", py1);
  else z.attr("y1", val(0)).attr("y2", val(0)).attr("x1", px0).attr("x2", px1);
}
function drawRefs(dur) {
  const refs = mode === "percent" ? [] : arr(o.refLines).filter(r => isFinite(+r.value));
  const sel = gRef.selectAll("g").data(refs);
  sel.exit().remove();
  const ent = sel.enter().append("g");
  ent.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.7)
    .attr("stroke-dasharray", "5,4").attr("stroke-width", 1.25);
  ent.append("text").style("font-size", "11px").style("font-weight", 600).style("fill", axisCol)
    .style("paint-order", "stroke").style("stroke", bgcol).style("stroke-width", 3);
  const m = ent.merge(sel);
  const ln = dur ? m.select("line").transition().duration(dur) : m.select("line");
  const tx = dur ? m.select("text").transition().duration(dur) : m.select("text");
  const lab = r => (r.label ? r.label + " " : "") + fmtV(+r.value);
  m.select("text").text(lab);
  if (horiz) {
    ln.attr("x1", r => val(+r.value)).attr("x2", r => val(+r.value)).attr("y1", py0 - 4).attr("y2", py1);
    tx.attr("x", r => val(+r.value) + 4).attr("y", py0 - 2).attr("text-anchor", "start");
  } else {
    ln.attr("y1", r => val(+r.value)).attr("y2", r => val(+r.value)).attr("x1", px0).attr("x2", px1);
    tx.attr("x", px1).attr("y", r => val(+r.value) - 5).attr("text-anchor", "end");
  }
}

// ---- hover areas, tooltip ----------------------------------------------------------------------
const hits = gHit.selectAll("rect").data(items, it => it.name).enter().append("rect")
  .attr("fill", "transparent").style("cursor", "pointer");
function drawHits() {
  const pad = band.step() * band.paddingInner() / 2;
  if (horiz) hits.attr("x", px0 - catLabelMax - 10).attr("width", px1 - px0 + catLabelMax + 10)
    .attr("y", it => band(it.name) - pad).attr("height", band.step());
  else hits.attr("y", py0).attr("height", py1 - py0 + 8)
    .attr("x", it => band(it.name) - pad).attr("width", band.step());
}

const tipRect = gTip.append("rect").attr("rx", 6).attr("fill", bgcol)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("filter", `url(#${uid}-shadow)`);
const tipBody = gTip.append("g");
const rankOf = new Map();
function refreshRanks() {
  const sorted = items.slice().sort((a, b) => b.total - a.total);
  sorted.forEach((it, k) => rankOf.set(it.name, k + 1));
}
const aggLabel = { sum: "Rows summed", mean: "Rows averaged", median: "Rows (median)", min: "Rows (minimum)", max: "Rows (maximum)", count: null };

function buildTip(it, focusCell) {
  tipBody.selectAll("*").remove();
  const pad = 10, lh = 18, fs = 11.5;
  const rows = [];
  if (!hasGroup) {
    const c = it.cells[0];
    rows.push({ name: o.valTitle || o.valName, value: fmtV(c.v), bold: true });
    const grand = d3.sum(items, x => Math.abs(x.cells[0].v || 0));
    const allPos = items.every(x => (x.cells[0].v || 0) >= 0);
    if (items.length > 1 && allPos && grand > 0) rows.push({ name: "Share of total", value: fmtPct1(Math.abs(c.v || 0) / grand) });
    if (items.length > 1) rows.push({ name: "Rank", value: rankOf.get(it.name) + " of " + items.length });
    if (aggLabel[o.agg] && c.n > 1) rows.push({ name: aggLabel[o.agg], value: d3.format(",")(c.n) });
  } else {
    const vis = it.cells.filter(c => !hidden.has(c.g.name));
    const shown = vis.slice(0, 14);
    shown.forEach(c => rows.push({
      name: c.g.name, value: fmtV(c.v), color: c.g.color, bold: c === focusCell,
      extra: (mode !== "grouped" && c.v !== null) ? fmtPct(c.share) : ""
    }));
    if (vis.length > 1) rows.push({ name: "Total", value: fmtV(it.total), bold: true, sep: true });
  }
  const head = truncate(it.name, 240, fs, 700);
  let y = pad + 9;
  const headColor = hasGroup ? null : cellColor(it.cells[0]);
  if (headColor) tipBody.append("rect").attr("x", pad).attr("y", y - 9).attr("width", 9).attr("height", 9)
    .attr("rx", 2).attr("fill", headColor);
  const hx = headColor ? pad + 15 : pad;
  tipBody.append("text").attr("x", hx).attr("y", y).style("font-size", fs + "px").style("font-weight", 700)
    .style("fill", axisCol).text(head);
  let w = hx + tw(head, fs, 700) + pad;
  y += lh + 2;
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
  rows.forEach((r, k) => {
    const ry = y + k * lh + (r.sep ? 4 : 0);
    if (r.sep) tipBody.append("line").attr("x1", pad).attr("x2", colVal + maxExtra)
      .attr("y1", ry - 13).attr("y2", ry - 13).attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    if (r.color) tipBody.append("circle").attr("cx", pad + 4).attr("cy", ry - 4).attr("r", 4).attr("fill", r.color);
    tipBody.append("text").attr("x", nameX).attr("y", ry).style("font-size", fs + "px")
      .style("font-weight", r.bold ? 700 : 400).style("fill", axisCol)
      .style("fill-opacity", r.bold ? 1 : 0.75).text(r.n);
    tipBody.append("text").attr("x", colVal).attr("y", ry).attr("text-anchor", "end")
      .style("font-size", fs + "px").style("font-weight", 700).style("fill", axisCol).text(r.value);
    if (r.extra) tipBody.append("text").attr("x", colVal + 8).attr("y", ry)
      .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.55).text(r.extra);
  });
  w = Math.max(w, colVal + maxExtra + pad);
  const h = y + (rows.length - 1) * lh + (rows.some(r => r.sep) ? 4 : 0) + pad + 2;
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
function cellAt(it, mx, my) {
  if (!hasGroup) return it.cells[0];
  const along = horiz ? my : mx;
  const across = horiz ? mx : my;
  if (mode === "grouped") {
    return it.cells.find(c => { if (!c.visible) return false; const [b0, b1] = cellBand(c); return along >= b0 - 1 && along <= b1 + 1; }) || null;
  }
  const v = val.invert(across);
  return it.cells.find(c => c.visible && v >= c.v0 && v <= c.v1) || null;
}
let lastTipKey = null;
function onHover(it, mx, my) {
  const c = cellAt(it, mx, my);
  const changed = hoverItem !== it || hoverCell !== c;
  hoverItem = it; hoverCell = c;
  if (changed) {
    const pad = band.step() * band.paddingInner() / 2;
    bandHi.style("display", null);
    if (horiz) bandHi.attr("x", px0 - 4).attr("width", plotW + 8).attr("y", band(it.name) - pad).attr("height", band.step());
    else bandHi.attr("y", py0).attr("height", plotH).attr("x", band(it.name) - pad).attr("width", band.step());
    styleBars(); styleLabels(0); drawCatAxisStyle();
  }
  if (o.tooltip === false) return;
  const key = it.name + "|" + (c ? c.g.name : "") + "|" + mode;
  if (key !== lastTipKey) { lastTipKey = key; buildTip(it, c); }
  placeTip(mx, my);
}
function clearHover() {
  hoverItem = null; hoverCell = null; lastTipKey = null;
  bandHi.style("display", "none");
  gTip.style("display", "none");
  styleBars(); styleLabels(0); drawCatAxisStyle();
}
function drawCatAxisStyle() {
  catSel.style("font-weight", it => hoverItem === it ? 700 : 400);
}
hits
  .on("mousemove", function (a) {
    const it = d3.select(this).datum();
    const [mx, my] = ptr(a, svg.node());
    onHover(it, mx, my);
  })
  .on("mouseleave", function () { clearHover(); })
  .on("click", function (a) {
    const it = d3.select(this).datum();
    const [mx, my] = ptr(a, svg.node());
    const c = cellAt(it, mx, my);
    sendShiny("clicked", { category: it.name, group: hasGroup && c ? c.g.name : null });
  });

// ---- legend ---------------------------------------------------------------------------------
gLegend.attr("transform", `translate(${padL},${legendTop})`);
[gLegend, gCtl, gHit].forEach(g => g.style("user-select", "none").style("-webkit-user-select", "none"));
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
  styleBars(); styleLabels(150);
}
function afterVisibilityChange() {
  st.hidden = Array.from(hidden);
  focusGroup = null;
  styleLegend();
  lastTipKey = null;
  update(550);
}
let clickTimer = null;
legendSel
  .on("mouseenter", function (a) {
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

// ---- controls (layout and sort) ---------------------------------------------------------------
gCtl.attr("transform", `translate(${W - padR - ctlW},${headerTop})`);
let cx = 0;
ctlGroups.forEach(cg => {
  const g = gCtl.append("g").attr("transform", `translate(${cx},0)`);
  cx += cg.w + ctlGap;
  g.append("rect").attr("width", cg.w).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  cg.items.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = g.append("g").attr("transform", `translate(${it.x},0)`).style("cursor", "pointer").datum(it);
    it.node = b;
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", ACCENT).attr("fill-opacity", 0);
    if (k > 0) g.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
      .style("fill", axisCol).text(it.t);
    b.on("mouseenter", function () { if (!isActive(cg, it)) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", function () { styleControls(); })
      .on("click", function () {
        if (cg.id === "mode") { if (mode === it.k) return; mode = it.k; st.mode = mode; }
        else { if (sortMode === it.k) return; sortMode = it.k; st.sort = sortMode; }
        lastTipKey = null;
        gTip.style("display", "none");
        update(650);
      });
  });
});
function isActive(cg, it) { return cg.id === "mode" ? mode === it.k : sortMode === it.k; }
function styleControls() {
  ctlGroups.forEach(cg => cg.items.forEach(it => {
    const on = isActive(cg, it);
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? ACCENT : axisCol);
  }));
}

// ---- update ---------------------------------------------------------------------------------
function update(dur, intro) {
  computeValues();
  refreshRanks();
  const order = orderedItems();
  band.domain(order.map(it => it.name));
  inner.domain(visGroups().map(g => g.name)).range([0, band.bandwidth()]);
  val.domain(valueDomain()).nice(nTicks);
  drawValueAxis(intro ? 0 : dur);
  if (valTitleSel) valTitleSel.text(valTitleText());
  drawCatAxis(intro ? 0 : dur, order);
  drawRefs(intro ? 0 : dur);
  drawHits();

  if (intro) {
    const rank = new Map(order.map((it, k) => [it.name, k]));
    const n = order.length;
    bars.attr("d", c => geom(c, true).d);
    bars.transition().duration(700)
      .delay(c => rank.get(c.item.name) * Math.min(45, 500 / n) + (mode !== "grouped" ? c.gi * 60 : 0))
      .ease(d3.easeCubicOut)
      .attr("d", c => geom(c, false).d);
    gLabels.style("opacity", 0);
    drawLabels(0);
    gLabels.transition().delay(Math.min(900, 650 + n * 15)).duration(300).style("opacity", 1);
  } else {
    (dur ? bars.transition().duration(dur).ease(d3.easeCubicInOut) : bars).attr("d", c => geom(c, false).d);
    gLabels.style("opacity", 1);
    drawLabels(dur);
  }
  styleBars();
  styleLegend();
  styleControls();
}

update(o.animate && firstRender ? 700 : 0, o.animate && firstRender);
