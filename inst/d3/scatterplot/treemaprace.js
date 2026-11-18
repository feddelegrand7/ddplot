// treemap_race(): an animated treemap. The tiles grow, shrink and reflow as
// the values change through time; with a group column, the treemap has two
// levels (group frames with headers, items in shades of the group colour).
//
// Prepended with ddplotreset.js and racekit.js (ddplot_script()). The race
// player is the clock: render(t) redraws everything for a continuous time t.
//
// Layout stability (tile = "resquarify"): one d3 hierarchy per scene is kept
// for the whole life of the chart. d3.treemapResquarify stores the rows of
// each parent in node._squarify and re-uses them while they exist, so the
// tiles keep their place and only their sizes change. The rows are computed
// in "epochs": at every period, when the rows of a parent have become much
// more stretched than a fresh squarified layout would be, a new epoch starts
// with fresh rows for that parent (the others keep theirs). The rows of every
// epoch are saved (node._sq[e]) so that any time t gives the same layout
// (scrubbing back and forth is deterministic) and the layout of the old epoch
// is morphed into the new one over BLEND periods before the epoch starts.
// tile = "squarify" / "binary": the best layout of every period, morphed from
// one period to the next. "slice" / "dice" / "sliceDice": a fixed order, the
// layout is simply recomputed at every t (it is continuous).
//
// Zoom (click a group header), hiding groups (legend) and other structural
// changes are animated with a morph from a snapshot of the tiles on screen.
// Works with D3 v5 and v6.

const o = options, W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const axisCol = o.axisCol || "#333333", bgcol = o.bgcol || "white";
svg.style("background-color", bgcol).style("font-family", font);
const ms = ddMeasure(svg, font);
const fmt = ddFormatter(o);
const fPct = d3.format(".1%"), fGrowth = d3.format("+.1%");
const padL = 14, padR = 16;
const UP = "#2b9a58", DOWN = "#d8473d", NEUTRAL = "#a7abb1", NODATA = "#cdd2d9";
// periods spent morphing into a new resquarify epoch (about 600 ms at 1x)
const BLEND = Math.max(0.5, Math.min(1.5, 600 / Math.max(30, +(o.player || {}).frameDur || 800)));
const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
const uid = "ddtmr" + Math.random().toString(36).slice(2, 8);

// ---- persistent state (Shiny updates / resizes) ------------------------------------------
const tstate = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!tstate.tmr || tstate.tmr.key !== o.stateKey) tstate.tmr = { key: o.stateKey };
const st = tstate.tmr;
const send = ddShiny(svg);

// fast text widths (canvas), with the svg measure as a fallback
const ctx2 = (function () {
  try { return document.createElement("canvas").getContext("2d") || null; } catch (e) { return null; }
})();
function tw(s, size, weight) {
  if (!ctx2) return ms.tw(s, size, weight);
  ctx2.font = (weight || 400) + " " + size + "px " + font;
  return ctx2.measureText(String(s)).width;
}

// ---- data -----------------------------------------------------------------------------------
const race = o.race;
const frames = ddArr(race.frames).map(String);
const nF = frames.length;
const means = ddArr(o.meanValues).map(v => +v || 0);
const sv = ddArr(race.series.v);
const items = ddArr(race.items).map(String).map((name, i) => ({
  i, name, s: ddArr(sv[i]).map(ddNum), mean: means[i] || 0, key: "i:" + i
}));
const nI = items.length;
const itemGroupNames = race.groups ? ddArr(race.groups).map(String) : null;
const hasGroup = !!(itemGroupNames && o.groupName);
const groupNames = hasGroup ? ddArr(o.groupLevels).map(String) : [];
const gCols = hasGroup ? (o.groupColors ? ddArr(o.groupColors) : ddColors(groupNames.length, null, o.colorCategory)) : [];
const groups = groupNames.map((name, k) => ({ k, name, color: gCols[k] || DD_ACCENT, items: [], key: "g:" + k }));
const groupByName = new Map(groups.map(g => [g.name, g]));
items.forEach(it => {
  it.group = hasGroup ? groupByName.get(itemGroupNames[it.i]) || null : null;
  if (it.group) it.group.items.push(it);
});

// colours: shades of the group colour (largest items darkest), or one colour per item
function paletteLong(n) {
  const base = DD_PALETTE.slice(0, 9);
  const light = base.map(c => d3.interpolateRgb(c, "#ffffff")(0.45));
  const all = n > 9 ? base.concat(light) : base;
  return d3.range(n).map(k => all[k % all.length]);
}
if (hasGroup) {
  groups.forEach(g => {
    const list = g.items.slice().sort((a, b) => b.mean - a.mean || a.i - b.i);
    const m = list.length;
    const ramp = d3.interpolateLab(d3.rgb(g.color).darker(0.45), d3.rgb(g.color).brighter(0.75));
    const spread = Math.min(0.75, 0.12 * (m - 1));
    list.forEach((it, k) => {
      let f = m > 1 ? 0.3 + spread * (k / (m - 1) - 0.4) : 0.3;
      if (m > 3) f += (k % 2 ? 0.045 : -0.045);
      it.color = ramp(clamp01(f));
    });
    g.frame = d3.interpolateLab(g.color, "#1c2230")(0.32);
  });
} else {
  const given = o.itemColors ? ddArr(o.itemColors) : null;
  const bySize = items.slice().sort((a, b) => b.mean - a.mean || a.i - b.i);
  const pal = given ? null : (o.colorCategory ? ddColors(nI, null, o.colorCategory) : paletteLong(nI));
  bySize.forEach((it, k) => { it.color = given ? (given[it.i] || DD_ACCENT) : pal[k]; });
}
const textOnCache = new Map();
function textOn(c) {
  let v = textOnCache.get(c);
  if (!v) { v = ddTextOn(c); textOnCache.set(c, v); }
  return v;
}
items.forEach(it => { it.nameW10 = tw(it.name, 10, 700); });

// ---- interactive state --------------------------------------------------------------------------
const hidden = new Set(ddArr(st.hidden).filter(n => groupByName.has(n)));
if (hidden.size >= groups.length) hidden.clear();
const pinned = new Set(ddArr(st.pinned !== undefined ? st.pinned : o.highlight).map(String)
  .filter(n => items.some(it => it.name === n)));
let zoom = (hasGroup && st.zoom && groupByName.has(st.zoom) && !hidden.has(st.zoom)) ? groupByName.get(st.zoom) : null;
let labelMode = st.labelMode || o.labelMode || "value";
let colorBy = st.colorBy || o.colorBy || "group";
const labelsOn = o.labels !== false;
const TILE = o.tile || "resquarify";
// d3.treemapResquarify re-using the rows saved in node._squarify. D3 v5
// (d3-hierarchy 1.1) divides by the remaining value without checking it, which
// gives NaN when the last rows are empty (items that are absent or hidden):
// the same loop as d3 v6, with the check.
function resquarify(parent, x0, y0, x1, y1) {
  const rows = parent._squarify;
  if (!rows) { d3.treemapResquarify(parent, x0, y0, x1, y1); return; }
  let value = parent.value;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j], nodes = row.children;
    row.value = 0;
    for (let i = 0; i < nodes.length; i++) row.value += nodes[i].value;
    if (row.dice) d3.treemapDice(row, x0, y0, x1, value > 0 ? y0 += (y1 - y0) * Math.min(1, row.value / value) : y1);
    else d3.treemapSlice(row, x0, y0, value > 0 ? x0 += (x1 - x0) * Math.min(1, row.value / value) : x1, y1);
    value -= row.value;
  }
}
const tileFn = {
  resquarify: resquarify, squarify: d3.treemapSquarify, binary: d3.treemapBinary,
  slice: d3.treemapSlice, dice: d3.treemapDice, sliceDice: d3.treemapSliceDice
}[TILE] || d3.treemapResquarify;
const KEYFRAMES = TILE === "squarify" || TILE === "binary";

// ---- the player --------------------------------------------------------------------------------
let EASE = d3.easeCubicInOut;
let curT = 0, curVals = new Float64Array(nI), lastDisp = new Map();
const player = ddRacePlayer({
  svg, W, H, font, axisCol, bgcol, measure: ms,
  frames: race.frames, frameNum: race.frameNum, timeType: race.timeType,
  o: o.player || {},
  onRender: t => render(t)
});
EASE = player.ease;

// ---- header layout: titles, period watermark, total, controls, legend ------------------------------
const y0 = ddTitles(svg, o, axisCol, padL);
const wmLabels = d3.range(nF).map(i => player.frameLabel(i));
const wmWidth = s => d3.max(wmLabels, l => tw(l, s, 800)) || 0;
const titleW = Math.max(o.title ? tw(o.title, o.titleFontSize, 700) : 0,
  o.subtitle ? tw(o.subtitle, o.subtitleFontSize) : 0);
let wmSize = Math.max(26, Math.min(56, W * 0.075));
while (wmSize > 22 && padL + titleW + 24 + wmWidth(wmSize) > W - padR) wmSize -= 2;
// a title too long to share its row with the period: the period goes below it
const wmBelow = padL + titleW + 24 + wmWidth(wmSize) > W - padR;
if (wmBelow) wmSize = Math.max(22, Math.min(40, W * 0.075));
const wmW = wmWidth(wmSize);
const wmTop = wmBelow ? y0 : 6, wmBottom = wmTop + wmSize * 0.86;
const rightEdgeAt = yy => yy < wmBottom ? W - padR - wmW - 18 : W - padR;

const rowH = 24;
const infoY = Math.max(y0, 14) + 2 + (wmBelow ? 4 : 0);

// segmented controls
const ctlGroups = [];
if (o.controls !== false) {
  if (labelsOn) ctlGroups.push({ id: "label", cap: "Labels", items: [
    { k: "value", t: "Value", tip: "Show the values in the tiles" },
    { k: "share", t: "Share", tip: "Show the share of the total" },
    { k: "growth", t: "Growth", tip: "Show the change since the previous period" }] });
  ctlGroups.push({ id: "color", cap: "Colour", items: [
    { k: "group", t: hasGroup ? "Groups" : "Items", tip: "Colour the tiles by " + (hasGroup ? "group" : "item") },
    { k: "growth", t: "Growth", tip: "Colour the tiles by their growth since the previous period" }] });
}
const ctlH = 22, ctlGap = 12;
ctlGroups.forEach(cg => {
  cg.items.forEach(it => { it.w = tw(it.t, 11, 600) + 18; });
  cg.capW = tw(cg.cap, 10) + 6;
  cg.w = cg.capW + d3.sum(cg.items, it => it.w);
});
let ctlW = ctlGroups.length ? d3.sum(ctlGroups, cg => cg.w) + ctlGap * (ctlGroups.length - 1) : 0;
// room for the total (and the growth colour scale, when it can be shown)
const heatW = 72, heatCapW = tw("Growth", 9.5) + 6;
const counterMin = 230 + ((o.controls !== false || colorBy === "growth") ? heatCapW + heatW + 18 : 0);
let ctlY = infoY, ctlOwnRow = false;
if (ctlW && rightEdgeAt(infoY) - ctlW < padL + counterMin) {
  ctlOwnRow = true;
  ctlY = infoY + rowH + 2;
  if (rightEdgeAt(ctlY) - ctlW < padL) { // still too narrow: drop the captions
    ctlGroups.forEach(cg => { cg.w -= cg.capW; cg.capW = 0; });
    ctlW = d3.sum(ctlGroups, cg => cg.w) + ctlGap * (ctlGroups.length - 1);
  }
}
const ctlX = rightEdgeAt(ctlY) - ctlW;
let y = infoY + rowH + (ctlOwnRow ? rowH + 2 : 0) + 4;

// legend
const legendOn = !!o.legend && hasGroup && groups.length > 1;
const legendItems = legendOn ? groups.map(g => ({ g, w: 19 + tw(g.name, 11.5) + 14 })) : [];
let legendRows = 0;
const legendTop = y;
if (legendOn) {
  let lx = 0, row = 0;
  legendItems.forEach(it => {
    const avail = rightEdgeAt(legendTop + row * 20) - padL;
    if (lx > 0 && lx + it.w > avail) { row++; lx = 0; }
    it.x = lx; it.row = row; lx += it.w;
  });
  legendRows = row + 1;
  y += legendRows * 20 + 2;
}
if (!o.title && !o.subtitle && !legendOn) y = Math.max(y, wmBottom - 4);
const ax = 12, ay = Math.round(y + 4);
const aw = Math.max(40, W - ax - 12);
const ah = Math.max(40, player.top - ay - (player.height ? 4 : 10));

// ---- values ---------------------------------------------------------------------------------------
function isHidden(it) { return !!(it.group && hidden.has(it.group.name)); }
function valsAt(t, arr) {
  arr = arr || new Float64Array(nI);
  for (let k = 0; k < nI; k++) {
    const it = items[k];
    if (isHidden(it)) { arr[k] = 0; continue; }
    const v = ddRaceAt(it.s, t, EASE);
    arr[k] = (v === null || !(v > 0)) ? 0 : v * ddRacePresence(it.s, t, EASE);
  }
  return arr;
}
function growthAt(it, t) {
  if (t < 1 - 1e-9) return null;
  const a = ddRaceAt(it.s, t - 1, EASE), b = ddRaceAt(it.s, t, EASE);
  if (a === null || b === null || !(a > 0)) return null;
  return b / a - 1;
}
// the scale of the growth heat map: a round number near the 90th percentile
const heatQ = (function () {
  const g = [];
  items.forEach(it => {
    for (let f = 1; f < nF; f++) {
      const a = it.s[f - 1], b = it.s[f];
      if (a !== null && b !== null && a > 0) g.push(Math.abs(b / a - 1));
    }
  });
  const q = g.length ? d3.quantile(g.sort(d3.ascending), 0.9) : 0.1;
  const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5];
  return steps.find(s => s >= q) || 5;
})();
const heat = d3.scaleLinear().domain([-heatQ, 0, heatQ]).range([DOWN, NEUTRAL, UP])
  .interpolate(d3.interpolateRgb).clamp(true);
function tileColor(it, t) {
  if (colorBy !== "growth") return it.color;
  const g = growthAt(it, t);
  return g === null ? NODATA : heat(g);
}

// ---- scenes (one hierarchy for the full treemap, one per zoomed group) -------------------------------
const pad = Math.max(0, +o.padding || 0);
const groupGap = Math.max(3, pad + 1.5);
const gp = Math.max(1.5, Math.min(3, pad));
const HDR = 17;
const headerH = (w, h) => HDR * clamp01((h - 30) / 34) * clamp01((w - 40) / 40);

function makeScene(zg) {
  const nested = hasGroup && !zg;
  const leaf = it => ({ key: it.key, it, ord: it.i });
  const kids = nested
    ? groups.map(g => ({ key: g.key, g, ord: g.k, children: g.items.map(leaf) }))
    : (zg ? zg.items : items).map(leaf);
  const root = d3.hierarchy({ key: "root", ord: 0, children: kids }, d => d.children);
  const side = d => (nested && d.depth === 1) ? gp : 0;
  const tm = d3.treemap().size([aw, ah]).round(false).tile(tileFn)
    .paddingInner(d => (nested && d.depth === 0) ? groupGap : pad)
    .paddingTop(d => (nested && d.depth === 1) ? gp + headerH(d.x1 - d.x0, d.y1 - d.y0) : 0)
    .paddingRight(side).paddingBottom(side).paddingLeft(side);
  return {
    root, tm, nested, built: false,
    internal: root.descendants().filter(d => d.children),
    nodes: root.descendants().slice(1)
  };
}
function setValues(sc, vals) { sc.root.sum(d => d.it ? vals[d.it.i] : 0); }
function sortKids(n) { n.children.sort((a, b) => (b.value - a.value) || (a.data.ord - b.data.ord)); }
function snap(sc) {
  const m = new Map();
  sc.nodes.forEach(n => m.set(n.data.key, { x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1 }));
  return m;
}
// area-weighted mean aspect ratio of the children of a node (grown back by
// the inner padding `p` that d3 removes from each child)
function quality(n, p) {
  let s = 0, a = 0;
  n.children.forEach(c => {
    const w = c.x1 - c.x0 + 2 * p, h = c.y1 - c.y0 + 2 * p;
    if (w > 0.5 && h > 0.5) { const ar = w * h; s += ar * Math.max(w / h, h / w); a += ar; }
  });
  return a ? s / a : 1;
}
function applyEpoch(sc, e) {
  sc.internal.forEach(n => { n._squarify = n._sq[e]; });
  sc.tm(sc.root);
}
// the rectangle a node tiles its children into (see d3's positionNode)
function innerRect(sc, n) {
  const nested1 = sc.nested && n.depth === 1;
  const p = ((sc.nested && n.depth === 0) ? groupGap : pad) / 2;
  const side = nested1 ? gp : 0;
  const top = nested1 ? gp + headerH(n.x1 - n.x0, n.y1 - n.y0) : 0;
  return { p, r: [n.x0 + side - p, n.y0 + top - p, n.x1 - side + p, n.y1 - side + p] };
}
function buildEpochs(sc) {
  sc.epochs = [];
  const v = new Float64Array(nI);
  const lastChange = new Map();
  // epoch 0: fresh rows at the first period
  setValues(sc, valsAt(0, v));
  sc.internal.forEach(n => { sortKids(n); delete n._squarify; n._sq = []; lastChange.set(n, 0); });
  sc.tm(sc.root);
  sc.internal.forEach(n => n._sq.push(n._squarify));
  sc.epochs.push(0);
  for (let f = 1; f < nF; f++) {
    setValues(sc, valsAt(f, v));
    const last = sc.epochs.length - 1;
    applyEpoch(sc, last);
    // the current rows, against a fresh squarified layout of the same rectangle
    const inner = sc.internal.map(n => innerRect(sc, n));
    const qc = sc.internal.map((n, k) => quality(n, inner[k].p));
    const bad = sc.internal.map((n, k) => {
      if (!(n.value > 0)) return false;
      const r = inner[k].r;
      if (r[2] - r[0] < 2 || r[3] - r[1] < 2) return false;
      sortKids(n);
      d3.treemapSquarify(n, r[0], r[1], r[2], r[3]);
      const qf = quality(n, 0);
      const since = f - lastChange.get(n);
      return qc[k] > qf * 1.4 + 0.4 && (since >= 2 || qc[k] > qf * 3);
    });
    if (!bad.some(Boolean)) continue;
    // a parent with new rows gets new rectangles: refresh its descendants with it
    sc.internal.forEach((n, k) => { if (!bad[k] && n.parent && bad[sc.internal.indexOf(n.parent)]) bad[k] = true; });
    // new epoch: fresh rows (in the real, final rectangles) for the stretched parents only
    sc.internal.forEach((n, k) => {
      if (bad[k]) { delete n._squarify; lastChange.set(n, f); }
      else n._squarify = n._sq[last];
    });
    sc.tm(sc.root);
    sc.internal.forEach(n => n._sq.push(n._squarify));
    sc.epochs.push(f);
  }
}
function buildScene(sc) {
  if (TILE === "resquarify") buildEpochs(sc);
  else if (KEYFRAMES) {
    const v = new Float64Array(nI);
    sc.kf = d3.range(nF).map(f => {
      setValues(sc, valsAt(f, v));
      sc.internal.forEach(sortKids);
      sc.tm(sc.root);
      return snap(sc);
    });
  } else {
    setValues(sc, Float64Array.from(items.map(it => it.mean)));
    sc.internal.forEach(sortKids);
  }
  sc.built = true;
}
// relocated (not just resized): its top left corner, where the label sits, travels
const moved = (a, b) => Math.abs(a.x0 - b.x0) + Math.abs(a.y0 - b.y0) > 10;
function lerpMaps(A, B, k, mark) {
  const out = new Map();
  B.forEach((b, key) => {
    const a = A.get(key) || b;
    out.set(key, {
      x0: a.x0 + (b.x0 - a.x0) * k, y0: a.y0 + (b.y0 - a.y0) * k,
      x1: a.x1 + (b.x1 - a.x1) * k, y1: a.y1 + (b.y1 - a.y1) * k,
      mv: mark && k > 0.02 && k < 0.98 && moved(a, b)
    });
  });
  return out;
}
function sceneRects(sc, t, vals) {
  if (!sc.built) buildScene(sc);
  if (TILE === "resquarify") {
    setValues(sc, vals);
    const E = sc.epochs;
    let e = 0;
    while (e + 1 < E.length && E[e + 1] <= t + 1e-9) e++;
    applyEpoch(sc, e);
    const A = snap(sc);
    const bl = e + 1 < E.length ? Math.min(BLEND, E[e + 1] - E[e]) : 0;
    if (bl > 0 && t > E[e + 1] - bl) {
      const k = d3.easeCubicInOut(clamp01((t - (E[e + 1] - bl)) / bl));
      applyEpoch(sc, e + 1);
      return lerpMaps(A, snap(sc), k, true);
    }
    return A;
  }
  if (KEYFRAMES) {
    const tc = Math.max(0, Math.min(nF - 1, t));
    const i0 = Math.floor(tc), i1 = Math.min(nF - 1, i0 + 1);
    return i0 === i1 ? sc.kf[i0] : lerpMaps(sc.kf[i0], sc.kf[i1], EASE(tc - i0), true);
  }
  setValues(sc, vals);
  sc.tm(sc.root);
  return snap(sc);
}
let sceneAll = makeScene(null);
let zoomScenes = new Map();
function zoomScene(g) {
  let sc = zoomScenes.get(g.k);
  if (!sc) { sc = makeScene(g); zoomScenes.set(g.k, sc); }
  return sc;
}
function resetScenes() { sceneAll = makeScene(null); zoomScenes = new Map(); }

// the rectangles to draw (op = opacity), for the current zoom
function targetRects(t, vals, withOutside) {
  const out = new Map();
  if (!zoom) {
    sceneRects(sceneAll, t, vals).forEach((r, k) => out.set(k, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, op: 1, mv: r.mv }));
    return out;
  }
  sceneRects(zoomScene(zoom), t, vals).forEach((r, k) => out.set(k, { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, op: 1, mv: r.mv }));
  if (withOutside) {
    // everything else, blown up by the zoom (for the zoom in / out morphs)
    const full = sceneRects(sceneAll, t, vals);
    const G = full.get(zoom.key);
    if (G && G.x1 - G.x0 > 0.5 && G.y1 - G.y0 > 0.5) {
      const sx = aw / (G.x1 - G.x0), sy = ah / (G.y1 - G.y0);
      full.forEach((r, k) => {
        if (!out.has(k)) out.set(k, {
          x0: (r.x0 - G.x0) * sx, x1: (r.x1 - G.x0) * sx,
          y0: (r.y0 - G.y0) * sy, y1: (r.y1 - G.y0) * sy, op: 0
        });
      });
    }
  }
  return out;
}

// morphs for structural changes (zoom, hidden groups)
let morph = null, morphTimer = null;
function startMorph(dur) {
  const from = new Map();
  lastDisp.forEach((r, k) => from.set(k, Object.assign({}, r)));
  targetRects(curT, curVals, true).forEach((r, k) => { if (!from.has(k)) from.set(k, Object.assign({}, r, { op: 0 })); });
  morph = { from, t0: d3.now(), dur: dur || 650 };
  if (!morphTimer) {
    morphTimer = ddplotTrack(d3.timer(() => {
      render(player.t());
      if (!morph && morphTimer) { morphTimer.stop(); morphTimer = null; }
    }));
  }
}
function displayRects(t, vals) {
  if (!morph) return targetRects(t, vals, false);
  const k = clamp01((d3.now() - morph.t0) / morph.dur), e = d3.easeCubicInOut(k);
  const tgt = targetRects(t, vals, true), from = morph.from, out = new Map();
  tgt.forEach((b, key) => {
    const a = from.get(key) || Object.assign({}, b, { op: 0 });
    out.set(key, {
      x0: a.x0 + (b.x0 - a.x0) * e, y0: a.y0 + (b.y0 - a.y0) * e,
      x1: a.x1 + (b.x1 - a.x1) * e, y1: a.y1 + (b.y1 - a.y1) * e,
      op: a.op + (b.op - a.op) * e,
      mv: b.mv || (e > 0.02 && e < 0.98 && moved(a, b))
    });
  });
  from.forEach((a, key) => { if (!out.has(key)) out.set(key, Object.assign({}, a, { op: a.op * (1 - e) })); });
  if (k >= 1) morph = null;
  return out;
}

// ---- DOM ---------------------------------------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "clip").append("rect")
  .attr("x", -1).attr("y", -1).attr("width", aw + 2).attr("height", ah + 2);
const gArea = svg.append("g").attr("class", "dd-treemap").attr("transform", `translate(${ax},${ay})`)
  .attr("clip-path", `url(#${uid}clip)`);
const gGroups = gArea.append("g").attr("class", "groups");
const gLeaves = gArea.append("g").attr("class", "tiles");
const gOutl = gArea.append("g").attr("class", "outlines").style("pointer-events", "none");
const SVGNS = "http://www.w3.org/2000/svg";

items.forEach(it => {
  const g = gLeaves.append("g").attr("class", "tile").style("display", "none");
  const rect = g.append("rect").attr("class", "tile-rect");
  const name = g.append("text").attr("class", "tile-name").style("font-weight", 700)
    .style("pointer-events", "none").style("display", "none");
  const val = g.append("text").attr("class", "tile-val").style("pointer-events", "none")
    .style("display", "none");
  g.datum(it);
  it.el = { g: g.node(), rect: rect.node(), name: name.node(), val: val.node() };
  it.vis = false; it._nm = null; it._vl = null; it._nv = false; it._vv = false;
});
groups.forEach(gr => {
  const g = gGroups.append("g").attr("class", "group").style("display", "none");
  const rect = g.append("rect").attr("class", "group-rect");
  const txt = g.append("text").attr("class", "group-head").style("pointer-events", "none");
  const tn = txt.append("tspan").style("font-weight", 700);
  const ts = txt.append("tspan").style("fill-opacity", 0.8);
  gr.el = { g: g.node(), rect: rect.node(), txt: txt.node(), tn: tn.node(), ts: ts.node() };
  gr.vis = false;
});
const hoverOutline = gOutl.append("rect").attr("fill", "none").attr("stroke", axisCol)
  .attr("stroke-width", 2).style("display", "none");
const overlay = gArea.append("rect").attr("class", "dd-hit").attr("width", aw).attr("height", ah)
  .attr("fill", "transparent");

function setA(el, k, v) { el.setAttribute(k, v); }
function show(el, on) { el.style.display = on ? "" : "none"; }

// ---- header DOM ----------------------------------------------------------------------------------------
const wm = ddWatermark(svg, { x: W - padR, y: wmTop + wmSize * 0.8, size: wmSize, font, color: axisCol, anchor: "end", opacity: 0.17 });
const gInfo = svg.append("g").attr("class", "dd-info").attr("transform", `translate(${padL},${infoY})`)
  .style("user-select", "none").style("-webkit-user-select", "none");
const bcAll = gInfo.append("text").attr("class", "dd-crumb").attr("y", 17).style("font-size", "12px")
  .style("font-weight", 700).style("fill", DD_ACCENT).style("cursor", "pointer").text("All").style("display", "none");
bcAll.append("title").text("Zoom out (Escape)");
const bcSep = gInfo.append("text").attr("y", 17).style("font-size", "12px").style("fill", axisCol)
  .style("fill-opacity", 0.45).text("›").style("display", "none");
const bcName = gInfo.append("text").attr("y", 17).style("font-size", "12px").style("font-weight", 700)
  .style("fill", axisCol).style("display", "none");
const totCap = gInfo.append("text").attr("y", 16).style("font-size", "9.5px").style("letter-spacing", "0.06em")
  .style("fill", axisCol).style("fill-opacity", 0.55).text("TOTAL");
const totVal = gInfo.append("text").attr("y", 17).style("font-size", "15px").style("font-weight", 700)
  .style("fill", axisCol).style("font-variant-numeric", "tabular-nums");
const totChg = gInfo.append("text").attr("y", 17).style("font-size", "11px").style("font-weight", 600)
  .style("font-variant-numeric", "tabular-nums");
// growth heat map scale
const gHeat = gInfo.append("g").attr("class", "dd-heat").style("display", "none");
(function () {
  const grad = defs.append("linearGradient").attr("id", uid + "heat");
  [0, 0.25, 0.5, 0.75, 1].forEach(p => grad.append("stop").attr("offset", p * 100 + "%")
    .attr("stop-color", heat(-heatQ + 2 * heatQ * p)));
  const capW = heatCapW;
  gHeat.append("text").attr("y", 16).style("font-size", "9.5px").style("fill", axisCol).style("fill-opacity", 0.55).text("Growth");
  gHeat.append("rect").attr("x", capW).attr("y", 6).attr("width", heatW).attr("height", 7).attr("rx", 2)
    .attr("fill", `url(#${uid}heat)`);
  const f = d3.format("+.0%");
  [[0, "start", f(-heatQ).replace("-", "−")], [heatW / 2, "middle", "0"], [heatW, "end", f(heatQ)]].forEach(d =>
    gHeat.append("text").attr("x", capW + d[0]).attr("y", 23).attr("text-anchor", d[1])
      .style("font-size", "8.5px").style("fill", axisCol).style("fill-opacity", 0.6).text(d[2]));
  gHeat.node().__w = capW + heatW;
})();

// ---- interactions state --------------------------------------------------------------------------------
let mouse = null, hover = null, legendFocus = null, lastHoverLeaf = null;
let tip = null; // created last (on top)

function hitTest(disp) {
  if (!mouse) return null;
  const x = mouse[0] - ax, y = mouse[1] - ay;
  if (x < 0 || y < 0 || x > aw || y > ah) return null;
  for (let k = 0; k < nI; k++) {
    const it = items[k], r = disp.get(it.key);
    if (r && r.op > 0.5 && r.x1 - r.x0 > 0.3 && r.y1 - r.y0 > 0.3 &&
        x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return { type: "leaf", it };
  }
  if (hasGroup && !zoom) {
    for (const g of groups) {
      const r = disp.get(g.key);
      if (!r || r.op < 0.5 || hidden.has(g.name)) continue;
      const hh = gp + headerH(r.x1 - r.x0, r.y1 - r.y0);
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y0 + Math.max(hh, gp) + 0.5) return { type: "group", g };
    }
  }
  // in the thin gaps between tiles: keep the last tile
  if (lastHoverLeaf) {
    const r = disp.get(lastHoverLeaf.key);
    if (r && r.op > 0.5 && x >= r.x0 - groupGap - 1 && x <= r.x1 + groupGap + 1 &&
        y >= r.y0 - groupGap - 1 && y <= r.y1 + groupGap + 1) return { type: "leaf", it: lastHoverLeaf };
  }
  return null;
}
function focusGroup() { return legendFocus || (hover && hover.type === "group" ? hover.g : null); }

// ---- labels ----------------------------------------------------------------------------------------------
const maxFs = Math.max(8, +o.maxLabelSize || 26), minFs = 9;
function fitName(it, maxW, fs) {
  if (it.nameW10 * fs / 10 <= maxW) return it.name;
  if (!it.pre) {
    it.pre = [0];
    for (let k = 1; k < it.name.length; k++) it.pre.push(tw(it.name.slice(0, k).replace(/\s+$/, "") + "…", 10, 700));
  }
  let k = it.pre.length - 1;
  while (k > 0 && it.pre[k] * fs / 10 > maxW) k--;
  if (k < Math.min(3, it.name.length - 1)) return null;
  return it.name.slice(0, k).replace(/\s+$/, "") + "…";
}
function metricText(it, t, v, total) {
  if (labelMode === "share") return total > 0 ? fPct(v / total) : "–";
  if (labelMode === "growth") {
    const g = growthAt(it, t);
    return g === null ? "–" : (g >= 0 ? "▲ " : "▼ ") + fGrowth(g).replace("-", "−").replace("+", "+");
  }
  return fmt.short(ddRaceAt(it.s, t, EASE));
}

// ---- render -------------------------------------------------------------------------------------------------
function render(t) {
  curT = t;
  const vals = valsAt(t, curVals);
  const disp = displayRects(t, vals);
  lastDisp = disp;
  wm.text(player.label(t));

  // totals (of the zoomed group when zoomed in)
  const scope = zoom ? zoom.items : items;
  let total = 0;
  scope.forEach(it => { total += vals[it.i]; });
  const gTotals = new Map();
  groups.forEach(g => { let s = 0; g.items.forEach(it => { s += vals[it.i]; }); gTotals.set(g.k, s); });

  hover = hitTest(disp);
  if (hover && hover.type === "leaf") lastHoverLeaf = hover.it; else if (!hover) lastHoverLeaf = null;
  overlay.style("cursor", hover ? "pointer" : null);
  const fg = focusGroup();
  const anyPin = pinned.size > 0 && scope.some(it => pinned.has(it.name) && !isHidden(it));

  // groups
  groups.forEach(g => {
    const r = disp.get(g.key), el = g.el;
    const w = r ? r.x1 - r.x0 : 0, h = r ? r.y1 - r.y0 : 0;
    const on = !!r && r.op > 0.01 && w > 1 && h > 1;
    if (on !== g.vis) { show(el.g, on); g.vis = on; }
    if (!on) return;
    setA(el.rect, "x", r.x0); setA(el.rect, "y", r.y0);
    setA(el.rect, "width", w); setA(el.rect, "height", h);
    setA(el.rect, "rx", Math.min(4, w / 4, h / 4));
    const frame = colorBy === "growth" ? "#4a5261" : g.frame;
    setA(el.rect, "fill", frame);
    el.g.style.opacity = r.op * (fg && fg !== g ? 0.3 : 1);
    const hh = headerH(w, h);
    if (hh >= 10 && r.op > 0.5 && !r.mv) {
      const fs = Math.min(11.5, hh - 4.5);
      const gt = gTotals.get(g.k);
      const stats = "  " + fmt.short(gt) + (total > 0 ? " · " + fPct(gt / total) : "");
      const maxW = w - 2 * gp - 8;
      const nw = tw(g.name, fs, 700);
      let nm = g.name, sx = stats;
      if (nw + tw(stats, fs) > maxW) {
        sx = "  " + fmt.short(gt);
        if (nw + tw(sx, fs) > maxW) {
          sx = "";
          nm = ms.truncate(g.name, maxW, fs, 700);
          if (nm.length < 3) nm = "";
        }
      }
      el.txt.style.display = "";
      setA(el.txt, "x", r.x0 + gp + 4);
      setA(el.txt, "y", r.y0 + gp + hh / 2 + fs * 0.36);
      el.txt.style.fontSize = fs + "px";
      el.txt.style.fill = textOn(frame);
      if (el.tn.textContent !== nm) el.tn.textContent = nm;
      if (el.ts.textContent !== sx) el.ts.textContent = sx;
    } else el.txt.style.display = "none";
  });

  // tiles
  for (let k = 0; k < nI; k++) {
    const it = items[k], r = disp.get(it.key), el = it.el;
    const w = r ? r.x1 - r.x0 : 0, h = r ? r.y1 - r.y0 : 0;
    const on = !!r && r.op > 0.01 && w > 0.2 && h > 0.2;
    if (on !== it.vis) { show(el.g, on); it.vis = on; }
    if (!on) continue;
    setA(el.rect, "x", r.x0); setA(el.rect, "y", r.y0);
    setA(el.rect, "width", w); setA(el.rect, "height", h);
    setA(el.rect, "rx", Math.min(2.5, w / 4, h / 4));
    const fill = tileColor(it, t);
    setA(el.rect, "fill", fill);
    const pres = ddRacePresence(it.s, t, EASE);
    let f = 1;
    if (fg && it.group !== fg) f = 0.28;
    else if (anyPin && !pinned.has(it.name)) f = 0.5;
    el.g.style.opacity = r.op * (0.3 + 0.7 * pres) * f;
    // labels
    let nameOn = false, valOn = false;
    if (labelsOn && r.op > 0.5 && !r.mv && pres > 0.5 && w >= 24 && h >= 13) {
      let fs = Math.min(maxFs, Math.max(minFs, Math.min(h * 0.3, w * 0.17, Math.sqrt(w * h) * 0.14)));
      const px = Math.max(3, Math.min(8, fs * 0.42));
      let nm = h >= fs * 1.05 + 2 * px - 2 ? fitName(it, (w - 2 * px) * 0.97, fs) : null;
      if (!nm && fs > minFs && h >= minFs + 6) { fs = minFs; nm = fitName(it, (w - 6) * 0.97, fs); }
      if (nm) {
        const pxx = fs === minFs ? Math.min(px, 3) : px;
        const col = textOn(fill);
        nameOn = true;
        if (it._nm !== nm) { el.name.textContent = nm; it._nm = nm; }
        setA(el.name, "x", r.x0 + pxx);
        setA(el.name, "y", r.y0 + pxx + fs * 0.8);
        el.name.style.fontSize = fs + "px";
        el.name.style.fill = col;
        const fs2 = Math.max(8, fs * 0.78);
        if (h >= 2 * pxx + fs * 1.05 + fs2 * 1.25) {
          const txt = metricText(it, t, vals[it.i], total);
          if (tw(txt, fs2, 400) <= (w - 2 * pxx) * 0.97) {
            valOn = true;
            if (it._vl !== txt) { el.val.textContent = txt; it._vl = txt; }
            setA(el.val, "x", r.x0 + pxx);
            setA(el.val, "y", r.y0 + pxx + fs * 0.8 + fs2 * 1.25);
            el.val.style.fontSize = fs2 + "px";
            el.val.style.fill = col;
            el.val.style.fillOpacity = 0.85;
          }
        }
      }
    }
    if (nameOn !== it._nv) { show(el.name, nameOn); it._nv = nameOn; }
    if (valOn !== it._vv) { show(el.val, valOn); it._vv = valOn; }
  }

  drawOutlines(disp);
  drawHeader(t, total, scope);
  drawTip(t, vals, total, gTotals);
}

function drawOutlines(disp) {
  const list = items.filter(it => pinned.has(it.name)).map(it => ({ it, r: disp.get(it.key) }))
    .filter(d => d.r && d.r.op > 0.5 && d.r.x1 - d.r.x0 > 1 && d.r.y1 - d.r.y0 > 1);
  const sel = gOutl.selectAll("rect.pin").data(list, d => d.it.key);
  sel.exit().remove();
  sel.enter().append("rect").attr("class", "pin").attr("fill", "none").attr("stroke", axisCol)
    .attr("stroke-width", 2.5).merge(sel)
    .attr("x", d => d.r.x0 + 1.25).attr("y", d => d.r.y0 + 1.25)
    .attr("width", d => Math.max(0, d.r.x1 - d.r.x0 - 2.5)).attr("height", d => Math.max(0, d.r.y1 - d.r.y0 - 2.5))
    .attr("rx", 2);
  let hr = null;
  if (hover && hover.type === "leaf") hr = disp.get(hover.it.key);
  else if (hover && hover.type === "group") hr = disp.get(hover.g.key);
  if (hr) {
    hoverOutline.style("display", null).attr("stroke", hover.type === "leaf" ? "#111111" : axisCol)
      .attr("x", hr.x0 + 1).attr("y", hr.y0 + 1)
      .attr("width", Math.max(0, hr.x1 - hr.x0 - 2)).attr("height", Math.max(0, hr.y1 - hr.y0 - 2))
      .attr("rx", 2);
  } else hoverOutline.style("display", "none");
}

function drawHeader(t, total, scope) {
  let x = 0;
  const z = !!zoom;
  bcAll.style("display", z ? null : "none");
  bcSep.style("display", z ? null : "none");
  bcName.style("display", z ? null : "none");
  if (z) {
    bcAll.attr("x", 0);
    x = tw("All", 12, 700) + 6;
    bcSep.attr("x", x);
    x += tw("›", 12) + 6;
    const nm = ms.truncate(zoom.name, 140, 12, 700);
    bcName.attr("x", x).text(nm);
    x += tw(nm, 12, 700) + 14;
  }
  totCap.attr("x", x);
  x += tw("TOTAL", 9.5) + 9;
  const tv = fmt.short(total);
  totVal.attr("x", x).text(tv);
  x += tw(tv, 15, 700) + 8;
  let chg = "";
  if (t >= 1 - 1e-9) {
    let prev = 0;
    const pv = valsAt(t - 1);
    scope.forEach(it => { prev += pv[it.i]; });
    if (prev > 0) {
      const g = total / prev - 1;
      chg = (g >= 0 ? "▲ " : "▼ ") + fGrowth(g).replace("-", "−");
      totChg.style("fill", g >= 0 ? UP : DOWN);
    }
  }
  totChg.attr("x", x).text(chg);
  x += (chg ? tw(chg, 11, 600) : 0) + 18;
  const hw = gHeat.node().__w;
  const limit = (ctlOwnRow ? rightEdgeAt(infoY) : ctlX) - padL - 10;
  const heatOn = colorBy === "growth" && x + hw <= limit;
  gHeat.style("display", heatOn ? null : "none").attr("transform", `translate(${x},0)`);
}

function drawTip(t, vals, total, gTotals) {
  if (!tip) return;
  if (!hover || o.tooltip === false || !mouse) { tip.hide(); return; }
  const period = player.label(t);
  if (hover.type === "leaf") {
    const it = hover.it, v = ddRaceAt(it.s, t, EASE), vv = vals[it.i];
    const rows = [{ name: period, value: "", dim: true }];
    rows.push({ name: o.valueName || "Value", value: fmt.value(v), bold: true });
    rows.push({ name: zoom ? "Share of " + zoom.name : "Share of total", value: total > 0 ? fPct(vv / total) : "–" });
    if (it.group && !zoom) {
      const gt = gTotals.get(it.group.k);
      rows.push({ name: "Share of " + it.group.name, value: gt > 0 ? fPct(vv / gt) : "–" });
    }
    const scope = (zoom ? zoom.items : items).filter(x => vals[x.i] > 0);
    const rank = scope.filter(x => vals[x.i] > vv).length + 1;
    if (vv > 0) rows.push({ name: "Rank", value: "#" + rank, extra: "of " + scope.length });
    const g = growthAt(it, t);
    if (t >= 1 - 1e-9) {
      const prev = ddRaceAt(it.s, t - 1, EASE);
      rows.push({
        name: "Since " + player.label(t - 1),
        value: g === null ? (prev === null ? "new" : "–") : (g >= 0 ? "▲ " : "▼ ") + fGrowth(g).replace("-", "−"),
        valueColor: g === null ? null : (g >= 0 ? UP : DOWN),
        extra: (g !== null && v !== null && prev !== null) ? ((v - prev >= 0 ? "+" : "") + fmt.short(v - prev)) : null
      });
    }
    if (it.group) rows.push({ name: it.group.name, value: "", sep: true, color: it.group.color, dim: true });
    if (pinned.has(it.name)) rows.push({ name: "Pinned (click to unpin)", value: "", dim: true, sep: !it.group });
    tip.show(it.name, rows, mouse[0], mouse[1], tileColor(it, t));
  } else {
    const gr = hover.g, gt = gTotals.get(gr.k);
    const present = gr.items.filter(x => vals[x.i] > 0).sort((a, b) => vals[b.i] - vals[a.i]);
    const rows = [{ name: period, value: "", dim: true },
      { name: "Total", value: fmt.value(gt), bold: true },
      { name: "Share of total", value: total > 0 ? fPct(gt / total) : "–" },
      { name: "Items", value: String(present.length) }];
    present.slice(0, 4).forEach((x, k) => rows.push({ name: x.name, value: fmt.short(vals[x.i]), color: x.color,
      sep: k === 0, extra: gt > 0 ? fPct(vals[x.i] / gt) : null }));
    rows.push({ name: "Click to zoom in", value: "", dim: true, sep: true });
    tip.show(gr.name, rows, mouse[0], mouse[1], gr.color);
  }
}

function redraw() { render(curT); }
function redrawSoon() { if (!player.playing() && !morph) redraw(); }

// ---- pointer --------------------------------------------------------------------------------------------------
overlay
  .on("mousemove", function (a) { mouse = ddPtr(a, svg.node()); redrawSoon(); })
  .on("mouseleave", function () { mouse = null; hover = null; lastHoverLeaf = null; redrawSoon(); if (tip) tip.hide(); })
  .on("click", function (a) {
    mouse = ddPtr(a, svg.node());
    const h = hitTest(lastDisp);
    if (!h) return;
    if (h.type === "group") { zoomTo(h.g); return; }
    const it = h.it;
    const on = !pinned.has(it.name);
    if (on) pinned.add(it.name); else pinned.delete(it.name);
    st.pinned = Array.from(pinned);
    const tot = d3.sum((zoom ? zoom.items : items), x => curVals[x.i]);
    send("clicked", {
      item: it.name, group: it.group ? it.group.name : null,
      value: ddRaceAt(it.s, curT, EASE), share: tot > 0 ? curVals[it.i] / tot : null,
      period: frames[player.frameIndex(curT)], pinned: on
    });
    redraw();
  });

function zoomTo(g) {
  if (g === zoom) return;
  if (g && hidden.has(g.name)) return;
  startMorph(700);
  zoom = g;
  st.zoom = g ? g.name : null;
  hover = null; lastHoverLeaf = null;
  if (tip) tip.hide();
  send("zoom", g ? g.name : null);
  redraw();
}
bcAll.on("click", function () { zoomTo(null); })
  .on("mouseenter", function () { bcAll.style("text-decoration", "underline"); })
  .on("mouseleave", function () { bcAll.style("text-decoration", null); });
svg.on("keydown.tmrace", function (a) {
  const ev = ddEvOf(a);
  if (ev && ev.key === "Escape" && zoom) { zoomTo(null); ev.preventDefault(); }
});

// ---- legend -------------------------------------------------------------------------------------------------
const gLegend = svg.append("g").attr("class", "dd-legend").attr("transform", `translate(${padL},${legendTop})`)
  .style("user-select", "none").style("-webkit-user-select", "none");
const legendSel = gLegend.selectAll("g.item").data(legendItems).enter().append("g")
  .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 20})`).style("cursor", "pointer");
legendSel.append("rect").attr("class", "bg").attr("x", -4).attr("width", d => d.w - 6).attr("height", 20)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legendSel.append("rect").attr("x", 1).attr("y", 4.5).attr("width", 11).attr("height", 11).attr("rx", 3)
  .attr("fill", d => d.g.color);
legendSel.append("text").attr("x", 17).attr("y", 10).attr("dy", "0.35em")
  .style("font-size", "11.5px").style("fill", axisCol).text(d => d.g.name);
legendSel.append("title").text("Click to hide or show, double-click to isolate");
function styleLegend() {
  legendSel.style("opacity", d => hidden.has(d.g.name) ? 0.4 : 1);
  legendSel.select("text").style("text-decoration", d => hidden.has(d.g.name) ? "line-through" : null);
}
function changeHidden(fn) {
  startMorph(650);
  fn();
  st.hidden = Array.from(hidden);
  if (zoom && hidden.has(zoom.name)) { zoom = null; st.zoom = null; send("zoom", null); }
  legendFocus = null;
  resetScenes();
  styleLegend();
  redraw();
}
let clickTimer = null;
legendSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (!hidden.has(d.g.name)) { legendFocus = d.g; redrawSoon(); }
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    legendFocus = null; redrawSoon();
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.g.name)) {
        if (groups.length - hidden.size <= 1) return;
        changeHidden(() => hidden.add(d.g.name));
      } else changeHidden(() => hidden.delete(d.g.name));
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = groups.length - hidden.size === 1 && !hidden.has(d.g.name);
    changeHidden(() => {
      hidden.clear();
      if (!onlyThis) groups.forEach(g => { if (g.name !== d.g.name) hidden.add(g.name); });
    });
  });
styleLegend();

// ---- controls ---------------------------------------------------------------------------------------------------
const gCtl = svg.append("g").attr("class", "dd-controls").attr("transform", `translate(${ctlX},${ctlY})`)
  .style("user-select", "none").style("-webkit-user-select", "none");
let cxx = 0;
ctlGroups.forEach(cg => {
  const g = gCtl.append("g").attr("class", "seg seg-" + cg.id).attr("transform", `translate(${cxx},0)`);
  cxx += cg.w + ctlGap;
  if (cg.capW) g.append("text").attr("x", 0).attr("y", ctlH / 2).attr("dy", "0.35em")
    .style("font-size", "10px").style("fill", axisCol).style("fill-opacity", 0.55).text(cg.cap);
  const bw = cg.w - cg.capW;
  const b0 = g.append("g").attr("transform", `translate(${cg.capW},0)`);
  b0.append("rect").attr("width", bw).attr("height", ctlH).attr("rx", 5)
    .attr("fill", bgcol).attr("stroke", axisCol).attr("stroke-opacity", 0.2);
  let ix = 0;
  cg.items.forEach((it, k) => {
    it.x = ix; ix += it.w;
    const b = b0.append("g").attr("class", "btn btn-" + it.k).attr("transform", `translate(${it.x},0)`).style("cursor", "pointer");
    b.append("title").text(it.tip);
    it.bg = b.append("rect").attr("x", 1.5).attr("y", 1.5).attr("width", it.w - 3).attr("height", ctlH - 3)
      .attr("rx", 4).attr("fill", DD_ACCENT).attr("fill-opacity", 0);
    if (k > 0) b0.append("line").attr("x1", it.x).attr("x2", it.x).attr("y1", 4).attr("y2", ctlH - 4)
      .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    it.text = b.append("text").attr("x", it.w / 2).attr("y", ctlH / 2).attr("dy", "0.35em")
      .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
      .style("fill", axisCol).text(it.t);
    b.on("mouseenter", function () { if (!isActive(cg, it)) it.bg.attr("fill-opacity", 0.06); })
      .on("mouseleave", function () { styleControls(); })
      .on("click", function () {
        if (cg.id === "label") { labelMode = it.k; st.labelMode = it.k; }
        else { colorBy = it.k; st.colorBy = it.k; }
        styleControls();
        redrawSoon();
      });
  });
});
function isActive(cg, it) { return cg.id === "label" ? labelMode === it.k : colorBy === it.k; }
function styleControls() {
  ctlGroups.forEach(cg => cg.items.forEach(it => {
    const on = isActive(cg, it);
    it.bg.attr("fill-opacity", on ? 0.14 : 0);
    it.text.style("fill", on ? DD_ACCENT : axisCol);
  }));
}
styleControls();

tip = ddTooltip(svg, { font, axisCol, bgcol, W, H, measure: ms });
player.start();
