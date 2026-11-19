// parliament_chart(): an interactive hemicycle and coalition builder.
//
// data: rows {label, value, order, color, previous} (one per party, already
// aggregated in R). The seats are laid out on the rows of a hemicycle (or of
// any arc from 180 to 360 degrees); the number of rows and the seat size are
// chosen so the seats are as large as possible, and the parties take
// consecutive seats by angle, so they form wedges. A dashed line marks the
// majority. Clicking parties builds a coalition: its seats glide to the left
// and a gauge counts them. The coalition and the seat positions are kept in
// r2d3.ddplotPlay (pkState) so Shiny updates and resizes keep them, and seats
// glide to their new places when the results change. Prepended with
// playkit.js. Works with D3 v5 and v6.

const o = options;
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const axisCol = o.axisCol || "#333333";
const bgcol = o.bgcol || "white";
const PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e"];
const GOOD = "#2f9e44", BAD = "#d6453d";
const tw = pkMeasure(svg, font);
const send = pkShiny(svg);
const st = pkState(o.stateKey || "parliament");
const fmt = d3.format(",");
const square = o.seatShape === "square";
const builder = o.coalitionBuilder !== false;
const motion = o.animate !== false && !pkCalm;
const TAU = 2 * Math.PI;

svg.style("background-color", bgcol).style("font-family", font);

function truncate(str, maxW, size, weight) {
  str = String(str);
  if (maxW <= 0) return "";
  if (tw(str, size, weight) <= maxW) return str;
  let s = str;
  while (s.length > 1 && tw(s + "…", size, weight) > maxW) s = s.slice(0, -1);
  return s + "…";
}
function fmtShare(p) {
  if (p > 0 && p < 0.001) return "<0.1%";
  return d3.format(p < 0.1 ? ".1~%" : ".0%")(p);
}
function lum(color) {
  const c = d3.rgb(color);
  const lin = u => { u /= 255; return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}
const bgDark = lum(bgcol) < 0.3;
// a party colour that stays readable as text on the background
function inkOf(color) {
  const L = lum(color);
  if (!bgDark && L > 0.42) return d3.rgb(color).darker(1.4).toString();
  if (bgDark && L < 0.18) return d3.rgb(color).brighter(1.4).toString();
  return color;
}

// ---- parties ------------------------------------------------------------------------------
const parties = (data || []).map((r, k) => ({
  label: String(r.label),
  value: Math.max(0, Math.round(pkNum(r.value, 0))),
  order: pkNum(r.order, k + 1),
  color: (r.color && r.color !== "NA") ? String(r.color) : null,
  previous: o.hasPrevious ? pkNum(r.previous, null) : null
}));
const scheme = o.colorCategory ? d3["scheme" + o.colorCategory] : null;
const schemeCols = (scheme && scheme.length) ? (typeof scheme[0] === "string" ? scheme : scheme[scheme.length - 1]) : null;
parties.forEach((pt, k) => { if (!pt.color) pt.color = (schemeCols || PALETTE)[k % (schemeCols || PALETTE).length]; });
if (o.sort === "descending") parties.sort((a, b) => (b.value - a.value) || (a.order - b.order));
else if (o.sort === "ascending") parties.sort((a, b) => (a.value - b.value) || (a.order - b.order));
else parties.sort((a, b) => a.order - b.order);
parties.forEach((pt, k) => { pt.bi = k; pt.ink = inkOf(pt.color); });

const N = d3.sum(parties, p => p.value);
if (!N) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No seats");
  return;
}
const seated = parties.filter(p => p.value > 0);
seated.slice().sort((a, b) => b.value - a.value).forEach((p, k) => { p.rank = k + 1; });
const M = (o.majority === null || o.majority === undefined) ? null : Math.max(1, Math.round(+o.majority));
const mLine = M !== null && M <= N;
const byLabel = new Map(parties.map(p => [p.label, p]));

// ---- coalition (kept across re-renders; a new `coalition` argument replaces it) ---------------
const optKey = JSON.stringify(pkArr(o.coalition).map(String));
if (st.optKey !== optKey) { st.optKey = optKey; st.coalition = pkArr(o.coalition).map(String); }
const coal = new Set(pkArr(st.coalition).filter(l => byLabel.has(l) && byLabel.get(l).value > 0));
const coalSeats = () => d3.sum(parties, p => coal.has(p.label) ? p.value : 0);

// ---- title ------------------------------------------------------------------------------------
const padL = 14, padR = 14;
let top = 14;
const tfs = pkPx(o.titleFontSize, 20), sfs = pkPx(o.subtitleFontSize, 13);
if (o.title) {
  svg.append("text").attr("x", padL).attr("y", top + tfs * 0.8)
    .style("font-size", tfs + "px").style("font-weight", 700).style("fill", axisCol)
    .text(truncate(o.title, W - padL - padR, tfs, 700));
  top += tfs + 6;
}
if (o.subtitle) {
  svg.append("text").attr("x", padL).attr("y", top + sfs * 0.8)
    .style("font-size", sfs + "px").style("fill", axisCol).style("opacity", 0.65)
    .text(truncate(o.subtitle, W - padL - padR, sfs));
  top += sfs + 6;
}
top += 4;
const areaX = padL, areaY = top, areaW = Math.max(80, W - padL - padR), areaH = Math.max(80, H - top - 10);

// ---- geometry helpers -----------------------------------------------------------------------
const A = pkClamp(pkNum(o.arc, 180), 180, 360) * Math.PI / 180;
const closed = A > TAU - 1e-6;
const th0 = Math.PI / 2 + A / 2;              // the first (leftmost) seat angle
const below = Math.max(0, -Math.cos(A / 2));  // how far the arc goes below its centre (unit radius)
const innerF = pkClamp(pkNum(o.innerRadius, 0.4), 0, 0.9);
const labTop = mLine ? 22 : 6;
const gaugeH = builder ? 44 : 4;
function rFor(bw, bh) {
  return Math.max(12, Math.min((bw - 8) / 2, (bh - labTop - gaugeH - 4) / (1 + below + 0.04)));
}

// ---- legend layout --------------------------------------------------------------------------
const lfs = W < 420 ? 11 : 12;
const rowH = lfs + 11;
function changeOf(p) {
  if (!o.hasPrevious) return null;
  if (p.previous === null) return p.value > 0 ? { text: "new", color: GOOD } : null;
  const d = p.value - p.previous;
  if (d > 0) return { text: "+" + fmt(d), color: GOOD };
  if (d < 0) return { text: "−" + fmt(-d), color: BAD };
  return { text: "=", color: axisCol, dim: true };
}
const extraOf = p => o.hasPrevious ? changeOf(p) : { text: fmtShare(p.value / N), color: axisCol, dim: true };
const seatW = tw(fmt(d3.max(parties, p => p.value)), lfs, 700);
const extraW = d3.max(parties, p => { const e = extraOf(p); return e ? tw(e.text, lfs - 1, 600) : 0; }) || 0;
const nameW = d3.max(parties, p => tw(p.label, lfs, 700)) || 0;
let legend = null;
if (o.legend !== false) {
  const rightNameW = Math.min(nameW, 170);
  const rightW = 10 + 8 + rightNameW + 14 + seatW + (extraW ? 10 + extraW : 0) + 8;
  const right = (areaW - rightW - 20 >= 170) ? (function () {
    const fit = Math.max(1, Math.floor(areaH / rowH));
    const rows = parties.length > fit ? fit - 1 : parties.length;
    return {
      side: "right", w: rightW, nameW: rightNameW,
      items: parties.slice(0, rows).map((p, k) => ({ p, x: 0, y: k * rowH, w: rightW })),
      more: parties.length - rows,
      box: { x: areaX, y: areaY, w: areaW - rightW - 20, h: areaH }
    };
  })() : null;
  const bottom = (function () {
    const items = parties.map(p => {
      const nw = Math.min(tw(p.label, lfs, 700), areaW * 0.5);
      const e = extraOf(p);
      return { p, nw, w: 10 + 6 + nw + 7 + tw(fmt(p.value), lfs, 700) + (e ? 6 + tw(e.text, lfs - 1, 600) : 0) + 18 };
    });
    const maxRows = Math.max(1, Math.floor(areaH * 0.3 / rowH));
    let lx = 0, row = 0;
    items.forEach(it => {
      if (lx > 0 && lx + it.w > areaW) { row++; lx = 0; }
      it.x = lx; it.row = row; lx += it.w;
    });
    let shown = items.filter(it => it.row < maxRows);
    let more = items.length - shown.length;
    if (more && shown.length > 1) { shown.pop(); more++; }
    const nRows = (d3.max(shown, it => it.row) || 0) + 1;
    d3.range(nRows).forEach(r => {
      const its = shown.filter(it => it.row === r);
      if (!its.length) return;
      const extra = (more && r === nRows - 1) ? tw("+" + more + " more", lfs) + 8 : 0;
      const wr = d3.max(its, it => it.x + it.w) - 18 + extra;
      its.forEach(it => { it.x += Math.max(0, (areaW - wr) / 2); });
    });
    shown.forEach(it => { it.y = it.row * rowH; });
    const h = nRows * rowH;
    return { side: "bottom", items: shown, more, h, box: { x: areaX, y: areaY, w: areaW, h: areaH - h - 8 } };
  })();
  legend = (right && rFor(right.box.w, right.box.h) >= rFor(bottom.box.w, bottom.box.h) * 0.98) ? right : bottom;
}
const box = legend ? legend.box : { x: areaX, y: areaY, w: areaW, h: areaH };

// ---- hemicycle geometry -----------------------------------------------------------------------
const R = rFor(box.w, box.h);
const usedH = labTop + R * (1 + below + 0.04) + gaugeH;
const cx = box.x + box.w / 2;
const cy = box.y + Math.max(0, (box.h - usedH) / 2) + labTop + R;

// One layout: `n` rows from radius ri to ro; the seats are shared between the
// rows in proportion to their length, so they are evenly spaced everywhere.
function plan(n, ri, ro) {
  if (n < 1 || n > N) return null;
  const radii = d3.range(n).map(k => n === 1 ? ro : ri + (ro - ri) * k / (n - 1));
  const sumR = d3.sum(radii) || 1;
  const free = N - n;
  const raw = radii.map(r => free * r / sumR);
  const cnt = raw.map(Math.floor);
  let rem = free - d3.sum(cnt);
  raw.map((v, k) => [v - cnt[k], k]).sort((a, b) => b[0] - a[0]).slice(0, rem).forEach(e => { cnt[e[1]]++; });
  const nk = cnt.map(c => c + 1);
  let tang = Infinity;
  radii.forEach((r, k) => {
    const gaps = closed ? nk[k] : nk[k] - 1;
    if (gaps > 0) tang = Math.min(tang, A * r / gaps);
  });
  const rad = n > 1 ? (ro - ri) / (n - 1) : Infinity;
  let pitch = Math.min(tang, rad);
  if (!isFinite(pitch)) pitch = Math.max(ro - ri, ro * 0.3);
  return { n, radii, nk, pitch };
}
const userSize = pkNum(o.seatSize, null);
const userPad = pkNum(o.padding, null);
const gapOf = pitch => userPad !== null ? userPad : pitch * 0.2;
const capOf = p => Math.min(R * 0.1, (p.pitch - gapOf(p.pitch)) / 2);
function bestPlan(ri, ro) {
  let best = null;
  const nMax = Math.min(N, 90);
  for (let n = 1; n <= nMax; n++) {
    const p = plan(n, ri, ro);
    if (p && (!best || capOf(p) > capOf(best) + 1e-6)) best = p;
    // the pitch falls steadily once past its best
    if (best && n > best.n + 6) break;
  }
  return best;
}

const userRows = pkNum(o.maxRows, null);
const hollow0 = R * innerF;
let layout = null, sr = 0;
if (userSize !== null && userRows === null) {
  // keep the requested seat size: the fewest rows that hold every seat
  const need = userSize + (userPad !== null ? userPad : Math.max(1, userSize / 3));
  const ro = R - userSize / 2;
  for (let n = 1; n <= Math.min(N, 200); n++) {
    const ri = Math.max(hollow0 + userSize / 2, ro - (n - 1) * need);
    const p = plan(n, Math.min(ri, ro), ro);
    if (p && p.pitch >= need - 1e-6) { layout = p; sr = userSize / 2; break; }
    if (ri <= hollow0 + userSize / 2 && n > 1 && p && p.pitch < need * 0.5) break;
  }
}
if (!layout) {
  // pass 1 with seat centres on the edges, pass 2 once the seat size is known
  const mk = (ri, ro) => userRows !== null ? plan(Math.min(Math.round(userRows), N), ri, ro) : bestPlan(ri, ro);
  let p = mk(hollow0, R);
  let s = Math.min(R * 0.1, Math.max(0.4, (p.pitch - gapOf(p.pitch)) / 2));
  const ri2 = Math.min(hollow0 + s, R - s), ro2 = R - s;
  p = mk(ri2, ro2);
  s = Math.min(s, Math.max(0.4, (p.pitch - gapOf(p.pitch)) / 2));
  if (userSize !== null) s = Math.min(s, userSize / 2);
  layout = p; sr = s;
}
// seat positions, sorted by angle from left to right
const pos = [];
layout.radii.forEach((r, k) => {
  const c = layout.nk[k];
  for (let j = 0; j < c; j++) {
    let th;
    if (closed) th = th0 - (j + 0.5) * A / c;
    else th = c === 1 ? Math.PI / 2 : th0 - j * A / (c - 1);
    pos.push({ th, r });
  }
});
pos.sort((a, b) => (b.th - a.th) || (a.r - b.r));
const pitch = layout.pitch;

const seatXY = (th, r) => [cx + r * Math.cos(th), cy - r * Math.sin(th)];
function tf(th, r, k) {
  const xy = seatXY(th, r);
  let s = `translate(${xy[0].toFixed(2)},${xy[1].toFixed(2)})`;
  if (square) s += ` rotate(${(90 - th * 180 / Math.PI).toFixed(2)})`;
  if (k !== 1) s += ` scale(${Math.max(1e-4, k).toFixed(4)})`;
  return s;
}

// ---- seats --------------------------------------------------------------------------------------
const seats = [];
parties.forEach(p => { for (let j = 0; j < p.value; j++) seats.push({ key: p.label + "\u0001" + j, party: p, j }); });
const seatByKey = new Map(seats.map(s => [s.key, s]));
function assign() {
  const order = parties.slice();
  if (o.regroup !== false && coal.size) order.sort((a, b) => (coal.has(b.label) - coal.has(a.label)) || (a.bi - b.bi));
  let k = 0;
  order.forEach(p => {
    for (let j = 0; j < p.value; j++) {
      const s = seatByKey.get(p.label + "\u0001" + j);
      s.p = k; s.th = pos[k].th; s.r = pos[k].r; k++;
    }
  });
  st.pos = {};
  seats.forEach(s => { st.pos[s.key] = { th: s.th, ru: s.r / R }; });
}
const oldPos = st.pos || null;
const firstRender = !st.drawn;
st.drawn = true;
assign();

const gMaj = svg.append("g").attr("class", "majority");
const gSeats = svg.append("g").attr("class", "seats");
const seatSel = gSeats.selectAll(".seat").data(seats).enter()
  .append(square ? "rect" : "circle").attr("class", "seat")
  .attr("fill", s => s.party.color);
if (square) {
  const h = sr * 0.94;
  seatSel.attr("x", -h).attr("y", -h).attr("width", 2 * h).attr("height", 2 * h).attr("rx", h * 0.28);
} else {
  seatSel.attr("r", sr);
}
if (sr > 4) seatSel.attr("stroke", d3.rgb(bgcol).toString()).attr("stroke-width", Math.min(1, sr * 0.12)).attr("stroke-opacity", 0.6);

// ---- majority line ----------------------------------------------------------------------------
let majLine = null, majText = null;
if (mLine) {
  const a = M >= 2 ? (pos[M - 2].th + pos[M - 1].th) / 2 : pos[0].th + 0.02;
  const r1 = Math.max(0, hollow0 - 4), r2 = R + 6;
  const p1 = seatXY(a, r1), p2 = seatXY(a, r2);
  majLine = gMaj.append("line").attr("x1", p1[0]).attr("y1", p1[1]).attr("x2", p2[0]).attr("y2", p2[1])
    .attr("stroke", axisCol).attr("stroke-opacity", 0.6).attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
  const ca = Math.cos(a), sa = Math.sin(a), p3 = seatXY(a, R + (Math.abs(ca) > 0.35 ? 14 : 10));
  majText = gMaj.append("text").attr("x", p3[0]).attr("y", p3[1] + (sa < -0.3 ? 10 : 0))
    .attr("dy", Math.abs(sa) < 0.6 ? "0.35em" : null)
    .attr("text-anchor", ca > 0.35 ? "start" : (ca < -0.35 ? "end" : "middle"))
    .style("font-size", (lfs - 1) + "px").style("fill", axisCol).style("fill-opacity", 0.7)
    .text("Majority " + fmt(M));
}
gMaj.raise();

// ---- centre ----------------------------------------------------------------------------------------
const hollow = hollow0 - 3;
const half = A < Math.PI * 1.25;
const centerOn = o.centerLabel !== "" && hollow >= 26;
const gCenter = svg.append("g").attr("class", "center").style("pointer-events", "none");
let cName, cNum, cLab, cNumFs = 0, cNameFs = 0, cLabFs = 0, nameMaxW = 0, numMaxW = 0;
if (centerOn) {
  cNumFs = Math.min(54, hollow * (half ? 0.5 : 0.44), (hollow * (half ? 0.92 : 1.7) - 18) / 1.3);
  cNumFs = Math.max(12, cNumFs);
  cLabFs = pkClamp(cNumFs * 0.3, 9.5, 14);
  cNameFs = pkClamp(cNumFs * 0.32, 10, 15);
  const blockH = cNameFs * 0.75 + 5 + cNumFs * 0.74 + 6 + cLabFs;
  const yLab = half ? cy - 3 : cy + blockH / 2 - cLabFs * 0.2;
  const yNum = yLab - cLabFs - 5;
  const yName = yNum - cNumFs * 0.74 - 6;
  const hy = Math.abs(cy - (yName - cNameFs * 0.75));
  nameMaxW = 2 * Math.sqrt(Math.max(0, hollow * hollow - hy * hy)) * 0.92;
  const hn = Math.abs(cy - (yNum - cNumFs * 0.74));
  numMaxW = 2 * Math.sqrt(Math.max(0, hollow * hollow - hn * hn)) * 0.9;
  cName = gCenter.append("text").attr("x", cx).attr("y", yName).attr("text-anchor", "middle")
    .style("font-size", cNameFs + "px").style("font-weight", 700);
  cNum = gCenter.append("text").attr("x", cx).attr("y", yNum).attr("text-anchor", "middle")
    .style("font-size", cNumFs + "px").style("font-weight", 700).style("fill", axisCol)
    .style("font-variant-numeric", "tabular-nums");
  cLab = gCenter.append("text").attr("x", cx).attr("y", yLab).attr("text-anchor", "middle")
    .style("font-size", cLabFs + "px").style("fill", axisCol).style("fill-opacity", 0.65);
}
let hover = null;
function setNum(txt) {
  const w = tw(txt, cNumFs, 700);
  cNum.style("font-size", (w > numMaxW ? Math.max(10, cNumFs * numMaxW / w) : cNumFs) + "px").text(txt);
}
function drawCenter() {
  if (!centerOn) return;
  cNum.interrupt("count");
  let name = "", nameCol = axisCol, num = fmt(N), lab = o.centerLabel || "seats";
  if (hover) {
    name = hover.label; nameCol = hover.ink; num = fmt(hover.value);
    lab = fmtShare(hover.value / N) + " of " + (o.centerLabel || "seats");
  } else if (coal.size) {
    const cs = coalSeats();
    name = coal.size === 1 ? Array.from(coal)[0] : "Coalition";
    nameCol = mLine ? (cs >= M ? GOOD : BAD) : axisCol;
    num = fmt(cs); lab = "of " + fmt(N) + " " + (o.centerLabel || "seats");
  }
  let nfs = cNameFs;
  const nw = name ? tw(name, nfs, 700) : 0;
  if (nw > nameMaxW) nfs = Math.max(cNameFs * 0.72, nfs * nameMaxW / nw);
  cName.style("fill", nameCol).style("font-size", nfs + "px").text(truncate(name, nameMaxW, nfs, 700));
  setNum(num);
  cLab.text(truncate(lab, hollow * 1.8, cLabFs));
}

// ---- coalition gauge --------------------------------------------------------------------------
const gGauge = svg.append("g").attr("class", "gauge");
let gauge = null;
if (builder) {
  const gw = Math.min(box.w - 8, Math.max(2 * R * 0.9, 230));
  const gx = cx - gw / 2;
  const gy = cy + R * below + sr + 18;
  const barY = gy + 8, barH = 9;
  const left = gGauge.append("text").attr("x", gx).attr("y", gy).style("font-size", lfs + "px").style("fill", axisCol);
  const clear = gGauge.append("text").attr("x", gx + gw).attr("y", gy).attr("text-anchor", "end")
    .style("font-size", lfs + "px").style("fill", axisCol).style("fill-opacity", 0.6)
    .style("cursor", "pointer").attr("tabindex", 0).text("Clear ✕")
    .on("click", function () { setCoalition(new Set()); })
    .on("keydown", function (a) {
      const ev = pkEvOf(a);
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); setCoalition(new Set()); }
    });
  gGauge.append("rect").attr("x", gx).attr("y", barY).attr("width", gw).attr("height", barH).attr("rx", barH / 2)
    .attr("fill", axisCol).attr("fill-opacity", 0.1);
  const clipId = pkUid("ddpa-clip");
  gGauge.append("clipPath").attr("id", clipId).append("rect").attr("x", gx).attr("y", barY)
    .attr("width", gw).attr("height", barH).attr("rx", barH / 2);
  const segs = gGauge.append("g").attr("clip-path", `url(#${clipId})`);
  let tick = null;
  if (mLine) {
    const tx = gx + gw * M / N;
    tick = gGauge.append("line").attr("x1", tx).attr("x2", tx).attr("y1", barY - 3).attr("y2", barY + barH + 3)
      .attr("stroke", axisCol).attr("stroke-width", 1.5);
  }
  gauge = { gx, gw, gy, barY, barH, left, clear, segs, tick };
}
let hadMajority = mLine && coalSeats() >= M;
function drawGauge(dur) {
  if (!gauge) return;
  const g = gauge;
  const members = parties.filter(p => coal.has(p.label));
  const cs = coalSeats();
  let x = g.gx;
  members.forEach(p => { p.gx = x; p.gwid = g.gw * p.value / N; x += p.gwid; });
  const sel = g.segs.selectAll("rect").data(members, p => p.label);
  sel.exit().transition().duration(dur).attr("width", 0).remove();
  const ent = sel.enter().append("rect").attr("y", g.barY).attr("height", g.barH)
    .attr("x", p => p.gx).attr("width", 0).attr("fill", p => p.color);
  ent.merge(sel).transition().duration(dur).attr("x", p => p.gx).attr("width", p => p.gwid);
  g.left.selectAll("*").remove();
  if (!members.length) {
    g.left.append("tspan").style("fill-opacity", 0.6)
      .text(truncate("Click the parties to build a coalition", g.gw, lfs));
    g.clear.style("display", "none");
  } else {
    g.clear.style("display", null);
    const room = g.gw - tw("Clear ✕", lfs) - 12;
    const t1 = "Coalition: ", t2 = fmt(cs) + " seats";
    let t3 = "";
    if (mLine) t3 = cs >= M ? "  ✓ majority" : "  " + fmt(M - cs) + " short";
    g.left.append("tspan").style("fill-opacity", 0.65).text(t1);
    g.left.append("tspan").style("font-weight", 700).text(t2);
    if (t3 && tw(t1 + t2 + t3, lfs, 700) <= room) {
      g.left.append("tspan").style("font-weight", 700).style("fill", cs >= M ? GOOD : BAD).text(t3);
    }
  }
  if (g.tick) g.tick.attr("stroke", mLine && cs >= M ? GOOD : axisCol);
}
function celebrate() {
  if (!majLine) return;
  majLine.interrupt().attr("stroke", GOOD).attr("stroke-opacity", 1).attr("stroke-width", 3)
    .transition().duration(900).attr("stroke-width", 1.5);
  majText.style("fill", GOOD).style("fill-opacity", 1).style("font-weight", 700);
}
function uncelebrate() {
  if (!majLine) return;
  majLine.interrupt().attr("stroke", axisCol).attr("stroke-opacity", 0.6).attr("stroke-width", 1.5);
  majText.style("fill", axisCol).style("fill-opacity", 0.7).style("font-weight", 400);
}

// ---- styling: highlight and coalition -----------------------------------------------------------
function seatOpacity(s) {
  if (hover) return s.party === hover ? 1 : 0.16;
  if (coal.size) return coal.has(s.party.label) ? 1 : 0.3;
  return 1;
}
function styleSeats(dur) {
  const t = seatSel.transition("op").duration(dur);
  t.attr("fill-opacity", seatOpacity);
}

// ---- legend ------------------------------------------------------------------------------------
const gLegend = svg.append("g").attr("class", "legend").style("font-size", lfs + "px");
let legSel = null;
if (legend) {
  const lx = legend.side === "right" ? box.x + box.w + 20 : areaX;
  const legH = legend.side === "right" ? (legend.items.length + (legend.more ? 1 : 0)) * rowH : legend.h;
  const ly = legend.side === "right" ? areaY + Math.max(0, (areaH - legH) / 2) : areaY + areaH - legend.h;
  gLegend.attr("transform", `translate(${lx},${ly})`);
  legSel = gLegend.selectAll("g.item").data(legend.items).enter().append("g").attr("class", "item")
    .attr("transform", it => `translate(${it.x},${it.y})`)
    .style("cursor", it => it.p.value > 0 ? "pointer" : "default")
    .attr("tabindex", it => it.p.value > 0 ? 0 : null)
    .attr("role", builder ? "button" : null)
    .style("outline", "none");
  legSel.append("rect").attr("class", "bg").attr("x", -5).attr("y", 1)
    .attr("width", it => (legend.side === "right" ? legend.w : it.w - 12) + 8).attr("height", rowH - 2)
    .attr("rx", 5).attr("fill", it => it.p.color).attr("fill-opacity", 0);
  legSel.append("circle").attr("class", "dot").attr("cx", 5).attr("cy", rowH / 2).attr("r", 5)
    .attr("fill", it => it.p.color);
  legSel.append("path").attr("class", "check").attr("d", "M2.3,5.2 L4.3,7.2 L7.8,3.2")
    .attr("transform", `translate(0.8,${rowH / 2 - 5.2})`)
    .attr("fill", "none").attr("stroke-width", 1.7).attr("stroke-linecap", "round")
    .attr("stroke", it => lum(it.p.color) > 0.45 ? "#222" : "#fff").style("display", "none");
  legSel.append("text").attr("class", "name").attr("x", 16).attr("y", rowH / 2).attr("dy", "0.35em")
    .style("fill", axisCol)
    .text(it => truncate(it.p.label, legend.side === "right" ? legend.nameW : it.nw, lfs));
  legSel.append("text").attr("class", "seats")
    .attr("x", it => legend.side === "right" ? 16 + legend.nameW + 14 + seatW : 16 + it.nw + 7)
    .attr("text-anchor", legend.side === "right" ? "end" : "start")
    .attr("y", rowH / 2).attr("dy", "0.35em").style("font-weight", 700).style("fill", axisCol)
    .style("font-variant-numeric", "tabular-nums")
    .text(it => fmt(it.p.value));
  legSel.append("text").attr("class", "extra")
    .attr("x", it => legend.side === "right" ? 16 + legend.nameW + 14 + seatW + 10 + extraW
      : 16 + it.nw + 7 + tw(fmt(it.p.value), lfs, 700) + 6)
    .attr("text-anchor", legend.side === "right" ? "end" : "start")
    .attr("y", rowH / 2).attr("dy", "0.35em").style("font-size", (lfs - 1) + "px").style("font-weight", 600)
    .style("font-variant-numeric", "tabular-nums")
    .style("fill", it => { const e = extraOf(it.p); return e ? e.color : axisCol; })
    .style("fill-opacity", it => { const e = extraOf(it.p); return e && e.dim ? 0.6 : 1; })
    .text(it => { const e = extraOf(it.p); return e ? e.text : ""; });
  legSel.append("title").text(it => it.p.label);
  if (legend.more) {
    const last = legend.items.length ? legend.items[legend.items.length - 1] : { x: 0, y: -rowH, w: 0 };
    const mx = legend.side === "right" ? 0 : last.x + last.w;
    const my = legend.side === "right" ? legend.items.length * rowH : last.y;
    gLegend.append("text").attr("x", mx).attr("y", my + rowH / 2).attr("dy", "0.35em")
      .style("fill", axisCol).style("fill-opacity", 0.6)
      .text("+" + legend.more + " more");
  }
  legSel
    .on("mouseenter", function () { const d = d3.select(this).datum(); if (d.p.value > 0) setHover(d.p); })
    .on("mouseleave", function () { setHover(null); })
    .on("focus", function () { const d = d3.select(this).datum(); if (d.p.value > 0) setHover(d.p); })
    .on("blur", function () { setHover(null); })
    .on("click", function () { const d = d3.select(this).datum(); if (d.p.value > 0) toggle(d.p); })
    .on("keydown", function (a) {
      const ev = pkEvOf(a);
      if (ev.key !== "Enter" && ev.key !== " ") return;
      ev.preventDefault();
      const d = d3.select(this).datum();
      if (d.p.value > 0) toggle(d.p);
    });
}
function styleLegend() {
  if (!legSel) return;
  legSel.style("opacity", it => {
    if (it.p.value === 0) return 0.45;
    if (hover) return it.p === hover ? 1 : 0.4;
    return 1;
  });
  legSel.select("rect.bg").attr("fill-opacity", it =>
    it.p === hover ? 0.16 : (coal.has(it.p.label) ? 0.1 : 0));
  legSel.select("path.check").style("display", it => coal.has(it.p.label) ? null : "none");
  legSel.select("text.name").style("font-weight", it => coal.has(it.p.label) ? 700 : 400);
}

// ---- hover target: the whole arc, the nearest seat wins ---------------------------------------
const hit = svg.append("path").attr("class", "hit")
  .attr("transform", `translate(${cx},${cy})`)
  .attr("d", d3.arc()({
    innerRadius: Math.max(0, hollow0 - 2), outerRadius: R + 4,
    startAngle: -A / 2 - (closed ? 0 : Math.min(0.2, (sr + 4) / R)),
    endAngle: A / 2 + (closed ? 0 : Math.min(0.2, (sr + 4) / R))
  }))
  .attr("fill", "transparent").style("cursor", "pointer");
function nearest(mx, my) {
  let best = null, bd = Infinity;
  for (let k = 0; k < seats.length; k++) {
    const s = seats[k];
    const xy = seatXY(s.th, s.r);
    const d = (xy[0] - mx) * (xy[0] - mx) + (xy[1] - my) * (xy[1] - my);
    if (d < bd) { bd = d; best = s; }
  }
  return (best && bd <= Math.pow(Math.max(pitch * 1.6, sr * 2 + 6), 2)) ? best : null;
}

// ---- tooltip -------------------------------------------------------------------------------------
const tip = pkTip(svg, { font, color: axisCol, bgcol, W, H, measure: tw });
function tipRows(p) {
  const rows = [
    { name: "Seats", value: fmt(p.value) },
    { name: "Share", value: fmtShare(p.value / N) },
    { name: "Rank", value: p.rank + " of " + seated.length }
  ];
  if (o.hasPrevious) {
    rows.push({ name: "Previously", value: p.previous === null ? "–" : fmt(p.previous) });
    const c = changeOf(p);
    if (c && !c.dim) rows.push({ name: "Change", value: c.text, color: c.color });
  }
  if (mLine) {
    if (p.value >= M) rows.push({ name: "Majority", value: "on its own", color: GOOD });
    else rows.push({ name: "Short of majority", value: fmt(M - p.value) });
  }
  if (builder) rows.push({ name: coal.has(p.label) ? "Click to leave the coalition" : "Click to join the coalition", value: "" });
  return rows;
}
let tipFor = null;
hit
  .on("mousemove", function (a) {
    const m = pkPtr(a, svg.node());
    const s = nearest(m[0], m[1]);
    if (!s) { setHover(null); return; }
    setHover(s.party);
    if (o.tooltip === false) return;
    if (tipFor !== s.party) { tipFor = s.party; tip.show(s.party.label, tipRows(s.party), m[0], m[1], s.party.color); }
    else tip.move(m[0], m[1]);
  })
  .on("mouseleave", function () { setHover(null); })
  .on("click", function (a) {
    const m = pkPtr(a, svg.node());
    const s = nearest(m[0], m[1]);
    if (!s) return;
    toggle(s.party);
    if (o.tooltip !== false && tipFor) tip.show(s.party.label, tipRows(s.party), m[0], m[1], s.party.color);
  });

function setHover(p) {
  if (hover === p) return;
  hover = p;
  styleSeats(140);
  styleLegend();
  drawCenter();
  if (!p) { tip.hide(); tipFor = null; }
}

// ---- coalition changes --------------------------------------------------------------------------
function coalitionValue() {
  const members = parties.filter(p => coal.has(p.label));
  const cs = coalSeats();
  return {
    parties: members.map(p => p.label),
    seats: cs,
    majority: M,
    hasMajority: mLine ? cs >= M : null
  };
}
// sent on every change, and after a re-render when the seats of the coalition changed
function sendCoalition(force) {
  const v = coalitionValue();
  const js = JSON.stringify(v);
  if (force || (coal.size && st.sentCoal !== js)) send("coalition", v);
  st.sentCoal = js;
}
function glide(dur) {
  seatSel.each(function (s) {
    if (!s.cur) s.cur = { th: s.th, r: s.r, k: 1 };
  });
  seatSel.transition("move").duration(dur)
    .delay(s => motion ? (s.p / N) * 260 : 0)
    .ease(d3.easeCubicInOut)
    .attrTween("transform", function (s) {
      const a = { th: s.cur.th, r: s.cur.r, k: s.cur.k }, b = { th: s.th, r: s.r };
      return function (t) {
        s.cur = { th: a.th + (b.th - a.th) * t, r: a.r + (b.r - a.r) * t, k: a.k + (1 - a.k) * t };
        return tf(s.cur.th, s.cur.r, s.cur.k);
      };
    });
}
function setCoalition(next) {
  coal.clear();
  next.forEach(l => coal.add(l));
  st.coalition = Array.from(coal);
  assign();
  glide(motion ? 850 : 0);
  styleSeats(200);
  styleLegend();
  drawCenter();
  drawGauge(motion ? 450 : 0);
  const has = mLine && coalSeats() >= M;
  if (has && !hadMajority) celebrate();
  else if (!has && hadMajority) uncelebrate();
  hadMajority = has;
  sendCoalition(true);
}
function toggle(p) {
  send("clicked", p.label);
  if (!builder) return;
  const next = new Set(coal);
  if (next.has(p.label)) next.delete(p.label); else next.add(p.label);
  setCoalition(next);
}

// ---- first draw ------------------------------------------------------------------------------------
styleSeats(0);
styleLegend();
drawCenter();
drawGauge(0);
if (hadMajority) celebrate();
gCenter.raise();
hit.raise();
svg.attr("role", "img").attr("aria-label",
  "Parliament chart of " + fmt(N) + " seats: " +
  seated.map(p => p.label + " " + fmt(p.value)).join(", ") + (mLine ? ". Majority: " + fmt(M) + " seats." : "."));

function entrance() {
  seatSel.each(function (s) { s.cur = { th: s.th, r: s.r, k: 0 }; })
    .attr("transform", s => tf(s.th, s.r, 0));
  const spread = Math.min(1100, 500 + N * 0.8);
  seatSel.transition("move").delay(s => (s.p / N) * spread).duration(420)
    .ease(d3.easeBackOut.overshoot(1.8))
    .attrTween("transform", function (s) {
      return function (t) { s.cur = { th: s.th, r: s.r, k: t }; return tf(s.th, s.r, t); };
    })
    .on("end", function (s) { s.cur = { th: s.th, r: s.r, k: 1 }; });
  if (centerOn && !coal.size) {
    cNum.transition("count").duration(spread + 300).ease(d3.easeCubicOut)
      .tween("text", function () {
        const node = this;
        return function (t) { if (!hover) setNum(fmt(Math.round(N * t))); };
      });
  }
  [gMaj, gGauge, gLegend].forEach((g, k) => g.style("opacity", 0)
    .transition().delay(200 + k * 120).duration(500).style("opacity", 1));
}

if (!firstRender && oldPos) {
  // a re-render: seats glide from where they were, new ones grow in
  seatSel.each(function (s) {
    const q = oldPos[s.key];
    s.cur = q ? { th: q.th, r: q.ru * R, k: 1 } : { th: s.th, r: s.r, k: 0 };
  }).attr("transform", s => tf(s.cur.th, s.cur.r, s.cur.k));
  glide(motion ? 800 : 0);
} else if (firstRender && motion) {
  seatSel.attr("transform", s => tf(s.th, s.r, 0));
  if (typeof IntersectionObserver === "function") {
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { obs.disconnect(); entrance(); }
    }, { threshold: 0.15 });
    obs.observe(svg.node());
    ddplotTrack({ stop() { obs.disconnect(); } });
  } else {
    entrance();
  }
} else {
  seatSel.each(function (s) { s.cur = { th: s.th, r: s.r, k: 1 }; })
    .attr("transform", s => tf(s.th, s.r, 1));
}
sendCoalition(false);
