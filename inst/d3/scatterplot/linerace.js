// line_race(): a racing line chart.
//
// Prepended with racekit.js (ddRacePlayer & helpers). The player drives a
// continuous time t; draw(t) redraws everything: the lines up to t (the last
// segment partially drawn), a head (dot, name, live value) at each tip, the
// smoothly rescaling axes (value or rank), the "now" guide, the events and
// the crosshair tooltip. The value / rank switch morphs every segment from a
// straight line to a bump curve (cubic Bezier), so heads always sit on their
// line. Works with D3 v5 and v6.

const o = options, W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const bgcol = o.bgcol || "white";
const gridCol = o.gridCol || null;
const GREY = "#c4c9d0";
const uid = "ddlr" + Math.random().toString(36).slice(2, 8);
svg.style("background-color", bgcol).style("font-family", font);
const ms = ddMeasure(svg, font);
const fmt = ddFormatter(o);
// value axis labels: "3k", "45k", "1.5M" (or the valueFormat)
const fmtS = ddFormatter(Object.assign({}, o, { valueFormat: "~s" }));
function tickFmt(v) {
  if (o.valueFormat || Math.abs(v) < 1000) return fmt.short(v);
  return fmtS.short(v).replace("G", "B");
}
const send = ddShiny(svg);
const r1 = v => Math.round(v * 10) / 10;
const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!state.linerace || state.linerace.key !== o.stateKey) state.linerace = { key: o.stateKey };
const st = state.linerace;

// ---- data ---------------------------------------------------------------------
const race = o.race || {};
const frames = ddArr(race.frames).map(String);
const nF = frames.length;
const frameNum = race.frameNum ? ddArr(race.frameNum).map(Number) : null;
const timeType = race.timeType || "category";
const isDate = timeType === "date" || timeType === "datetime";
const isLog = o.yScale === "log";
const sw = +o.strokeWidth || 2.5;
const dotR = (o.dotRadius === null || o.dotRadius === undefined) ? 4.5 : +o.dotRadius;
const intYears = timeType === "number" && frameNum && frameNum.every(v => Number.isInteger(v));
const xU = i => frameNum ? frameNum[i] : i;
const names = ddArr(race.items).map(String);
const rawSer = ddArr(race.series && race.series.v);
const itemCats = race.groups ? ddArr(race.groups).map(String) : null;
const categories = ddArr(o.categories).map(String);
const hasCats = !!itemCats && categories.length > 0;
let colors = ddArr(o.colors);
let catColors = ddArr(o.catColors);
if (hasCats && !catColors.length) catColors = ddColors(categories.length, null, o.colorCategory);
if (!colors.length) {
  colors = hasCats ? names.map((nm, k) => catColors[Math.max(0, categories.indexOf(itemCats[k]))])
    : ddColors(names.length, null, o.colorCategory);
}
function textColor(c) {
  const h = d3.hsl(c);
  if (!isFinite(h.l)) return axisCol;
  if (h.l > 0.42) h.l = 0.42;
  return h + "";
}
const items = names.map((name, k) => {
  const v = ddArr(rawSer[k]).map(ddNum);
  while (v.length < nF) v.push(null);
  if (isLog) v.forEach((x, i) => { if (x !== null && !(x > 0)) v[i] = null; });
  let first = Infinity, last = -1;
  v.forEach((x, i) => { if (x !== null) { if (first === Infinity) first = i; last = i; } });
  const color = colors[k % colors.length] || DD_PALETTE[k % DD_PALETTE.length];
  return {
    k, name, v, first, last, color, txt: textColor(color),
    cat: itemCats ? itemCats[k] : null,
    ci: d3.interpolateRgb(GREY, color),
    rk: new Array(nF).fill(1), ly: null, alpha: 0
  };
}).filter(it => it.first !== Infinity);

if (!items.length || !nF) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}

const hidden = new Set(ddArr(st.hidden).filter(c => categories.indexOf(c) >= 0));
if (hidden.size >= categories.length) hidden.clear();
const pins = new Set((st.pins !== undefined ? ddArr(st.pins) : ddArr(o.highlight)).map(String)
  .filter(nm => names.indexOf(nm) >= 0));
let modeKey = st.mode || o.mode || "value";
let m = modeKey === "rank" ? 1 : 0;
const topN = o.topN ? Math.max(1, +o.topN) : null;
const winN = (o.window && +o.window > 0 && +o.window < nF - 1) ? +o.window : null;
const growOn = !winN && !!o.grow && nF > 2;
const tf = isLog ? (v => Math.log10(v)) : (v => v);
const tfi = isLog ? (v => Math.pow(10, v)) : (v => v);

// ---- monotone cubic interpolation (Fritsch-Carlson) of per-frame numbers ----
function monoInterp(ys) {
  const n = ys.length;
  const d = [], s = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d[i] = ys[i + 1] - ys[i];
  if (n > 1) { s[0] = d[0]; s[n - 1] = d[n - 2]; }
  for (let i = 1; i < n - 1; i++) s[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { s[i] = 0; s[i + 1] = 0; continue; }
    const a = s[i] / d[i], b = s[i + 1] / d[i], q = a * a + b * b;
    if (q > 9) { const tau = 3 / Math.sqrt(q); s[i] = tau * a * d[i]; s[i + 1] = tau * b * d[i]; }
  }
  return function (t) {
    if (n === 1 || t <= 0) return ys[0];
    if (t >= n - 1) return ys[n - 1];
    const i = Math.floor(t), h = t - i, h2 = h * h, h3 = h2 * h;
    return ys[i] * (2 * h3 - 3 * h2 + 1) + s[i] * (h3 - 2 * h2 + h)
      + ys[i + 1] * (-2 * h3 + 3 * h2) + s[i + 1] * (h3 - h2);
  };
}

// ---- ranks and value ranges per frame (visible lines only) ----------------------
let vis = [], nPres = [], HiF = null, LoF = null, KF = null, gMax = 1, gMin = 0;
function recompute() {
  vis = items.filter(it => !(it.cat !== null && hidden.has(it.cat)));
  nPres = new Array(nF).fill(0);
  for (let i = 0; i < nF; i++) {
    const pres = vis.filter(it => it.v[i] !== null).sort((a, b) => (b.v[i] - a.v[i]) || (a.k - b.k));
    nPres[i] = pres.length;
    pres.forEach((it, r) => { it.rk[i] = r + 1; });
    vis.forEach(it => { if (it.v[i] === null) it.rk[i] = pres.length + 1; });
  }
  const hi = new Array(nF).fill(-Infinity), lo = new Array(nF).fill(Infinity);
  const fhi = new Array(nF).fill(-Infinity), flo = new Array(nF).fill(Infinity);
  for (let i = 0; i < nF; i++) {
    vis.forEach(it => { const x = it.v[i]; if (x !== null) { const y = tf(x); if (y > fhi[i]) fhi[i] = y; if (y < flo[i]) flo[i] = y; } });
  }
  for (let i = 0; i < nF; i++) {
    const j0 = winN ? Math.max(0, Math.floor(i - winN)) : 0;
    if (!winN && i > 0) { hi[i] = Math.max(hi[i - 1], fhi[i]); lo[i] = Math.min(lo[i - 1], flo[i]); continue; }
    for (let j = j0; j <= i; j++) { hi[i] = Math.max(hi[i], fhi[j]); lo[i] = Math.min(lo[i], flo[j]); }
  }
  // frames without any value borrow from their neighbours
  const fillArr = a => {
    let last = null;
    for (let i = 0; i < nF; i++) { if (isFinite(a[i])) last = a[i]; else if (last !== null) a[i] = last; }
    last = null;
    for (let i = nF - 1; i >= 0; i--) { if (isFinite(a[i])) last = a[i]; else if (last !== null) a[i] = last; }
    for (let i = 0; i < nF; i++) if (!isFinite(a[i])) a[i] = isLog ? 0 : 0;
  };
  fillArr(hi); fillArr(lo);
  HiF = monoInterp(hi); LoF = monoInterp(lo);
  KF = monoInterp(nPres.map(v => Math.max(1, v)));
  gMax = d3.max(hi); gMin = d3.min(lo);
}
recompute();

// ---- layout: title, header (legend + mode buttons) ----------------------------------
const padL = 14, padR = 14;
let top = ddTitles(svg, o, axisCol, padL);
const ctlItems = (o.controls !== false && items.length > 1) ? [
  { k: "value", t: "Value", tip: "Show the values" },
  { k: "rank", t: "Rank", tip: "Show the ranks (bump chart)" }] : [];
const ctlH = 22;
ctlItems.forEach(it => { it.w = ms.tw(it.t, 11, 600) + 18; });
const ctlW = d3.sum(ctlItems, it => it.w);
const legendItems = hasCats ? categories.map((c, k) => ({ c, color: catColors[k % catColors.length], w: 20 + ms.tw(c, 11.5) + 14 })) : [];
let ctlOwnRow = false;
let legendAvail = W - padL - padR - (ctlW ? ctlW + 16 : 0);
if (legendItems.length && ctlW && legendAvail < Math.min(160, d3.sum(legendItems, d => d.w))) {
  ctlOwnRow = true; legendAvail = W - padL - padR;
}
let lx = 0, lrow = 0;
legendItems.forEach(it => {
  if (lx > 0 && lx + it.w > legendAvail) { lrow++; lx = 0; }
  it.x = lx; it.row = lrow; lx += it.w;
});
const legendRows = legendItems.length ? lrow + 1 : 0;
let headerTop = top, legendTop = top;
if (ctlW || legendRows) {
  top += 2;
  headerTop = top;
  if (ctlOwnRow) { legendTop = top + ctlH + 6; top = legendTop + legendRows * 22; }
  else { legendTop = top + 1; top += Math.max(legendRows * 22, ctlW ? ctlH : 0); }
  top += 6;
}
const ytitleText = o.ytitle === null || o.ytitle === undefined ? "" : String(o.ytitle);
const ytitleOn = ytitleText !== "" || ctlItems.length > 0;
const ytitleY = top + 12;
if (ytitleOn) top += 12 + 10;

// the player (draws its controls at the bottom; its onRender is called from start())
let curT = 0;
const player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames, frameNum, timeType,
  o: Object.assign({}, o.player || {}, { stateKey: o.stateKey }),
  onRender: t => draw(t)
});
const ease = player.ease;

// ---- margins ------------------------------------------------------------------------
const tickFs = 10.5;
const sampleVals = isLog ? [Math.pow(10, Math.ceil(gMax)), Math.pow(10, Math.floor(gMin)), tfi(gMax)]
  : [gMax, gMin, d3.max(d3.ticks(Math.min(0, gMin), gMax, 6)) || gMax, d3.min(d3.ticks(Math.min(0, gMin), gMax, 6)) || gMin];
const ytickW = Math.max(d3.max(sampleVals.map(v => ms.tw(tickFmt(v), tickFs))) || 20,
  ms.tw("#" + Math.max(items.length, topN || 0), tickFs), 18);
const plotL = padL + ytickW + 10;
const LFS = 11.5, VFS = 11, LH = 15;
const nameMax = Math.max(60, Math.min(150, W * 0.2));
const labelsOn = o.labels !== false;
items.forEach(it => { it.short = ms.truncate(it.name, nameMax, LFS, 700); });
const valW = d3.max([gMax, gMin].map(v => ms.tw(fmt.short(isLog ? tfi(v) : v), VFS))) || 30;
const nameW = d3.max(items, it => ms.tw(it.short, LFS, 700)) || 40;
const labelColW = labelsOn ? Math.min(W * 0.4, dotR + 8 + nameW + 6 + valW + 6) : dotR + 10;
const plotR = Math.max(plotL + 60, W - padR - labelColW);
const xtitleOn = !!o.xtitle;
const plotBottom = player.top - 24 - (xtitleOn ? 16 : 0);

// events: label rows above the plot
const evs = ddArr(o.events).map(e => ({ x: +e.x, t: +e.t, label: String(e.label) }))
  .filter(e => isFinite(e.x) && isFinite(e.t));
evs.forEach(e => { e.text = ms.truncate(e.label, 180, 10.5, 600); e.w = ms.tw(e.text, 10.5, 600) + 14; });
let evRows = 0;
if (evs.length) {
  // rows needed with the whole time range on show (an upper bound otherwise)
  const sc = d3.scaleLinear().domain([xU(0), xU(nF - 1)]).range([plotL, plotR]);
  const ends = [];
  evs.slice().sort((a, b) => a.x - b.x).forEach(e => {
    const cx = sc(e.x);
    let r = ends.findIndex(end => cx - e.w / 2 > end + 4);
    if (r < 0) { r = ends.length; ends.push(-Infinity); }
    ends[r] = cx + e.w / 2;
  });
  evRows = Math.min(3, ends.length);
}
const EVH = 19;
const evTop = top;
top += evRows * EVH + (evRows ? 4 : 0);
const plotTop = top + 2;
const plotH = Math.max(40, plotBottom - plotTop);
const labelCap = Math.max(3, Math.min(30, Math.floor(plotH / LH)));

// ---- scales ---------------------------------------------------------------------------
const xs = d3.scaleLinear().range([plotL, plotR]);
const yv = (isLog ? d3.scaleLog() : d3.scaleLinear());
const yr = d3.scaleLinear();
const areaOK = !isLog && o.yZero !== false;
const padTop = 7, padBot = (!isLog && o.yZero !== false) ? 0 : 7;
yv.range([plotBottom - padBot, plotTop + padTop]);

// ---- groups -------------------------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "c").append("rect")
  .attr("x", plotL - 1).attr("y", plotTop - sw - 4).attr("width", plotR - plotL + dotR + 3)
  .attr("height", plotBottom - plotTop + 2 * sw + 8);
let maskAttr = null;
if (winN) {
  const gr = defs.append("linearGradient").attr("id", uid + "fg").attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", plotL).attr("x2", plotL + 46).attr("y1", 0).attr("y2", 0);
  gr.append("stop").attr("offset", 0).attr("stop-color", "white").attr("stop-opacity", 0.05);
  gr.append("stop").attr("offset", 1).attr("stop-color", "white").attr("stop-opacity", 1);
  defs.append("mask").attr("id", uid + "m").attr("maskUnits", "userSpaceOnUse")
    .attr("x", 0).attr("y", 0).attr("width", W).attr("height", H)
    .append("rect").attr("x", plotL - 2).attr("y", 0).attr("width", W).attr("height", H).attr("fill", `url(#${uid}fg)`);
  maskAttr = `url(#${uid}m)`;
}
const gGrid = svg.append("g").attr("class", "dd-grid");
const gY = gGrid.append("g"), gYR = gGrid.append("g"), gX = gGrid.append("g");
gGrid.append("line").attr("x1", plotL).attr("x2", plotR).attr("y1", plotBottom).attr("y2", plotBottom)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.3);
const longest = frames.reduce((a, f, i) => { const s = player.frameLabel(i); return s.length > a.length ? s : a; }, "");
const wmSize = Math.max(26, Math.min(110, plotH * 0.32, (plotR - plotL) * 0.5 / Math.max(2, longest.length * 0.62)));
const wm = ddWatermark(svg, { x: plotR - 6, y: plotBottom - 12, size: wmSize, font, color: axisCol, opacity: 0.085 });
const gEv = svg.append("g").attr("class", "dd-events").style("pointer-events", "none");
const gArea = svg.append("g").attr("clip-path", `url(#${uid}c)`).style("pointer-events", "none");
const gLinesC = svg.append("g").attr("clip-path", `url(#${uid}c)`).style("pointer-events", "none");
const gLines = gLinesC.append("g");
if (maskAttr) { gLines.attr("mask", maskAttr); gArea.attr("mask", maskAttr); }
const gNow = svg.append("g").style("pointer-events", "none");
const gCross = svg.append("g").style("pointer-events", "none").style("display", "none");
const gHeads = svg.append("g").style("pointer-events", "none");
const hit = svg.append("rect").attr("x", plotL).attr("y", plotTop - 4).attr("width", plotR - plotL + dotR + 4)
  .attr("height", plotBottom - plotTop + 8).attr("fill", "transparent").style("cursor", "crosshair");
const gConn = svg.append("g").style("pointer-events", "none");
const gLabels = svg.append("g");
const gEvLab = svg.append("g").style("pointer-events", "none");
const gLegend = svg.append("g");
const gCtl = svg.append("g");
[gLegend, gCtl, gLabels].forEach(g => g.style("user-select", "none").style("-webkit-user-select", "none"));

// titles of the axes
const ytitleSel = ytitleOn ? svg.append("text").attr("x", padL).attr("y", ytitleY)
  .style("font-size", "12px").style("font-weight", 600).style("fill", axisCol).style("fill-opacity", 0.75)
  .text(ytitleText) : null;
if (xtitleOn) svg.append("text").attr("x", (plotL + plotR) / 2).attr("y", plotBottom + 36)
  .attr("text-anchor", "middle").style("font-size", "12px").style("fill", axisCol).style("fill-opacity", 0.75)
  .text(o.xtitle);

// ---- per item elements -----------------------------------------------------------------------
items.forEach(it => {
  it.path = gLines.append("path").attr("fill", "none").attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round").node();
  const hg = gHeads.append("g").style("display", "none");
  it.halo = hg.append("circle").attr("r", dotR + 4).attr("fill", it.color).attr("fill-opacity", 0.18).node();
  it.dot = hg.append("circle").attr("r", dotR).attr("fill", it.color).attr("stroke", bgcol).attr("stroke-width", 1.5).node();
  it.head = hg.node();
  it.conn = gConn.append("path").attr("fill", "none").attr("stroke-width", 1).style("display", "none").node();
  const lg = gLabels.append("g").attr("class", "dd-label").style("display", "none").style("cursor", "pointer").datum(it);
  lg.append("rect").attr("class", "hitbox").attr("x", -3).attr("y", -9).attr("height", 18)
    .attr("width", dotR + nameW + valW + 18).attr("fill", "transparent");
  const tx = lg.append("text").attr("dy", "0.35em").style("paint-order", "stroke").attr("stroke", bgcol)
    .attr("stroke-width", 3).attr("stroke-linejoin", "round");
  tx.append("tspan").style("font-size", LFS + "px").style("font-weight", 700).style("fill", it.txt).text(it.short);
  it.valSpan = tx.append("tspan").attr("dx", 6).style("font-size", VFS + "px").style("fill", axisCol)
    .style("fill-opacity", 0.72).style("font-variant-numeric", "tabular-nums").node();
  it.valTxt = "";
  it.label = lg.node();
  it.areaSel = null;
});

// ---- tick layers (fade in / out as the scales move) ------------------------------------------
function tickLayer(parent, make, place) {
  const live = new Map();
  let instant = true;
  function update(list) {
    const seen = new Set();
    list.forEach(tk => {
      let e = live.get(tk.key);
      if (!e) {
        e = { g: parent.append("g"), dying: false };
        make(e);
        live.set(tk.key, e);
        if (instant) e.g.style("opacity", 1);
        else e.g.style("opacity", 0).transition("fade").duration(420).style("opacity", 1);
      } else if (e.dying) {
        e.dying = false;
        e.g.interrupt("fade").transition("fade").duration(250).style("opacity", 1);
      }
      e.tk = tk;
      seen.add(tk.key);
      if (e.label !== tk.label) { e.text.text(tk.label); e.label = tk.label; }
    });
    live.forEach((e, key) => {
      if (!seen.has(key) && !e.dying) {
        e.dying = true;
        e.g.interrupt("fade").transition("fade").duration(320).style("opacity", 0)
          .on("end", () => { e.g.remove(); if (live.get(key) === e) live.delete(key); });
      }
      place(e);
    });
    if (list.length) instant = false;
  }
  return { update, live };
}
const makeY = e => {
  e.line = gridCol ? e.g.append("line").attr("x1", plotL).attr("x2", plotR).attr("stroke", gridCol) : null;
  e.text = e.g.append("text").attr("x", plotL - 8).attr("dy", "0.32em").attr("text-anchor", "end")
    .style("font-size", tickFs + "px").style("fill", axisCol).style("fill-opacity", 0.7)
    .style("font-variant-numeric", "tabular-nums");
};
const yLayer = tickLayer(gY, makeY, e => {
  const y = yv(e.tk.pos);
  const ok = isFinite(y) && y >= plotTop - 2 && y <= plotBottom + 1;
  e.g.style("display", ok ? null : "none").attr("transform", `translate(0,${r1(y)})`);
  if (e.line) e.line.style("display", Math.abs(y - plotBottom) < 1 ? "none" : null);
});
const rLayer = tickLayer(gYR, makeY, e => {
  const y = yr(e.tk.pos);
  const ok = isFinite(y) && y >= plotTop - 2 && y <= plotBottom + 1;
  e.g.style("display", ok ? null : "none").attr("transform", `translate(0,${r1(y)})`);
});
let nowPill = { x: -1e9, w: 0 };
const xLayer = tickLayer(gX, e => {
  e.g.append("line").attr("y1", plotBottom).attr("y2", plotBottom + 4).attr("stroke", axisCol).attr("stroke-opacity", 0.35);
  e.text = e.g.append("text").attr("y", plotBottom + 15).attr("text-anchor", "middle")
    .style("font-size", tickFs + "px").style("fill", axisCol).style("fill-opacity", 0.7);
}, e => {
  const x = xs(e.tk.pos);
  const ok = isFinite(x) && x >= plotL - 0.5 && x <= plotR + 0.5;
  e.g.style("display", ok ? null : "none").attr("transform", `translate(${r1(x)},0)`);
  const gap = Math.abs(x - nowPill.x) - nowPill.w / 2 - (e.tw || 20) / 2 - 4;
  e.text.style("fill-opacity", 0.7 * clamp01(gap / 12));
  if (e.tw === undefined && e.label) e.tw = ms.tw(e.label, tickFs);
});

const catLabW = timeType === "category" ? (d3.max(frames, f => ms.tw(f, tickFs)) || 20) : 0;
function xTicks(d0, d1) {
  const n = Math.max(2, Math.round((plotR - plotL) / 90));
  if (nF === 1) return [{ key: "one", pos: xU(0), label: player.frameLabel(0) }];
  if (timeType === "category") {
    const pxPer = (plotR - plotL) / Math.max(1e-9, d1 - d0);
    const every = Math.max(1, Math.ceil((catLabW + 14) / pxPer));
    const out = [];
    for (let i = Math.max(0, Math.ceil(d0 - 1e-9)); i <= Math.min(nF - 1, Math.floor(d1 + 1e-9)); i++) {
      if (i % every === 0) out.push({ key: "c" + i, pos: i, label: frames[i] });
    }
    return out;
  }
  if (isDate) {
    const sc = d3.scaleUtc().domain([new Date(d0), new Date(d1)]);
    const f = o.player && o.player.timeFormat ? d3.utcFormat(o.player.timeFormat) : sc.tickFormat();
    return sc.ticks(n).map(d => ({ key: "d" + (+d), pos: +d, label: f(d) }));
  }
  const sc = d3.scaleLinear().domain([d0, d1]);
  let tk = sc.ticks(n);
  if (intYears) tk = tk.filter(v => Number.isInteger(v));
  const f = intYears ? d3.format("d") : sc.tickFormat(n);
  return tk.map(v => ({ key: "n" + v, pos: v, label: f(v) }));
}
function logTicks(lo, hi, nT) {
  const a = Math.log10(lo), b = Math.log10(hi);
  if (b - a < 0.9) return d3.ticks(lo, hi, nT).filter(v => v > 0);
  const mults = (b - a) <= nT / 3 ? [1, 2, 5] : ((b - a) <= nT * 0.8 ? [1, 3] : [1]);
  const step = (b - a) > nT ? Math.ceil((b - a) / nT) : 1;
  const out = [];
  for (let e = Math.floor(a); e <= Math.ceil(b); e++) {
    if (e % step !== 0) continue;
    mults.forEach(mm => { const v = mm * Math.pow(10, e); if (v >= lo * 0.999 && v <= hi * 1.001) out.push(+v.toPrecision(6)); });
  }
  return out;
}

// ---- geometry: straight segments that morph into bump curves -----------------------------------
function ptY(it, i) {
  if (m <= 0) return yv(it.v[i]);
  if (m >= 1) return yr(it.rk[i]);
  return yv(it.v[i]) * (1 - m) + yr(it.rk[i]) * m;
}
// x(s) / dx of the cubic with control x at k and 1 - k
function bx(s, k) { const u = 1 - s; return 3 * u * u * s * k + 3 * u * s * s * (1 - k) + s * s * s; }
function solveS(u, k) {
  if (m <= 0) return u;
  let a = 0, b = 1, s = u;
  for (let j = 0; j < 22; j++) { s = (a + b) / 2; if (bx(s, k) < u) a = s; else b = s; }
  return s;
}
function ctrl(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, k = 1 / 3 + m / 6, c = (1 - m) / 3;
  return [x0 + dx * k, y0 + dy * c, x1 - dx * k, y1 - dy * c, k];
}
function segFull(x0, y0, x1, y1) {
  if (m <= 0) return "L" + r1(x1) + "," + r1(y1);
  const c = ctrl(x0, y0, x1, y1);
  return "C" + r1(c[0]) + "," + r1(c[1]) + " " + r1(c[2]) + "," + r1(c[3]) + " " + r1(x1) + "," + r1(y1);
}
// the sub-curve from 0 to the x fraction u; returns [path, x, y]
function segPart(x0, y0, x1, y1, u) {
  if (m <= 0) {
    const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
    return ["L" + r1(x) + "," + r1(y), x, y];
  }
  const c = ctrl(x0, y0, x1, y1), s = solveS(u, c[4]);
  const L = (p, q) => p + (q - p) * s;
  const ax = L(x0, c[0]), ay = L(y0, c[1]), bxx = L(c[0], c[2]), byy = L(c[1], c[3]), cx = L(c[2], x1), cy = L(c[3], y1);
  const dx = L(ax, bxx), dy = L(ay, byy), ex = L(bxx, cx), ey = L(byy, cy);
  const px = L(dx, ex), py = L(dy, ey);
  return ["C" + r1(ax) + "," + r1(ay) + " " + r1(dx) + "," + r1(dy) + " " + r1(px) + "," + r1(py), px, py];
}
// y of a line at a continuous frame position tm (linear in x), or null
function yAt(it, tm) {
  const i = Math.floor(tm), u = tm - i;
  if (it.v[i] === null || it.v[i] === undefined) return null;
  if (u < 1e-9 || i >= nF - 1) return ptY(it, i);
  if (it.v[i + 1] === null) return null;
  const x0 = xs(xU(i)), x1 = xs(xU(i + 1));
  return segPart(x0, ptY(it, i), x1, ptY(it, i + 1), u)[2];
}
function xToT(px) {
  const u = xs.invert(px);
  if (!frameNum) return Math.max(0, Math.min(nF - 1, u));
  if (u <= frameNum[0]) return 0;
  if (u >= frameNum[nF - 1]) return nF - 1;
  const i = Math.max(0, d3.bisectRight(frameNum, u) - 1);
  const span = frameNum[i + 1] - frameNum[i];
  return i + (span > 0 ? (u - frameNum[i]) / span : 0);
}
function xAtE(tt) {
  tt = Math.max(0, Math.min(nF - 1, tt));
  const i = Math.floor(tt);
  if (i >= nF - 1) return xU(nF - 1);
  return xU(i) + (xU(i + 1) - xU(i)) * ease(tt - i);
}

// ---- focus / pins ---------------------------------------------------------------------------------
let hover = null, hoverItem = null, labelHover = null, catHover = null;
// the lines in focus (hovered, or of the hovered category) and the pinned ones;
// only a hover dims the other lines
function focusSet() {
  const f = new Set();
  if (labelHover) f.add(labelHover);
  else if (hoverItem) f.add(hoverItem);
  if (catHover !== null) vis.forEach(it => { if (it.cat === catHover) f.add(it); });
  f.transient = f.size > 0;
  vis.forEach(it => { if (pins.has(it.name)) f.add(it); });
  return f;
}
function togglePin(it) {
  if (pins.has(it.name)) pins.delete(it.name); else pins.add(it.name);
  st.pins = Array.from(pins);
  const tc = Math.max(0, Math.min(nF - 1, curT));
  send("clicked", {
    name: it.name, category: it.cat, period: player.label(tc),
    value: it.on ? it.vT : null, rank: it.on ? Math.round(it.rT) : null, pinned: pins.has(it.name)
  });
  draw(curT);
}

// ---- the tooltip ---------------------------------------------------------------------------------
const tip = ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms });
const crossLine = gCross.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "2,3");
const crossDots = gCross.append("g");

// ---- draw at time t ----------------------------------------------------------------------------------
let lastT = null, lastTime = 0, orderSig = "", settleTimer = null;
function draw(t) {
  curT = t;
  const tc = Math.max(0, Math.min(nF - 1, t));
  const fi = Math.min(nF - 1, Math.floor(tc + 1e-9));
  const fl = fi < nF - 1 ? Math.max(0, tc - fi) : 0;
  const fe = fi < nF - 1 ? ease(fl) : 0;
  const te = fi + fe;

  // x domain
  let d0, d1;
  if (winN) {
    if (tc <= winN) { d0 = xU(0); d1 = xAtE(winN); } else { d0 = xAtE(tc - winN); d1 = xAtE(tc); }
  } else if (growOn) {
    d0 = xU(0); d1 = xAtE(Math.max(tc, Math.min(nF - 1, Math.max(1, (nF - 1) * 0.2))));
  } else { d0 = xU(0); d1 = xU(nF - 1); }
  if (!(d1 > d0)) { const p = isDate ? 86400000 * 30 : (timeType === "category" ? 0.5 : 1); d0 -= p; d1 += p; }
  xs.domain([d0, d1]);
  const iStart = winN && tc > winN ? Math.max(0, Math.floor(tc - winN)) : 0;
  const headX = xs(xAtE(tc));

  // state of each line at t
  vis.forEach(it => {
    const a = it.v[fi], b = fi < nF - 1 ? it.v[fi + 1] : null;
    it.on = a !== null;
    if (!it.on) { it.alpha = 0; return; }
    it.hasNext = b !== null;
    it.vT = it.hasNext ? a + (b - a) * fe : a;
    it.rT = fi < nF - 1 ? it.rk[fi] + (it.rk[fi + 1] - it.rk[fi]) * fe : it.rk[fi];
    const since = tc - it.first;
    const enter = (it.first === 0 || since < 1e-6) ? 1 : clamp01(since / 0.35);
    it.pop = it.first === 0 || since < 1e-6 ? 1 : d3.easeBackOut.overshoot(2.2)(enter);
    let al = enter;
    if (!it.hasNext && fi < nF - 1) al *= clamp01(1 - fl / 0.5);
    it.alpha = al;
  });
  const onItems = vis.filter(it => it.on);

  // y domains
  let hiT = HiF(te), loT = LoF(te);
  onItems.forEach(it => { const y = tf(it.vT); if (y > hiT) hiT = y; if (y < loT) loT = y; });
  if (!isLog && o.yZero !== false) { loT = Math.min(0, loT); hiT = Math.max(0, hiT); }
  if (!(hiT - loT > 1e-9)) {
    if (isLog) { hiT += 0.5; loT -= 0.5; } else { const p = Math.abs(hiT) * 0.1 || 1; hiT += p; if (o.yZero === false) loT -= p; }
  }
  yv.domain([tfi(loT), tfi(hiT)]);
  const nT = Math.max(2, Math.round(plotH / 55));
  const nPresT = Math.max(1, KF(te));
  const K = topN ? Math.max(1, Math.min(topN, nPresT)) : nPresT;
  // one slot per rank, rank 1 at the top
  yr.domain([0.5, K + 0.5]).range([plotTop + 2, plotBottom - 2]);

  // activeness (topN / label cap), focus
  const focus = focusSet();
  const Lcap = topN || labelCap;
  vis.forEach(it => {
    if (!it.on) { it.aTop = it.aLab = 0; return; }
    const pinned = pins.has(it.name);
    it.aTop = (!topN || pinned) ? 1 : clamp01(topN + 1 - it.rT);
    it.aLab = !labelsOn ? 0 : (pinned || focus.has(it) ? 1 : clamp01(Lcap + 1 - it.rT));
    const rankVis = clamp01(K + 1 - it.rT);
    it.vis = it.alpha * (1 - m + m * rankVis);
  });

  // lines
  vis.forEach(it => {
    let d = "", open = false, px = 0, py = 0, sx = null, subs = 0;
    const iEnd = Math.min(fi, it.last);
    for (let i = Math.max(iStart, it.first); i <= iEnd; i++) {
      if (it.v[i] === null) { open = false; continue; }
      const x = xs(xU(i)), y = ptY(it, i);
      if (!open) { d += "M" + r1(x) + "," + r1(y); open = true; subs++; if (sx === null) sx = x; }
      else d += segFull(px, py, x, y);
      px = x; py = y;
    }
    if (it.on && open && it.hasNext && fe > 0) {
      const sp = segPart(px, py, xs(xU(fi + 1)), ptY(it, fi + 1), fe);
      d += sp[0]; px = sp[1]; py = sp[2];
    }
    it.d = d; it.hx = px; it.hy = py; it.sx = sx; it.subs = subs;
    if (it.on && !d) { it.hx = xs(xU(fi)); it.hy = ptY(it, fi); }
  });
  hiddenItems.forEach(it => { it.path.style.display = "none"; it.head.style.display = "none"; it.label.style.display = "none"; it.conn.style.display = "none"; });

  // hover: the line closest to the mouse
  hoverItem = null;
  let tm = null;
  if (hover && hover.mx >= plotL - 4 && hover.mx <= plotR + dotR + 4) {
    tm = Math.min(tc, xToT(Math.min(hover.mx, plotR)));
    if (hover.mx > headX) tm = tc;
    let best = null, bd = 26;
    vis.forEach(it => {
      if (it.first > tm + 1e-9) return;
      const y = (Math.abs(tm - tc) < 1e-9 && it.on) ? it.hy : yAt(it, tm);
      if (y === null || !isFinite(y)) return;
      const dd = Math.abs(y - hover.my);
      if (dd < bd) { bd = dd; best = it; }
    });
    hoverItem = best;
  }
  const focus2 = focusSet();
  const dim2 = focus2.transient;

  // style lines
  vis.forEach(it => {
    const p = it.path;
    if (!it.d) { p.style.display = "none"; return; }
    p.style.display = "";
    p.setAttribute("d", it.d);
    const f = focus2.has(it), a = f ? 1 : it.aTop;
    const exited = !it.on || (!it.hasNext && it.last < nF - 1 && fi >= it.last);
    let op = (0.4 + 0.6 * a) * (exited ? 0.55 : 1);
    if (dim2 && !f) op *= a > 0.5 ? 0.16 : 0.45;
    p.setAttribute("stroke", a >= 1 ? it.color : (a <= 0 ? GREY : it.ci(a)));
    p.setAttribute("stroke-width", (Math.max(1, sw * 0.42) + (sw - Math.max(1, sw * 0.42)) * a) * (f && (dim2 || pins.has(it.name)) ? 1.3 : 1));
    p.setAttribute("stroke-opacity", op);
  });
  const sig = vis.map(it => (focus2.has(it) ? 2 : 0) + (it.aTop > 0.5 ? 1 : 0)).join("");
  if (sig !== orderSig) {
    orderSig = sig;
    const score = it => (focus2.has(it) ? 2 : 0) + (it.aTop > 0.5 ? 1 : 0);
    vis.slice().sort((a, b) => score(a) - score(b) || b.k - a.k).forEach(it => {
      it.path.parentNode.appendChild(it.path);
      it.head.parentNode.appendChild(it.head);
    });
  }

  // areas under the pinned lines (value mode)
  vis.forEach(it => {
    const want = areaOK && pins.has(it.name) && it.d && it.subs === 1 && m < 1 && pins.size <= 3;
    if (!want) { if (it.areaSel) it.areaSel.style("display", "none"); return; }
    if (!it.areaSel) {
      const gid = uid + "a" + it.k;
      const gr = defs.append("linearGradient").attr("id", gid).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
      gr.append("stop").attr("offset", 0).attr("stop-color", it.color).attr("stop-opacity", 0.24);
      gr.append("stop").attr("offset", 1).attr("stop-color", it.color).attr("stop-opacity", 0.02);
      it.areaSel = gArea.append("path").attr("fill", `url(#${gid})`);
    }
    it.areaSel.style("display", null).style("opacity", 1 - m)
      .attr("d", it.d + "L" + r1(it.hx) + "," + plotBottom + "L" + r1(it.sx) + "," + plotBottom + "Z");
  });

  // heads
  vis.forEach(it => {
    const hn = it.head;
    if (!it.on || it.vis <= 0.01 || it.hx < plotL - 2) { hn.style.display = "none"; return; }
    hn.style.display = "";
    const f = focus2.has(it), a = f ? 1 : it.aTop;
    const col = a >= 1 ? it.color : (a <= 0 ? GREY : it.ci(a));
    const r = (Math.max(1.6, dotR * 0.45) + (dotR - Math.max(1.6, dotR * 0.45)) * a) * (f && dim2 ? 1.2 : 1);
    let op = it.vis;
    if (dim2 && !f) op *= 0.25;
    hn.setAttribute("transform", `translate(${r1(it.hx)},${r1(it.hy)}) scale(${r1(it.pop * 100) / 100})`);
    hn.setAttribute("opacity", op);
    it.dot.setAttribute("r", r); it.dot.setAttribute("fill", col);
    it.halo.setAttribute("r", r + 4 + (pins.has(it.name) ? 2 : 0));
    it.halo.setAttribute("fill", col);
    it.halo.setAttribute("fill-opacity", a * (pins.has(it.name) ? 0.3 : 0.16));
  });

  // labels: spread vertically so they do not overlap, then glide there
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const dt = Math.min(100, Math.max(0, now - lastTime));
  lastTime = now;
  const snap = lastT === null || (!player.playing() && Math.abs(tc - lastT) > 0.6);
  lastT = tc;
  const labs = [];
  vis.forEach(it => {
    const la = it.vis * it.aLab;
    it.la = la;
    if (!it.on || la <= 0.02 || it.hx < plotL - 2) { it.label.style.display = "none"; it.conn.style.display = "none"; it.ly = null; return; }
    it.ty = it.hy; it.w = clamp01(la * 1.6);
    labs.push(it);
  });
  spread(labs, plotTop - 4, plotBottom + 4);
  const kk = 1 - Math.exp(-dt / 60);
  let settled = true;
  labs.forEach(it => {
    if (snap || it.ly === null) it.ly = it.py;
    else it.ly += (it.py - it.ly) * kk;
    if (Math.abs(it.ly - it.py) > 0.4) settled = false;
    const lxp = it.hx + dotR + 7;
    const f = focus2.has(it);
    let op = it.la;
    if (dim2 && !f) op *= 0.3;
    const ln = it.label;
    ln.style.display = "";
    ln.setAttribute("transform", `translate(${r1(lxp)},${r1(it.ly)})`);
    ln.setAttribute("opacity", op);
    const vt = fmt.short(it.vT);
    if (vt !== it.valTxt) { it.valSpan.textContent = vt; it.valTxt = vt; }
    const off = it.ly - it.hy;
    if (Math.abs(off) > 3) {
      it.conn.style.display = "";
      it.conn.setAttribute("d", `M${r1(it.hx + dotR + 1)},${r1(it.hy)}L${r1(lxp - 2)},${r1(it.ly)}`);
      it.conn.setAttribute("stroke", it.color);
      it.conn.setAttribute("stroke-opacity", 0.55 * op);
    } else it.conn.style.display = "none";
  });

  // the y axes (values and ranks, cross-faded)
  gY.style("opacity", 1 - m);
  gYR.style("opacity", m);
  if (m < 1) {
    const [lo, hi] = yv.domain();
    yLayer.update((isLog ? logTicks(lo, hi, nT) : yv.ticks(nT)).map(v => ({ key: "v" + v, pos: v, label: tickFmt(v) })));
  } else yLayer.update([]);
  if (m > 0) {
    const kmax = Math.floor(K + 1e-6);
    let rt;
    if (plotH / Math.max(1, K) >= 15) rt = d3.range(1, kmax + 1);
    else rt = [1].concat(d3.ticks(1, kmax, nT).filter(v => Number.isInteger(v) && v > 1));
    rLayer.update(rt.map(r => ({ key: "r" + r, pos: r, label: "#" + r })));
  } else rLayer.update([]);
  if (ytitleSel) ytitleSel.text(m > 0.5 ? "Rank" : ytitleText);

  // the "now" guide and its period label
  drawNow(tc, headX);
  xLayer.update(xTicks(d0, d1));
  wm.text(player.label(tc));
  drawEvents(tc);
  drawHover(tc, tm, fi);
  lastSettled = settled;
  if (!settled) ensureSettle();
}
const hiddenItems = [];
function refreshHiddenItems() {
  hiddenItems.length = 0;
  items.forEach(it => { if (vis.indexOf(it) < 0) hiddenItems.push(it); });
}
refreshHiddenItems();

let lastSettled = true;
function ensureSettle() {
  if (settleTimer || player.playing()) return;
  settleTimer = ddplotTrack(d3.timer(() => {
    if (!player.playing()) draw(curT);
    if (player.playing() || lastSettled) { settleTimer.stop(); settleTimer = null; }
  }));
}

// cluster labels around their targets (balanced), within [lo, hi]
function spread(list, lo, hi) {
  if (!list.length) return;
  list.sort((a, b) => (a.ty - b.ty) || (a.k - b.k));
  let total = d3.sum(list, it => it.w * LH);
  const sc = total > hi - lo ? (hi - lo) / total : 1;
  let cl = list.map(it => ({ m: [it], size: it.w * LH * sc, c: it.ty, ws: it.w || 1e-6, wy: (it.w || 1e-6) * it.ty }));
  const fix = c => {
    if (c.c - c.size / 2 < lo) c.c = lo + c.size / 2;
    if (c.c + c.size / 2 > hi) c.c = hi - c.size / 2;
  };
  cl.forEach(fix);
  let guard = 0, changed = true;
  while (changed && guard++ < 400) {
    changed = false;
    for (let j = 0; j < cl.length - 1; j++) {
      const A = cl[j], B = cl[j + 1];
      if (A.c + A.size / 2 > B.c - B.size / 2 + 0.01) {
        const M = { m: A.m.concat(B.m), size: A.size + B.size, ws: A.ws + B.ws, wy: A.wy + B.wy };
        M.c = M.wy / M.ws;
        fix(M);
        cl.splice(j, 2, M);
        changed = true;
        break;
      }
    }
  }
  cl.forEach(c => {
    let y = c.c - c.size / 2;
    c.m.forEach(it => { const s = it.w * LH * sc; it.py = y + s / 2; y += s; });
  });
}

// ---- now guide ------------------------------------------------------------------------------------------
const nowLine = gNow.append("line").attr("y1", plotTop - 2).attr("y2", plotBottom).attr("stroke", axisCol)
  .attr("stroke-opacity", 0.22).attr("stroke-dasharray", "3,3");
const nowG = gNow.append("g");
const nowRect = nowG.append("rect").attr("y", plotBottom + 4).attr("height", 17).attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0.88);
const nowTxt = nowG.append("text").attr("y", plotBottom + 12.5).attr("dy", "0.35em").attr("text-anchor", "middle")
  .style("font-size", "10.5px").style("font-weight", 700).style("fill", bgcol).style("font-variant-numeric", "tabular-nums");
let nowLabel = null, nowW = 0;
function drawNow(tc, headX) {
  if (nF < 2) { gNow.style("display", "none"); nowPill = { x: -1e9, w: 0 }; return; }
  const lab = player.label(tc);
  if (lab !== nowLabel) { nowLabel = lab; nowTxt.text(lab); nowW = ms.tw(lab, 10.5, 700) + 12; }
  nowLine.attr("x1", r1(headX)).attr("x2", r1(headX));
  const cx = Math.max(plotL + nowW / 2 - 6, Math.min(W - padR - nowW / 2, headX));
  nowRect.attr("x", r1(cx - nowW / 2)).attr("width", nowW);
  nowTxt.attr("x", r1(cx));
  nowPill = { x: cx, w: nowW };
}

// ---- events -----------------------------------------------------------------------------------------------
evs.forEach(e => {
  e.line = gEv.append("line").attr("stroke", DD_ACCENT).attr("stroke-opacity", 0.45).attr("stroke-dasharray", "4,3")
    .attr("stroke-width", 1.2).style("display", "none");
  e.g = gEvLab.append("g").style("display", "none");
  e.g.append("rect").attr("x", -e.w / 2).attr("y", -8.5).attr("width", e.w).attr("height", 17).attr("rx", 8.5)
    .attr("fill", bgcol).attr("stroke", DD_ACCENT).attr("stroke-opacity", 0.55);
  e.g.append("rect").attr("x", -e.w / 2).attr("y", -8.5).attr("width", e.w).attr("height", 17).attr("rx", 8.5)
    .attr("fill", DD_ACCENT).attr("fill-opacity", 0.1);
  e.g.append("text").attr("dy", "0.35em").attr("text-anchor", "middle").style("font-size", "10.5px")
    .style("font-weight", 600).style("fill", d3.hsl(DD_ACCENT).darker(0.8) + "").text(e.text);
});
function drawEvents(tc) {
  if (!evs.length) return;
  const ends = new Array(Math.max(1, evRows)).fill(-Infinity);
  // newest last, so older events keep their row
  evs.slice().sort((a, b) => a.x - b.x).forEach(e => {
    const since = tc - e.t;
    const x = xs(e.x);
    if (since < -1e-6 || x < plotL - 1 || x > plotR + 1) { e.line.style("display", "none"); e.g.style("display", "none"); return; }
    const k = since < 1e-6 ? 1 : clamp01(since / 0.3);
    const edge = winN ? clamp01((x - plotL) / 40) : 1;
    const cx = Math.max(plotL + e.w / 2, Math.min(W - padR - e.w / 2, x));
    const row = ends.findIndex(end => cx - e.w / 2 > end + 4);
    if (row < 0) { e.line.style("display", "none"); e.g.style("display", "none"); return; }
    ends[row] = cx + e.w / 2;
    const y = evTop + row * EVH + EVH / 2;
    const pop = d3.easeBackOut.overshoot(2.4)(k);
    e.g.style("display", null).attr("opacity", clamp01(k * 2) * edge)
      .attr("transform", `translate(${r1(cx)},${r1(y)}) scale(${r1((0.55 + 0.45 * pop) * 100) / 100})`);
    e.line.style("display", null).attr("x1", r1(x)).attr("x2", r1(x)).attr("y1", y + 8.5).attr("y2", plotBottom)
      .attr("opacity", clamp01(k * 1.5) * edge);
  });
}

// ---- hover: crosshair + tooltip ---------------------------------------------------------------------------
function drawHover(tc, tm, fi) {
  if (labelHover) { gCross.style("display", "none"); showLabelTip(labelHover, tc); return; }
  if (!hover || tm === null) { gCross.style("display", "none"); if (!labelHover) tip.hide(); return; }
  // snap to the nearest period at or before the head (or the head itself)
  let kk = Math.round(tm), live = false;
  if (kk > tc + 1e-9) live = true;
  const iStart = winN && tc > winN ? Math.floor(tc - winN) : 0;
  if (!live && kk < iStart) kk = Math.ceil(tc - winN);
  if (!live && xs(xU(kk)) < plotL - 0.5) kk = Math.min(fi, kk + 1);
  if (Math.abs(kk - tc) < 1e-9) live = true;
  const cx = live ? xs(xAtE(tc)) : xs(xU(kk));
  const rows = [];
  vis.forEach(it => {
    let v, r, y;
    if (live) { if (!it.on || it.alpha < 0.5) return; v = it.vT; r = Math.round(it.rT); y = it.hy; }
    else { v = it.v[kk]; if (v === null) return; r = it.rk[kk]; y = ptY(it, kk); }
    rows.push({ it, v, r, y });
  });
  rows.sort((a, b) => (a.r - b.r));
  gCross.style("display", null);
  crossLine.attr("x1", r1(cx)).attr("x2", r1(cx)).attr("y1", plotTop - 2).attr("y2", plotBottom);
  const nShow = Math.min(rows.length, topN ? Math.min(12, topN) : 10);
  const shown = rows.slice(0, nShow);
  const extra = rows.filter(r => (r.it === hoverItem || pins.has(r.it.name)) && shown.indexOf(r) < 0);
  const dots = shown.concat(extra).filter(r => r.y >= plotTop - 6 && r.y <= plotBottom + 6);
  const ds = crossDots.selectAll("circle").data(dots);
  ds.exit().remove();
  ds.enter().append("circle").attr("r", 3.5).attr("stroke", bgcol).attr("stroke-width", 1.5).merge(ds)
    .attr("cx", r1(cx)).attr("cy", d => r1(d.y)).attr("fill", d => d.it.color)
    .attr("r", d => d.it === hoverItem ? 5 : 3.5);
  if (o.tooltip === false) { tip.hide(); return; }
  const head = live ? player.label(tc) : player.frameLabel(kk);
  const mk = (r, sep) => ({
    name: r.it.name, value: fmt.value(r.v), color: r.it.color, extra: "#" + r.r,
    bold: r.it === hoverItem, sep
  });
  const trows = shown.map(r => mk(r, false));
  extra.forEach((r, j) => trows.push(mk(r, j === 0)));
  if (rows.length > nShow + extra.length) trows.push({ name: "+ " + (rows.length - nShow - extra.length) + " more", dim: true });
  tip.show(head, trows, hover.mx, hover.my);
}
function showLabelTip(it, tc) {
  if (o.tooltip === false || !it.on) { tip.hide(); return; }
  const rows = [];
  rows.push({ name: "Value", value: fmt.value(it.vT), bold: true });
  rows.push({ name: "Rank", value: "#" + Math.round(it.rT), extra: "of " + Math.round(nPres[Math.round(tc)] || vis.length) });
  const v0 = it.v[it.first];
  if (it.first < Math.round(tc) && v0 !== null) {
    const ch = it.vT - v0;
    const pct = v0 !== 0 ? ch / Math.abs(v0) : null;
    rows.push({ name: "Since " + player.frameLabel(it.first), value: (ch >= 0 ? "+" : "") + fmt.value(ch),
      extra: pct === null ? "" : (ch >= 0 ? "+" : "") + d3.format(".0%")(pct),
      extraColor: ch >= 0 ? "#2f9e44" : "#d9480f" });
  }
  let pk = null, pv = -Infinity;
  for (let i = it.first; i <= Math.min(Math.floor(tc + 1e-9), it.last); i++) if (it.v[i] !== null && it.v[i] > pv) { pv = it.v[i]; pk = i; }
  if (it.vT > pv) { pv = it.vT; pk = -1; }
  if (pk !== null) rows.push({ name: "Peak so far", value: fmt.value(pv), extra: pk < 0 ? "now" : player.frameLabel(pk) });
  if (it.cat !== null) rows.push({ name: o.catName || "Category", value: it.cat, sep: true });
  if (pins.has(it.name)) rows.push({ name: "Pinned (click to unpin)", dim: true });
  else rows.push({ name: "Click to pin", dim: true });
  tip.show(it.name, rows, undefined, undefined, it.color);
}

// ---- events: hover, click ----------------------------------------------------------------------------------
hit.on("mousemove", function (a) {
  const [mx, my] = ddPtr(a, svg.node());
  hover = { mx, my };
  if (!player.playing()) draw(curT);
}).on("mouseleave", function () {
  hover = null;
  if (!player.playing()) draw(curT); else tip.hide();
}).on("click", function () {
  if (hoverItem) togglePin(hoverItem);
  else if (pins.size) { pins.clear(); st.pins = []; draw(curT); }
});
gLabels.selectAll("g.dd-label")
  .on("mouseenter", function () {
    labelHover = d3.select(this).datum();
    if (!player.playing()) draw(curT);
  })
  .on("mousemove", function (a) {
    const [mx, my] = ddPtr(a, svg.node());
    tip.move(mx, my);
  })
  .on("mouseleave", function () {
    labelHover = null;
    tip.hide();
    if (!player.playing()) draw(curT);
  })
  .on("click", function () { togglePin(d3.select(this).datum()); });

// ---- legend (categories) ------------------------------------------------------------------------------------
gLegend.attr("transform", `translate(${padL},${legendTop})`);
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`).style("cursor", "pointer");
legendSel.append("rect").attr("class", "bg").attr("x", -4).attr("width", d => d.w - 6).attr("height", 22)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legendSel.append("circle").attr("cx", 6).attr("cy", 11).attr("r", 5).attr("fill", d => d.color);
legendSel.append("text").attr("x", 16).attr("y", 11).attr("dy", "0.35em")
  .style("font-size", "11.5px").style("fill", axisCol).text(d => d.c);
legendSel.append("title").text("Click to hide or show, double-click to isolate");
function styleLegend() {
  legendSel.style("opacity", d => hidden.has(d.c) ? 0.4 : 1);
  legendSel.select("text").style("text-decoration", d => hidden.has(d.c) ? "line-through" : null);
}
function afterHide() {
  st.hidden = Array.from(hidden);
  catHover = null;
  recompute();
  refreshHiddenItems();
  orderSig = "";
  styleLegend();
  lastT = null;
  draw(curT);
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.c)) { catHover = d.c; if (!player.playing()) draw(curT); }
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    catHover = null;
    if (!player.playing()) draw(curT);
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.c)) {
        if (categories.length - hidden.size <= 1) return;
        hidden.add(d.c);
      } else hidden.delete(d.c);
      afterHide();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = categories.length - hidden.size === 1 && !hidden.has(d.c);
    hidden.clear();
    if (!onlyThis) categories.forEach(c => { if (c !== d.c) hidden.add(c); });
    afterHide();
  });
styleLegend();

// ---- mode buttons (value / rank) -------------------------------------------------------------------------
gCtl.attr("transform", `translate(${W - padR - ctlW},${headerTop})`);
let modeTimer = null;
if (ctlItems.length) {
  gCtl.append("rect").attr("width", ctlW).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  ctlItems.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = gCtl.append("g").attr("class", "dd-mode dd-mode-" + it.k).attr("transform", `translate(${it.x},0)`)
      .style("cursor", "pointer");
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", DD_ACCENT).attr("fill-opacity", 0);
    if (k > 0) gCtl.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
      .style("fill", axisCol).text(it.t);
    b.on("mouseenter", function () { if (modeKey !== it.k) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", styleCtl)
      .on("click", function () { setMode(it.k); });
  });
}
function styleCtl() {
  ctlItems.forEach(it => {
    const on = modeKey === it.k;
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? DD_ACCENT : axisCol);
  });
}
function setMode(k) {
  if (k === modeKey) return;
  modeKey = k; st.mode = k;
  styleCtl();
  const from = m, to = k === "rank" ? 1 : 0, e = d3.easeCubicInOut;
  if (modeTimer) modeTimer.stop();
  modeTimer = ddplotTrack(d3.timer(el => {
    const q = Math.min(1, el / 750);
    m = from + (to - from) * e(q);
    if (q >= 1) { m = to; modeTimer.stop(); modeTimer = null; }
    orderSig = "";
    if (!player.playing() || q >= 1) draw(curT);
  }));
}
styleCtl();

player.start();
