// barchartrace.js -- bar_chart_race(): an animated, interactive bar chart race.
//
// Prepended with racekit.js (ddplot_script(c("racekit.js", "barchartrace.js"))).
// The racekit player drives a continuous time t in [0, nFrames - 1] and calls
// render(t) on every animation frame; everything is redrawn from t (no D3
// transitions for the race itself).
//
// Ranks are precomputed on K sub-frames per period from the interpolated
// values, then interpolated linearly, so the bars swap places when their
// values actually cross. Items missing at a period enter from (and leave to)
// below the cut: their value is blended with the worst value. Legend changes
// and the top-N toggle blend an old and a new rank table over ~650 ms.
// Works with D3 v5 and v6.

const o = options;
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const bgcol = o.bgcol || "white";
const UP = "#3ca951";
svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", o.title || "Bar chart race");
const ms = ddMeasure(svg, font);
const send = ddShiny(svg);
const fmt = ddFormatter(o);

// ---- persistent state (Shiny updates / resizes) ----------------------------------
const bstate = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!bstate.barrace || bstate.barrace.key !== o.stateKey) bstate.barrace = { key: o.stateKey };
const st = bstate.barrace;

// ---- data -------------------------------------------------------------------------
const race = o.race || {};
const frames = ddArr(race.frames).map(String);
const nF = frames.length;
const names = ddArr(race.items).map(String);
const n = names.length;
if (!n || !nF) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}
const vals = new Float64Array(n * nF).fill(NaN);
const serIn = ddArr(race.series && race.series.v);
for (let i = 0; i < n; i++) {
  const s = ddArr(serIn[i]);
  for (let f = 0; f < nF; f++) {
    const v = ddNum(s[f]);
    if (v !== null) vals[i * nF + f] = v;
  }
}
let gmin = Infinity, gmax = -Infinity, allInt = true;
for (let k = 0; k < vals.length; k++) {
  const v = vals[k];
  if (v === v) {
    if (v < gmin) gmin = v;
    if (v > gmax) gmax = v;
    if (allInt && !Number.isInteger(v) && o.intValues !== true) allInt = false;
  }
}
if (!isFinite(gmin)) { gmin = 0; gmax = 1; }

// groups and colours
const groupKeys = ddArr(o.groupKeys).map(String);
const itemGroup = race.groups ? ddArr(race.groups).map(String) : null;
const hasGroup = !!itemGroup && groupKeys.length > 0;
const givenCols = ddArr(o.colors);
let groupColor = null, itemColor;
if (hasGroup) {
  const gc = givenCols.length ? groupKeys.map((g, k) => givenCols[k % givenCols.length])
    : ddColors(groupKeys.length, null, o.colorCategory);
  groupColor = new Map(groupKeys.map((g, k) => [g, gc[k]]));
  itemColor = names.map((nm, i) => groupColor.get(itemGroup[i]) || DD_ACCENT);
} else {
  itemColor = givenCols.length ? names.map((nm, i) => givenCols[i % givenCols.length])
    : ddColors(n, null, o.colorCategory);
}
const groupIndex = hasGroup ? itemGroup.map(g => groupKeys.indexOf(g)) : null;

// ---- timing ---------------------------------------------------------------------------
// each period: rest for `hold` (share of the period), then move with the easing
const baseEase = ddEase(o.ease, d3.easeLinear);
const hold = Math.max(0, Math.min(0.995, +o.hold || 0));
const E = f => f <= hold ? 0 : baseEase((f - hold) / (1 - hold));
const sortMode = o.sort === "ascending" ? "ascending" : (o.sort === "none" ? "none" : "descending");
const desc = sortMode !== "ascending";
const worst = desc ? Math.min(0, gmin) : Math.max(0, gmax);
let K = nF > 1 ? Math.max(1, Math.min(12, Math.round((+o.transitionDur || 1000) / 200))) : 1;
while (K > 1 && ((nF - 1) * K + 1) * n > 3e6) K--;
const S = (nF - 1) * K + 1;
const BIG = 1e6;

// ---- interaction state --------------------------------------------------------------------
const hidden = new Set(ddArr(st.hidden).filter(g => groupKeys.indexOf(g) >= 0));
if (hasGroup && hidden.size >= groupKeys.length) hidden.clear();
const isHidden = i => hasGroup && hidden.has(itemGroup[i]);
const pinned = new Set();
(st.pinned !== undefined ? ddArr(st.pinned) : ddArr(o.highlight)).forEach(nm => {
  const i = names.indexOf(String(nm));
  if (i >= 0) pinned.add(i);
});
let focusGroup = null;

// ---- rank tables ------------------------------------------------------------------------------
function buildRanks() {
  const R = new Float32Array(S * n);
  const keys = new Float64Array(n);
  const list = [];
  let maxPresent = 0;
  if (sortMode === "none") {
    let r = 0;
    const fixed = new Float32Array(n);
    for (let i = 0; i < n; i++) fixed[i] = isHidden(i) ? BIG : r++;
    for (let s = 0; s < S; s++) R.set(fixed, s * n);
    return { R, maxPresent: r };
  }
  for (let s = 0; s < S; s++) {
    const i0 = nF > 1 ? Math.min(nF - 2, Math.floor(s / K)) : 0;
    const f = nF > 1 ? s / K - i0 : 0;
    list.length = 0;
    const off = s * n;
    for (let i = 0; i < n; i++) {
      if (isHidden(i)) { R[off + i] = BIG; continue; }
      const a = vals[i * nF + i0], b = nF > 1 ? vals[i * nF + i0 + 1] : a;
      const pa = a === a ? 1 : 0, pb = b === b ? 1 : 0;
      const p = pa + (pb - pa) * f;
      if (p <= 0) { R[off + i] = BIG; continue; }
      const v = (pa && pb) ? a + (b - a) * f : (pa ? a : b);
      keys[i] = p >= 1 ? v : worst + (v - worst) * p;
      list.push(i);
    }
    if (desc) list.sort((x, y) => (keys[y] - keys[x]) || (x - y));
    else list.sort((x, y) => (keys[x] - keys[y]) || (x - y));
    for (let r = 0; r < list.length; r++) R[off + list[r]] = r;
    if (f === 0 && list.length > maxPresent) maxPresent = list.length;
  }
  // the last frame
  return { R, maxPresent: Math.max(1, maxPresent, list.length) };
}
const topN0 = Math.max(1, +o.topN || 10);
let topChoice = (st.topN && isFinite(st.topN)) ? st.topN : topN0;
let table = buildRanks();
const effN = (tb, choice) => Math.max(1, Math.min(choice, tb.maxPresent));
let cur = { R: table.R, N: effN(table, topChoice) };
let prev = null, blendStart = 0;
const BLEND = 650;

function now() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
function setModel(next) {
  // blend from the state on screen (if a blend is running, from its end)
  prev = cur;
  cur = next;
  blendStart = now();
  requestFx();
}
function rankIn(m, i, sPos) {
  const s0 = Math.min(S - 1, Math.floor(sPos)), s1 = Math.min(S - 1, s0 + 1), fr = sPos - s0;
  const r0 = Math.min(m.R[s0 * n + i], m.N), r1 = Math.min(m.R[s1 * n + i], m.N);
  return r0 + (r1 - r0) * fr;
}
function rawRank(i, sPos) {
  const s = Math.min(S - 1, Math.round(sPos));
  const r = cur.R[s * n + i];
  return r >= BIG ? null : r;
}

// ---- formats ------------------------------------------------------------------------------------
const pre = o.valuePrefix || "", suf = o.valueSuffix || "";
// short affixes ("$", "%", "k") are kept on the axis, words (" units") are not
const tickPre = pre.trim().length <= 2 ? pre : "", tickSuf = suf.trim().length <= 2 ? suf : "";
function cnt(v) {
  if (v === null || v === undefined || !isFinite(v)) return "–";
  if (o.valueFormat) return fmt.value(v);
  const a = Math.abs(v);
  let s;
  if (a >= 1e6) s = d3.format(".3s")(a).replace("G", "B");
  else if (allInt) s = d3.format(",")(Math.round(a));
  else s = d3.format(a >= 1000 ? ",.0f" : (a >= 10 ? ",.1f" : ",.2f"))(a);
  const zero = /^[0.,]+$/.test(s);
  return (v < 0 && !zero ? "−" : "") + pre + s + suf;
}
const fmtPct = d3.format(".1%");

// ---- layout ---------------------------------------------------------------------------------------
const padL = 14, padR = 16;
const yFs = +o.yFontSize || 12, xFs = +o.xFontSize || 10;
const inside = o.namePosition === "inside";
const nameW = names.map(nm => ms.tw(nm, yFs, inside ? 600 : 400));
let top = ddTitles(svg, o, axisCol, padL);

// header: legend (left) and top-N buttons (right)
const altN = (function () {
  if (o.controls === false || sortMode === "none") return null;
  const m = table.maxPresent;
  if (m <= topN0) return null;
  return m <= Math.ceil(topN0 * 2.5) ? m : topN0 * 2;
})();
const ctlItems = altN ? [
  { k: topN0, t: "Top " + topN0, tip: "Show the top " + topN0 },
  { k: altN, t: altN === table.maxPresent ? "All " + altN : "Top " + altN, tip: "Show the top " + altN }] : [];
if (ctlItems.length && ctlItems.every(c => c.k !== topChoice)) { topChoice = topN0; cur.N = effN(table, topChoice); }
const ctlH = 22;
ctlItems.forEach(c => { c.w = ms.tw(c.t, 11, 600) + 18; });
const ctlW = d3.sum(ctlItems, c => c.w);
const legendItems = hasGroup ? groupKeys.map(g => ({ g, color: groupColor.get(g), w: 22 + ms.tw(g, 12) + 14 })) : [];
let legendAvail = W - padL - padR - (ctlW ? ctlW + 16 : 0);
let ctlOwnRow = false;
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
  else { legendTop = top; top += Math.max(legendRows * 22, ctlW ? ctlH : 0); }
  top += 6;
}

// the player at the bottom
const player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames, frameNum: race.frameNum, timeType: race.timeType,
  o: Object.assign({}, o.player, { stateKey: o.stateKey }),
  onRender: t => render(t)
});

// columns
const nameColW = inside ? 0 : Math.max(24, Math.min(W * 0.28, d3.max(nameW) || 0));
const px0 = inside ? padL : padL + nameColW + 10;
const valFsMax = Math.max(6, yFs - 1);
let maxValW = 0;
if (o.labels !== false) {
  const strs = [];
  for (let k = 0; k < vals.length; k++) if (vals[k] === vals[k]) strs.push(cnt(vals[k]));
  strs.sort((a, b) => b.length - a.length);
  const seen = new Set();
  strs.slice(0, 40).forEach(s => { if (!seen.has(s)) { seen.add(s); maxValW = Math.max(maxValW, ms.tw(s, valFsMax, 600)); } });
  if (o.rankFlash !== false) maxValW += valFsMax + 4;
}
const labelRoom = o.labels !== false ? Math.min(W * 0.25, maxValW + 10) : 6;
const px1 = W - padR - labelRoom;
// room left of zero only when a negative bar can reach the ranking
const negRoom = (function () {
  if (gmin >= 0) return 0;
  if (sortMode !== "descending") return labelRoom;
  const maxN = Math.max(topN0, altN || 0);
  for (let f = 0; f < nF; f++) {
    const off = Math.min(S - 1, f * K) * n;
    for (let i = 0; i < n; i++) if (vals[i * nF + f] < 0 && table.R[off + i] < maxN) return labelRoom;
  }
  return 0;
})();

// axis titles, then the tick labels
let titlesY = null;
if (o.xtitle || o.ytitle) {
  const fs = Math.max(o.xtitle ? +o.xtitleFontSize || 12 : 0, o.ytitle ? +o.ytitleFontSize || 12 : 0);
  titlesY = top + fs * 0.8;
  top += fs + 6;
}
const tickY = top + xFs * 0.8;
const py0 = top + xFs + 8;
const py1 = (player.height ? player.top - 8 : H - 10);
const areaH = Math.max(20, py1 - py0);

if (titlesY !== null) {
  if (o.ytitle) svg.append("text").attr("x", inside ? padL : px0 - 8).attr("y", titlesY)
    .attr("text-anchor", inside ? "start" : "end")
    .style("font-size", (+o.ytitleFontSize || 12) + "px").style("font-weight", 600)
    .style("fill", axisCol).text(o.ytitle);
  if (o.xtitle) svg.append("text").attr("x", inside ? (px0 + px1) / 2 : (px0 + px1) / 2).attr("y", titlesY)
    .attr("text-anchor", "middle")
    .style("font-size", (+o.xtitleFontSize || 12) + "px").style("font-weight", 600)
    .style("fill", axisCol).text(o.xtitle);
}

// ---- layers ---------------------------------------------------------------------------------------
const gBack = svg.append("g").style("pointer-events", "none");
if (o.panelcol) gBack.append("rect").attr("x", px0).attr("y", py0 - 4)
  .attr("width", Math.max(0, W - padR - px0)).attr("height", Math.max(0, py1 - py0 + 4)).attr("fill", o.panelcol);
const hoverBand = gBack.append("rect").attr("x", padL - 6).attr("width", W - padL - padR + 12)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0.05).style("display", "none");
const gGrid = gBack.append("g");
const gTicks = svg.append("g").style("pointer-events", "none");
const zeroLine = gBack.append("line").attr("y1", py0 - 4).attr("y2", py1)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.35).attr("stroke-width", 1);
const gRows = svg.append("g").style("pointer-events", "none");
const gWm = svg.append("g").style("pointer-events", "none");
const gLab = svg.append("g").style("pointer-events", "none");
const sep = svg.append("line").attr("x1", padL).attr("x2", W - padR).attr("stroke", axisCol)
  .attr("stroke-opacity", 0.3).attr("stroke-dasharray", "3,3").style("display", "none").style("pointer-events", "none");
const sepLbl = svg.append("text").attr("x", padL).attr("text-anchor", "start")
  .style("font-size", "9.5px").style("fill", axisCol).style("fill-opacity", 0.55)
  .style("display", "none").style("pointer-events", "none").text("Followed");

// watermark and total
const tlo = o.timeLabelOpts || {};
const wmSize = ddNum(tlo.size) || (function () {
  // as big as the chart allows, but never wider than ~45% of it
  let size = Math.max(24, Math.min(110, W * 0.11, areaH * 0.22));
  if (o.timeLabel === false) return size;
  const probe = [0, nF - 1, Math.floor(nF / 2)].map(k => (tlo.prefix || "") + player.label(k) + (tlo.suffix || ""));
  const w = d3.max(probe, s => ms.tw(s, size, 800)) || 1;
  if (w > W * 0.45) size = Math.max(18, size * W * 0.45 / w);
  return size;
})();
const totalLbl = o.total || null;
const totalFs = Math.max(10, Math.min(16, wmSize * 0.24));
const wmRight = W - padR - 2;
const wmBase = py1 - 6 - (totalLbl ? totalFs + 8 : 0);
const wm = o.timeLabel !== false
  ? ddWatermark(gWm, { x: wmRight, y: wmBase, size: wmSize, font, color: axisCol, opacity: 0.17 }) : null;
let totalText = null, totalVal = null;
if (totalLbl) {
  totalText = gWm.append("text").attr("x", wmRight).attr("y", py1 - 6).attr("text-anchor", "end")
    .style("font-size", totalFs + "px").style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
  totalText.append("tspan").style("fill-opacity", 0.55).text(totalLbl + "  ");
  totalVal = totalText.append("tspan").style("font-weight", 700).style("fill-opacity", 0.75);
}
let wmLast = null;

// rows: one group per item, hidden until it is in the ranking
const strokeW = (o.strokeWidth === null || o.strokeWidth === undefined) ? (o.stroke ? 1 : 0) : +o.strokeWidth;
const rows = names.map((nm, i) => {
  const g = gRows.append("g").attr("class", "dd-bar").style("display", "none");
  const bar = g.append("path").attr("fill", itemColor[i])
    .attr("stroke", o.stroke || "none").attr("stroke-width", strokeW);
  const lg = gLab.append("g").attr("class", "dd-lab").style("display", "none");
  const nameT = lg.append("text").attr("dy", "0.35em").style("font-weight", inside ? 600 : 400);
  const rk = nameT.append("tspan").style("fill-opacity", 0.55).style("font-weight", 700);
  const nmT = nameT.append("tspan");
  const valT = lg.append("text").attr("dy", "0.35em").style("font-weight", 600)
    .style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
  const vT = valT.append("tspan").style("fill-opacity", 0.85);
  const flT = valT.append("tspan").attr("dx", 4).style("fill", UP).style("font-size", "0.8em");
  return { g, lg, bar, nameT, rk, nmT, valT, vT, flT, shown: false, last: {} };
});
const nameFull = names.map(nm => nm);
const nameTrunc = inside ? nameFull : names.map(nm => ms.truncate(nm, nameColW, yFs));
const nameShort = inside ? nameFull : names.map(nm => ms.truncate(nm, Math.max(20, nameColW - 30), yFs));

// value axis
const X = d3.scaleLinear().range([px0 + negRoom, px1]);
const nTicks = o.xticks ? +o.xticks : Math.max(2, Math.round((px1 - px0) / 110));
const tickMap = new Map();
const gridCol = o.gridCol || null;

// hover overlay and tooltip
const overlay = svg.append("rect").attr("x", padL - 6).attr("y", py0 - 2)
  .attr("width", W - padL - padR + 12).attr("height", Math.max(0, py1 - py0 + 2))
  .attr("fill", "transparent").style("cursor", "pointer");
const tip = ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms });
const mouse = { on: false, mx: 0, my: 0 };

// ---- per-render bookkeeping -----------------------------------------------------------------------
const lastIntRank = new Int32Array(n).fill(-1);
const flashAt = new Float64Array(n).fill(-1e9);
let lastTe = null, lastNow = null, firstRender = true;
let drawn = [];           // rows drawn in the last render: {i, y, h, op, v, rank}
let hoverI = -1, lastTipKey = null, curTe = 0;
let fxTimer = null, needFx = false;

function requestFx() {
  // runs while something still animates (blend, tick fades, flashes); the
  // player renders by itself while playing
  if (!fxTimer) fxTimer = ddplotTrack(d3.timer(() => { if (!player.playing()) player.render(); }));
}

function barPath(x0, x1, h, r, neg) {
  const len = x1 - x0;
  const f = v => Math.round(v * 10) / 10;
  if (len <= 0.05) return `M${f(x0)},0h0v${f(h)}h0Z`;
  r = Math.max(0, Math.min(r, h / 2, len));
  if (!neg) return `M${f(x0)},0H${f(x1 - r)}Q${f(x1)},0 ${f(x1)},${f(r)}V${f(h - r)}Q${f(x1)},${f(h)} ${f(x1 - r)},${f(h)}H${f(x0)}Z`;
  return `M${f(x1)},0H${f(x0 + r)}Q${f(x0)},0 ${f(x0)},${f(r)}V${f(h - r)}Q${f(x0)},${f(h)} ${f(x0 + r)},${f(h)}H${f(x1)}Z`;
}
const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
function setAttr(r, key, sel, name, value) {
  if (r.last[key] !== value) { r.last[key] = value; sel.attr(name, value); }
}
function setStyle(r, key, sel, name, value) {
  if (r.last[key] !== value) { r.last[key] = value; sel.style(name, value); }
}
function setText(r, key, sel, value) {
  if (r.last[key] !== value) { r.last[key] = value; sel.text(value); }
}

// value of item i at period i0 + e (e may overshoot with "Back" easings)
function valueAt(i, i0, e, ec) {
  const a = vals[i * nF + i0], b = nF > 1 ? vals[i * nF + i0 + 1] : a;
  const pa = a === a ? 1 : 0, pb = b === b ? 1 : 0;
  const p = pa + (pb - pa) * ec;
  if (!pa && !pb) return { v: NaN, p: 0, dv: NaN };
  const v = (pa && pb) ? a + (b - a) * e : (pa ? a : b);
  return { v, p, dv: (pa && pb) ? v : v * p };
}
// value at a continuous (eased) time te, for the tooltip
function valueAtTe(i, te) {
  if (nF < 2) { const a = vals[i]; return a === a ? a : null; }
  const i0 = Math.min(nF - 2, Math.max(0, Math.floor(te))), f = te - i0;
  const a = vals[i * nF + i0], b = vals[i * nF + i0 + 1];
  if (a !== a && b !== b) return null;
  if (a !== a) return f >= 0.999 ? b : null;
  if (b !== b) return f <= 0.001 ? a : null;
  return a + (b - a) * f;
}

// ---- render ----------------------------------------------------------------------------------------
let inRender = false;
function render(t) {
  inRender = true;
  try { renderAt(t); } finally { inRender = false; }
  // restyle once when the hovered bar changed during this render
  if (hoverDirty) { hoverDirty = false; if (!player.playing()) player.render(); }
}
let hoverDirty = false;
function renderAt(t) {
  const tNow = now();
  const dt = lastNow === null ? 1000 : Math.min(120, tNow - lastNow);
  lastNow = tNow;
  let i0, e;
  if (nF < 2) { i0 = 0; e = 0; } else { i0 = Math.min(nF - 2, Math.max(0, Math.floor(t))); e = E(Math.min(1, t - i0)); }
  const ec = clamp01(e);
  const te = i0 + ec;
  curTe = te;
  const sPos = te * K;
  const jumped = lastTe !== null && Math.abs(te - lastTe) > 0.6;
  const playingNow = player.playing();
  lastTe = te;
  needFx = false;

  // blend between two rank tables (legend, top-N toggle)
  let k = 1;
  if (prev) {
    k = d3.easeCubicInOut(clamp01((tNow - blendStart) / BLEND));
    if (k >= 1) prev = null; else needFx = true;
  }
  const Nf = prev ? prev.N + (cur.N - prev.N) * k : cur.N;

  // positions and values
  const items = [];
  for (let i = 0; i < n; i++) {
    const hid = isHidden(i);
    const rc = prev ? rankIn(prev, i, sPos) + (rankIn(cur, i, sPos) - rankIn(prev, i, sPos)) * k : rankIn(cur, i, sPos);
    let op = clamp01(Nf - rc);
    const vv = valueAt(i, i0, e, ec);
    if (sortMode === "none") op *= vv.p;
    const follow = pinned.has(i) && !hid && vv.p > 0;
    if (op <= 0.002 && !follow) continue;
    items.push({ i, rc, op, v: vv.v, dv: vv.dv, p: vv.p, follow, b: 0 });
  }
  // followed items below the cut get extra rows under a separator
  const extras = items.filter(d => d.follow && d.rc > Nf - 1 - 1e-6)
    .map(d => { d.raw = rawRank(d.i, sPos); return d; })
    .filter(d => d.raw !== null)
    .sort((a, b) => a.raw - b.raw).slice(0, 3);
  let extraF = 0;
  extras.forEach((d, j) => { d.b = clamp01(d.rc - (Nf - 1)); d.j = j; extraF += d.b; });
  extraF = Math.min(3, extraF);
  const gap = extraF > 0 ? 0.5 * Math.min(1, extraF) : 0;
  const step = areaH / Math.max(1, Nf + gap + extraF);
  const thick = Math.max(1, step * (1 - (+o.paddingWidth || 0)));
  const yb = (step - thick) / 2;

  // the axis follows the visible bars
  let lo = 0, hi = 0;
  items.forEach(d => {
    if (d.b > 0) { d.op = Math.max(d.op, 1); }
    if (d.op <= 0.002 || !(d.dv === d.dv)) return;
    const w = Math.min(1, d.op);
    if (d.dv > 0) hi = Math.max(hi, d.dv * w);
    if (d.dv < 0) lo = Math.min(lo, d.dv * w);
  });
  if (hi - lo <= 0) hi = lo + 1;
  X.domain([lo, hi]);

  // ---- ticks and grid (fading in and out) ----
  const ticks = X.ticks(nTicks);
  const big = Math.max(Math.abs(lo), Math.abs(hi)) >= 1e4;
  const tf = (o.valueFormat && /%/.test(o.valueFormat)) ? (v => fmt.short(v)) : (function () {
    const base = big ? d3.format("~s") : X.tickFormat(nTicks);
    return v => (v < 0 ? "−" : "") + tickPre + String(base(Math.abs(v))).replace("G", "B") + tickSuf;
  })();
  const want = new Set(ticks);
  ticks.forEach(v => {
    if (!tickMap.has(v)) {
      const tg = gTicks.append("g");
      const ln = gridCol ? gGrid.append("line").attr("y1", py0 - 4).attr("y2", py1).attr("stroke", gridCol) : null;
      const tx = tg.append("text").attr("y", tickY).attr("text-anchor", "middle")
        .style("font-size", xFs + "px").style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
      tickMap.set(v, { tg, ln, tx, op: firstRender ? 1 : 0 });
    }
  });
  tickMap.forEach((tk, v) => {
    const target = want.has(v) ? 1 : 0;
    if (tk.op !== target) {
      tk.op = target ? Math.min(1, tk.op + dt / 260) : Math.max(0, tk.op - dt / 200);
      if (tk.op !== target) needFx = true;
    }
    const x = X(v);
    if (tk.op <= 0 || x < px0 - 30 || x > W) {
      if (!target || tk.op <= 0) { tk.tg.remove(); if (tk.ln) tk.ln.remove(); tickMap.delete(v); return; }
    }
    const edge = clamp01((px1 + 6 - x) / 20);
    tk.tx.attr("x", x).attr("text-anchor", x < padL + 14 ? "start" : "middle").style("fill-opacity", 0.7 * tk.op * edge).text(tf(v));
    if (tk.ln) tk.ln.attr("x1", x).attr("x2", x).attr("stroke-opacity", tk.op * edge);
  });
  zeroLine.attr("x1", X(0)).attr("x2", X(0));

  // ---- rows ----
  const anyPinned = pinned.size > 0;
  const shown = new Set();
  const fsN = Math.max(6, Math.min(yFs, step * 0.62));
  const fsV = Math.max(6, Math.min(valFsMax, step * 0.58));
  const showNames = fsN >= 6.5;
  const showVals = o.labels !== false && fsV >= 6.5;
  const baseOp = (o.opacity === null || o.opacity === undefined) ? 1 : +o.opacity;
  const newDrawn = [];
  const rad = +o.cornerRadius || 0;
  items.forEach(d => {
    if (d.op <= 0.002 || !(d.dv === d.dv)) return;
    const i = d.i, r = rows[i];
    shown.add(i);
    if (!r.shown) { r.g.style("display", null); r.lg.style("display", null); r.shown = true; }
    let y = py0 + d.rc * step;
    if (d.b > 0) y = y + ((py0 + (Nf + gap + d.j) * step) - y) * d.b;
    const x0 = X(Math.min(0, d.dv)), x1 = X(Math.max(0, d.dv));
    const neg = d.dv < 0;
    const trf = `translate(0,${(y + yb).toFixed(2)})`;
    if (r.last.tr !== trf) { r.last.tr = trf; r.g.attr("transform", trf); r.lg.attr("transform", trf); }
    r.bar.attr("d", barPath(x0, x1, thick, rad, neg));
    // emphasis
    let dim = 1;
    if (anyPinned && !pinned.has(i)) dim *= 0.4;
    if (focusGroup !== null && itemGroup[i] !== focusGroup) dim *= 0.2;
    if (hoverI >= 0 && hoverI !== i) dim *= 0.65;
    const op = d.op;
    setAttr(r, "bo", r.bar, "fill-opacity", +(baseOp * op * dim).toFixed(3));
    if (strokeW) setAttr(r, "so", r.bar, "stroke-opacity", +(op * dim).toFixed(3));
    const strong = pinned.has(i) || hoverI === i;
    // the rank shown in front of followed rows below the cut
    const rkTxt = d.b > 0.5 ? "#" + (d.raw + 1) + " " : "";
    setText(r, "rk", r.rk, rkTxt);
    // names
    const barW = x1 - x0;
    const nw = nameW[i] * fsN / yFs;
    let valX, valAnchor = "start";
    if (inside) {
      let nx, nAnchor, nFill;
      if (neg) { nx = X(0) + 6; nAnchor = "start"; nFill = axisCol; valX = x0 - 6; valAnchor = "end"; }
      else if (barW >= nw + 14 + (rkTxt ? fsN * 2.4 : 0)) { nx = x1 - 7; nAnchor = "end"; nFill = ddTextOn(itemColor[i]); valX = x1 + 6; }
      else { nx = x1 + 6; nAnchor = "start"; nFill = axisCol; valX = x1 + 6 + nw + (rkTxt ? fsN * 2.4 : 0) + 7; }
      setAttr(r, "nx", r.nameT, "x", nx.toFixed(1));
      setAttr(r, "na", r.nameT, "text-anchor", nAnchor);
      setStyle(r, "nf", r.nameT, "fill", nFill);
      setText(r, "nm", r.nmT, nameFull[i]);
    } else {
      setAttr(r, "nx", r.nameT, "x", px0 - 8);
      setAttr(r, "na", r.nameT, "text-anchor", "end");
      setStyle(r, "nf", r.nameT, "fill", axisCol);
      setText(r, "nm", r.nmT, rkTxt ? nameShort[i] : nameTrunc[i]);
      valX = neg ? x0 - 6 : x1 + 6;
      if (neg) valAnchor = "end";
    }
    setAttr(r, "ny", r.nameT, "y", (thick / 2).toFixed(2));
    setStyle(r, "nfs", r.nameT, "font-size", fsN.toFixed(1) + "px");
    setStyle(r, "nw", r.nameT, "font-weight", (strong || inside) ? 700 : 400);
    setStyle(r, "nd", r.nameT, "display", showNames ? null : "none");
    setStyle(r, "no", r.nameT, "opacity", +(Math.min(1, op * 1.15) * (dim < 1 ? Math.max(0.35, dim) : 1)).toFixed(3));
    // value labels (counting)
    if (showVals) {
      setAttr(r, "vx", r.valT, "x", valX.toFixed(1));
      setAttr(r, "va", r.valT, "text-anchor", valAnchor);
      setAttr(r, "vy", r.valT, "y", (thick / 2).toFixed(2));
      setStyle(r, "vfs", r.valT, "font-size", fsV.toFixed(1) + "px");
      setText(r, "vt", r.vT, cnt(d.dv));
      setStyle(r, "vo", r.valT, "opacity", +(op * (dim < 1 ? Math.max(0.35, dim) : 1)).toFixed(3));
    }
    setStyle(r, "vd", r.valT, "display", showVals ? null : "none");
    // overtaking flash
    if (o.rankFlash !== false && sortMode !== "none") {
      const ir = Math.round(d.rc);
      if (playingNow && !prev && !jumped && op > 0.9 && lastIntRank[i] >= 0 && ir < lastIntRank[i] && d.b === 0) flashAt[i] = tNow;
      lastIntRank[i] = ir;
      const age = tNow - flashAt[i];
      if (age < 900 && showVals) {
        needFx = true;
        r.flT.text(valAnchor === "end" ? "" : "▲").style("fill-opacity", (1 - age / 900).toFixed(3));
      } else if (r.last.fl !== 0) { r.flT.text(""); }
      r.last.fl = age < 900 ? 1 : 0;
    }
    newDrawn.push({ i, y, h: step, op, dv: d.dv, v: d.v, b: d.b });
  });
  rows.forEach((r, i) => {
    if (r.shown && !shown.has(i)) { r.g.style("display", "none"); r.lg.style("display", "none"); r.shown = false; r.flT.text(""); r.last.fl = 0; lastIntRank[i] = -1; }
  });
  drawn = newDrawn;

  // separator above the followed rows
  if (extraF > 0.01) {
    const sy = py0 + (Nf + gap * 0.5) * step;
    sep.style("display", null).attr("y1", sy).attr("y2", sy).attr("stroke-opacity", 0.3 * Math.min(1, extraF));
    sepLbl.style("display", step > 11 ? null : "none").attr("y", sy - 3).style("fill-opacity", 0.55 * Math.min(1, extraF));
  } else { sep.style("display", "none"); sepLbl.style("display", "none"); }

  // ---- watermark and total ----
  if (wm) {
    const txt = (tlo.prefix || "") + player.label(te) + (tlo.suffix || "");
    if (txt !== wmLast) {
      wmLast = txt;
      wm.text(txt);
      const xo = +tlo.xOffset || 0, yo = +tlo.yOffset || 0;
      const w = xo ? wm.node().getComputedTextLength() : 0;
      wm.attr("x", wmRight - w * xo).attr("y", wmBase - wmSize * 1.15 * yo);
    }
  }
  if (totalVal) {
    let tot = 0;
    for (let i = 0; i < n; i++) {
      if (isHidden(i)) continue;
      const vv = valueAt(i, i0, e, ec);
      if (vv.dv === vv.dv) tot += vv.dv;
    }
    totalVal.text(cnt(tot));
  }

  firstRender = false;
  updateHover();
  if (fxTimer && !needFx) { fxTimer.stop(); fxTimer = null; }
  else if (needFx) requestFx();
}

// ---- hover, tooltip, click ---------------------------------------------------------------------
function hoveredRow() {
  if (!mouse.on) return null;
  let best = null;
  drawn.forEach(d => {
    if (d.op < 0.5) return;
    if (mouse.my >= d.y && mouse.my < d.y + d.h && (!best || d.op > best.op)) best = d;
  });
  return best;
}
function updateHover() {
  const d = hoveredRow();
  const hi = d ? d.i : -1;
  if (hi !== hoverI) {
    hoverI = hi;
    // restyle at the next frame (or now, when paused)
    if (inRender) hoverDirty = true;
    else if (!player.playing()) player.render();
  }
  if (!d) { hoverBand.style("display", "none"); tip.hide(); lastTipKey = null; return; }
  hoverBand.style("display", null).attr("y", d.y).attr("height", d.h);
  if (o.tooltip === false) return;
  const i = d.i;
  const te = curTe;
  const head = names[i];
  const period = player.label(te);
  const rows = [{ name: period, value: cnt(d.dv), bold: true }];
  const rr = rawRank(i, te * K);
  let present = 0;
  const s = Math.min(S - 1, Math.round(te * K));
  for (let j = 0; j < n; j++) if (cur.R[s * n + j] < BIG) present++;
  if (rr !== null && sortMode !== "none") rows.push({ name: "Rank", value: (rr + 1) + " of " + present });
  if (te >= 1) {
    const a = valueAtTe(i, te - 1), b = valueAtTe(i, te);
    if (a !== null && b !== null) {
      const ch = b - a;
      const arrow = ch > 0 ? "▲ " : (ch < 0 ? "▼ " : "");
      const pct = a !== 0 ? (ch >= 0 ? "+" : "−") + d3.format(".1%")(Math.abs(ch / a)) : "";
      rows.push({ name: "Since " + player.label(te - 1), value: arrow + (ch >= 0 ? "+" : "") + cnt(ch),
        valueColor: ch > 0 ? UP : (ch < 0 ? "#e0533d" : null), extra: pct });
    }
  }
  if (totalLbl) {
    let tot = 0;
    for (let j = 0; j < n; j++) {
      if (isHidden(j)) continue;
      const v = valueAtTe(j, te);
      if (v !== null) tot += v;
    }
    const v = valueAtTe(i, te);
    if (tot > 0 && v !== null && v >= 0) rows.push({ name: "Share of " + (totalLbl === "Total" ? "total" : totalLbl), value: fmtPct(v / tot) });
  }
  if (hasGroup) rows.push({ name: o.groupName || "Group", value: itemGroup[i], dim: true });
  rows.push({ name: pinned.has(i) ? "Click to stop following" : "Click to follow", dim: true, sep: true });
  const key = head + "|" + rows.map(r => r.name + ":" + (r.value || "") + (r.extra || "")).join("|");
  if (key !== lastTipKey) { lastTipKey = key; tip.show(head, rows, mouse.mx, mouse.my, itemColor[i]); }
  else tip.move(mouse.mx, mouse.my);
}
overlay
  .on("mousemove", function (a) {
    const p = ddPtr(a, svg.node());
    mouse.on = true; mouse.mx = p[0]; mouse.my = p[1];
    if (!player.playing()) updateHover();
  })
  .on("mouseleave", function () {
    mouse.on = false;
    updateHover();
  })
  .on("click", function (a) {
    const p = ddPtr(a, svg.node());
    mouse.on = true; mouse.mx = p[0]; mouse.my = p[1];
    const d = hoveredRow();
    if (!d) {
      if (pinned.size) { pinned.clear(); st.pinned = []; player.render(); }
      return;
    }
    const i = d.i;
    if (pinned.has(i)) pinned.delete(i); else pinned.add(i);
    st.pinned = Array.from(pinned).map(j => names[j]);
    lastTipKey = null;
    const rr = rawRank(i, curTe * K);
    send("clicked", {
      item: names[i], group: hasGroup ? itemGroup[i] : null, value: isFinite(d.dv) ? d.dv : null,
      rank: rr === null ? null : rr + 1, period: player.label(curTe), followed: pinned.has(i)
    });
    player.render();
  });

// Escape stops following every bar
svg.on("keydown.ddbar", function (a) {
  const ev = ddEvOf(a);
  if (ev && ev.key === "Escape" && pinned.size) {
    pinned.clear(); st.pinned = []; lastTipKey = null; player.render();
  }
});

// ---- legend ------------------------------------------------------------------------------------
const gLegend = svg.append("g").attr("transform", `translate(${padL},${legendTop})`)
  .style("user-select", "none").style("-webkit-user-select", "none");
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`).style("cursor", "pointer");
legendSel.append("title").text("Click to hide, double-click to isolate");
legendSel.append("rect").attr("class", "bg").attr("x", -4).attr("width", d => d.w - 6).attr("height", 22)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legendSel.append("rect").attr("x", 1).attr("y", 5).attr("width", 12).attr("height", 12).attr("rx", 3)
  .attr("fill", d => d.color);
legendSel.append("text").attr("x", 19).attr("y", 11).attr("dy", "0.35em")
  .style("font-size", "12px").style("fill", axisCol).text(d => d.g);
function styleLegend() {
  legendSel.style("opacity", d => hidden.has(d.g) ? 0.4 : 1);
  legendSel.select("text").style("text-decoration", d => hidden.has(d.g) ? "line-through" : null);
}
function afterHiddenChange() {
  st.hidden = Array.from(hidden);
  focusGroup = null;
  styleLegend();
  table = buildRanks();
  setModel({ R: table.R, N: effN(table, topChoice) });
  lastTipKey = null;
  player.render();
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g)) { focusGroup = d.g; if (!player.playing()) player.render(); }
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    focusGroup = null;
    if (!player.playing()) player.render();
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.g)) {
        if (groupKeys.length - hidden.size <= 1) return;
        hidden.add(d.g);
      } else hidden.delete(d.g);
      afterHiddenChange();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = groupKeys.length - hidden.size === 1 && !hidden.has(d.g);
    hidden.clear();
    if (!onlyThis) groupKeys.forEach(g => { if (g !== d.g) hidden.add(g); });
    afterHiddenChange();
  });
styleLegend();

// ---- top-N buttons -----------------------------------------------------------------------------
const gCtl = svg.append("g").attr("class", "dd-topn").attr("transform", `translate(${W - padR - ctlW},${headerTop})`)
  .style("user-select", "none").style("-webkit-user-select", "none");
if (ctlItems.length) {
  gCtl.append("rect").attr("width", ctlW).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  ctlItems.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = gCtl.append("g").attr("transform", `translate(${it.x},0)`).style("cursor", "pointer");
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", DD_ACCENT).attr("fill-opacity", 0);
    if (k > 0) gCtl.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
      .style("fill", axisCol).text(it.t);
    b.on("mouseenter", function () { if (topChoice !== it.k) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", styleCtl)
      .on("click", function () {
        if (topChoice === it.k) return;
        topChoice = it.k; st.topN = it.k;
        styleCtl();
        setModel({ R: cur.R, N: effN(table, topChoice) });
        lastTipKey = null;
        player.render();
      });
  });
}
function styleCtl() {
  ctlItems.forEach(it => {
    const on = topChoice === it.k;
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? DD_ACCENT : axisCol);
  });
}
styleCtl();

player.start();
