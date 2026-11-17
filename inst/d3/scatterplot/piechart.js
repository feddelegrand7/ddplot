// pie_chart(): interactive pie and donut chart.
//
// data: rows {label, value, order, color, other} (one per slice, already
// aggregated in R; "other" marks the combined slice). Slices are labelled
// inside when they are large enough and outside with leader lines otherwise.
// Hovering pulls a slice out; the legend hides (click) or isolates
// (double-click) slices and the pie is re-normalised. A donut shows the total
// in its centre, or the hovered slice. The hidden slices are kept in
// r2d3.ddplotState so a Shiny update or a resize keeps them. Works with D3 v5
// and v6.

const o = options;
const isV6 = typeof d3.pointer === "function";
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const bgcol = o.bgcol || "white";
const PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e"];
const uid = "ddpi" + Math.random().toString(36).slice(2, 9);
const arr = v => (v === null || v === undefined) ? [] : [].concat(v);
const ptr = (a, node) => isV6 ? d3.pointer(a, node) : d3.mouse(node);
const TAU = 2 * Math.PI;

svg.style("background-color", bgcol).style("font-family", font);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
if (!state.pie || state.pie.key !== o.stateKey) state.pie = { key: o.stateKey };
const st = state.pie;

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
const slices = (data || []).map((r, k) => ({
  label: String(r.label), value: +r.value, order: +r.order, color: r.color, other: !!r.other, k
})).filter(s => isFinite(s.value) && s.value > 0);
if (!slices.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}
const bySize = slices.slice().sort((a, b) => (b.value - a.value) || (a.order - b.order));
bySize.forEach((s, k) => { s.sizeRank = k; });
if (o.sort === "descending") slices.sort((a, b) => (a.other - b.other) || (b.value - a.value) || (a.order - b.order));
else if (o.sort === "ascending") slices.sort((a, b) => (a.other - b.other) || (a.value - b.value) || (a.order - b.order));
else slices.sort((a, b) => (a.other - b.other) || (a.order - b.order));
// colours: given in R, or a D3 scheme by size
const scheme = o.colorCategory ? d3["scheme" + o.colorCategory] : null;
const schemeCols = (scheme && scheme.length && typeof scheme[0] === "string") ? scheme
  : (scheme && scheme.length ? scheme[scheme.length - 1] : null);
slices.forEach(s => {
  if (!s.color) s.color = s.other ? "#b8bdc4" : (schemeCols || PALETTE)[s.sizeRank % (schemeCols || PALETTE).length];
});

const hidden = new Set(arr(st.hidden).filter(l => slices.some(s => s.label === l)));
if (hidden.size >= slices.length) hidden.clear();
const pulled = new Set(arr(o.highlight).map(String));
const firstRender = !st.drawn;
st.drawn = true;
const others = arr(o.otherMembers);

// ---- formats ----------------------------------------------------------------------
const fmtCore = o.valueFormat ? d3.format(o.valueFormat) : null;
const pre = o.valuePrefix || "", suf = o.valueSuffix || "";
function autoFmt(a) {
  if (a >= 1e6) return d3.format(".3~s")(a).replace("G", "B");
  if (Number.isInteger(a)) return d3.format(",")(a);
  return d3.format(a >= 100 ? ",.1~f" : ",.2~f")(a);
}
const fmtV = v => pre + (fmtCore ? fmtCore(v) : autoFmt(v)) + suf;
function fmtShare(p) {
  if (p > 0 && p < 0.001) return "<0.1%";
  return d3.format(p < 0.1 ? ".1~%" : ".0%")(p);
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
function textOn(color) {
  const c = d3.rgb(color);
  const lin = u => { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  return L > 0.36 ? "#222222" : "#ffffff";
}

// ---- shares -------------------------------------------------------------------------
let total = 0;
function computeShares() {
  const vis = slices.filter(s => !hidden.has(s.label));
  total = d3.sum(vis, s => s.value);
  slices.forEach(s => { s.visible = !hidden.has(s.label); s.share = s.visible && total ? s.value / total : 0; });
  const ranked = vis.slice().sort((a, b) => b.value - a.value);
  slices.forEach(s => { s.rank = ranked.indexOf(s) + 1; });
}
computeShares();

// ---- layout: title ----------------------------------------------------------------------
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
top += 6;
const areaX = padL, areaY = top, areaW = Math.max(60, W - padL - padR), areaH = Math.max(60, H - top - 10);

// ---- legend layout ------------------------------------------------------------------------
const lfs = +o.labelHeight || 12, lfont = o.labelFont || font;
const rowH = Math.max(20, lfs + 9);
const pctW = tw("100%", lfs - 1, 600);
const nameW = d3.max(slices, s => tw(s.label, lfs)) || 0;
let legendSide = null, legW = 0, legH = 0, legRows = [], legMore = 0;
if (o.legend) {
  const rightW = Math.min(areaW * 0.42, 12 + 8 + nameW + 12 + pctW + 8);
  if (areaW >= areaH * 1.2 && areaW - rightW >= 150) {
    legendSide = "right";
    legW = rightW;
    const maxRows = Math.max(1, Math.floor(areaH / rowH));
    const rows = slices.length > maxRows ? maxRows - 1 : slices.length;
    legRows = slices.slice(0, rows).map((s, k) => ({ s, x: 0, y: k * rowH, w: legW }));
    legMore = slices.length - rows;
    legH = (rows + (legMore ? 1 : 0)) * rowH;
  } else {
    legendSide = "bottom";
    let lx = 0, row = 0;
    const items = slices.map(s => ({ s, w: 12 + 6 + Math.min(tw(s.label, lfs), areaW * 0.6) + 6 + pctW + 16 }));
    const maxRows = Math.max(1, Math.floor(areaH * 0.34 / rowH));
    items.forEach(it => {
      if (lx > 0 && lx + it.w > areaW) { row++; lx = 0; }
      it.x = lx; it.row = row; lx += it.w;
    });
    legRows = items.filter(it => it.row < maxRows);
    legMore = items.length - legRows.length;
    if (legMore && legRows.length) { legRows.pop(); legMore++; }
    // centre each row
    d3.range(maxRows).forEach(r => {
      const its = legRows.filter(it => it.row === r);
      if (!its.length) return;
      const wr = d3.max(its, it => it.x + it.w) - 16;
      its.forEach(it => { it.x += (areaW - wr - (legMore && r === d3.max(legRows, q => q.row) ? tw("+99 more", lfs) + 10 : 0)) / 2; });
    });
    legRows.forEach(it => { it.y = it.row * rowH; });
    legH = (d3.max(legRows, it => it.row) + 1) * rowH;
  }
}
const box = legendSide === "right"
  ? { x: areaX, y: areaY, w: areaW - legW - 18, h: areaH }
  : { x: areaX, y: areaY, w: areaW, h: areaH - (legendSide === "bottom" ? legH + 10 : 0) };

// ---- geometry ------------------------------------------------------------------------------
const a0 = (+o.startAngle || 0) * Math.PI / 180;
const a1 = ((o.endAngle === null || o.endAngle === undefined) ? 360 : +o.endAngle) * Math.PI / 180;
const span = Math.min(TAU, a1 - a0);
const full = span >= TAU - 1e-6;
// the extent of the unit sector (d3 angles: clockwise from 12 o'clock)
const ext = (function () {
  const pts = [[0, 0], [Math.sin(a0), -Math.cos(a0)], [Math.sin(a0 + span), -Math.cos(a0 + span)]];
  for (let k = Math.ceil(a0 / (Math.PI / 2)); k * Math.PI / 2 <= a0 + span; k++) {
    const a = k * Math.PI / 2;
    pts.push([Math.round(Math.sin(a)), Math.round(-Math.cos(a))]);
  }
  return { x0: d3.min(pts, p => p[0]), x1: d3.max(pts, p => p[0]), y0: d3.min(pts, p => p[1]), y1: d3.max(pts, p => p[1]) };
})();
const POP = 8; // how far a hovered or pulled slice moves out
function fitRadius(bw, bh) {
  return Math.max(10, Math.min(bw / (ext.x1 - ext.x0), bh / (ext.y1 - ext.y0)) - POP - 2);
}
const labelParts = arr(o.labels);
const lab = { label: labelParts.indexOf("label") >= 0, value: labelParts.indexOf("value") >= 0, percent: labelParts.indexOf("percent") >= 0 };
const anyLabel = lab.label || lab.value || lab.percent;
const sfs = 11; // slice label font size
function innerOf(R) {
  const ir = +o.innerRadius || 0;
  return ir <= 0 ? 0 : (ir < 1 ? ir * R : Math.min(ir, R * 0.92));
}
function insideLines(s) {
  const out = [];
  if (lab.label) out.push({ t: s.label, w: 700 });
  const vp = [];
  if (lab.value) vp.push(fmtV(s.value));
  if (lab.percent) vp.push(fmtShare(s.share));
  if (vp.length) out.push({ t: vp.join(" · "), w: lab.label ? 400 : 700 });
  return out;
}
function outsideText(s) {
  const vp = [];
  if (lab.value) vp.push(fmtV(s.value));
  if (lab.percent) vp.push(fmtShare(s.share));
  return { name: lab.label ? s.label : "", rest: vp.join(" · ") };
}
function outsideW(s) {
  const t = outsideText(s);
  return (t.name ? tw(t.name, sfs, 600) + (t.rest ? 5 : 0) : 0) + (t.rest ? tw(t.rest, sfs) : 0);
}

// angles of the visible slices (d3.pie semantics for the padding)
const padAngle = (o.padAngle === null || o.padAngle === undefined) ? 0 : +o.padAngle;
function layoutAngles() {
  const vis = slices.filter(s => s.visible);
  const n = vis.length;
  const pa = Math.min(span / Math.max(1, n), padAngle);
  const k = total ? (span - n * pa) / total : 0;
  let a = a0;
  slices.forEach(s => {
    if (!s.visible) { s.t = { startAngle: a, endAngle: a, padAngle: 0 }; return; }
    const e = a + s.value * k + pa;
    s.t = { startAngle: a, endAngle: e, padAngle: pa };
    a = e;
  });
}
function fitsInside(s, R, ri) {
  const lines = insideLines(s);
  if (!lines.length) return true;
  const ang = s.t.endAngle - s.t.startAngle - s.t.padAngle;
  const rl = ri > 0 ? (ri + R) / 2 : R * 0.62;
  const wMax = d3.max(lines, l => tw(l.t, sfs, l.w));
  const hNeed = lines.length * (sfs + 2) + 2;
  if (R - ri < hNeed + 6 && ri > 0) return false;
  // the chord at the label radius, and the radial room
  const chord = 2 * rl * Math.sin(Math.min(Math.PI / 2, ang / 2));
  return ang < Math.PI ? (chord >= wMax + 8 && ang * rl >= hNeed + 4) : true;
}
layoutAngles();
const wantOutside = s => o.labelPosition === "outside" ? true : (o.labelPosition === "inside" ? false : null);
let R = fitRadius(box.w, box.h);
let ri = innerOf(R);
let outsideRoom = false;
if (anyLabel && o.labelPosition !== "inside") {
  const outs = slices.filter(s => s.visible && (wantOutside(s) === true || !fitsInside(s, R, ri)));
  if (outs.length) {
    // room for the outside labels on both sides
    const allOut = o.labelPosition === "outside" ? slices : slices.filter(s => !fitsInside(s, R * 0.75, innerOf(R * 0.75)));
    const lw = Math.min(box.w * 0.3, (d3.max(allOut.length ? allOut : outs, outsideW) || 40) + 24);
    R = Math.min(R, fitRadius(box.w - 2 * lw, box.h - 2 * (sfs + 6)));
    outsideRoom = true;
  }
}
if (o.outerRadius !== "auto" && isFinite(+o.outerRadius) && +o.outerRadius > 0) R = Math.min(R, +o.outerRadius);
R = Math.max(12, R);
ri = innerOf(R);
const cx0 = box.x + box.w / 2 - R * (ext.x0 + ext.x1) / 2;
const cy0 = box.y + box.h / 2 - R * (ext.y0 + ext.y1) / 2;

const arc = d3.arc().innerRadius(ri).outerRadius(R).cornerRadius(+o.cornerRadius || 0);
if (o.padRadius !== null && o.padRadius !== undefined) arc.padRadius(+o.padRadius);
const midAngle = t => (t.startAngle + t.endAngle) / 2;

// ---- static chrome ----------------------------------------------------------------
const defs = svg.append("defs");
const shadow = defs.append("filter").attr("id", uid + "-shadow")
  .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
  .attr("flood-color", "#000").attr("flood-opacity", 0.14);

const gPie = svg.append("g").attr("transform", `translate(${cx0},${cy0})`);
const gSlices = gPie.append("g");
const gLeaders = gPie.append("g").style("pointer-events", "none");
const gLabels = gPie.append("g").style("pointer-events", "none");
const gCenter = gPie.append("g").style("pointer-events", "none");
const gLegend = svg.append("g").style("user-select", "none").style("-webkit-user-select", "none");
const gTip = svg.append("g").style("pointer-events", "none").style("display", "none");

let hover = null;
const strokeCol = o.stroke || bgcol;
const strokeW = (o.strokeWidth === null || o.strokeWidth === undefined) ? (padAngle > 0 ? 0 : (slices.length > 1 ? 1.5 : 0)) : +o.strokeWidth;
const baseOp = (o.opacity === null || o.opacity === undefined) ? 1 : +o.opacity;
const paths = gSlices.selectAll("path").data(slices, s => s.label).enter().append("path")
  .attr("fill", s => s.color)
  .attr("stroke", strokeCol).attr("stroke-width", strokeW).attr("stroke-linejoin", "round")
  .style("cursor", "pointer");
function offsetOf(s) {
  const out = (hover === s ? POP * 0.75 : 0) + (pulled.has(s.label) ? POP : 0);
  const d = Math.min(POP, out);
  if (!d || !s.visible) return [0, 0];
  const m = midAngle(s.t);
  return [Math.sin(m) * d, -Math.cos(m) * d];
}
function styleSlices(dur) {
  const sel = dur ? paths.transition("pop").duration(dur) : paths;
  sel.attr("transform", s => { const [dx, dy] = offsetOf(s); return `translate(${dx},${dy})`; })
    .attr("fill-opacity", s => baseOp * (hover && hover !== s ? 0.45 : 1));
}

// ---- labels ------------------------------------------------------------------------------------
function labelLayout() {
  const ins = [], outs = [];
  if (!anyLabel) return { ins, outs };
  slices.forEach(s => {
    if (!s.visible) return;
    const forced = wantOutside(s);
    const inside = forced === false || (forced === null && fitsInside(s, R, ri));
    if (inside) {
      if (forced === false && !fitsInside(s, R, ri)) {
        // forced inside: keep the label only when it roughly fits
        const ang = s.t.endAngle - s.t.startAngle;
        if (ang * R * 0.62 < sfs + 2) return;
      }
      const rl = ri > 0 ? (ri + R) / 2 : (slices.filter(q => q.visible).length === 1 ? 0 : R * 0.62);
      const m = midAngle(s.t);
      ins.push({ s, x: Math.sin(m) * rl, y: -Math.cos(m) * rl, lines: insideLines(s), color: textOn(s.color) });
    } else if (outsideRoom || forced === true) {
      const m = midAngle(s.t);
      outs.push({ s, m, right: Math.sin(m) >= 0, ay: -Math.cos(m) * (R + 14), text: outsideText(s) });
    }
  });
  // spread the outside labels on each side so they do not overlap
  const gap = sfs + 4;
  const yMin = box.y - cy0 + sfs / 2, yMax = box.y + box.h - cy0 - sfs / 2;
  [true, false].forEach(side => {
    let list = outs.filter(l => l.right === side).sort((a, b) => a.ay - b.ay);
    const room = Math.floor((yMax - yMin) / gap) + 1;
    if (list.length > room) {
      const keep = new Set(list.slice().sort((a, b) => b.s.value - a.s.value).slice(0, room));
      list.forEach(l => { if (!keep.has(l)) l.drop = true; });
      list = list.filter(l => !l.drop);
    }
    // labels that would overlap form clusters, each centred on its anchors
    let cl = list.map(l => ({ items: [l], y: l.ay }));
    const place = c => {
      const n = c.items.length;
      c.y = d3.mean(c.items, (l, k) => l.ay - k * gap);
      c.y = Math.max(yMin, Math.min(yMax - (n - 1) * gap, c.y));
    };
    let merged = true;
    while (merged) {
      merged = false;
      for (let k = 0; k + 1 < cl.length; k++) {
        if (cl[k].y + cl[k].items.length * gap > cl[k + 1].y) {
          cl[k] = { items: cl[k].items.concat(cl[k + 1].items) };
          place(cl[k]);
          cl.splice(k + 1, 1);
          merged = true;
          break;
        }
      }
    }
    cl.forEach(c => { place(c); c.items.forEach((l, k) => { l.y = c.y + k * gap; }); });
  });
  return { ins, outs: outs.filter(l => !l.drop) };
}
function drawLabels(fadeIn) {
  gLabels.selectAll("*").remove();
  gLeaders.selectAll("*").remove();
  const { ins, outs } = labelLayout();
  ins.forEach(l => {
    const t = gLabels.append("text").attr("class", "in").datum(l.s).attr("text-anchor", "middle")
      .attr("transform", `translate(${l.x},${l.y})`).style("fill", l.color).style("font-size", sfs + "px");
    const n = l.lines.length;
    l.lines.forEach((ln, k) => t.append("tspan").attr("x", 0)
      .attr("y", (k - (n - 1) / 2) * (sfs + 2)).attr("dy", "0.35em").style("font-weight", ln.w).text(ln.t));
  });
  outs.forEach(l => {
    const m = l.m;
    // out along the radius (past a pulled-out slice), then across to the label
    const pull = pulled.has(l.s.label) ? POP : 0;
    const ex = Math.sin(m) * (R + 2 + pull), ey = -Math.cos(m) * (R + 2 + pull);
    const bx = Math.sin(m) * (R + 10 + pull), by = -Math.cos(m) * (R + 10 + pull);
    const lx = (l.right ? 1 : -1) * Math.max(Math.abs(bx) + 6, R + 18);
    gLeaders.append("path").datum(l.s).attr("fill", "none").attr("stroke", axisCol).attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1)
      .attr("d", `M${ex},${ey}L${bx},${by}L${lx},${l.y}`);
    const t = gLabels.append("text").attr("class", "out").datum(l.s)
      .attr("x", lx + (l.right ? 4 : -4)).attr("y", l.y).attr("dy", "0.35em")
      .attr("text-anchor", l.right ? "start" : "end").style("font-size", sfs + "px").style("fill", axisCol);
    const avail = l.right ? (box.x + box.w + (legendSide === "right" ? 8 : 0)) - (cx0 + lx + 4) : (cx0 + lx - 4) - box.x;
    const txt = l.text;
    let name = txt.name;
    if (name) {
      const restW = txt.rest ? tw(txt.rest, sfs) + 5 : 0;
      name = truncate(name, Math.max(20, avail - restW), sfs, 600);
      t.append("tspan").style("font-weight", 600).text(name);
    }
    if (txt.rest) t.append("tspan").attr("dx", name ? 5 : 0).style("fill-opacity", name ? 0.7 : 1)
      .style("font-weight", name ? 400 : 600).text(txt.rest);
  });
  styleLabels();
  if (fadeIn) {
    gLabels.style("opacity", 0).transition().duration(300).style("opacity", 1);
    gLeaders.style("opacity", 0).transition().duration(300).style("opacity", 1);
  }
}
function styleLabels() {
  gLabels.selectAll("text").style("opacity", s => hover && hover !== s ? 0.35 : 1)
    .attr("transform", function (s) {
      const base = d3.select(this).attr("data-base") || d3.select(this).attr("transform") || "";
      d3.select(this).attr("data-base", base);
      if (!d3.select(this).classed("in")) return base || null;
      const [dx, dy] = offsetOf(s);
      return base + ` translate(${dx},${dy})`;
    });
  gLeaders.selectAll("path").style("opacity", s => hover && hover !== s ? 0.35 : 1);
}

// ---- donut centre ----------------------------------------------------------------------------
const centerOn = ri >= 26 && o.centerLabel !== "";
const halfUp = ext.y1 < 0.3; // a half donut opening downwards: centre text sits above
let cBig = null, cCap = null, cSub = null;
if (centerOn) {
  const big = Math.max(12, Math.min(30, ri * 0.4));
  const yb = halfUp ? -big * 0.35 - 14 : 0;
  cBig = gCenter.append("text").attr("text-anchor", "middle").attr("y", yb).attr("dy", "0.1em")
    .style("font-size", big + "px").style("font-weight", 700).style("fill", axisCol);
  cCap = gCenter.append("text").attr("text-anchor", "middle").attr("y", yb + big * 0.55 + 4)
    .style("font-size", Math.max(10, Math.min(13, ri * 0.17)) + "px").style("fill", axisCol).style("fill-opacity", 0.7);
  cSub = gCenter.append("text").attr("text-anchor", "middle").attr("y", yb - big * 0.85 - 2)
    .style("font-size", Math.max(10, Math.min(12, ri * 0.15)) + "px").style("font-weight", 600);
}
function drawCenter() {
  if (!centerOn) return;
  const maxW = ri * 1.6;
  const big = parseFloat(cBig.style("font-size"));
  if (hover) {
    cBig.text(truncate(fmtShare(hover.share), maxW, big, 700));
    cCap.text(truncate(fmtV(hover.value), maxW * 0.9, 12));
    cSub.text(truncate(hover.label, maxW * 0.95, 12, 600)).style("fill", d3.color(hover.color).darker(0.6));
  } else {
    cBig.text(truncate(fmtV(total), maxW, big, 700));
    cCap.text(truncate(o.centerLabel || "Total", maxW * 0.9, 12));
    cSub.text("");
  }
}

// ---- tooltip ---------------------------------------------------------------------------------
const tipRect = gTip.append("rect").attr("rx", 6).attr("fill", bgcol)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("filter", `url(#${uid}-shadow)`);
const tipBody = gTip.append("g");
const visCount = () => slices.filter(s => s.visible).length;
function buildTip(s) {
  tipBody.selectAll("*").remove();
  const pad = 10, lh = 18, fs = 11.5;
  const rows = [];
  rows.push({ name: o.counted ? "Count" : o.valueName, value: fmtV(s.value), bold: true });
  if (visCount() > 1) {
    rows.push({ name: "Share", value: fmtShare(s.share) });
    rows.push({ name: "Rank", value: s.rank + " of " + visCount() });
  }
  if (s.other && others.length) {
    rows.push({ name: "Includes", value: "", sep: true, dim: true });
    others.slice(0, 8).forEach(m => rows.push({ name: String(m.label), value: fmtV(+m.value), extra: total ? fmtShare(+m.value / total) : "" }));
    if (others.length > 8) rows.push({ name: "and " + (others.length - 8) + " more", value: "", dim: true });
  }
  const head = truncate(s.label, 240, fs, 700);
  let y = pad + 9;
  tipBody.append("rect").attr("x", pad).attr("y", y - 9).attr("width", 9).attr("height", 9)
    .attr("rx", 2).attr("fill", s.color);
  tipBody.append("text").attr("x", pad + 15).attr("y", y).style("font-size", fs + "px").style("font-weight", 700)
    .style("fill", axisCol).text(head);
  let w = pad + 15 + tw(head, fs, 700) + pad;
  y += lh + 2;
  let maxName = 0, maxVal = 0, maxExtra = 0;
  rows.forEach(r => {
    r.n = truncate(r.name, 170, fs, r.bold ? 700 : 400);
    maxName = Math.max(maxName, tw(r.n, fs, r.bold ? 700 : 400));
    maxVal = Math.max(maxVal, r.value ? tw(r.value, fs, 700) : 0);
    maxExtra = Math.max(maxExtra, r.extra ? tw(r.extra, 10.5) + 8 : 0);
  });
  const colVal = pad + maxName + 18 + maxVal;
  let extraOff = 0;
  rows.forEach((r, k) => {
    if (r.sep) extraOff += 4;
    const ry = y + k * lh + extraOff;
    if (r.sep) tipBody.append("line").attr("x1", pad).attr("x2", colVal + maxExtra)
      .attr("y1", ry - 13).attr("y2", ry - 13).attr("stroke", axisCol).attr("stroke-opacity", 0.15);
    tipBody.append("text").attr("x", pad).attr("y", ry).style("font-size", (r.dim ? 10.5 : fs) + "px")
      .style("font-weight", r.bold ? 700 : 400).style("fill", axisCol)
      .style("fill-opacity", r.bold ? 1 : (r.dim ? 0.55 : 0.75)).text(r.n);
    if (r.value) tipBody.append("text").attr("x", colVal).attr("y", ry).attr("text-anchor", "end")
      .style("font-size", fs + "px").style("font-weight", 700).style("fill", axisCol).text(r.value);
    if (r.extra) tipBody.append("text").attr("x", colVal + 8).attr("y", ry)
      .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.55).text(r.extra);
  });
  w = Math.max(w, colVal + maxExtra + pad);
  const h = y + (rows.length - 1) * lh + extraOff + pad + 2;
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
// with a donut centre, the centre replaces the tooltip (except for "Other")
const tipFor = s => o.tooltip !== false && (!centerOn || (s.other && others.length));

// ---- hover, click ----------------------------------------------------------------------------
let lastTip = null;
function setHover(s) {
  if (hover === s) return;
  hover = s;
  styleSlices(180);
  styleLabels();
  styleLegend();
  drawCenter();
  if (!s) { gTip.style("display", "none"); lastTip = null; }
}
paths
  .on("mousemove", function (a) {
    const s = d3.select(this).datum();
    if (!s.visible) return;
    setHover(s);
    if (!tipFor(s)) { gTip.style("display", "none"); return; }
    if (lastTip !== s) { lastTip = s; buildTip(s); }
    const [mx, my] = ptr(a, svg.node());
    placeTip(mx, my);
  })
  .on("mouseleave", function () { setHover(null); })
  .on("click", function () {
    const s = d3.select(this).datum();
    if (pulled.has(s.label)) pulled.delete(s.label); else pulled.add(s.label);
    styleSlices(200); styleLabels();
    sendShiny("clicked", s.label);
  });

// ---- legend ---------------------------------------------------------------------------------
const legX = legendSide === "right" ? box.x + box.w + 18 : areaX;
const legY = legendSide === "right" ? areaY + Math.max(0, (areaH - legH) / 2) : areaY + areaH - legH;
gLegend.attr("transform", `translate(${legX},${legY})`);
const legSel = gLegend.selectAll("g.item").data(legRows).enter().append("g").attr("class", "item")
  .attr("transform", d => `translate(${d.x},${d.y})`).style("cursor", "pointer");
legSel.append("rect").attr("class", "bg").attr("x", -4).attr("y", 0)
  .attr("width", d => (legendSide === "right" ? legW : d.w - 10) + 6).attr("height", rowH)
  .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
legSel.append("rect").attr("x", 0).attr("y", (rowH - 12) / 2).attr("width", 12).attr("height", 12).attr("rx", 3)
  .attr("fill", d => d.s.color);
legSel.append("text").attr("class", "name").attr("x", 18).attr("y", rowH / 2).attr("dy", "0.35em")
  .style("font-size", lfs + "px").style("font-family", lfont).style("fill", axisCol)
  .text(d => truncate(d.s.label, legendSide === "right" ? legW - 18 - pctW - 12 : areaW * 0.6, lfs))
  .append("title").text(d => d.s.label);
legSel.append("text").attr("class", "pct")
  .attr("x", d => legendSide === "right" ? legW : 18 + Math.min(tw(d.s.label, lfs), areaW * 0.6) + 6)
  .attr("y", rowH / 2).attr("dy", "0.35em").attr("text-anchor", legendSide === "right" ? "end" : "start")
  .style("font-size", (lfs - 1) + "px").style("font-weight", 600).style("font-family", lfont)
  .style("fill", axisCol).style("fill-opacity", 0.6);
if (legMore) {
  const last = legRows[legRows.length - 1];
  const mx = legendSide === "right" ? 18 : (last ? last.x + last.w : 0);
  const my = legendSide === "right" ? legRows.length * rowH : (last ? last.y : 0);
  gLegend.append("text").attr("x", mx).attr("y", my + rowH / 2).attr("dy", "0.35em")
    .style("font-size", (lfs - 1) + "px").style("fill", axisCol).style("fill-opacity", 0.55)
    .text("+" + legMore + " more");
}
function styleLegend() {
  legSel.style("opacity", d => hidden.has(d.s.label) ? 0.4 : (hover && hover !== d.s ? 0.55 : 1));
  legSel.select("text.name").style("text-decoration", d => hidden.has(d.s.label) ? "line-through" : null)
    .style("font-weight", d => hover === d.s ? 700 : 400);
  legSel.select("text.pct").text(d => d.s.visible ? fmtShare(d.s.share) : "–");
}
let clickTimer = null;
legSel
  .on("mouseenter", function () {
    const d = d3.select(this).datum();
    d3.select(this).select("rect.bg").attr("fill-opacity", 0.06);
    if (d.s.visible) setHover(d.s);
  })
  .on("mouseleave", function () {
    d3.select(this).select("rect.bg").attr("fill-opacity", 0);
    setHover(null);
  })
  .on("click", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
    clickTimer = ddplotTrack(setTimeout(() => {
      clickTimer = null;
      if (!hidden.has(d.s.label)) {
        if (slices.length - hidden.size <= 1) return;
        hidden.add(d.s.label);
      } else hidden.delete(d.s.label);
      afterVisibilityChange();
    }, 230));
  })
  .on("dblclick", function () {
    const d = d3.select(this).datum();
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    const onlyThis = slices.length - hidden.size === 1 && !hidden.has(d.s.label);
    hidden.clear();
    if (!onlyThis) slices.forEach(s => { if (s.label !== d.s.label) hidden.add(s.label); });
    afterVisibilityChange();
  });
function afterVisibilityChange() {
  st.hidden = Array.from(hidden);
  hover = null; lastTip = null;
  gTip.style("display", "none");
  update(600);
}

// ---- update ---------------------------------------------------------------------------------
function tweenTo(sel, dur) {
  sel.each(function (s) {
    const from = this._cur || s.t;
    const i = d3.interpolate({ startAngle: from.startAngle, endAngle: from.endAngle, padAngle: from.padAngle },
      { startAngle: s.t.startAngle, endAngle: s.t.endAngle, padAngle: s.t.padAngle });
    this._interp = i;
  });
  sel.transition("arc").duration(dur).ease(d3.easeCubicInOut)
    .attrTween("d", function () {
      const node = this, i = node._interp;
      return t => { node._cur = i(t); return arc(node._cur); };
    });
}
function update(dur, intro) {
  computeShares();
  layoutAngles();
  styleLegend();
  if (intro) {
    // sweep the slices in, clockwise from the start angle
    paths.each(function (s) { this._cur = { startAngle: a0, endAngle: a0, padAngle: s.t.padAngle }; })
      .attr("d", function () { return arc(this._cur); });
    gLabels.style("opacity", 0); gLeaders.style("opacity", 0); gCenter.style("opacity", 0);
    paths.transition("arc").duration(dur).ease(d3.easeCubicInOut)
      .attrTween("d", function (s) {
        const node = this;
        return t => {
          const lim = a0 + span * t;
          node._cur = { startAngle: Math.min(s.t.startAngle, lim), endAngle: Math.min(s.t.endAngle, lim), padAngle: s.t.padAngle };
          return arc(node._cur);
        };
      });
    drawLabels(false);
    gLabels.transition().delay(dur - 150).duration(300).style("opacity", 1);
    gLeaders.transition().delay(dur - 150).duration(300).style("opacity", 1);
    gCenter.transition().delay(dur - 250).duration(300).style("opacity", 1);
  } else if (dur) {
    gLabels.interrupt().transition().duration(120).style("opacity", 0);
    gLeaders.interrupt().transition().duration(120).style("opacity", 0);
    tweenTo(paths, dur);
    ddplotTrack(d3.timeout(() => drawLabels(true), dur));
  } else {
    paths.each(function (s) { this._cur = s.t; }).attr("d", s => arc(s.t));
    drawLabels(false);
  }
  styleSlices(intro ? 0 : Math.min(dur, 300));
  drawCenter();
}

update(o.animate && firstRender ? 900 : 0, o.animate && firstRender);
