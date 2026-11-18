// radial_bar_race(): a circular bar chart race.
//
// Prepended with racekit.js (ddRacePlayer, ddRaceAt, ...). The player drives a
// continuous time t; render(t) redraws everything. Two layouts:
//   "spokes"  one wedge per item from the inner circle outwards, ordered by
//             rank clockwise from the top; a one-slot gap at 12 o'clock is
//             where items enter and leave, and holds the grid labels;
//   "rings"   concentric 270 degree arcs, the leader outermost, labels in the
//             top-left gap.
// Every item is drawn as an arc (inner / outer radius, start / end angle), so
// switching layout, or hiding a legend group, morphs the arcs from the old
// geometry to the new one. Works with D3 v5 and v6.

const o = options, W = width, H = height;
const font = o.font, axisCol = o.axisCol || "#333333", bgcol = o.bgcol || "white";
svg.style("background-color", bgcol).style("font-family", font);
const ms = ddMeasure(svg, font);
const fmt = ddFormatter(o);
const send = ddShiny(svg);
const TAU = 2 * Math.PI, SWEEP = 1.5 * Math.PI;
const UP = "#2f9e44", DOWN = "#e8590c";
const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;

// ---- persistent state (Shiny updates / resizes) ------------------------------
const pst = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
const skey = (o.player && o.player.stateKey) || "radialbarrace";
if (!pst.rbr || pst.rbr.key !== skey) pst.rbr = { key: skey };
const st = pst.rbr;

// ---- data ----------------------------------------------------------------------
const race = o.race;
const frames = ddArr(race.frames).map(String);
const nf = frames.length;
const items = ddArr(race.items).map(String);
const ni = items.length;
const itemGroup = race.groups ? ddArr(race.groups).map(String) : null;
const hasGroup = !!itemGroup;
const vals = ddArr(race.series.value).map(s => {
  const a = ddArr(s).map(ddNum);
  while (a.length < nf) a.push(null);
  return a;
});
const gKeys = hasGroup ? ddArr(o.groupKeys).map(String) : [];
const keyCols = ddColors(hasGroup ? gKeys.length : ni, o.colors, o.colorCategory);
const colorOf = items.map((it, i) => hasGroup ? (keyCols[gKeys.indexOf(itemGroup[i])] || DD_ACCENT) : keyCols[i]);
const inkOf = colorOf.map(c => ddTextOn(c));
const topN = Math.max(1, Math.round(+o.topN || 12));
const fixedMax = ddNum(o.max);
const areaScale = o.scale === "area";
const valueName = o.valueName || "Value";

const hidden = new Set(ddArr(st.hidden).filter(g => gKeys.indexOf(g) >= 0));
const pinned = new Set((st.pinned !== undefined ? ddArr(st.pinned) : ddArr(o.highlight).map(String))
  .filter(h => items.indexOf(h) >= 0));
let layout = st.layout || (o.layout === "rings" ? "rings" : "spokes");

// ---- character widths (no DOM measuring while playing) ---------------------------
const cw = {};
function textW(str, fs, wt) {
  str = String(str);
  const w = wt || 400;
  const tab = cw[w] || (cw[w] = {});
  let s = 0;
  for (let k = 0; k < str.length; k++) {
    const c = str[k];
    let x = tab[c];
    if (x === undefined) x = tab[c] = (c === " " ? ms.tw("a a", 20, w) - ms.tw("aa", 20, w) : ms.tw(c, 20, w)) / 20;
    s += x;
  }
  return s * fs;
}
function truncW(str, maxW, fs, wt) {
  str = String(str);
  if (textW(str, fs, wt) <= maxW) return str;
  if (maxW < textW("W…", fs, wt)) return "";
  let s = str;
  while (s.length > 1 && textW(s + "…", fs, wt) > maxW) s = s.slice(0, -1);
  return s.replace(/\s+$/, "") + "…";
}

// ---- ranks, maxima and totals per frame (recomputed when groups are hidden) ------
function makeState(lay) {
  const active = d3.range(ni).filter(i => !(hasGroup && hidden.has(itemGroup[i])));
  const K = Math.max(1, Math.min(topN, active.length));
  const ranks = items.map(() => new Array(nf).fill(K));
  const trueRank = items.map(() => new Array(nf).fill(null));
  const maxArr = new Array(nf), topAvg = new Array(nf), topTot = new Array(nf), allTot = new Array(nf), count = new Array(nf);
  for (let f = 0; f < nf; f++) {
    const list = active.filter(i => vals[i][f] !== null)
      .sort((a, b) => (vals[b][f] - vals[a][f]) || (a - b));
    let tt = 0, at = 0;
    list.forEach((i, k) => {
      trueRank[i][f] = k + 1;
      ranks[i][f] = Math.min(k, K);
      const v = Math.max(0, vals[i][f]);
      at += v;
      if (k < K) tt += v;
    });
    maxArr[f] = list.length ? Math.max(0, vals[list[0]][f]) : 0;
    topAvg[f] = list.length ? tt / Math.min(K, list.length) : 0;
    topTot[f] = tt; allTot[f] = at; count[f] = list.length;
  }
  // frames without a positive maximum borrow the nearest one
  let last = null;
  for (let f = 0; f < nf; f++) { if (maxArr[f] > 0) last = maxArr[f]; else if (last !== null) maxArr[f] = last; }
  last = null;
  for (let f = nf - 1; f >= 0; f--) { if (maxArr[f] > 0) last = maxArr[f]; else maxArr[f] = last || 1; }
  return { layout: lay, K, ranks, trueRank, maxArr, topAvg, topTot, allTot, count, nActive: active.length, g: null };
}

// ---- header: titles, layout buttons, legend ------------------------------------------
const padL = 14, padR = 16;
let top = ddTitles(svg, o, axisCol, padL);
const ctlItems = o.layoutButtons ? [
  { k: "spokes", t: "Spokes", tip: "Bars radiating from the centre" },
  { k: "rings", t: "Rings", tip: "Concentric rings, the leader outside" }] : [];
const ctlH = 22;
ctlItems.forEach(it => { it.w = textW(it.t, 11, 600) + 20; });
const ctlW = d3.sum(ctlItems, it => it.w);
const legendOn = !!o.legend && hasGroup;
const legendItems = legendOn ? gKeys.map((g, k) => ({ g, color: keyCols[k], w: 22 + textW(g, 12) + 14 })) : [];
const titleW = Math.max(o.title ? textW(o.title, o.titleFontSize, 700) : 0,
  o.subtitle ? textW(o.subtitle, o.subtitleFontSize) : 0);
const ctlInTitle = !!ctlW && !!(o.title || o.subtitle) && padL + titleW + 24 + ctlW <= W - padR;
const ctlTitleY = 14 + Math.max(0, ((o.title ? o.titleFontSize : o.subtitleFontSize) - ctlH) / 2);
let ctlOwnRow = false;
let legendAvail = W - padL - padR - (ctlW && !ctlInTitle ? ctlW + 16 : 0);
if (legendOn && ctlW && !ctlInTitle && legendAvail < Math.min(160, d3.sum(legendItems, d => d.w))) {
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
if (ctlInTitle) {
  headerTop = ctlTitleY;
  if (legendRows) { top += 2; legendTop = top; top += legendRows * 22 + 6; }
} else if (ctlW || legendRows) {
  top += 2;
  headerTop = top;
  if (ctlOwnRow) { legendTop = top + ctlH + 6; top = legendTop + legendRows * 22; }
  else { legendTop = top; top += Math.max(legendRows * 22, ctlW ? ctlH : 0); }
  top += 6;
}

// ---- layers ---------------------------------------------------------------------------
const gWm = svg.append("g").attr("class", "rbr-wm");
const gChart = svg.append("g").attr("class", "rbr-chart");
const gTracks = gChart.append("g").attr("class", "rbr-tracks");
const gGrid = gChart.append("g").attr("class", "rbr-grid").style("pointer-events", "none");
const gItems = gChart.append("g").attr("class", "rbr-items");
const gCenter = gChart.append("g").attr("class", "rbr-center").style("pointer-events", "none");
const gGridLbl = gChart.append("g").attr("class", "rbr-gridlbl").style("pointer-events", "none");
const gLegend = svg.append("g").attr("class", "rbr-legend");
const gCtl = svg.append("g").attr("class", "rbr-ctl");
[gLegend, gCtl].forEach(g => g.style("user-select", "none").style("-webkit-user-select", "none"));

let cur = null, blend = null, blendTimer = null;
const player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames: race.frames, frameNum: race.frameNum, timeType: race.timeType,
  o: Object.assign({}, o.player, { stateKey: skey }),
  onRender: t => render(t)
});
const tip = o.tooltip ? ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms }) : null;

// ---- geometry -------------------------------------------------------------------------
const xL = padL, xR = W - padR, yT = top + 2, yB = (player.height ? player.top : H) - 8;
const cx = (xL + xR) / 2, cy = (yT + yB) / 2;
const Rspace = Math.max(40, Math.min(xR - xL, yB - yT) / 2);
gChart.attr("transform", `translate(${cx},${cy})`);

function innerR(R) {
  const ir = +o.innerRadius;
  if (!isFinite(ir) || ir <= 0) return 0;
  return ir < 1 ? ir * R : Math.min(ir, R * 0.85);
}
// the widest value label, at 1px
let maxValW1 = textW(fmt.short(0), 1);
(function () {
  const seen = new Set();
  vals.forEach(s => s.forEach(v => {
    if (v === null) return;
    const str = fmt.short(Math.max(0, v));
    if (seen.has(str.length)) return;
    seen.add(str.length);
    maxValW1 = Math.max(maxValW1, textW(str, 1));
  }));
  // values between two periods can have more digits than the periods themselves
  maxValW1 = Math.max(maxValW1, textW(fmt.short(d3.max(vals, s => d3.max(s, v => v === null ? 0 : v)) || 0), 1));
})();

function spokeGeo(K) {
  const step = TAU / (K + 1);
  let fs = 11, R = Rspace, r0 = 0;
  for (let it = 0; it < 3; it++) {
    R = Math.max(30, Rspace - (maxValW1 * fs + 14));
    r0 = innerR(R);
    fs = Math.max(7.5, Math.min(11.5, Math.max(r0, 0.3 * R) * step * 0.8));
  }
  return { step, fs, R, r0, w: Math.min(step * 0.74, 0.38), rC: r0 };
}
function ringGeo(K) {
  const R = Math.max(30, Rspace - 22);
  const r0 = innerR(R);
  const band = Math.min(34, Math.max(2, (R - r0) / K));
  const th = band * 0.74;
  return { R, r0, band, th, fs: Math.max(6.5, Math.min(11.5, band * 0.78)), rC: R - band * K - band * 0.15 };
}
function geoOf(S) {
  if (!S.g) S.g = S.layout === "rings" ? ringGeo(S.K) : spokeGeo(S.K);
  return S.g;
}
const rad = (frac, g) => areaScale ? Math.sqrt(g.r0 * g.r0 + frac * (g.R * g.R - g.r0 * g.r0)) : g.r0 + frac * (g.R - g.r0);

function edgeDist(a) {
  const sx = Math.sin(a), sy = -Math.cos(a);
  let d = Infinity;
  if (sx > 1e-6) d = Math.min(d, (xR - cx) / sx); else if (sx < -1e-6) d = Math.min(d, (cx - xL) / -sx);
  if (sy > 1e-6) d = Math.min(d, (yB - cy) / sy); else if (sy < -1e-6) d = Math.min(d, (cy - yT) / -sy);
  return d;
}

// the geometry of item i at time t under the state S
function itemGeom(i, t, S) {
  const e = player.ease, g = geoOf(S);
  let v = ddRaceAt(vals[i], t, e);
  v = v === null ? 0 : Math.max(0, v);
  const pres = ddRacePresence(vals[i], t, e);
  const rank = ddLerpFrames(S.ranks[i], t, e);
  const op = Math.min(pres, clamp01(S.K - rank));
  const mx = fixedMax || ddLerpFrames(S.maxArr, t, e) || 1;
  const frac = Math.min(1, v / mx);
  if (S.layout === "rings") {
    const rc = g.R - (rank + 0.5) * g.band;
    const ir = Math.max(0.5, rc - g.th / 2);
    return { v, rank, op, ir, or: Math.max(ir + 0.5, rc + g.th / 2), a0: 0, a1: Math.max(0.004, frac) * SWEEP, cr: g.th / 2 };
  }
  const a = g.step * (rank + 1);
  return { v, rank, op, ir: g.r0, or: Math.max(g.r0 + 0.5, rad(frac, g)), a0: a - g.w / 2, a1: a + g.w / 2, cr: 2.5 };
}

// ---- items ----------------------------------------------------------------------------
const arcGen = d3.arc().innerRadius(d => d.ir).outerRadius(d => d.or)
  .startAngle(d => d.a0).endAngle(d => d.a1).cornerRadius(d => d.cr);
const itemSel = gItems.selectAll("g.rbr-item").data(d3.range(ni)).enter().append("g")
  .attr("class", "rbr-item").style("display", "none").style("transition", "opacity 180ms");
const P = [];
itemSel.each(function (i) {
  const g = d3.select(this);
  const inner = g.append("g");
  const path = inner.append("path").attr("class", "rbr-bar").attr("fill", colorOf[i]);
  const tin = inner.append("text").attr("class", "rbr-in").attr("dy", "0.35em")
    .style("font-weight", 600).style("fill", inkOf[i]).style("pointer-events", "none");
  const tout = inner.append("text").attr("class", "rbr-out").attr("dy", "0.35em")
    .style("fill", axisCol).style("stroke", bgcol).style("stroke-width", 3).style("stroke-linejoin", "round")
    .style("paint-order", "stroke").style("pointer-events", "none");
  const so = [tout.append("tspan"), tout.append("tspan"), tout.append("tspan")];
  const tring = inner.append("text").attr("class", "rbr-ring").attr("dy", "0.35em").attr("text-anchor", "end")
    .style("fill", axisCol).style("stroke", bgcol).style("stroke-width", 3).style("stroke-linejoin", "round")
    .style("paint-order", "stroke").style("pointer-events", "none");
  const sr = [tring.append("tspan"), tring.append("tspan"), tring.append("tspan")];
  P[i] = { g, inner, path, tin, tout, so, tring, sr, shown: false, em: 1, op: -1, keyO: "", keyR: "", keyIn: "", pin: null, geo: null };
});

// a tspan setter that only touches the DOM when something changed
function setSpan(sp, text, style) {
  const n = sp.node();
  if (n.__t !== text) { sp.text(text); n.__t = text; }
  const k = style.w + "|" + style.c + "|" + style.o + "|" + style.dx + "|" + style.f;
  if (n.__s !== k) {
    sp.style("font-weight", style.w).style("fill", style.c).style("fill-opacity", style.o).attr("dx", style.dx)
      .style("font-size", style.f ? style.f + "px" : null);
    n.__s = k;
  }
}
const S_NAME = dx => ({ w: 600, c: axisCol, o: 1, dx, f: 0 });
const S_VAL = dx => ({ w: 400, c: axisCol, o: 0.72, dx, f: 0 });
const S_ARR = (c, dx, f) => ({ w: 700, c, o: 1, dx, f });

// rank change arrows: the move into the nearest frame, shown around that frame
function arrowOf(i, t, S) {
  const j = Math.round(t);
  if (j < 1 || j >= nf) return null;
  const al = clamp01((0.5 - Math.abs(t - j)) / 0.25);
  if (al <= 0) return null;
  const a = S.trueRank[i][j - 1], b = S.trueRank[i][j];
  if (a === null || b === null || a === b || b > S.K) return null;
  const d = a - b;
  return { s: (d > 0 ? "▲" : "▼") + (Math.abs(d) > 1 ? Math.abs(d) : ""), c: d > 0 ? UP : DOWN, al };
}

// ---- grid -----------------------------------------------------------------------------
function gridTicks(mx) {
  const out = new Map();
  if (!(mx > 0)) return [];
  const e10 = Math.floor(Math.log10(mx));
  for (let p = e10 - 2; p <= e10 + 1; p++) {
    [1, 2, 5].forEach(m => {
      const s = m * Math.pow(10, p), c = mx / s;
      const al = clamp01((6 - c) / 2);
      if (al <= 0.01 || c < 1) return;
      for (let j = 1; j * s < mx * 0.99; j++) {
        const v = +(j * s).toPrecision(12);
        if ((out.get(v) || 0) < al) out.set(v, al);
      }
    });
  }
  const res = Array.from(out.entries()).map(([v, al]) => ({ v, al: al * clamp01((1 - v / mx) / 0.1) }));
  if (fixedMax) res.push({ v: fixedMax, al: 1 });
  return res;
}
const POOL = 18;
const spokeRings = d3.range(POOL).map(() => gGrid.append("circle").attr("fill", "none").attr("stroke", axisCol).style("display", "none"));
const ringTicks = d3.range(POOL).map(() => gGrid.append("line").attr("stroke", axisCol).style("display", "none"));
// value labels of the grid: one tick step at a time, fading in and out
// (keyed by value) when the step changes, so they never pile up
function labelLayer() {
  const map = new Map();
  return function (targets, place, wLayer, dt, snap) {
    targets.forEach((a, v) => {
      if (!map.has(v)) {
        const el = gGridLbl.append("text").attr("dy", "0.35em").style("font-size", "9px").style("fill", axisCol)
          .style("stroke", bgcol).style("stroke-width", 3).style("paint-order", "stroke");
        map.set(v, { el, a: snap ? a : 0 });
      }
    });
    map.forEach((m, v) => {
      const target = targets.has(v) ? targets.get(v) : 0;
      m.a = snap ? target : m.a + Math.sign(target - m.a) * Math.min(Math.abs(target - m.a), dt / 350);
      if (m.a <= 0.001 && !targets.has(v)) { m.el.remove(); map.delete(v); return; }
      const pl = place(v);
      m.el.attr("x", pl.x).attr("y", pl.y).attr("text-anchor", pl.anchor).text(fmt.short(v))
        .attr("opacity", 0.62 * m.a * wLayer * pl.fade);
    });
  };
}
const spokeLabels = labelLayer(), ringLabels = labelLayer();
let lastTs = null;
function labelTicks(mx, ok) {
  const out = new Map();
  if (!(mx > 0) || !ok) return out;
  const s = d3.tickStep(0, mx, 3);
  for (let j = 1; j * s < mx * 0.93; j++) out.set(+(j * s).toPrecision(12), 1);
  if (fixedMax) out.set(fixedMax, 1); // a fixed maximum is worth a label at the rim
  return out;
}
const baseCircle = gGrid.append("circle").attr("fill", "none").attr("stroke", axisCol);
let trackPool = [];
function show(sel, on) {
  const n = sel.node();
  if (n.__on !== on) { sel.style("display", on ? null : "none"); n.__on = on; }
}

function drawGrid(t, wS, wR, gS, gR, mx) {
  // spokes: circles at the ticks, labels in the gap at 12 o'clock
  const ticks = (wS > 0.01 || wR > 0.01) ? gridTicks(mx) : [];
  for (let k = 0; k < POOL; k++) {
    const tk = ticks[k];
    const on = !!tk && wS > 0.01 && tk.al > 0.01;
    show(spokeRings[k], on);
    if (on) spokeRings[k].attr("r", rad(tk.v / mx, gS)).attr("stroke-opacity", 0.11 * tk.al * wS);
  }
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const dt = lastTs === null ? 1000 : Math.min(200, now - lastTs);
  lastTs = now;
  const snap = !player.playing() && !blend;
  spokeLabels(labelTicks(mx, wS > 0.01), v => {
    const r = rad(v / mx, gS);
    const half = r * Math.sin(Math.max(0.05, gS.step - gS.w / 2));
    const fits = half > textW(fmt.short(v), 9) / 2 + 2 && r > gS.r0 + 8;
    return { x: 0, y: -r, anchor: "middle", fade: fits ? (v === fixedMax ? 1 : clamp01((1 - v / mx) / 0.1)) : 0 };
  }, wS, dt, snap);
  ringLabels(labelTicks(mx, wR > 0.01), v => {
    const a = Math.min(1, v / mx) * SWEEP, sx = Math.sin(a), sy = -Math.cos(a), rl = gR.R + 11;
    return { x: sx * rl, y: sy * rl, anchor: sx > 0.35 ? "start" : (sx < -0.35 ? "end" : "middle"),
      fade: v === fixedMax ? 1 : clamp01((1 - v / mx) / 0.1) };
  }, wR, dt, snap);
  show(baseCircle, wS > 0.01 && gS.r0 > 2);
  if (wS > 0.01) baseCircle.attr("r", gS.r0).attr("stroke-opacity", 0.18 * wS);
  // rings: tracks and value ticks around the sweep
  for (let k = 0; k < POOL; k++) {
    const tk = ticks[k];
    const on = !!tk && wR > 0.01 && tk.al > 0.01;
    show(ringTicks[k], on);
    if (on) {
      const a = tk.v / mx * SWEEP, sx = Math.sin(a), sy = -Math.cos(a);
      const r1 = gR.rC + 2, r2 = gR.R + 4;
      ringTicks[k].attr("x1", sx * r1).attr("y1", sy * r1).attr("x2", sx * r2).attr("y2", sy * r2)
        .attr("stroke-opacity", 0.13 * tk.al * wR).attr("stroke-dasharray", "2,3");
    }
  }
  const K = wR > 0.01 ? (cur.layout === "rings" ? cur.K : blend.old.K) : 0;
  while (trackPool.length < K) {
    trackPool.push(gTracks.append("path").attr("fill", axisCol));
  }
  trackPool.forEach((p, k) => {
    const on = k < K;
    show(p, on);
    if (on) {
      const rc = gR.R - (k + 0.5) * gR.band;
      p.attr("d", arcGen({ ir: rc - gR.th / 2, or: rc + gR.th / 2, a0: 0, a1: SWEEP, cr: gR.th / 2 }))
        .attr("fill-opacity", 0.055 * wR);
    }
  });
}

// ---- centre -----------------------------------------------------------------------------
const c1 = gCenter.append("text").attr("text-anchor", "middle").style("font-weight", 700)
  .style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
const c2 = gCenter.append("text").attr("text-anchor", "middle").style("fill", axisCol).style("fill-opacity", 0.6);
const c3 = gCenter.append("text").attr("text-anchor", "middle").style("font-weight", 700)
  .style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
const widestPeriod1 = d3.max(d3.range(nf), i => textW(player.frameLabel(i), 1, 700)) || 1;
const widestTotal1 = Math.max(textW(fmt.short(d3.max(vals.map(s => d3.max(s, v => v === null ? 0 : v))) * Math.min(ni, topN)), 1, 700), 1);
function drawCenter(t, rC, S, focus) {
  if (rC < 24) { c1.text(""); c2.text(""); c3.text(""); return; }
  const e = player.ease, room = rC * 1.62;
  let fA = Math.max(10, Math.min(32, rC * 0.4));
  const fB = Math.max(7.5, Math.min(11, rC * 0.17));
  let fC = Math.max(9, Math.min(19, rC * 0.27));
  let l1, l2, l3, col1 = axisCol;
  if (focus !== null) {
    const fi = player.frameIndex(t);
    const v = ddRaceAt(vals[focus], t, e);
    const tot = ddLerpFrames(S.allTot, t, e);
    const tr = S.trueRank[focus][fi];
    fA = Math.max(8, Math.min(fA * 0.8, room / Math.max(1, textW(items[focus], 1, 700))));
    l1 = truncW(items[focus], room, fA, 700);
    col1 = d3.color(colorOf[focus]).darker(0.4) + "";
    const share = v !== null && tot > 0 ? " · " + d3.format(".1%")(Math.max(0, v) / tot) : "";
    l2 = tr ? "#" + tr + " of " + S.count[fi] + share : "not ranked";
    if (textW(l2, fB) > room) l2 = tr ? "#" + tr + share : l2;
    l2 = truncW(l2, room, fB);
    l3 = v === null ? "–" : fmt.short(Math.max(0, v));
  } else {
    fA = Math.min(fA, room / widestPeriod1);
    l1 = player.label(t);
    const avg = o.centerValue === "average";
    if (o.centerValue === "none") { l2 = ""; l3 = ""; }
    else {
      l2 = (avg ? "Average" : "Total") + (S.nActive > S.K ? " of the top " + S.K : "");
      if (textW(l2, fB) > room) l2 = avg ? "Average" : "Total";
      l3 = fmt.short(ddLerpFrames(avg ? S.topAvg : S.topTot, t, e));
    }
  }
  fC = Math.min(fC, room / widestTotal1);
  const hA = fA * 0.74, hB = l2 ? fB * 0.74 : 0, hC = l3 ? fC * 0.74 : 0, gap = Math.max(4, rC * 0.06);
  const tot = hA + (hB ? gap + hB : 0) + (hC ? gap * 0.7 + hC : 0);
  const y0 = -tot / 2;
  c1.attr("y", y0 + hA).style("font-size", fA + "px").style("fill", col1).text(l1);
  c2.attr("y", y0 + hA + gap + hB).style("font-size", fB + "px").text(l2);
  c3.attr("y", y0 + tot).style("font-size", fC + "px").text(l3);
}

// ---- watermark ------------------------------------------------------------------------------
let wm = null;
(function () {
  const room = xR - (cx + Rspace) - 6;
  let size = Math.min(96, Math.max(30, H * 0.15));
  while (size > 30 && widestPeriod1 * size * 1.04 > room) size -= 2;
  if (widestPeriod1 * size * 1.04 <= room) {
    wm = ddWatermark(gWm, { x: xR, y: yB - 2, size, font, color: axisCol, anchor: "end", opacity: 0.1 });
  }
})();

// ---- hover, pin -----------------------------------------------------------------------------
let mouse = null, hoverItem = null, hoverGroup = null, lastT = 0;
// pinned items only dim the others while one of them is in a visible group
function pinsActive() {
  for (const name of pinned) {
    const i = items.indexOf(name);
    if (i >= 0 && !(hasGroup && hidden.has(itemGroup[i]))) return true;
  }
  return false;
}
let pinsOn = false;
function emphasisOf(i) {
  if (hoverItem !== null) return i === hoverItem ? 1 : (pinsOn && pinned.has(items[i]) ? 0.65 : 0.26);
  if (hoverGroup !== null) return itemGroup[i] === hoverGroup ? 1 : 0.2;
  if (pinsOn) return pinned.has(items[i]) ? 1 : 0.3;
  return 1;
}
function hitTest(mx, my) {
  if (mx < xL || mx > xR || my < yT - 2 || my > yB + 4) return null;
  const dx = mx - cx, dy = my - cy, r = Math.hypot(dx, dy);
  let ang = Math.atan2(dx, -dy);
  if (ang < 0) ang += TAU;
  let best = null, bestD = Infinity;
  for (let i = 0; i < ni; i++) {
    const h = P[i].geo;
    if (!h || h.op < 0.25) continue;
    if (h.mode === "s") {
      let da = Math.abs(ang - h.a) % TAU;
      if (da > Math.PI) da = TAU - da;
      if (da <= h.half && r >= h.ir - 6 && r <= h.rHit && da < bestD) { best = i; bestD = da; }
    } else {
      const dr = Math.abs(r - h.rc);
      const inLabel = my >= cy - h.rc - h.halfBand && my <= cy - h.rc + h.halfBand && mx <= cx && mx >= cx - h.lw;
      if ((dr <= h.halfBand && ang <= h.a1 + 0.25) || inLabel) {
        const d = inLabel ? 0 : dr;
        if (d < bestD) { best = i; bestD = d; }
      }
    }
  }
  return best;
}
function focusItem() {
  if (hoverItem !== null) return hoverItem;
  if (pinned.size) {
    const last = Array.from(pinned).pop();
    const i = items.indexOf(last);
    if (i >= 0 && !(hasGroup && hidden.has(itemGroup[i]))) return i;
  }
  return null;
}
function showTip(t) {
  if (!tip) return;
  if (hoverItem === null || !mouse) { tip.hide(); return; }
  const i = hoverItem, S = cur, e = player.ease;
  const fi = player.frameIndex(t);
  const v = ddRaceAt(vals[i], t, e);
  const tr = S.trueRank[i][fi];
  const rows = [{ name: valueName, value: fmt.value(v === null ? null : v), bold: true },
    { name: "Rank", value: tr ? "#" + tr : "–", extra: "of " + S.count[fi] }];
  if (t >= 1 && v !== null) {
    const vp = ddRaceAt(vals[i], t - 1, e);
    if (vp !== null) {
      const d = v - vp;
      const pct = vp !== 0 ? d / Math.abs(vp) : null;
      rows.push({ name: "Change", value: (d >= 0 ? "▲ " : "▼ ") + (pct !== null ? d3.format("+.1%")(pct) : fmt.short(d)),
        valueColor: d >= 0 ? UP : DOWN, extra: (d >= 0 ? "+" : "") + fmt.short(d) + " since " + player.label(t - 1) });
    }
  }
  const tot = ddLerpFrames(S.allTot, t, e);
  if (v !== null && tot > 0) rows.push({ name: "Share of total", value: d3.format(".1%")(Math.max(0, v) / tot) });
  if (hasGroup) rows.push({ name: o.groupName || "Group", value: itemGroup[i] });
  rows.push({ name: player.label(t) + (pinned.has(items[i]) ? " · click to unpin" : " · click to pin"), sep: true, dim: true });
  tip.show(items[i], rows, mouse[0], mouse[1], colorOf[i]);
}
function togglePin(i) {
  const name = items[i];
  if (pinned.has(name)) pinned.delete(name); else pinned.add(name);
  st.pinned = Array.from(pinned);
  const t = player.t(), fi = player.frameIndex(t);
  const v = ddRaceAt(vals[i], t, player.ease);
  send("clicked", { label: name, group: hasGroup ? itemGroup[i] : null, rank: cur.trueRank[i][fi],
    value: v, period: frames[fi], pinned: pinned.has(name) });
  if (!player.playing()) player.render();
}
svg.on("mousemove.rbr", function (a) {
  mouse = ddPtr(a, svg.node());
  const i = hitTest(mouse[0], mouse[1]);
  if (i !== hoverItem) { hoverItem = i; if (!player.playing()) player.render(); }
  else if (tip && hoverItem !== null) tip.move(mouse[0], mouse[1]);
  gItems.style("cursor", hoverItem !== null ? "pointer" : null);
})
  .on("mouseleave.rbr", function () {
    mouse = null;
    if (hoverItem !== null) { hoverItem = null; if (!player.playing()) player.render(); }
    if (tip) tip.hide();
  })
  .on("click.rbr", function (a) {
    const [mx, my] = ddPtr(a, svg.node());
    const i = hitTest(mx, my);
    if (i !== null) togglePin(i);
  });
gChart.style("cursor", "default");

// ---- legend -------------------------------------------------------------------------------
gLegend.attr("transform", `translate(${padL},${legendTop})`);
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`).style("cursor", "pointer");
legendSel.append("title").text("Click to hide or show, double-click to isolate");
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
function afterVisibilityChange() {
  st.hidden = Array.from(hidden);
  hoverGroup = null;
  styleLegend();
  transitionTo(makeState(layout));
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g)) { hoverGroup = d.g; if (!player.playing()) player.render(); }
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    hoverGroup = null;
    if (!player.playing()) player.render();
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.g)) {
        if (gKeys.length - hidden.size <= 1) return;
        hidden.add(d.g);
      } else hidden.delete(d.g);
      afterVisibilityChange();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = gKeys.length - hidden.size === 1 && !hidden.has(d.g);
    hidden.clear();
    if (!onlyThis) gKeys.forEach(g => { if (g !== d.g) hidden.add(g); });
    afterVisibilityChange();
  });

// ---- layout buttons ---------------------------------------------------------------------------
gCtl.attr("transform", `translate(${W - padR - ctlW},${headerTop})`);
if (ctlItems.length) {
  gCtl.append("rect").attr("width", ctlW).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  ctlItems.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = gCtl.append("g").attr("class", "rbr-btn rbr-btn-" + it.k).attr("transform", `translate(${it.x},0)`)
      .style("cursor", "pointer");
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", DD_ACCENT).attr("fill-opacity", 0);
    if (k > 0) gCtl.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
      .style("fill", axisCol).text(it.t);
    b.on("mouseenter", function () { if (layout !== it.k) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", function () { styleControls(); })
      .on("click", function () {
        if (layout === it.k) return;
        layout = it.k; st.layout = layout;
        styleControls();
        transitionTo(makeState(layout));
      });
  });
}
function styleControls() {
  ctlItems.forEach(it => {
    const on = layout === it.k;
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? DD_ACCENT : axisCol);
  });
}

// ---- morphing between states (layout or hidden groups) ---------------------------------------
function transitionTo(S) {
  const old = cur;
  cur = S;
  if (blendTimer) { blendTimer.stop(); blendTimer = null; }
  if (!old) { blend = null; player.render(); return; }
  blend = { old, k: 0 };
  const dur = 750;
  blendTimer = ddplotTrack(d3.timer(el => {
    const k = Math.min(1, el / dur);
    if (blend) blend.k = k;
    if (k >= 1) { blendTimer.stop(); blendTimer = null; blend = null; }
    if (!player.playing() || !blend) player.render();
  }));
}

// ---- render ------------------------------------------------------------------------------------
function render(t) {
  lastT = t;
  if (!cur) return;
  const bk = blend ? d3.easeCubicInOut(blend.k) : 1;
  const old = blend ? blend.old : null;
  const wS = (cur.layout === "spokes" ? bk : 0) + (old && old.layout === "spokes" ? 1 - bk : 0);
  const wR = 1 - wS;
  const gCur = geoOf(cur), gOld = old ? geoOf(old) : null;
  const gS = cur.layout === "spokes" ? gCur : (old && old.layout === "spokes" ? gOld : spokeGeo(cur.K));
  const gR = cur.layout === "rings" ? gCur : (old && old.layout === "rings" ? gOld : ringGeo(cur.K));
  const e = player.ease;
  const mxCur = fixedMax || ddLerpFrames(cur.maxArr, t, e) || 1;
  const mx = old ? lerp(fixedMax || ddLerpFrames(old.maxArr, t, e) || 1, mxCur, bk) : mxCur;
  const rC = old ? lerp(gOld.rC, gCur.rC, bk) : gCur.rC;
  if (wm) wm.text(player.label(t));

  // geometry of every item
  for (let i = 0; i < ni; i++) {
    let q = itemGeom(i, t, cur);
    if (old) {
      const p = itemGeom(i, t, old);
      q = { v: q.v, rank: q.rank, op: lerp(p.op, q.op, bk), ir: lerp(p.ir, q.ir, bk), or: lerp(p.or, q.or, bk),
        a0: lerp(p.a0, q.a0, bk), a1: lerp(p.a1, q.a1, bk), cr: lerp(p.cr, q.cr, bk) };
    }
    P[i].q = q;
  }
  // hover follows the bars while they move under a still mouse
  if (mouse) {
    // hit areas from the previous frame are close enough; refresh them below
  }

  const fsS = gS.fs, fsR = gR.fs;
  for (let i = 0; i < ni; i++) {
    const it = P[i], q = it.q;
    const visible = q.op > 0.004 && q.or - q.ir > 0.1;
    if (!visible) {
      if (it.shown) { it.g.style("display", "none"); it.shown = false; }
      it.geo = null;
      continue;
    }
    if (!it.shown) { it.g.style("display", null); it.shown = true; }
    if (Math.abs(it.op - q.op) > 0.002) { it.inner.attr("opacity", q.op); it.op = q.op; }
    it.path.attr("d", arcGen(q));
    const isPin = pinned.has(items[i]);
    if (it.pin !== isPin) {
      it.path.attr("stroke", isPin ? axisCol : null).attr("stroke-width", isPin ? 1.6 : null);
      it.pin = isPin;
    }
    const arrow = arrowOf(i, t, cur);
    const a = (q.a0 + q.a1) / 2;
    const geo = { op: q.op, mode: wS >= 0.5 ? "s" : "r", a, half: gS.step / 2, ir: q.ir, rHit: q.or + 8,
      rc: (q.ir + q.or) / 2, halfBand: gR.band / 2, a1: q.a1, lw: 0 };

    // spokes labels, along the spoke, flipped on the left
    if (wS > 0.01) {
      const fs = fsS, flip = Math.sin(a) < -1e-9;
      const vs = fmt.short(q.v), vw = textW(vs, fs);
      const aw = arrow ? textW(arrow.s, fs * 0.85, 700) + 4 : 0;
      const nm = items[i], nw = textW(nm, fs, 600);
      const rEnd = q.or, room = edgeDist(a) - rEnd - 10, barLen = rEnd - q.ir;
      let outName = nm, inName = "";
      if (nw + 5 + vw + aw > room) {
        if (barLen - 12 >= nw) { outName = ""; inName = nm; }
        else if (barLen - 12 >= textW("Abc…", fs, 600) && barLen - 12 >= room - vw - aw - 5) {
          outName = ""; inName = truncW(nm, barLen - 12, fs, 600);
        } else outName = truncW(nm, room - vw - aw - 5, fs, 600);
      }
      const deg = a * 180 / Math.PI - 90;
      const tr = `rotate(${deg})translate(${rEnd + 5},0)` + (flip ? "rotate(180)" : "");
      const sizeKey = fs + (flip ? "f" : "r");
      if (it.keyO !== sizeKey) {
        it.tout.style("font-size", fs + "px").attr("text-anchor", flip ? "end" : "start");
        it.tin.style("font-size", fs + "px").attr("text-anchor", flip ? "start" : "end");
        it.keyO = sizeKey;
      }
      it.tout.attr("transform", tr).attr("opacity", wS);
      const ac = arrow ? arrow.c : axisCol;
      const outNameW = outName ? textW(outName, fs, 600) : 0;
      if (!flip) {
        setSpan(it.so[0], outName, S_NAME(0));
        setSpan(it.so[1], vs, S_VAL(outName ? 5 : 0));
        setSpan(it.so[2], arrow ? arrow.s : "", S_ARR(ac, arrow ? 4 : 0, fs * 0.85));
      } else {
        setSpan(it.so[0], arrow ? arrow.s : "", S_ARR(ac, 0, fs * 0.85));
        setSpan(it.so[1], vs, S_VAL(arrow ? 4 : 0));
        setSpan(it.so[2], outName, S_NAME(outName ? 5 : 0));
      }
      const arrSpan = flip ? it.so[0] : it.so[2];
      arrSpan.style("fill-opacity", arrow ? arrow.al : 0);
      if (it.keyIn !== inName) { it.tin.text(inName); it.keyIn = inName; }
      if (inName) it.tin.attr("transform", `rotate(${deg})translate(${rEnd - 6},0)` + (flip ? "rotate(180)" : "")).attr("opacity", wS);
      show(it.tin, !!inName);
      show(it.tout, true);
      geo.rHit = rEnd + 10 + outNameW + vw + aw;
    } else { show(it.tout, false); show(it.tin, false); }

    // rings labels, horizontal in the gap at the top left
    if (wR > 0.01) {
      const fs = fsR, rc = (q.ir + q.or) / 2;
      const vs = fmt.short(q.v), vw = textW(vs, fs);
      const aw = arrow ? textW(arrow.s, fs * 0.85, 700) + 4 : 0;
      const nm = truncW(items[i], Math.max(0, cx - xL - 16 - vw - aw - 6), fs, 600);
      if (it.keyR !== fs) { it.tring.style("font-size", fs + "px"); it.keyR = fs; }
      const ac = arrow ? arrow.c : axisCol;
      setSpan(it.sr[0], arrow ? arrow.s : "", S_ARR(ac, 0, fs * 0.85));
      setSpan(it.sr[1], nm, S_NAME(arrow ? 4 : 0));
      setSpan(it.sr[2], vs, S_VAL(nm ? 6 : 0));
      it.sr[0].style("fill-opacity", arrow ? arrow.al : 0);
      it.tring.attr("x", -10).attr("y", -rc).attr("opacity", wR * (fs >= 6.5 ? 1 : 0));
      show(it.tring, true);
      geo.lw = 12 + textW(nm, fs, 600) + vw + aw + 6;
    } else show(it.tring, false);
    it.geo = geo;
  }

  // hover: re-test under a still mouse, then emphasis
  if (mouse) {
    const h = hitTest(mouse[0], mouse[1]);
    if (h !== hoverItem) { hoverItem = h; gItems.style("cursor", h !== null ? "pointer" : null); }
  }
  pinsOn = pinsActive();
  for (let i = 0; i < ni; i++) {
    const it = P[i];
    if (!it.shown) continue;
    const em = emphasisOf(i);
    if (it.em !== em) { it.g.style("opacity", em); it.em = em; }
  }
  if (hoverItem !== null && P[hoverItem].shown && P[hoverItem].g.node().nextSibling) P[hoverItem].g.raise();

  drawGrid(t, wS, wR, gS, gR, mx);
  drawCenter(t, rC, cur, focusItem());
  showTip(t);
}

// ---- go --------------------------------------------------------------------------------------
styleLegend();
styleControls();
transitionTo(makeState(layout));
player.start();
