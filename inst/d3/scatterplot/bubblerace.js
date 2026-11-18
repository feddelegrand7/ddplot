// bubblerace.js -- bubble_race(): the Gapminder animated bubble chart.
//
// Prepended with ddplotreset.js and racekit.js (ddplot_script()). The player
// (racekit) is the clock: it calls onRender(t) with a continuous time t in
// [0, nFrames - 1] and everything below is redrawn from t. Hover, follow,
// legend and scale changes are eased by a small tween engine (fxStep) that
// runs inside the same draw, kicked by a tracked d3.timer while paused.
//
// Bubble positions are precomputed in pixels for every frame (so a log axis
// interpolates in log space), sizes are interpolated in data space.

const o = options;
const W = width, H = height;
const font = o.font, axisCol = o.axisCol || "#333333", bgcol = o.bgcol || "white";
const gridCol = o.gridCol || null;
svg.style("background-color", bgcol).style("font-family", font);
const ms = ddMeasure(svg, font), tw = ms.tw;
const send = ddShiny(svg);

// ---- data -------------------------------------------------------------------------------------
const RC = o.race;
const frames = ddArr(RC.frames).map(String);
const nF = frames.length;
const ids = ddArr(RC.items).map(String);
const nI = ids.length;
const serOf = name => {
  const s = name ? RC.series[name] : null;
  if (!s) return null;
  const arr = Array.isArray(s) ? s : [s];
  return arr.map(v => ddArr(v).map(ddNum));
};
const SX = serOf(o.xName), SY = serOf(o.yName), SS = o.sizeName ? serOf(o.sizeName) : null;
const hasSize = !!SS;
const itemGroup = RC.groups ? ddArr(RC.groups).map(String) : null;
const hasGroup = !!itemGroup;
const groupLevels = hasGroup ? (o.groupLevels ? ddArr(o.groupLevels).map(String) : Array.from(new Set(itemGroup))) : [];
const gIndex = new Map(groupLevels.map((g, k) => [g, k]));
const colorKeys = hasGroup ? groupLevels : ids;
const keyColors = ddColors(colorKeys.length, o.colors, o.colorCategory);
const colorOf = i => hasGroup ? keyColors[gIndex.get(itemGroup[i]) || 0] : keyColors[i];
const COL = d3.range(nI).map(colorOf);
const COLD = COL.map(c => { const k = d3.hsl(c); k.l = Math.min(k.l, 0.36); return k + ""; }); // darker, for text
// an item is present at a frame when x, y (and size) are all known
const PRES = d3.range(nI).map(i => d3.range(nF).map(f =>
  (SX[i][f] !== null && SY[i][f] !== null && (!hasSize || SS[i][f] !== null)) ? 1 : null));
const MX = d3.range(nI).map(i => SX[i].map((v, f) => PRES[i][f] ? v : null));
const MY = d3.range(nI).map(i => SY[i].map((v, f) => PRES[i][f] ? v : null));
const MS = hasSize ? d3.range(nI).map(i => SS[i].map((v, f) => PRES[i][f] ? v : null)) : null;
const firstPres = PRES.map(p => p.findIndex(v => v));

// ---- formats ----------------------------------------------------------------------------------
const strOr = (v, d) => (typeof v === "string") ? v : d;
const fmtOf = k => ddFormatter({
  valueFormat: strOr(o.formats && o.formats[k], null),
  valuePrefix: strOr(o.prefixes && o.prefixes[k], ""),
  valueSuffix: strOr(o.suffixes && o.suffixes[k], "")
});
const FX = fmtOf("x"), FY = fmtOf("y"), FS = fmtOf("size");
// axis ticks: compact ("2k", "50k", "0.5"), or the user format
function tickFmt(k) {
  const userF = strOr(o.formats && o.formats[k], null);
  const pre = strOr(o.prefixes && o.prefixes[k], ""), suf = strOr(o.suffixes && o.suffixes[k], "");
  // ticks drop the trailing zeros of the user format (".1f" gives 90, not 90.0)
  let core = null;
  if (userF) {
    try { const sp = d3.formatSpecifier(userF); sp.trim = true; core = d3.format(sp.toString()); }
    catch (e) { core = d3.format(userF); }
  }
  const s = d3.format("~s"), g = d3.format(",~g");
  return v => {
    const a = Math.abs(v);
    let txt = core ? core(a) : (a >= 1000 ? s(a).replace("G", "B") : g(+a.toPrecision(6)));
    return (v < 0 ? "−" : "") + pre + txt + suf;
  };
}
const TX = tickFmt("x"), TY = tickFmt("y");
const pct = d3.format("+.1%");

// ---- persistent state ---------------------------------------------------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!state.bubble || state.bubble.key !== o.stateKey) state.bubble = { key: o.stateKey };
const st = state.bubble;
const idIndex = new Map(ids.map((d, i) => [d, i]));
const followed = new Set((st.followed || ddArr(o.highlight)).map(String).filter(d => idIndex.has(d)).map(d => idIndex.get(d)));
const hidden = new Set((st.hidden || []).filter(g => gIndex.has(g)));
let trailsAll = st.trails !== undefined ? !!st.trails : !!o.trails;

const allPos = M => M.every(s => s.every(v => v === null || v > 0));
const canLogX = allPos(MX), canLogY = allPos(MY);
let xLog = (st.xLog !== undefined ? st.xLog : o.xScale === "log") && canLogX;
let yLog = (st.yLog !== undefined ? st.yLog : o.yScale === "log") && canLogY;

// ---- layout: titles, header (legend + buttons) ---------------------------------------------------
const padL = 14, padR = 16;
let top = ddTitles(svg, o, axisCol, padL);
const ACC = DD_ACCENT;
const legendOn = o.legend && hasGroup;
const legendItems = legendOn ? groupLevels.map((g, k) => ({ g, k, w: 20 + tw(g, 12) + 14 })) : [];

const btnDefs = [];
if (o.buttons) {
  if (canLogX) btnDefs.push({ k: "xlog", t: "Log x", tip: "Log scale on the x axis" });
  if (canLogY) btnDefs.push({ k: "ylog", t: "Log y", tip: "Log scale on the y axis" });
  if (nF > 1) btnDefs.push({ k: "trails", t: "Trails", tip: "Show the trail of every bubble" });
  btnDefs.push({ k: "clear", t: "Clear", tip: "Stop following the bubbles (Esc)", sep: true });
}
const ctlH = 22;
btnDefs.forEach(b => { b.w = tw(b.t, 11, 600) + 18; });
const ctlW = btnDefs.length ? d3.sum(btnDefs, b => b.w) + (btnDefs.some(b => b.sep) && btnDefs.length > 1 ? 8 : 0) : 0;
let ctlOwnRow = false;
let legendAvail = W - padL - padR - (ctlW ? ctlW + 16 : 0);
if (legendOn && ctlW && legendAvail < Math.min(200, d3.sum(legendItems, d => d.w))) {
  ctlOwnRow = true; legendAvail = W - padL - padR;
}
let lx = 0, lrow = 0;
legendItems.forEach(it => {
  if (lx > 0 && lx + it.w > legendAvail) { lrow++; lx = 0; }
  it.x = lx; it.row = lrow; lx += it.w;
});
const legendRows = legendOn ? lrow + 1 : 0;
let headerTop = top, legendTop = top;
if (ctlW || legendRows) {
  top += 2; headerTop = top;
  if (ctlOwnRow) { legendTop = top + ctlH + 6; top = legendTop + legendRows * 22; }
  else { legendTop = top; top += Math.max(legendRows * 22, ctlW ? ctlH : 0); }
  top += 6;
}

// ---- player ------------------------------------------------------------------------------------------
let player = null;
let drawNow = () => {};
player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames: RC.frames, frameNum: RC.frameNum, timeType: RC.timeType,
  o: Object.assign({}, o.player, { stateKey: o.stateKey }),
  onRender: t => drawNow(t),
  onFrame: () => { orderDirty = true; labelsDirty = true; }
});
const ease = player.ease;

// ---- plot area ------------------------------------------------------------------------------------
const tickFs = 11, titleFs = 12;
const yTitle = o.ytitle || "", xTitle = o.xtitle || "";
if (yTitle) top += titleFs + 8;
const py0 = top + 6;
const py1 = player.top - 8 - (tickFs + 8) - (xTitle ? titleFs + 8 : 0);
const plotH = Math.max(40, py1 - py0);

// fixed domains over the whole race
const extentOf = M => {
  let a = Infinity, b = -Infinity;
  M.forEach(s => s.forEach(v => { if (v !== null) { if (v < a) a = v; if (v > b) b = v; } }));
  if (!isFinite(a)) { a = 0; b = 1; }
  return [a, b];
};
const extX = extentOf(MX), extY = extentOf(MY);
const M125 = [1, 2, 5];
const n125 = (k, e) => +(k + "e" + e);
function logDomain(ext) {
  let [a, b] = ext;
  if (!(a > 0)) a = 1e-3;
  if (b <= a) { a = a / 2; b = b * 2; }
  let lo = a, hi = b;
  const e0 = Math.floor(Math.log10(a)), e1 = Math.ceil(Math.log10(b));
  for (let e = e0; e <= e0 + 1; e++) M125.forEach(k => { const v = n125(k, e); if (v <= a * (1 + 1e-9)) lo = v; });
  let found = false;
  for (let e = e1 - 1; e <= e1 && !found; e++) M125.forEach(k => { const v = n125(k, e); if (!found && v >= b * (1 - 1e-9)) { hi = v; found = true; } });
  if (!found) hi = n125(1, e1);
  return [lo, hi];
}
function linScale(ext, nT) {
  let [a, b] = ext;
  if (a === b) { const p = Math.abs(a) * 0.1 || 1; a -= p; b += p; }
  return d3.scaleLinear().domain([a, b]).nice(nT);
}
function logTicks(dom, span, needPx) {
  const [a, b] = dom;
  const e0 = Math.floor(Math.log10(a)), e1 = Math.ceil(Math.log10(b));
  const L = Math.log10(b / a);
  const sets = [[1, 2, 5], [1, 3], [1]];
  for (let si = 0; si < sets.length; si++) {
    const t = [];
    for (let e = e0; e <= e1; e++) sets[si].forEach(k => { const v = n125(k, e); if (v >= a * (1 - 1e-9) && v <= b * (1 + 1e-9)) t.push(v); });
    if (t.length < 2) break;
    let minGap = Infinity;
    for (let k = 1; k < t.length; k++) minGap = Math.min(minGap, span * Math.log10(t[k] / t[k - 1]) / L);
    if (minGap >= needPx) return t;
    if (si === sets.length - 1) {
      // decades only, every other one if still too dense
      const step = Math.ceil(needPx / minGap);
      return t.filter((v, k) => k % step === 0);
    }
  }
  return d3.scaleLog().domain(dom).ticks(4);
}

// y tick labels decide the left margin: measure both scales
const nTy = Math.max(3, Math.round(plotH / 50));
const yLinS = linScale(extY, nTy), yLogDom = canLogY ? logDomain(extY) : null;
const yTickSets = [yLinS.ticks(nTy)].concat(canLogY ? [logTicks(yLogDom, plotH, 18)] : []);
const yTickW = d3.max(yTickSets, s => d3.max(s, v => tw(TY(v), tickFs))) || 20;
const px0 = padL + yTickW + 10;
const nTx = Math.max(2, Math.round((W - padR - px0) / 85));
const xLinS = linScale(extX, nTx), xLogDom = canLogX ? logDomain(extX) : null;
// room for half of the last x tick label on the right
const lastXW = Math.max(tw(TX(xLinS.domain()[1]), tickFs), canLogX ? tw(TX(xLogDom[1]), tickFs) : 0);
const px1 = W - padR - Math.max(0, lastXW / 2 - 6 - (padR - 4));
const plotW = Math.max(40, px1 - px0);

const inset = 6;
let xS, yS, xTicks, yTicks;
function buildScales() {
  if (xLog) {
    xS = d3.scaleLog().domain(xLogDom).range([px0 + inset, px1 - inset]);
    const need = d3.max([1, 2, 5, 10, 20, 50].map(k => tw(TX(k * xLogDom[1] / 50), tickFs))) + 14;
    xTicks = logTicks(xLogDom, plotW - 2 * inset, need);
  } else {
    xS = xLinS.copy().range([px0 + inset, px1 - inset]);
    xTicks = xS.ticks(nTx);
    // drop ticks whose labels would collide
    const need = d3.max(xTicks, v => tw(TX(v), tickFs)) + 12;
    const gap = xTicks.length > 1 ? Math.abs(xS(xTicks[1]) - xS(xTicks[0])) : Infinity;
    if (gap < need) { const s = Math.ceil(need / gap); xTicks = xTicks.filter((v, k) => k % s === 0); }
  }
  if (yLog) {
    yS = d3.scaleLog().domain(yLogDom).range([py1 - inset, py0 + inset]);
    yTicks = logTicks(yLogDom, plotH - 2 * inset, 18);
  } else {
    yS = yLinS.copy().range([py1 - inset, py0 + inset]);
    yTicks = yS.ticks(nTy);
  }
}
buildScales();

// sizes: area proportional to the value
const rMin = Math.max(0, +ddArr(o.sizeRange)[0] || 0);
const rMaxWanted = +ddArr(o.sizeRange)[1] || 40;
// smaller bubbles on small charts
const rScaleK = Math.max(0.45, Math.min(1, Math.min(plotW, plotH * 1.4) / 560));
const rMax = Math.max(rMin, Math.min(rMaxWanted * rScaleK, Math.min(plotW, plotH) / 5));
const sMax = hasSize ? (d3.max(MS, s => d3.max(s, v => v === null ? 0 : v)) || 1) : 1;
const rS = d3.scaleSqrt().domain([0, sMax]).range([0, rMax]);
const rFixed = Math.max(7, rMin);
const rOf = s => hasSize ? Math.max(rMin, rS(Math.max(0, s || 0))) : rFixed;

// pixel positions of every item at every frame
let PX, PY, oldPX = null, oldPY = null, tweenK = 1;
function computePixels() {
  PX = MX.map(s => s.map(v => v === null ? null : xS(v)));
  PY = MY.map(s => s.map(v => v === null ? null : yS(v)));
}
computePixels();

// ---- layers -------------------------------------------------------------------------------------
const uid = "ddbr" + Math.random().toString(36).slice(2, 8);
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "c").append("rect")
  .attr("x", px0).attr("y", py0).attr("width", plotW).attr("height", plotH);
const gWm = svg.append("g").style("pointer-events", "none");
const gGrid = svg.append("g").style("pointer-events", "none");
const gSizeLeg = svg.append("g").style("pointer-events", "none");
const gPlot = svg.append("g").attr("clip-path", `url(#${uid}c)`).style("pointer-events", "none");
const gTrails = gPlot.append("g").attr("class", "dd-trails");
const gBub = gPlot.append("g").attr("class", "dd-bubbles");
const gDots = gPlot.append("g").attr("class", "dd-trail-dots");
const gLabels = svg.append("g").attr("class", "dd-labels").style("pointer-events", "none");
const gCross = svg.append("g").attr("class", "dd-cross").style("pointer-events", "none").style("display", "none");
const overlay = svg.append("rect").attr("class", "dd-overlay").attr("x", px0).attr("y", py0)
  .attr("width", plotW).attr("height", plotH).attr("fill", "transparent");
const gLegend = svg.append("g").attr("class", "dd-legend");
const gCtl = svg.append("g").attr("class", "dd-buttons");
[gLegend, gCtl].forEach(g => g.style("user-select", "none").style("-webkit-user-select", "none"));
const tip = ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms });

// watermark: the period, as large as fits, centred behind the plot
const wmW100 = d3.max(d3.range(nF), i => tw(player.frameLabel(i), 100, 800)) || 100;
const wmSize = Math.max(18, Math.min(plotH * 0.42, plotW * 0.8 / wmW100 * 100));
const wm = ddWatermark(gWm, { x: (px0 + px1) / 2, y: (py0 + py1) / 2, anchor: "middle", size: wmSize, font, color: axisCol, opacity: 0.08 })
  .attr("dy", "0.36em");

// axis titles
if (yTitle) svg.append("text").attr("x", padL).attr("y", py0 - 10)
  .style("font-size", titleFs + "px").style("font-weight", 600).style("fill", axisCol).style("fill-opacity", 0.8)
  .text(ms.truncate(yTitle, W - padL - padR, titleFs, 600));
if (xTitle) svg.append("text").attr("x", px1).attr("y", py1 + tickFs + 8 + titleFs + 6).attr("text-anchor", "end")
  .style("font-size", titleFs + "px").style("font-weight", 600).style("fill", axisCol).style("fill-opacity", 0.8)
  .text(ms.truncate(xTitle, plotW, titleFs, 600));
// plot frame: baseline and left line
gGrid.append("line").attr("x1", px0).attr("x2", px1).attr("y1", py1 + 0.5).attr("y2", py1 + 0.5)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.3);
gGrid.append("line").attr("x1", px0 - 0.5).attr("x2", px0 - 0.5).attr("y1", py0).attr("y2", py1)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.3);
const gXT = gGrid.append("g"), gYT = gGrid.append("g");

function drawAxes(dur, prevX, prevY) {
  const safe = (s, v, fb) => { const p = s(v); return isFinite(p) ? p : fb; };
  const xs = gXT.selectAll("g.tick").data(xTicks, v => v);
  const xe = xs.enter().append("g").attr("class", "tick")
    .attr("transform", v => `translate(${prevX ? safe(prevX, v, px0) : xS(v)},0)`).style("opacity", dur ? 0 : 1);
  if (gridCol) xe.append("line").attr("y1", py0).attr("y2", py1).attr("stroke", gridCol);
  xe.append("text").attr("y", py1 + tickFs + 6).attr("text-anchor", "middle")
    .style("font-size", tickFs + "px").style("fill", axisCol).style("fill-opacity", 0.7).text(v => TX(v));
  const xm = xe.merge(xs);
  (dur ? xm.transition().duration(dur).ease(d3.easeCubicInOut) : xm)
    .attr("transform", v => `translate(${xS(v)},0)`).style("opacity", 1);
  (dur ? xs.exit().transition().duration(dur * 0.6).ease(d3.easeCubicOut)
    .attr("transform", v => `translate(${safe(xS, v, px0)},0)`).style("opacity", 0) : xs.exit()).remove();

  const ys = gYT.selectAll("g.tick").data(yTicks, v => v);
  const ye = ys.enter().append("g").attr("class", "tick")
    .attr("transform", v => `translate(0,${prevY ? safe(prevY, v, py1) : yS(v)})`).style("opacity", dur ? 0 : 1);
  if (gridCol) ye.append("line").attr("x1", px0).attr("x2", px1).attr("stroke", gridCol);
  ye.append("text").attr("x", px0 - 8).attr("dy", "0.34em").attr("text-anchor", "end")
    .style("font-size", tickFs + "px").style("fill", axisCol).style("fill-opacity", 0.7).text(v => TY(v));
  const ym = ye.merge(ys);
  (dur ? ym.transition().duration(dur).ease(d3.easeCubicInOut) : ym)
    .attr("transform", v => `translate(0,${yS(v)})`).style("opacity", 1);
  (dur ? ys.exit().transition().duration(dur * 0.6).ease(d3.easeCubicOut)
    .attr("transform", v => `translate(0,${safe(yS, v, py1)})`).style("opacity", 0) : ys.exit()).remove();
}
drawAxes(0);

// ---- size legend: nested reference circles in the emptiest corner -----------------------------------
let sizeLegBox = null;
if (o.sizeLegend && hasSize && sMax > 0) {
  const e = Math.floor(Math.log10(sMax));
  let topV = n125(1, e);
  M125.forEach(k => { const v = n125(k, e); if (v <= sMax) topV = v; });
  const refs = [topV, topV / 10, topV / 100].filter(v => rS(v) >= 3.5).slice(0, 3);
  if (refs.length) {
    const R0 = rS(refs[0]);
    const lblW = d3.max(refs, v => tw(FS.short(v), 10)) || 20;
    const ttl = ms.truncate(o.sizeTitle || o.sizeName, 2 * R0 + lblW + 40, 10.5, 600);
    const bw = Math.max(2 * R0 + 12 + lblW + 16, tw(ttl, 10.5, 600) + 16), bh = 2 * R0 + 30;
    sizeLegBox = { w: bw, h: bh };
    gSizeLeg.append("rect").attr("width", bw).attr("height", bh).attr("rx", 6)
      .attr("fill", bgcol).attr("fill-opacity", 0.72).attr("stroke", axisCol).attr("stroke-opacity", 0.08);
    gSizeLeg.append("text").attr("x", 8).attr("y", 15).style("font-size", "10.5px").style("font-weight", 600)
      .style("fill", axisCol).style("fill-opacity", 0.75).text(ttl);
    const cx = 8 + R0, base = bh - 7;
    refs.forEach(v => {
      const r = rS(v);
      gSizeLeg.append("circle").attr("cx", cx).attr("cy", base - r).attr("r", r)
        .attr("fill", "none").attr("stroke", axisCol).attr("stroke-opacity", 0.45);
      gSizeLeg.append("line").attr("x1", cx).attr("x2", cx + R0 + 8).attr("y1", base - 2 * r).attr("y2", base - 2 * r)
        .attr("stroke", axisCol).attr("stroke-opacity", 0.3).attr("stroke-dasharray", "2,2");
      gSizeLeg.append("text").attr("x", cx + R0 + 11).attr("y", base - 2 * r).attr("dy", "0.34em")
        .style("font-size", "10px").style("fill", axisCol).style("fill-opacity", 0.7).text(FS.short(v));
    });
  }
}
function placeSizeLegend(dur) {
  if (!sizeLegBox) return;
  const m = 8, bw = sizeLegBox.w, bh = sizeLegBox.h;
  const corners = [
    { x: px1 - m - bw, y: py1 - m - bh }, { x: px0 + m, y: py0 + m },
    { x: px1 - m - bw, y: py0 + m }, { x: px0 + m, y: py1 - m - bh }];
  // how much the bubbles cover each corner, over the whole race
  const score = corners.map(c => {
    let s = 0;
    for (let i = 0; i < nI; i++) for (let f = 0; f < nF; f++) {
      if (PX[i][f] === null) continue;
      const r = rOf(hasSize ? MS[i][f] : 0);
      const dx = Math.max(c.x - PX[i][f], 0, PX[i][f] - (c.x + bw)), dy = Math.max(c.y - PY[i][f], 0, PY[i][f] - (c.y + bh));
      if (dx * dx + dy * dy < r * r) s += 1 + r / 10;
    }
    return s;
  });
  let best = 0;
  score.forEach((s, k) => { if (s < score[best] - 1e-9) best = k; });
  const c = corners[best];
  (dur ? gSizeLeg.transition().duration(dur) : gSizeLeg).attr("transform", `translate(${c.x},${c.y})`);
}
placeSizeLegend(0);

// ---- bubbles --------------------------------------------------------------------------------------------
const opa = o.opacity === undefined ? 0.85 : +o.opacity;
const circles = gBub.selectAll("circle").data(d3.range(nI)).enter().append("circle")
  .attr("fill", i => COL[i]).attr("stroke", bgcol).attr("stroke-width", 1).style("display", "none");
const cNodes = circles.nodes();
const trailPaths = new Map(), trailDots = new Map();
const labelSel = gLabels.selectAll("text").data(d3.range(nI)).enter().append("text")
  .style("font-size", "11px").style("font-weight", 700).style("display", "none")
  .style("paint-order", "stroke").attr("stroke-linejoin", "round").text(i => ids[i]);
const lNodes = labelSel.nodes();
const labelW = ids.map(d => tw(d, 11, 700));

// per-item eased state
const emCur = new Float64Array(nI).fill(1);    // emphasis (hover / follow / legend focus)
const visCur = new Float64Array(nI);           // legend visibility
for (let i = 0; i < nI; i++) visCur[i] = hasGroup && hidden.has(itemGroup[i]) ? 0 : 1;
const lblCur = new Float64Array(nI);           // label opacity
const lblTarget = new Uint8Array(nI);
const lblSlot = new Int8Array(nI).fill(-1);
const CUR = d3.range(nI).map(() => ({ cx: 0, cy: 0, r: 0, a: 0, p: 0 }));

let hover = null;       // { i } or { i, f } (a trail dot)
let focusGroup = null;  // legend hover
let orderDirty = true, labelsDirty = true;
let lastDraw = null, fxTimer = null;

function emTarget(i) {
  let e = 1;
  if (focusGroup !== null && hasGroup && itemGroup[i] !== focusGroup) e = Math.min(e, 0.12);
  if (followed.size && !followed.has(i)) e = Math.min(e, 0.32);
  if (hover && hover.f === undefined && hover.i !== i) e = Math.min(e, followed.size && !followed.has(i) ? 0.2 : 0.5);
  if (hover && hover.i === i) e = 1;
  return e;
}
function visTarget(i) { return hasGroup && hidden.has(itemGroup[i]) ? 0 : 1; }

// steps every eased value towards its target; returns true when all settled
function fxStep() {
  const now = (typeof performance !== "undefined" ? performance : Date).now();
  const dt = lastDraw === null ? 16 : Math.min(80, now - lastDraw);
  lastDraw = now;
  let settled = true;
  const sE = dt / 200, sV = dt / 380, sL = dt / 260;
  for (let i = 0; i < nI; i++) {
    const te = emTarget(i), tv = visTarget(i), tl = lblTarget[i];
    if (emCur[i] !== te) { const d = te - emCur[i]; emCur[i] = Math.abs(d) <= sE ? te : emCur[i] + Math.sign(d) * sE; settled = settled && emCur[i] === te; }
    if (visCur[i] !== tv) { const d = tv - visCur[i]; visCur[i] = Math.abs(d) <= sV ? tv : visCur[i] + Math.sign(d) * sV; settled = settled && visCur[i] === tv; }
    if (lblCur[i] !== tl) { const d = tl - lblCur[i]; lblCur[i] = Math.abs(d) <= sL ? tl : lblCur[i] + Math.sign(d) * sL; settled = settled && lblCur[i] === tl; }
  }
  if (tweenK < 1) {
    tweenK = Math.min(1, tweenK + dt / 650);
    settled = false;
    if (tweenK >= 1) { oldPX = null; oldPY = null; }
  }
  return settled;
}
// redraws until the eased values settle (the player redraws while playing)
function kick() {
  if (fxTimer) return;
  fxTimer = ddplotTrack(d3.timer(() => {
    if (!player.playing()) draw(player.t());
    if (fxSettled) { fxTimer.stop(); fxTimer = null; }
  }));
}
let fxSettled = true;

// position of item i at frame f (with the scale tween)
function ptAt(i, f) {
  const x = PX[i][f], y = PY[i][f];
  if (x === null || oldPX === null) return [x, y];
  const k = d3.easeCubicInOut(tweenK);
  return [oldPX[i][f] + (x - oldPX[i][f]) * k, oldPY[i][f] + (y - oldPY[i][f]) * k];
}
function posAt(i, t) {
  const x = ddRaceAt(PX[i], t, ease), y = ddRaceAt(PY[i], t, ease);
  if (x === null || oldPX === null) return [x, y];
  const k = d3.easeCubicInOut(tweenK);
  const x0 = ddRaceAt(oldPX[i], t, ease), y0 = ddRaceAt(oldPY[i], t, ease);
  return [x0 + (x - x0) * k, y0 + (y - y0) * k];
}
const sizeAt = (i, t) => hasSize ? ddRaceAt(MS[i], t, ease) : null;

// ---- the draw ------------------------------------------------------------------------------------------
function draw(t) {
  fxSettled = fxStep();
  wm.text(player.label(t));
  const playing = player.playing();
  // positions
  for (let i = 0; i < nI; i++) {
    const c = CUR[i];
    const p = ddRacePresence(PRES[i], t, ease);
    c.p = p;
    if (p <= 0 || visCur[i] <= 0) { c.a = 0; continue; }
    const [x, y] = posAt(i, t);
    if (x === null || y === null) { c.a = 0; continue; }
    c.cx = x; c.cy = y;
    c.r = rOf(sizeAt(i, t)) * (0.35 + 0.65 * p);
    c.a = p * visCur[i];
  }
  // depth: larger behind, followed above, hovered on top
  if (orderDirty) {
    orderDirty = false;
    const order = d3.range(nI).sort((a, b) => {
      const ka = (hover && hover.i === a ? 2 : followed.has(a) ? 1 : 0), kb = (hover && hover.i === b ? 2 : followed.has(b) ? 1 : 0);
      return (ka - kb) || (CUR[b].r - CUR[a].r) || (a - b);
    });
    order.forEach(i => gBub.node().appendChild(cNodes[i]));
  }
  for (let i = 0; i < nI; i++) {
    const c = CUR[i], nd = cNodes[i];
    if (c.a <= 0.002) { if (nd.style.display !== "none") nd.style.display = "none"; continue; }
    if (nd.style.display === "none") nd.style.display = "";
    nd.setAttribute("cx", c.cx.toFixed(2));
    nd.setAttribute("cy", c.cy.toFixed(2));
    nd.setAttribute("r", Math.max(0, c.r).toFixed(2));
    nd.setAttribute("fill-opacity", (opa * emCur[i] * c.a).toFixed(3));
    nd.setAttribute("stroke-opacity", (0.9 * c.a * Math.max(emCur[i], 0.3)).toFixed(3));
    const isH = hover && hover.i === i && hover.f === undefined, isF = followed.has(i);
    nd.setAttribute("stroke", isH ? axisCol : isF ? COLD[i] : bgcol);
    nd.setAttribute("stroke-width", isH ? 1.8 : isF ? 1.5 : 1);
  }
  drawTrails(t);
  drawLabels(t, playing);
  drawHover(t);
}
drawNow = draw;

// ---- trails -------------------------------------------------------------------------------------------
function drawTrails(t) {
  const fi = Math.floor(t + 1e-9);
  const want = new Set();
  for (let i = 0; i < nI; i++) {
    if (visCur[i] <= 0) continue;
    if (followed.has(i) || (trailsAll && nF > 1)) want.add(i);
  }
  trailPaths.forEach((p, i) => { if (!want.has(i)) { p.remove(); trailPaths.delete(i); } });
  trailDots.forEach((g, i) => { if (!want.has(i) || !followed.has(i)) { g.remove(); trailDots.delete(i); } });
  want.forEach(i => {
    let p = trailPaths.get(i);
    if (!p) {
      p = gTrails.append("path").attr("fill", "none").attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
      trailPaths.set(i, p);
    }
    const isF = followed.has(i);
    let d = "", pen = false;
    for (let f = 0; f <= Math.min(fi, nF - 1); f++) {
      const [x, y] = ptAt(i, f);
      if (x === null) { pen = false; continue; }
      d += (pen ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
      pen = true;
    }
    const c = CUR[i];
    if (pen && t > fi + 1e-6 && c.a > 0 && PRES[i][Math.min(nF - 1, fi + 1)]) d += "L" + c.cx.toFixed(1) + "," + c.cy.toFixed(1);
    const hl = hover && hover.i === i;
    p.attr("d", d || null)
      .attr("stroke", isF ? COLD[i] : COL[i])
      .attr("stroke-width", isF || hl ? 1.7 : 1.1)
      .attr("stroke-opacity", visCur[i] * (isF || hl ? 0.75 : 0.55 * Math.max(0.25, emCur[i])));
    if (!isF) return;
    let g = trailDots.get(i);
    if (!g) {
      g = gDots.append("g");
      g.selectAll("circle").data(d3.range(nF)).enter().append("circle").attr("r", 2.7)
        .attr("fill", COL[i]).attr("stroke", bgcol).attr("stroke-width", 1);
      g.append("text").attr("class", "first").style("font-size", "9.5px").style("fill", COLD[i])
        .style("paint-order", "stroke").attr("stroke", bgcol).attr("stroke-width", 3);
      trailDots.set(i, g);
    }
    g.style("opacity", visCur[i]);
    g.selectAll("circle").each(function (f) {
      const [x, y] = ptAt(i, f);
      const show = x !== null && f <= fi;
      this.style.display = show ? "" : "none";
      if (show) {
        this.setAttribute("cx", x); this.setAttribute("cy", y);
        const hd = hover && hover.i === i && hover.f === f;
        this.setAttribute("r", hd ? 4.5 : 2.7);
      }
    });
    // the first period of the trail, next to its first dot
    const f0 = firstPres[i];
    const ft = g.select("text.first");
    if (f0 >= 0 && f0 < fi) {
      const [x, y] = ptAt(i, f0);
      ft.style("display", null).attr("x", x + 5).attr("y", y - 5).text(player.frameLabel(f0));
    } else ft.style("display", "none");
  });
}

// ---- labels (largest bubbles + followed), with simple collision avoidance ------------------------
const nLab = +o.labels < 0 ? nI : Math.round(+o.labels || 0);
function drawLabels(t, playing) {
  const fs = 11;
  // candidates: followed first, then the largest
  const vis = d3.range(nI).filter(i => followed.has(i) ? CUR[i].a > 0.05
    : CUR[i].a > 0.35 && (focusGroup === null || itemGroup[i] === focusGroup));
  const rankKey = i => hasSize ? (sizeAt(i, t) || 0) : -CUR[i].cy;
  const fol = vis.filter(i => followed.has(i));
  let rest = [];
  if (nLab > 0 && !followed.size) rest = vis.filter(i => !followed.has(i)).sort((a, b) => rankKey(b) - rankKey(a)).slice(0, nLab);
  const cand = fol.sort((a, b) => rankKey(b) - rankKey(a)).concat(rest);
  const placed = [];
  const isFree = b => b.x0 >= px0 + 1 && b.x1 <= px1 - 1 && b.y0 >= py0 + 1 && b.y1 <= py1 - 1 &&
    !placed.some(q => b.x0 < q.x1 && b.x1 > q.x0 && b.y0 < q.y1 && b.y1 > q.y0);
  const on = new Set();
  cand.forEach(i => {
    if (hover && hover.i === i && hover.f === undefined && o.tooltip) return; // the tooltip says it
    const c = CUR[i], w = labelW[i], h = fs + 2;
    const slots = [];
    // inside large bubbles, else right / left / above / below
    if (c.r * 2 >= w + 8 && c.r >= 13) slots.push({ k: 0, x: c.cx, y: c.cy, a: "middle", inside: true });
    slots.push({ k: 1, x: c.cx + c.r + 4, y: c.cy, a: "start" });
    slots.push({ k: 2, x: c.cx - c.r - 4, y: c.cy, a: "end" });
    slots.push({ k: 3, x: c.cx, y: c.cy - c.r - h / 2 - 2, a: "middle" });
    slots.push({ k: 4, x: c.cx, y: c.cy + c.r + h / 2 + 2, a: "middle" });
    const box = s => {
      const x0 = s.a === "start" ? s.x : s.a === "end" ? s.x - w : s.x - w / 2;
      return { x0: x0 - 2, x1: x0 + w + 2, y0: s.y - h / 2, y1: s.y + h / 2 };
    };
    // keep the previous slot when it still works (less jumping)
    const prev = slots.find(s => s.k === lblSlot[i]);
    let pick = slots.find(s => isFree(box(s)));
    if (pick && pick.k !== 0 && prev && prev.k !== pick.k && isFree(box(prev))) pick = prev;
    if (!pick && followed.has(i)) pick = prev || slots[slots.length > 1 && slots[0].inside ? 0 : 0];
    if (!pick) return;
    lblSlot[i] = pick.k;
    placed.push(box(pick));
    on.add(i);
    const nd = lNodes[i];
    nd.setAttribute("x", pick.x.toFixed(1)); nd.setAttribute("y", pick.y.toFixed(1));
    nd.setAttribute("dy", "0.35em");
    nd.setAttribute("text-anchor", pick.a);
    if (pick.inside) {
      const on = ddTextOn(COL[i]);
      nd.style.fill = on; nd.setAttribute("stroke", on === "#ffffff" ? COLD[i] : COL[i]);
      nd.setAttribute("stroke-width", 2.5); nd.setAttribute("stroke-opacity", 0.9);
    } else {
      nd.style.fill = COLD[i]; nd.setAttribute("stroke", bgcol); nd.setAttribute("stroke-width", 3);
      nd.setAttribute("stroke-opacity", 0.85);
    }
  });
  for (let i = 0; i < nI; i++) {
    lblTarget[i] = on.has(i) ? 1 : 0;
    // snap when paused or stepping, fade while playing
    if (!playing && lblCur[i] !== lblTarget[i] && !(tweenK < 1)) lblCur[i] = lblTarget[i];
    const nd = lNodes[i];
    const a = on.has(i) ? lblCur[i] * Math.min(1, CUR[i].a * 1.3) : 0;
    if (a <= 0.01) { if (nd.style.display !== "none") nd.style.display = "none"; continue; }
    nd.style.display = "";
    nd.style.opacity = a.toFixed(3);
  }
}

// ---- hover: crosshair, axis value pills, live tooltip -------------------------------------------------
const crossV = gCross.append("line").attr("stroke-dasharray", "3,3").attr("stroke-width", 1);
const crossH = gCross.append("line").attr("stroke-dasharray", "3,3").attr("stroke-width", 1);
const pillX = gCross.append("g"), pillY = gCross.append("g");
[pillX, pillY].forEach(p => {
  p.append("rect").attr("rx", 4).attr("height", 17);
  p.append("text").attr("dy", "0.35em").style("font-size", "10.5px").style("font-weight", 700).style("fill", "#fff");
});
function pill(p, txt, x, y, anchor, color) {
  const w = tw(txt, 10.5, 700) + 10;
  let x0 = anchor === "end" ? x - w : x - w / 2;
  if (anchor !== "end") x0 = Math.max(px0, Math.min(px1 - w, x0));
  x0 = Math.max(2, x0);
  p.attr("transform", `translate(${x0},${y - 8.5})`);
  p.select("rect").attr("width", w).attr("fill", color);
  p.select("text").attr("x", w / 2).attr("y", 8.5).attr("text-anchor", "middle").text(txt);
}
const chg = (a, b) => (a === null || b === null || !isFinite(a) || !isFinite(b) || b === 0) ? null : (a - b) / Math.abs(b);
function valuesAt(i, t) {
  // data values at t: invert the pixel position (exact at the frames, log-aware between them)
  const x = ddRaceAt(PX[i], t, ease), y = ddRaceAt(PY[i], t, ease);
  return { x: x === null ? null : xS.invert(x), y: y === null ? null : yS.invert(y), s: sizeAt(i, t) };
}
function drawHover(t) {
  if (!hover) { gCross.style("display", "none"); tip.hide(); return; }
  const i = hover.i, isDot = hover.f !== undefined;
  const tt = isDot ? hover.f : t;
  let cx, cy, r;
  if (isDot) { [cx, cy] = ptAt(i, hover.f); r = 4.5; if (cx === null || hover.f > Math.floor(t + 1e-9)) { setHover(null); return; } }
  else { const c = CUR[i]; if (c.a < 0.05) { setHover(null); return; } cx = c.cx; cy = c.cy; r = Math.max(0, c.r); }
  const col = COLD[i];
  gCross.style("display", null);
  crossV.attr("x1", cx).attr("x2", cx).attr("y1", Math.min(py1, cy + r)).attr("y2", py1).attr("stroke", col).attr("stroke-opacity", 0.7);
  crossH.attr("x1", Math.max(px0, cx - r)).attr("x2", px0).attr("y1", cy).attr("y2", cy).attr("stroke", col).attr("stroke-opacity", 0.7);
  const v = valuesAt(i, tt);
  pill(pillX, FX.value(v.x), cx, py1 + 10, "middle", col);
  pill(pillY, FY.value(v.y), px0 - 2, cy, "end", col);
  if (!o.tooltip) return;
  const pv = tt >= 1 ? valuesAt(i, tt - 1) : null;
  const ex = (a, b) => { const c = pv ? chg(a, b) : null; return c === null ? null : (c > 0 ? "▲ " : c < 0 ? "▼ " : "") + pct(c).replace("+", "").replace("-", ""); };
  const rows = [];
  if (hasGroup) rows.push({ name: o.groupName, value: itemGroup[i] });
  rows.push({ name: o.xtitle || o.xName, value: FX.value(v.x), extra: pv ? ex(v.x, pv.x) : null });
  rows.push({ name: o.ytitle || o.yName, value: FY.value(v.y), extra: pv ? ex(v.y, pv.y) : null });
  if (hasSize) rows.push({ name: o.sizeTitle || o.sizeName, value: FS.value(v.s), extra: pv ? ex(v.s, pv.s) : null });
  rows.push({ name: o.timeName, value: isDot ? player.frameLabel(hover.f) : player.label(t), sep: true });
  rows.push({ name: isDot ? "Click to jump to " + player.frameLabel(hover.f) : followed.has(i) ? "Click to stop following" : "Click to follow", dim: true });
  tip.show(ids[i], rows, cx + r * 0.75, cy, COL[i]);
}
function setHover(h) {
  const same = (h === null && hover === null) || (h && hover && h.i === hover.i && h.f === hover.f);
  if (same) return;
  hover = h;
  orderDirty = true;
  overlay.style("cursor", h ? "pointer" : null);
  kick();
}
// the bubble (or followed trail dot) under the pointer: the smallest one that contains it
function hitTest(mx, my) {
  let best = null, bestScore = Infinity;
  const fi = Math.floor(player.t() + 1e-9);
  followed.forEach(i => {
    if (visCur[i] < 0.5) return;
    for (let f = 0; f <= Math.min(fi, nF - 1); f++) {
      const [x, y] = ptAt(i, f);
      if (x === null) continue;
      // dots hidden under the bubble itself are not targets
      if (CUR[i].a > 0.3 && Math.hypot(x - CUR[i].cx, y - CUR[i].cy) < CUR[i].r) continue;
      const d = Math.hypot(mx - x, my - y);
      if (d <= 5 && 4 + d < bestScore) { bestScore = 4 + d; best = { i, f }; }
    }
  });
  for (let i = 0; i < nI; i++) {
    const c = CUR[i];
    if (c.a < 0.3 || emCur[i] < 0.15) continue;
    const d = Math.hypot(mx - c.cx, my - c.cy);
    const rr = Math.max(c.r, 4) + 1.5;
    if (d <= rr && c.r < bestScore) { bestScore = c.r; best = { i }; }
  }
  return best;
}
overlay
  .on("mousemove", function (a) {
    const [mx, my] = ddPtr(a, svg.node());
    setHover(hitTest(mx, my));
    if (!player.playing()) draw(player.t());
  })
  .on("mouseleave", function () { setHover(null); })
  .on("click", function (a) {
    const [mx, my] = ddPtr(a, svg.node());
    const h = hitTest(mx, my);
    if (!h) return;
    if (h.f !== undefined) {
      player.pause();
      player.seek(h.f, 500);
      return;
    }
    const i = h.i;
    if (followed.has(i)) followed.delete(i); else followed.add(i);
    afterFollow();
    const v = valuesAt(i, player.t());
    send("clicked", { id: ids[i], group: hasGroup ? itemGroup[i] : null, x: v.x, y: v.y, size: v.s,
      period: frames[player.frameIndex()] });
  });
function afterFollow() {
  st.followed = Array.from(followed).map(i => ids[i]);
  send("followed", st.followed);
  orderDirty = true; labelsDirty = true;
  styleButtons();
  if (!player.playing()) { lblCur.fill(0); }
  kick();
}
svg.on("keydown.bubble", function (a) {
  const ev = ddEvOf(a);
  if (ev && ev.key === "Escape" && followed.size) { followed.clear(); afterFollow(); }
});

// ---- legend -------------------------------------------------------------------------------------------
gLegend.attr("transform", `translate(${padL},${legendTop})`);
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`).style("cursor", "pointer");
legendSel.append("title").text("Click to hide, double-click to isolate");
legendSel.append("rect").attr("class", "bg").attr("x", -4).attr("width", d => d.w - 6).attr("height", 22)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legendSel.append("circle").attr("cx", 6).attr("cy", 11).attr("r", 5.5).attr("fill", d => keyColors[d.k])
  .attr("stroke", bgcol);
legendSel.append("text").attr("x", 17).attr("y", 11).attr("dy", "0.35em")
  .style("font-size", "12px").style("fill", axisCol).text(d => d.g);
function styleLegend() {
  legendSel.style("opacity", d => hidden.has(d.g) ? 0.4 : 1);
  legendSel.select("text").style("text-decoration", d => hidden.has(d.g) ? "line-through" : null);
}
function afterHidden() {
  st.hidden = Array.from(hidden);
  focusGroup = null;
  if (hover && hasGroup && hidden.has(itemGroup[hover.i])) hover = null;
  styleLegend();
  labelsDirty = true;
  kick();
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g)) { focusGroup = d.g; kick(); }
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    focusGroup = null; kick();
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.g)) {
        if (groupLevels.length - hidden.size <= 1) return;
        hidden.add(d.g);
      } else hidden.delete(d.g);
      afterHidden();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = groupLevels.length - hidden.size === 1 && !hidden.has(d.g);
    hidden.clear();
    if (!onlyThis) groupLevels.forEach(g => { if (g !== d.g) hidden.add(g); });
    afterHidden();
  });
styleLegend();

// ---- buttons: log x, log y, trails, clear --------------------------------------------------------
gCtl.attr("transform", `translate(${W - padR - ctlW},${headerTop})`);
(function () {
  const main = btnDefs.filter(b => !b.sep), extra = btnDefs.filter(b => b.sep);
  let cx = 0;
  [main, extra].forEach(set => {
    if (!set.length) return;
    const w = d3.sum(set, b => b.w);
    const g = gCtl.append("g").attr("transform", `translate(${cx},0)`);
    g.append("rect").attr("width", w).attr("height", ctlH).attr("rx", 5)
      .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
    let ix = 0;
    set.forEach((b, k) => {
      b.x = ix; ix += b.w;
      const n = g.append("g").attr("class", "dd-btn dd-btn-" + b.k).attr("transform", `translate(${b.x},0)`).style("cursor", "pointer");
      b.node = n;
      n.append("title").text(b.tip);
      b.bg = n.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", b.w - 3).attr("height", ctlH - 3)
        .attr("rx", 4).attr("fill", ACC).attr("fill-opacity", 0);
      if (k > 0) g.append("line").attr("x1", b.x).attr("x2", b.x).attr("y1", 4).attr("y2", ctlH - 4)
        .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
      b.text = n.append("text").attr("x", b.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
        .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
        .style("fill", axisCol).text(b.t);
      n.on("mouseenter", function () { if (!btnActive(b) && btnEnabled(b)) b.bg.attr("fill-opacity", 0.06); })
        .on("mouseleave", function () { styleButtons(); })
        .on("click", function () { onButton(b.k); });
    });
    cx += w + 8;
  });
})();
function btnActive(b) {
  return b.k === "xlog" ? xLog : b.k === "ylog" ? yLog : b.k === "trails" ? trailsAll : false;
}
function btnEnabled(b) { return b.k !== "clear" || followed.size > 0; }
function styleButtons() {
  btnDefs.forEach(b => {
    if (!b.bg) return;
    const on = btnActive(b), en = btnEnabled(b);
    b.bg.attr("fill-opacity", on ? 0.14 : 0);
    b.text.style("fill", on ? ACC : axisCol).style("fill-opacity", en ? 1 : 0.35);
    b.node.style("cursor", en ? "pointer" : "default");
  });
}
function onButton(k) {
  if (k === "clear") { if (followed.size) { followed.clear(); afterFollow(); } return; }
  if (k === "trails") { trailsAll = !trailsAll; st.trails = trailsAll; styleButtons(); kick(); return; }
  // scale switch: tween the bubbles from the old pixels to the new ones
  const prevX = xS.copy(), prevY = yS.copy();
  const fromX = oldPX ? PX.map((s, i) => s.map((v, f) => ptAt(i, f)[0])) : PX;
  const fromY = oldPY ? PY.map((s, i) => s.map((v, f) => ptAt(i, f)[1])) : PY;
  if (k === "xlog") { xLog = !xLog; st.xLog = xLog; }
  if (k === "ylog") { yLog = !yLog; st.yLog = yLog; }
  buildScales();
  computePixels();
  oldPX = fromX; oldPY = fromY; tweenK = 0;
  drawAxes(650, prevX, prevY);
  placeSizeLegend(650);
  styleButtons();
  kick();
}
styleButtons();

player.start();
if (!player.playing()) kick();
