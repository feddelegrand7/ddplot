// donut_race(): a share race. A donut (or a pie) whose slices change smoothly
// through time, next to a live league table whose rows slide to their rank.
//
// Prepended with ddplotreset.js and racekit.js (ddplot_script()). The player
// of racekit.js is the clock: draw(t) redraws everything for any continuous
// time t, so playing, scrubbing and stepping are all smooth.
//
// How the slices reorder without flicker (sort = "value"): every item has a
// rank per frame (interpolated at t). A plain cumulative layout in the order
// of the interpolated ranks would jump when two ranks cross, and moving rigid
// slices would leave holes and overlaps. Instead the slices are placed one by
// one, the largest first: each one takes its "soft" position among the slices
// not placed yet (the sum of their widths weighted by a smooth step of the
// rank difference), measured along the part of the circle still free. The
// smaller slices then fill what is left, splitting around a larger slice
// while it slides through them. The result is always an exact partition of
// the circle (every slice keeps its exact angle), it is continuous in t, and
// at every frame it is the plain ranked layout.
//
// "Other" (maxSlices): in each frame an item either has its own slice (own =
// 1) or is grouped (own = 0). At t, own is interpolated, so the value of an
// item crossing the cut flows from its slice into the "Other" slice (or back)
// while its slice slides next to "Other". The table always ranks every item.
//
// Hidden items, the slice order and pins are kept in r2d3.ddplotState. A
// change of the hidden items or of the order blends the old and the new
// per-frame ranks over 650 ms, so the slices close the gap smoothly.
// Works with D3 v5 and v6.

const o = options;
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const axisCol = o.axisCol || "#333333";
const bgcol = o.bgcol || "white";
const TAU = 2 * Math.PI;
const OTHER_COL = "#b8bdc4";
const UP_COL = "#2f9e44", DOWN_COL = "#e03131";
svg.style("background-color", bgcol).style("font-family", font);
const ms = ddMeasure(svg, font);
const fmt = ddFormatter(o);
const send = ddShiny(svg);

// ---- data -------------------------------------------------------------------------------
const race = o.race || {};
const frames = ddArr(race.frames).map(String);
const nF = Math.max(1, frames.length);
const items = ddArr(race.items).map(String);
const N = items.length;
const ser = ddArr(race.series && race.series.v).map(s => ddArr(s).map(v => { const x = ddNum(v); return x !== null && x > 0 ? x : null; }));
while (ser.length < N) ser.push([]);
ser.forEach(s => { while (s.length < nF) s.push(null); });
const OTHER = N; // index of the "Other" pseudo item
const otherLabel = o.otherLabel || "Other";
const cols = (function () {
  const given = ddArr(o.colors);
  if (given.length) return items.map((d, i) => given[i % given.length] || DD_PALETTE[i % DD_PALETTE.length]);
  // a D3 scheme: the first colours go to the largest items
  const sch = ddColors(N, null, o.colorCategory);
  const order = ddArr(o.sizeOrder).map(Number);
  return items.map((d, i) => sch[order.length === N && isFinite(order[i]) ? order[i] : i]);
})();
const colorOf = k => k === OTHER ? OTHER_COL : cols[k];
const nameOf = k => k === OTHER ? otherLabel : items[k];
const K = (o.maxSlices && N > o.maxSlices) ? Math.max(2, +o.maxSlices) : null;
const valueName = o.valueName || "Value";

if (!N || !frames.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).style("font-size", "13px").text("No data");
  return;
}

// the nearest frame where each item is known (to place it before it enters)
const nextKnown = ser.map(s => { const out = new Array(nF); let nx = -1; for (let f = nF - 1; f >= 0; f--) { if (s[f] !== null) nx = f; out[f] = nx; } return out; });
const prevKnown = ser.map(s => { const out = new Array(nF); let pv = -1; for (let f = 0; f < nF; f++) { if (s[f] !== null) pv = f; out[f] = pv; } return out; });

// ---- persistent state ------------------------------------------------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
const SK = (o.player && o.player.stateKey) || "donutrace";
if (!state.donut || state.donut.key !== SK) state.donut = { key: SK };
const st = state.donut;
const hidden = new Set(ddArr(st.hidden).filter(l => items.indexOf(l) >= 0));
if (hidden.size >= N) hidden.clear();
const pinned = new Set((st.pinned !== undefined ? ddArr(st.pinned) : ddArr(o.highlight).map(String))
  .filter(l => items.indexOf(l) >= 0 || l === otherLabel));
let sortMode = st.sort || (o.sort === "fixed" ? "fixed" : "value");

// ---- per-frame model: ranks, own slice or grouped, visibility -------------------------------
function computeModel() {
  const vis = items.map(d => hidden.has(d) ? 0 : 1);
  const tRank = items.map(() => new Float64Array(nF));
  const lRank = items.map(() => new Float64Array(nF));
  const own = items.map(() => new Float64Array(nF));
  const otherRank = new Float64Array(nF);
  const frameTotal = new Float64Array(nF);
  const count = new Int32Array(nF);
  let maxShare = 0;
  const idx = d3.range(N);
  for (let f = 0; f < nF; f++) {
    const pres = idx.filter(i => vis[i] && ser[i][f] !== null)
      .sort((a, b) => (ser[b][f] - ser[a][f]) || (a - b));
    const m = pres.length;
    count[f] = m;
    let tot = 0;
    pres.forEach(i => { tot += ser[i][f]; });
    frameTotal[f] = tot;
    const keepN = (K && m > K) ? K - 1 : m;
    const inPres = new Uint8Array(N);
    pres.forEach((i, k) => {
      inPres[i] = 1;
      tRank[i][f] = k + 1;
      own[i][f] = k < keepN ? 1 : 0;
      if (tot > 0) maxShare = Math.max(maxShare, ser[i][f] / tot);
    });
    for (let i = 0; i < N; i++) {
      if (inPres[i]) continue;
      // missing or hidden: placed where its value would rank, so that it grows
      // (or shrinks) in place
      let ref = ser[i][f];
      if (ref === null) {
        const nx = nextKnown[i][f], pv = prevKnown[i][f];
        ref = nx >= 0 ? ser[i][nx] : (pv >= 0 ? ser[i][pv] : null);
      }
      let c = m;
      if (ref !== null) { c = 0; while (c < m && ser[pres[c]][f] > ref) c++; }
      tRank[i][f] = c + 0.5;
      own[i][f] = c < keepN ? 1 : 0;
    }
    for (let i = 0; i < N; i++) {
      if (sortMode === "fixed") lRank[i][f] = i + 1;
      else lRank[i][f] = own[i][f] > 0.5 ? tRank[i][f] : keepN + 0.5;
    }
    otherRank[f] = sortMode === "fixed" ? N + 1 : keepN + 1;
  }
  return { vis, tRank, lRank, own, otherRank, frameTotal, count, maxShare: maxShare || 1 };
}
function mixModel(a, b, k) {
  const mix = (x, y) => { const out = new Float64Array(x.length); for (let f = 0; f < x.length; f++) out[f] = x[f] + (y[f] - x[f]) * k; return out; };
  return {
    vis: a.vis.map((v, i) => v + (b.vis[i] - v) * k),
    tRank: a.tRank.map((x, i) => mix(x, b.tRank[i])),
    lRank: a.lRank.map((x, i) => mix(x, b.lRank[i])),
    own: a.own.map((x, i) => mix(x, b.own[i])),
    otherRank: mix(a.otherRank, b.otherRank),
    frameTotal: b.frameTotal, count: b.count,
    maxShare: a.maxShare + (b.maxShare - a.maxShare) * k
  };
}
let model = computeModel(), prevModel = null, blendStart = 0;
const BLEND = 650;
function blendK() {
  if (!prevModel) return 1;
  const k = Math.min(1, (performance.now() - blendStart) / BLEND);
  if (k >= 1) { prevModel = null; return 1; }
  return d3.easeCubicInOut(k);
}
function remodel() {
  const k = blendK();
  prevModel = prevModel ? mixModel(prevModel, model, k) : model;
  model = computeModel();
  blendStart = performance.now();
  kick();
}

// ---- header controls ----------------------------------------------------------------------------
const padL = 14, padR = 16;
let top = ddTitles(svg, o, axisCol, padL);
const ctlH = 22;
const gCtl = svg.append("g").attr("class", "dd-ctl").style("user-select", "none").style("-webkit-user-select", "none");
const sortItems = [{ k: "value", t: "Ranked", tip: "Slices in the order of the ranking, largest first" },
  { k: "fixed", t: "Fixed", tip: "Slices in the order of the data: each slice stays in place" }];
sortItems.forEach(it => { it.w = ms.tw(it.t, 11, 600) + 18; });
const sortW = N > 1 ? d3.sum(sortItems, it => it.w) : 0;
// the buttons sit at the top right, or under the titles when they collide
const titleW = Math.max(o.title ? ms.tw(o.title, o.titleFontSize, 700) : 0,
  o.subtitle ? ms.tw(o.subtitle, o.subtitleFontSize) : 0);
const ctlRoom = sortW + 8 + ms.tw("Show all (99 hidden)", 11, 600) + 18;
let headerY = 12;
if (sortW && (o.title || o.subtitle) && padL + titleW + 16 + ctlRoom > W - padR) headerY = top + 2;
if (sortW) top = Math.max(top, headerY + ctlH + 6);
top += 4;

// ---- the player (bottom) ----------------------------------------------------------------------
const gMain = svg.append("g");
let player = null;
player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames: race.frames, frameNum: race.frameNum, timeType: race.timeType,
  o: Object.assign({}, o.player || {}, { stateKey: SK }),
  onRender(t) { draw(t); }
});
const ease = player.ease;

// ---- layout ---------------------------------------------------------------------------------------
const areaTop = top, areaBot = player.top - (player.height ? 8 : 12);
const areaW = Math.max(80, W - padL - padR), areaH = Math.max(80, areaBot - areaTop);
const POP = 8;
const maxVis = d3.max(d3.range(nF), f => model.count[f]) || 1;
let tableOn = !!o.table;
let wide = tableOn && areaW >= 500 && areaW >= areaH * 1.12;
let box, tbl = null;
if (tableOn && wide) {
  const D = Math.min(areaH, areaW * 0.5, 560);
  const gap = Math.max(24, Math.min(48, areaW * 0.05));
  const tw0 = Math.min(areaW - D - gap, 480);
  const comp = D + gap + tw0;
  const x0 = padL + Math.max(0, (areaW - comp) / 2);
  box = { x: x0, y: areaTop, w: D, h: areaH };
  tbl = { x: x0 + D + gap, y: areaTop, w: tw0, h: areaH };
} else if (tableOn && areaH >= 230) {
  const dh = Math.max(130, Math.min(areaH * 0.56, areaW));
  box = { x: padL, y: areaTop, w: areaW, h: dh };
  tbl = { x: padL + Math.max(0, (areaW - Math.min(areaW, 480)) / 2), y: areaTop + dh + 10, w: Math.min(areaW, 480), h: areaH - dh - 10 };
  if (tbl.h < 70) { tbl = null; box.h = areaH; }
} else {
  box = { x: padL, y: areaTop, w: areaW, h: areaH };
}
if (!tbl) tableOn = false;
const R = Math.max(16, Math.min(box.w, box.h) / 2 - POP - 2);
const ir = Math.max(0, Math.min(0.9, +o.innerRadius || 0));
const ri = ir * R;
const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
const arc = d3.arc().innerRadius(ri).outerRadius(R);

// ---- static chrome ---------------------------------------------------------------------------------
const centerOn = ri >= 28;
let wm = null;
if (!centerOn) {
  // a pie: the period as a big faded label
  const size = Math.max(22, Math.min(64, (tableOn && wide ? tbl.w : box.w) * 0.16));
  if (tableOn && wide) wm = ddWatermark(gMain, { x: tbl.x + tbl.w, y: areaBot - 4, size, font, color: axisCol, opacity: 0.1 });
  else wm = ddWatermark(gMain, { x: box.x + box.w, y: box.y + box.h - 2, size, font, color: axisCol, opacity: 0.1 });
}
const gPie = gMain.append("g").attr("class", "dd-donut").attr("transform", `translate(${cx},${cy})`);
// a faint track under the slices
gPie.append("path").attr("class", "dd-track-ring").attr("fill", axisCol).attr("fill-opacity", 0.05)
  .attr("d", d3.arc().innerRadius(ri).outerRadius(R)({ startAngle: 0, endAngle: TAU }));
const gSlices = gPie.append("g");
const gLabels = gPie.append("g").style("pointer-events", "none");
const gCenter = gPie.append("g").style("pointer-events", "none");

const nEnt = N + 1;
const strokeW = N > 60 ? 0.5 : 1;
const slicePaths = gSlices.selectAll("path").data(d3.range(nEnt)).enter().append("path")
  .attr("class", "dd-slice").attr("data-label", k => nameOf(k))
  .attr("fill", k => colorOf(k)).attr("stroke", bgcol).attr("stroke-width", strokeW)
  .attr("stroke-linejoin", "round").style("cursor", "pointer");
const sliceNodes = slicePaths.nodes();

// inside labels (share, and the name when there is no table)
const lfs = Math.max(9.5, Math.min(12, (R - ri) * 0.16 + 6));
const charW = ms.tw("00.0%", lfs, 700) / 5;
const nameW = d3.range(nEnt).map(k => ms.tw(nameOf(k), lfs, 700));
const labelSel = gLabels.selectAll("text").data(d3.range(nEnt)).enter().append("text")
  .attr("text-anchor", "middle").style("font-size", lfs + "px").style("font-weight", 700)
  .style("fill", k => ddTextOn(colorOf(k))).style("display", "none");
labelSel.append("tspan").attr("class", "nm").attr("x", 0);
labelSel.append("tspan").attr("class", "pc").attr("x", 0);
const labelNodes = labelSel.nodes();

// the centre: period, total, or the hovered item
let cTop = null, cBig = null, cMid = null, cCap = null, bigFs = 0;
if (centerOn) {
  bigFs = Math.max(13, Math.min(46, ri * 0.4));
  const lblW = d3.max(d3.range(nF), i => ms.tw(player.frameLabel(i), bigFs, 800)) || 1;
  const shW = ms.tw("100.0%", bigFs, 800);
  const lim = ri * 1.5;
  bigFs = Math.max(11, bigFs * Math.min(1, lim / Math.max(lblW, shW)));
  const midFs = Math.max(10.5, Math.min(17, ri * 0.15));
  const capFs = Math.max(9.5, Math.min(12, ri * 0.11));
  cBig = gCenter.append("text").attr("class", "dd-center-big dd-watermark").attr("text-anchor", "middle")
    .attr("y", bigFs * 0.2).style("font-size", bigFs + "px").style("font-weight", 800)
    .style("font-variant-numeric", "tabular-nums").style("fill", axisCol);
  cTop = gCenter.append("text").attr("text-anchor", "middle").attr("y", -bigFs * 0.75 - 4)
    .style("font-size", capFs + 1 + "px").style("font-weight", 700);
  cMid = gCenter.append("text").attr("class", "dd-center-total").attr("text-anchor", "middle")
    .attr("y", bigFs * 0.2 + midFs + 6).style("font-size", midFs + "px").style("font-weight", 700)
    .style("font-variant-numeric", "tabular-nums").style("fill", axisCol).style("fill-opacity", 0.85);
  cCap = gCenter.append("text").attr("text-anchor", "middle")
    .attr("y", bigFs * 0.2 + midFs + 8 + capFs + 2).style("font-size", capFs + "px")
    .style("fill", axisCol).style("fill-opacity", 0.55);
}

// ---- the table ---------------------------------------------------------------------------------------
const rowsG = gMain.append("g").attr("class", "dd-table");
let T = null;
if (tableOn) {
  const fs = 11.5;
  const headH = 22;
  const maxRowsFit = Math.max(1, Math.floor((tbl.h - headH) / 22));
  let wantRows = Math.min(maxVis, o.tableRows ? +o.tableRows : Infinity);
  const more = wantRows > maxRowsFit || (o.tableRows && maxVis > o.tableRows);
  let nRows = Math.min(wantRows, maxRowsFit);
  if (more && nRows > 1 && nRows >= maxRowsFit) nRows -= 1;
  const rowH = Math.max(20, Math.min(30, (tbl.h - headH - (more ? 18 : 0)) / Math.max(1, nRows)));
  const contentH = headH + nRows * rowH + (more ? 18 : 0);
  // centre the table vertically next to the donut, or at the top when stacked
  const ty = wide ? tbl.y + Math.max(0, (tbl.h - contentH) / 2) : tbl.y;
  const maxV = d3.max(ser, s => d3.max(s, v => v === null ? 0 : v)) || 1;
  const valW = Math.max(ms.tw(fmt.short(maxV), fs, 400), ms.tw(fmt.short(maxV * 0.77), fs, 400), ms.tw(valueName, 10, 600)) + 4;
  const shareW = ms.tw("100.0%", fs, 700) + 4;
  const rankW = Math.max(18, ms.tw(String(maxVis), 10.5, 600) + 6);
  const deltaW = nF > 1 ? 34 : 0, closeW = 16;
  const nameX = rankW + 8 + 16;
  const longest = (d3.max(items, d => ms.tw(d, fs, 700)) || 40) + 2;
  const rest = tbl.w - nameX - 10 - shareW - 10 - valW - 8 - deltaW - closeW;
  // the names first, then a share bar of 40 to 150 pixels
  let nmW = Math.min(longest, Math.max(56, rest - 50));
  let barW = Math.min(150, rest - nmW - 10);
  if (barW < 36) { nmW = Math.max(40, rest); barW = 0; }
  const xBar = nameX + nmW + 10;
  const xShare = xBar + (barW > 0 ? barW + 10 : 0) + shareW;
  const xVal = xShare + 10 + valW;
  const xDelta = xVal + 8;
  const xClose = tbl.w - closeW / 2;
  T = { fs, headH, nRows, rowH, ty, nmW, barW, xBar, xShare, xVal, xDelta, xClose, nameX, rankW, more };
  rowsG.attr("transform", `translate(${tbl.x},${ty})`);
  // header
  const hd = rowsG.append("g").style("font-size", "10px").style("fill", axisCol).style("fill-opacity", 0.55)
    .style("font-weight", 600);
  hd.append("text").attr("x", rankW).attr("y", 13).attr("text-anchor", "end").text("#");
  hd.append("text").attr("x", nameX).attr("y", 13).text("");
  hd.append("text").attr("x", xShare).attr("y", 13).attr("text-anchor", "end").text("Share");
  hd.append("text").attr("x", xVal).attr("y", 13).attr("text-anchor", "end").text(ms.truncate(valueName, valW + 20, 10, 600));
  if (deltaW) hd.append("text").attr("x", xDelta + deltaW / 2).attr("y", 13).attr("text-anchor", "middle").text("±")
    .append("title").text("Places gained or lost since the previous period");
  rowsG.append("line").attr("x1", 0).attr("x2", tbl.w).attr("y1", headH - 3).attr("y2", headH - 3)
    .attr("stroke", axisCol).attr("stroke-opacity", 0.12);
  // clip the rows to the visible ranks
  const clipId = "ddrc" + Math.random().toString(36).slice(2, 8);
  rowsG.append("clipPath").attr("id", clipId).append("rect").attr("x", -4).attr("y", headH - 2)
    .attr("width", tbl.w + 8).attr("height", nRows * rowH + 3);
  const body = rowsG.append("g").attr("clip-path", `url(#${clipId})`);
  T.footer = rowsG.append("text").attr("x", nameX).attr("y", headH + nRows * rowH + 13)
    .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.5);
  const rows = body.selectAll("g.dd-row").data(d3.range(N)).enter().append("g").attr("class", "dd-row")
    .attr("data-label", i => items[i]).style("cursor", "pointer").style("display", "none");
  rows.append("rect").attr("class", "bg").attr("x", -4).attr("y", 1).attr("width", tbl.w + 6).attr("height", rowH - 2)
    .attr("rx", 5).attr("fill", axisCol).attr("fill-opacity", 0);
  rows.append("text").attr("class", "rk").attr("x", rankW).attr("y", rowH / 2).attr("dy", "0.35em")
    .attr("text-anchor", "end").style("font-size", "10.5px").style("font-weight", 600)
    .style("fill", axisCol).style("fill-opacity", 0.55).style("font-variant-numeric", "tabular-nums");
  rows.append("rect").attr("class", "sw").attr("x", rankW + 8).attr("y", rowH / 2 - 5.5).attr("width", 11)
    .attr("height", 11).attr("rx", 3).attr("fill", i => cols[i]);
  rows.append("text").attr("class", "nm").attr("x", nameX).attr("y", rowH / 2).attr("dy", "0.35em")
    .style("font-size", fs + "px").style("fill", axisCol).text(i => ms.truncate(items[i], nmW, fs, 700))
    .append("title").text(i => items[i]);
  if (barW > 0) {
    rows.append("rect").attr("class", "trk").attr("x", xBar).attr("y", rowH / 2 - 3).attr("width", barW)
      .attr("height", 6).attr("rx", 3).attr("fill", axisCol).attr("fill-opacity", 0.06);
    rows.append("rect").attr("class", "bar").attr("x", xBar).attr("y", rowH / 2 - 3).attr("height", 6)
      .attr("rx", 3).attr("fill", i => cols[i]);
  }
  rows.append("text").attr("class", "sh").attr("x", xShare).attr("y", rowH / 2).attr("dy", "0.35em")
    .attr("text-anchor", "end").style("font-size", fs + "px").style("font-weight", 700)
    .style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
  rows.append("text").attr("class", "vl").attr("x", xVal).attr("y", rowH / 2).attr("dy", "0.35em")
    .attr("text-anchor", "end").style("font-size", fs + "px").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("font-variant-numeric", "tabular-nums");
  const dl = rows.append("g").attr("class", "dl").attr("transform", `translate(${xDelta},${rowH / 2})`);
  dl.append("path").attr("class", "ar");
  dl.append("text").attr("class", "dn").attr("x", 10).attr("dy", "0.35em").style("font-size", "10px")
    .style("font-weight", 700).style("font-variant-numeric", "tabular-nums");
  const cl = rows.append("g").attr("class", "dd-hide").attr("transform", `translate(${xClose},${rowH / 2})`)
    .style("opacity", 0);
  cl.append("title").text("Hide (or alt-click the row)");
  cl.append("circle").attr("r", 7).attr("fill", axisCol).attr("fill-opacity", 0.08);
  cl.append("path").attr("d", "M-2.6,-2.6L2.6,2.6M2.6,-2.6L-2.6,2.6").attr("stroke", axisCol)
    .attr("stroke-width", 1.4).attr("stroke-linecap", "round").attr("stroke-opacity", 0.7);
  // the "Other" row at the bottom of the table (when maxSlices groups items)
  T.rows = rows;
  T.rowNodes = rows.nodes().map(node => {
    const s = d3.select(node);
    return {
      node, s, bg: s.select("rect.bg"), rk: s.select("text.rk").node(), sw: s.select("rect.sw"),
      nm: s.select("text.nm"), bar: s.select("rect.bar"), sh: s.select("text.sh").node(),
      vl: s.select("text.vl").node(), ar: s.select("path.ar"), dn: s.select("text.dn"),
      close: s.select("g.dd-hide"), shown: false, lastRk: null, lastDl: null
    };
  });
}

// ---- tooltip ----------------------------------------------------------------------------------------
const tip = ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms });

// ---- interaction state ----------------------------------------------------------------------------
let hover = null;          // hovered entity (item index, or OTHER)
let hoverFrom = null;      // "slice" or "row"
let tipPos = null;         // last pointer position for the live tooltip
const popCur = new Float64Array(nEnt), dimCur = new Float64Array(nEnt).fill(1);
const rowEmph = new Float64Array(N);
let lastNow = null, unsettled = false;
let fxTimer = null;
function kick() {
  if (fxTimer) return;
  fxTimer = ddplotTrack(d3.timer(function () {
    if (!player.playing()) draw(player.t());
    if (!unsettled && !prevModel && fxTimer) { fxTimer.stop(); fxTimer = null; }
  }));
}
const fmtShare = p => {
  if (!(p > 0)) return "0%";
  if (p < 0.001) return "<0.1%";
  return d3.format(p >= 0.995 ? ".0%" : ".1%")(p);
};
const pcLabel = p => (p < 0.001 ? "<0.1%" : d3.format(p >= 0.1 ? ".0%" : ".1%")(p));

// ---- per-frame state ----------------------------------------------------------------------------------
const cur = d3.range(nEnt).map(k => ({ k, v: 0, base: 0, w: 0, r: 0, tr: 0, own: 1, vis: 1, z: 0, pieces: [], mid: 0, main: 0 }));
let curTotal = 0, curT = 0, curM = null;
const S = x => { if (x <= -0.5) return 0; if (x >= 0.5) return 1; const u = x + 0.5; return u * u * (3 - 2 * u); };
const lerpM = (a, b, k) => a + (b - a) * k;

function cut(free, a, b, eps) {
  const pieces = [], rest = [];
  let acc = 0;
  for (let q = 0; q < free.length; q++) {
    const s = free[q][0], e = free[q][1], c0 = acc, c1 = acc + (e - s);
    acc = c1;
    const lo = Math.max(c0, a), hi = Math.min(c1, b);
    if (hi - lo > eps) {
      const ps = s + (lo - c0), pe = s + (hi - c0);
      pieces.push([ps, pe]);
      if (ps - s > eps) rest.push([s, ps]);
      if (e - pe > eps) rest.push([pe, e]);
    } else rest.push([s, e]);
  }
  return { pieces, rest };
}
// place the slices: the largest first at its soft position along the free
// part of the circle, then the others (see the top of the file)
function layout(ents, total) {
  ents.sort((a, b) => (b.z - a.z) || (a.k - b.k));
  let free = [[0, total]];
  const eps = total * 1e-9;
  for (let a = 0; a < ents.length; a++) {
    const e = ents[a];
    if (a === ents.length - 1) { e.pieces = free; break; }
    let u = 0;
    for (let b = a + 1; b < ents.length; b++) { const q = ents[b]; u += q.w * S(e.r - q.r); }
    const res = cut(free, u, u + e.w, eps);
    e.pieces = res.pieces;
    free = res.rest;
  }
}

function compute(t) {
  const kB = blendK();
  const M = model, P = prevModel;
  const fi = Math.max(0, Math.min(nF - 1, Math.floor(t)));
  let total = 0, otherW = 0, otherZ = 0;
  for (let i = 0; i < N; i++) {
    const c = cur[i], s = ser[i];
    const v = ddRaceAt(s, t, ease);
    const p = v === null ? 0 : ddRacePresence(s, t, ease);
    let own = ddLerpFrames(M.own[i], t, ease), r = ddLerpFrames(M.lRank[i], t, ease);
    let tr = ddLerpFrames(M.tRank[i], t, ease), vis = M.vis[i];
    if (P) {
      own = lerpM(ddLerpFrames(P.own[i], t, ease), own, kB);
      r = lerpM(ddLerpFrames(P.lRank[i], t, ease), r, kB);
      tr = lerpM(ddLerpFrames(P.tRank[i], t, ease), tr, kB);
      vis = lerpM(P.vis[i], vis, kB);
    }
    c.v = v === null ? 0 : v;
    c.base = c.v * p * vis;
    c.w = c.base * own;
    c.own = own; c.vis = vis; c.r = r; c.tr = tr; c.p = p;
    // the order of the layers is fixed within a period (the frame values)
    const v0 = s[fi] === null ? 0 : s[fi];
    c.z = v0 * M.vis[i] * M.own[i][fi];
    otherZ += v0 * M.vis[i] * (1 - M.own[i][fi]);
    otherW += c.base - c.w;
    total += c.base;
  }
  const co = cur[OTHER];
  co.w = otherW; co.base = otherW; co.v = otherW; co.z = otherZ; co.vis = 1; co.own = 1; co.p = 1;
  co.r = P ? lerpM(ddLerpFrames(P.otherRank, t, ease), ddLerpFrames(M.otherRank, t, ease), kB) : ddLerpFrames(M.otherRank, t, ease);
  curTotal = total;
  curT = t;
  curM = { maxShare: P ? lerpM(P.maxShare, M.maxShare, kB) : M.maxShare };
  const ents = [];
  for (let k = 0; k < nEnt; k++) {
    cur[k].pieces = [];
    if (cur[k].w > total * 1e-7) ents.push(cur[k]);
  }
  if (total > 0) layout(ents, total);
  const sc = total > 0 ? TAU / total : 0;
  for (let k = 0; k < nEnt; k++) {
    const c = cur[k];
    let best = -1, bl = 0;
    for (let q = 0; q < c.pieces.length; q++) {
      const pc = c.pieces[q];
      pc[0] *= sc; pc[1] *= sc;
      if (pc[1] - pc[0] > bl) { bl = pc[1] - pc[0]; best = q; }
    }
    c.main = bl;
    c.mid = best >= 0 ? (c.pieces[best][0] + c.pieces[best][1]) / 2 : 0;
  }
}

// which slice shows an item (its own, or "Other" while it is grouped)
const sliceOf = k => (k === null ? null : (k === OTHER || cur[k].own > 0.5 ? k : OTHER));

function draw(t) {
  compute(t);
  const now = performance.now();
  const dt = lastNow === null ? 16 : Math.min(100, now - lastNow);
  lastNow = now;
  const a = 1 - Math.exp(-dt / 70);
  unsettled = false;
  const hs = sliceOf(hover);
  const anyPin = pinned.size > 0;

  // ---- slices ----
  for (let k = 0; k < nEnt; k++) {
    const c = cur[k], node = sliceNodes[k];
    const nm = nameOf(k);
    const isPin = pinned.has(nm);
    const tp = (hs === k ? 1 : 0) + (isPin ? 1 : 0) > 0 ? 1 : 0;
    const td = hs !== null ? (hs === k ? 1 : 0.32) : (anyPin ? (isPin ? 1 : 0.62) : 1);
    popCur[k] += (tp - popCur[k]) * a;
    dimCur[k] += (td - dimCur[k]) * a;
    if (Math.abs(tp - popCur[k]) > 0.004 || Math.abs(td - dimCur[k]) > 0.004) unsettled = true;
    else { popCur[k] = tp; dimCur[k] = td; }
    if (!c.pieces.length) { node.setAttribute("d", ""); continue; }
    let d = "";
    for (let q = 0; q < c.pieces.length; q++) {
      const pc = c.pieces[q];
      if (pc[1] - pc[0] < 1e-5) continue;
      d += arc({ startAngle: pc[0], endAngle: pc[1] });
    }
    node.setAttribute("d", d);
    const off = popCur[k] * POP * (c.main >= TAU - 1e-6 ? 0 : 1);
    node.setAttribute("transform", off > 0.01 ? `translate(${Math.sin(c.mid) * off},${-Math.cos(c.mid) * off})` : "");
    node.setAttribute("fill-opacity", dimCur[k]);
    node.setAttribute("class", "dd-slice" + (hs === k ? " dd-hover" : "") + (isPin ? " dd-pinned" : ""));
  }
  // the hovered slice on top
  if (hs !== null && sliceNodes[hs].nextSibling) sliceNodes[hs].parentNode.appendChild(sliceNodes[hs]);

  // ---- slice labels ----
  if (o.labels !== false) {
    const rl = ri > 0 ? (ri + R) / 2 : R * 0.64;
    const thick = ri > 0 ? R - ri : R;
    for (let k = 0; k < nEnt; k++) {
      const c = cur[k], node = labelNodes[k];
      const share = curTotal > 0 ? c.w / curTotal : 0;
      if (!c.pieces.length || c.main < 0.12 || thick < lfs + 6) { node.style.display = "none"; continue; }
      const txt = pcLabel(share);
      const need = txt.length * charW + 8;
      const single = c.main >= TAU - 1e-6;
      const chord = single ? Infinity : 2 * rl * Math.sin(Math.min(Math.PI / 2, c.main / 2));
      const alpha = Math.max(0, Math.min(1, (chord - need) / 14)) * Math.max(0, Math.min(1, (c.main * rl - lfs - 4) / 8));
      if (alpha <= 0.01) { node.style.display = "none"; continue; }
      const showName = !tableOn && (thick >= 2 * lfs + 8) && (single || chord >= nameW[k] + 10) && c.main * rl >= 2 * lfs + 8;
      const off = popCur[k] * POP * (single ? 0 : 1);
      const rr = single && ri === 0 ? 0 : rl;
      const x = Math.sin(c.mid) * (rr + off), y = -Math.cos(c.mid) * (rr + off);
      node.style.display = null;
      node.setAttribute("transform", `translate(${x},${y})`);
      node.style.opacity = alpha * (dimCur[k] < 0.9 ? Math.max(0.45, dimCur[k]) : 1);
      // keep the text readable on a dimmed slice
      const dk = Math.round(dimCur[k] * 20) / 20;
      if (node.__dk !== dk) {
        node.__dk = dk;
        node.style.fill = ddTextOn(dk >= 1 ? colorOf(k) : d3.interpolateRgb(bgcol, colorOf(k))(dk));
      }
      const nmS = node.firstChild, pcS = node.lastChild;
      if (showName) {
        nmS.textContent = nameOf(k); nmS.setAttribute("y", -lfs * 0.55); nmS.setAttribute("dy", "0.35em");
        pcS.setAttribute("y", lfs * 0.6); pcS.style.fontWeight = 400;
      } else {
        nmS.textContent = ""; pcS.setAttribute("y", 0); pcS.style.fontWeight = 700;
      }
      pcS.setAttribute("dy", "0.35em");
      pcS.textContent = txt;
    }
  }

  // ---- centre ----
  const lbl = player.label(t);
  if (wm) wm.text(lbl);
  if (centerOn) {
    if (hover !== null) {
      const c = cur[hover];
      const share = curTotal > 0 ? c.base / curTotal : 0;
      cTop.text(ms.truncate(nameOf(hover), ri * 1.6, 12, 700)).style("fill", d3.color(colorOf(hover)).darker(hover === OTHER ? 1.2 : 0.5));
      cBig.text(fmtShare(share));
      cMid.text(fmt.short(c.base));
      cCap.text(lbl);
    } else {
      cTop.text("");
      cBig.text(lbl);
      if (o.centerLabel !== "") { cMid.text(fmt.short(curTotal)); cCap.text(o.centerLabel || "Total"); }
      else { cMid.text(""); cCap.text(""); }
    }
  }

  // ---- table ----
  if (tableOn) drawTable(t, a);

  // ---- live tooltip ----
  if (hover !== null && tipPos && o.tooltip !== false) showTip(hover, tipPos[0], tipPos[1]);
}

function drawTable(t, a) {
  const fi = Math.max(0, Math.min(nF - 1, Math.round(t)));
  const M = model;
  const nRows = T.nRows, rowH = T.rowH, headH = T.headH;
  const maxShare = curM.maxShare;
  let beyond = 0;
  for (let i = 0; i < N; i++) {
    const R0 = T.rowNodes[i], c = cur[i];
    const y = headH + (c.tr - 1) * rowH;
    const fade = Math.max(0, Math.min(1, nRows + 1 - c.tr)) * Math.max(0, Math.min(1, c.p)) * c.vis;
    const nm = items[i];
    const isPin = pinned.has(nm);
    const emT = hover === i ? 1 : (isPin ? 0.6 : 0);
    rowEmph[i] += (emT - rowEmph[i]) * a;
    if (Math.abs(emT - rowEmph[i]) > 0.004) unsettled = true; else rowEmph[i] = emT;
    if (ser[i][fi] !== null && M.vis[i] && M.tRank[i][fi] > nRows) beyond++;
    if (fade <= 0.003) {
      if (R0.shown) { R0.node.style.display = "none"; R0.shown = false; }
      continue;
    }
    if (!R0.shown) { R0.node.style.display = null; R0.shown = true; }
    const dimR = hover !== null ? (hover === i ? 1 : 0.5) : 1;
    R0.node.setAttribute("transform", `translate(0,${y})`);
    R0.node.style.opacity = fade * dimR;
    R0.node.setAttribute("class", "dd-row" + (hover === i ? " dd-hover" : "") + (isPin ? " dd-pinned" : ""));
    R0.bg.attr("fill", isPin ? DD_ACCENT : axisCol).attr("fill-opacity", rowEmph[i] * (isPin && hover !== i ? 0.12 : 0.07));
    // rank, in the nearest frame
    const present = ser[i][fi] !== null && M.vis[i];
    const rk = present ? String(Math.round(M.tRank[i][fi])) : "–";
    if (R0.lastRk !== rk) { R0.rk.textContent = rk; R0.lastRk = rk; }
    // grouped in "Other": the swatch turns grey
    const g = 1 - Math.max(0, Math.min(1, c.own));
    const col = g > 0.001 ? d3.interpolateRgb(cols[i], OTHER_COL)(g) : cols[i];
    R0.sw.attr("fill", col);
    R0.nm.style("font-weight", rowEmph[i] > 0.5 ? 700 : 400).style("fill-opacity", 1 - 0.35 * g);
    const share = curTotal > 0 ? c.base / curTotal : 0;
    if (T.barW > 0) R0.bar.attr("width", Math.max(0, Math.min(1, share / maxShare)) * T.barW).attr("fill", col);
    R0.sh.textContent = fmtShare(share);
    R0.vl.textContent = fmt.short(c.v);
    // places gained or lost since the previous period
    let dl = "";
    if (fi > 0 && present) {
      const prevPresent = ser[i][fi - 1] !== null;
      if (!prevPresent) dl = "new";
      else {
        const dr = Math.round(M.tRank[i][fi - 1]) - Math.round(M.tRank[i][fi]);
        dl = dr > 0 ? "+" + dr : (dr < 0 ? String(dr) : "");
      }
    }
    if (R0.lastDl !== dl) {
      R0.lastDl = dl;
      if (dl === "new") {
        R0.ar.attr("d", "");
        R0.dn.attr("x", 0).text("NEW").style("fill", DD_ACCENT).style("font-size", "9px");
      } else if (dl) {
        const up = dl[0] === "+";
        R0.ar.attr("d", up ? "M0,2.5L3.5,-3L7,2.5Z" : "M0,-2.5L3.5,3L7,-2.5Z").attr("fill", up ? UP_COL : DOWN_COL);
        R0.dn.attr("x", 10).text(dl.replace(/^[+-]/, "")).style("fill", up ? UP_COL : DOWN_COL).style("font-size", "10px");
      } else {
        R0.ar.attr("d", "M1,0h5").attr("stroke", axisCol).attr("stroke-opacity", 0.3).attr("fill", "none");
        R0.dn.text("");
      }
    }
    R0.close.style("opacity", hover === i && hoverFrom === "row" ? 1 : 0);
  }
  if (T.more) T.footer.text(beyond > 0 ? "+ " + beyond + " more" : "");
}

// ---- tooltip -------------------------------------------------------------------------------------------
function showTip(k, mx, my) {
  const t = curT;
  const fi = Math.max(0, Math.min(nF - 1, Math.round(t)));
  const M = model;
  const c = cur[k];
  const rows = [];
  const share = curTotal > 0 ? c.base / curTotal : 0;
  if (k === OTHER) {
    const members = d3.range(N).filter(i => cur[i].base - cur[i].w > curTotal * 1e-6)
      .sort((x, y) => (cur[y].base - cur[y].w) - (cur[x].base - cur[x].w));
    rows.push({ name: valueName, value: fmt.value(c.base), bold: true });
    rows.push({ name: "Share", value: fmtShare(share) });
    rows.push({ name: members.length + " items", value: "", sep: true, dim: true });
    members.slice(0, 8).forEach(i => rows.push({ name: items[i], value: fmt.short(cur[i].v), color: cols[i],
      extra: fmtShare(curTotal > 0 ? cur[i].base / curTotal : 0) }));
    if (members.length > 8) rows.push({ name: "and " + (members.length - 8) + " more", value: "", dim: true });
  } else {
    const present = ser[k][fi] !== null && M.vis[k];
    rows.push({ name: valueName, value: fmt.value(c.v), bold: true });
    let shExtra = "", shCol = null;
    if (fi > 0 && present && ser[k][fi - 1] !== null && M.frameTotal[fi - 1] > 0 && M.frameTotal[fi] > 0) {
      const d = (ser[k][fi] / M.frameTotal[fi] - ser[k][fi - 1] / M.frameTotal[fi - 1]) * 100;
      if (Math.abs(d) >= 0.05) { shExtra = (d > 0 ? "+" : "−") + d3.format(".1f")(Math.abs(d)) + " pts"; shCol = d > 0 ? UP_COL : DOWN_COL; }
    }
    rows.push({ name: "Share", value: fmtShare(share), extra: shExtra, extraColor: shCol });
    if (present) {
      const rk = Math.round(M.tRank[k][fi]);
      let ex = "", exCol = null;
      if (fi > 0 && ser[k][fi - 1] !== null) {
        const dr = Math.round(M.tRank[k][fi - 1]) - rk;
        if (dr) { ex = (dr > 0 ? "▲ " : "▼ ") + Math.abs(dr); exCol = dr > 0 ? UP_COL : DOWN_COL; }
      } else if (fi > 0) { ex = "new"; exCol = DD_ACCENT; }
      rows.push({ name: "Rank", value: rk + " of " + M.count[fi], extra: ex, extraColor: exCol });
    }
    if (fi > 0 && present && ser[k][fi - 1] !== null) {
      const ch = ser[k][fi] / ser[k][fi - 1] - 1;
      rows.push({ name: "Since " + player.frameLabel(fi - 1), value: (ch >= 0 ? "+" : "−") + d3.format(Math.abs(ch) >= 10 ? ",.0%" : ".1%")(Math.abs(ch)),
        valueColor: ch > 0.0005 ? UP_COL : (ch < -0.0005 ? DOWN_COL : null), sep: true });
    }
    if (K && c.own < 0.5 && c.base > 0) rows.push({ name: "Grouped in " + otherLabel, value: "", dim: true });
    if (!present && c.p < 0.5) rows.push({ name: "No value for this period", value: "", dim: true });
  }
  const head = nameOf(k) + "  ·  " + player.label(t);
  tip.show(head, rows, mx, my, colorOf(k));
}

// ---- hover, pin, hide ---------------------------------------------------------------------------------
function setHover(k, from) {
  if (hover === k && hoverFrom === from) return;
  hover = k; hoverFrom = from;
  if (k === null) { tip.hide(); tipPos = null; }
  kick();
  if (!player.playing()) draw(player.t());
}
function togglePin(k) {
  const nm = nameOf(k);
  const on = !pinned.has(nm);
  if (on) pinned.add(nm); else pinned.delete(nm);
  st.pinned = Array.from(pinned);
  const fi = Math.max(0, Math.min(nF - 1, Math.round(player.t())));
  const c = cur[k];
  send("clicked", {
    label: nm, value: k === OTHER ? c.base : c.v,
    share: curTotal > 0 ? c.base / curTotal : 0,
    rank: k === OTHER ? null : (ser[k][fi] !== null && model.vis[k] ? Math.round(model.tRank[k][fi]) : null),
    period: frames[fi], pinned: on
  });
  kick();
  if (!player.playing()) draw(player.t());
}
function setHidden(k, on) {
  if (k === null || k === OTHER) return;
  const nm = items[k];
  if (on) {
    if (hidden.has(nm) || N - hidden.size <= 1) return;
    hidden.add(nm);
  } else if (!hidden.delete(nm)) return;
  st.hidden = Array.from(hidden);
  send("hidden", st.hidden);
  setHover(null, null);
  remodel();
  drawCtl();
}
const isHideClick = ev => ev && (ev.altKey || ev.shiftKey);

slicePaths
  .on("mousemove", function (a) {
    const k = d3.select(this).datum();
    const [mx, my] = ddPtr(a, svg.node());
    tipPos = [mx, my];
    setHover(k, "slice");
    if (o.tooltip !== false) showTip(k, mx, my);
  })
  .on("mouseleave", function () { setHover(null, null); })
  .on("click", function (a) {
    const k = d3.select(this).datum();
    if (isHideClick(ddEvOf(a)) && k !== OTHER) { setHidden(k, true); return; }
    togglePin(k);
  });

if (tableOn) {
  T.rows
    .on("mousemove", function (a) {
      const i = d3.select(this).datum();
      const [mx, my] = ddPtr(a, svg.node());
      tipPos = [mx, my];
      setHover(i, "row");
      if (o.tooltip !== false) showTip(i, mx, my);
    })
    .on("mouseleave", function () { setHover(null, null); })
    .on("click", function (a) {
      const i = d3.select(this).datum();
      const ev = ddEvOf(a);
      const onClose = ev && ev.target && ev.target.closest && ev.target.closest("g.dd-hide");
      if (onClose || isHideClick(ev)) { setHidden(i, true); return; }
      togglePin(i);
    });
}
// a click on the background clears the pins
svg.on("click.ddpin", function (a) {
  const ev = ddEvOf(a);
  const tg = ev && ev.target;
  // only the empty background (not a slice, a row, a button or the player)
  if (!tg || (tg !== svg.node() && !(tg.classList && tg.classList.contains("dd-track-ring")))) return;
  if (pinned.size) { pinned.clear(); st.pinned = []; kick(); if (!player.playing()) draw(player.t()); }
});

// ---- header controls ------------------------------------------------------------------------------------
function drawCtl() {
  gCtl.selectAll("*").remove();
  let x = W - padR;
  if (sortW) {
    x -= sortW;
    const g = gCtl.append("g").attr("class", "dd-sort").attr("transform", `translate(${x},${headerY})`);
    g.append("rect").attr("width", sortW).attr("height", ctlH).attr("rx", 5)
      .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
    let ix = 0;
    sortItems.forEach((it, k) => {
      const on = sortMode === it.k;
      const b = g.append("g").attr("class", "dd-btn" + (on ? " dd-on" : "")).attr("data-k", it.k)
        .attr("transform", `translate(${ix},0)`).style("cursor", "pointer");
      b.append("title").text(it.tip);
      const bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
        .attr("rx", 4).attr("fill", DD_ACCENT).attr("fill-opacity", on ? 0.14 : 0);
      if (k > 0) g.append("line").attr("x1", ix).attr("x2", ix).attr("y1", 4).attr("y2", ctlH - 4)
        .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
      b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
        .style("font-size", "11px").style("font-weight", 600).style("fill", on ? DD_ACCENT : axisCol).text(it.t);
      b.on("mouseenter", function () { if (sortMode !== it.k) bg.attr("fill-opacity", 0.06); })
        .on("mouseleave", function () { bg.attr("fill-opacity", sortMode === it.k ? 0.14 : 0); })
        .on("click", function () {
          if (sortMode === it.k) return;
          sortMode = it.k; st.sort = sortMode;
          remodel();
          drawCtl();
        });
      ix += it.w;
    });
    x -= 8;
  }
  if (hidden.size) {
    const txt = "Show all (" + hidden.size + " hidden)";
    const w = ms.tw(txt, 11, 600) + 18;
    x -= w;
    const b = gCtl.append("g").attr("class", "dd-showall").attr("transform", `translate(${x},${headerY})`)
      .style("cursor", "pointer");
    b.append("title").text("Hidden: " + Array.from(hidden).join(", "));
    b.append("rect").attr("width", w).attr("height", ctlH).attr("rx", 11).attr("fill", DD_ACCENT)
      .attr("fill-opacity", 0.1).attr("stroke", DD_ACCENT).attr("stroke-opacity", 0.35);
    b.append("text").attr("x", w / 2).attr("y", ctlH / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
      .style("font-size", "11px").style("font-weight", 600).style("fill", DD_ACCENT).text(txt);
    b.on("click", function () {
      hidden.clear(); st.hidden = []; send("hidden", []);
      remodel(); drawCtl();
    });
  }
}
drawCtl();

tip.raise();
player.start();
