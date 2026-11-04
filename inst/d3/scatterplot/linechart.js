// line_chart(): interactive multi-series time series chart.
//
// data: long rows {t, s, v, lo, hi} (t = ISO date string or number,
// s = series name, v = value, lo/hi = optional ribbon bounds).
// Works with D3 v5 and v6 (r2d3 default). The zoom range and hidden series
// are kept in r2d3.ddplotState so a Shiny update or a resize keeps the view.

const o = options;
const isV6 = typeof d3.pointer === "function";
const PALETTE = ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951",
                 "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"];
const ACCENT = "#4269d0";
const W = width, H = height;
const font = o.font;
const axisCol = o.axisCol || "#333333";
const gridCol = o.gridCol || "#e9e9e9";
const bgcol = o.bgcol || "white";
const isTime = o.xType !== "number";
const DAY = 864e5;
const uid = "ddlc" + Math.random().toString(36).slice(2, 9);
const arr = v => (v === null || v === undefined) ? [] : [].concat(v);
const num = v => (v === null || v === undefined || v === "NA" || !isFinite(+v)) ? null : +v;
const parseT = isTime ? (s => new Date(s)) : (s => +s);

svg.style("background-color", bgcol).style("font-family", font);

// ---- persistent state (Shiny updates / resizes) ------------------------------
const state = r2d3.ddplotState || (r2d3.ddplotState = { timers: [] });
state.line = state.line || {};

// ---- series ----------------------------------------------------------------
const names = arr(o.series).map(String);
const userColors = arr(o.colors);
const series = names.map((name, i) => ({
  name, i,
  color: userColors.length ? userColors[i % userColors.length] : PALETTE[i % PALETTE.length],
  pts: []
}));
const byName = new Map(series.map(s => [s.name, s]));
data.forEach(r => {
  const s = byName.get(String(r.s));
  if (!s || r.t === null || r.t === undefined) return;
  s.pts.push({ t: parseT(r.t), v: num(r.v), lo: num(r.lo), hi: num(r.hi) });
});
series.forEach(s => {
  s.pts.sort((a, b) => a.t - b.t);
  s.tn = s.pts.map(p => +p.t);
  const steps = d3.pairs(s.tn).map(([a, b]) => b - a).filter(d => d > 0);
  s.step = steps.length ? d3.median(steps) : 0;
  s.hasRibbon = s.pts.some(p => p.lo !== null && p.hi !== null);
  // trailing moving average over complete windows
  if (o.rollmean) {
    const k = o.rollmean;
    let sum = 0, nn = 0;
    s.pts.forEach((p, i) => {
      if (p.v !== null) { sum += p.v; nn++; }
      if (i >= k) { const q = s.pts[i - k]; if (q.v !== null) { sum -= q.v; nn--; } }
      p.ma = (i >= k - 1 && nn === k) ? sum / k : null;
    });
  }
});

const allT = series.flatMap(s => s.tn);
if (!allT.length) {
  svg.append("text").attr("x", W / 2).attr("y", H / 2).attr("text-anchor", "middle")
    .style("fill", axisCol).text("No data");
  return;
}
const full = d3.extent(allT);
if (full[0] === full[1]) { full[0] -= isTime ? DAY : 1; full[1] += isTime ? DAY : 1; }
const medStep = d3.median(series.filter(s => s.step > 0), s => s.step) || (full[1] - full[0]) / 10;

// hidden series and view survive re-renders
const hidden = new Set(arr(state.line.hidden).filter(n => byName.has(n)));
if (hidden.size >= series.length) hidden.clear();
let view = full.slice();
if (state.line.view && state.line.full) {
  const pv = state.line.view, pf = state.line.full;
  const wasFull = pv[0] <= pf[0] && pv[1] >= pf[1];
  if (!wasFull) {
    const v0 = Math.max(full[0], pv[0]), v1 = Math.min(full[1], pv[1]);
    if (v1 - v0 > medStep) view = [v0, v1];
  }
}
const firstRender = !state.line.drawn;
state.line.full = full.slice();
state.line.view = view.slice();

// ---- formats ------------------------------------------------------------------
const transform = o.transform || "none";
const fmtValueCore = d3.format(o.valueFormat ||
  (transform === "percent" ? "+.2~%" : ",.2~f"));
const pre = o.valuePrefix || "", suf = o.valueSuffix || "";
const fmtValue = v => v === null ? "–" : pre + fmtValueCore(v) + suf;
const fmtRaw = d3.format(",.2~f");

const isIntX = !isTime && allT.every(Number.isInteger);
const fmtXNum = d3.format(isIntX ? "d" : "~g");
let fmtDate;
if (!isTime) {
  fmtDate = fmtXNum;
} else if (o.dateFormat) {
  fmtDate = d3.utcFormat(o.dateFormat);
} else if (o.xType === "datetime" && medStep < DAY) {
  fmtDate = d3.utcFormat("%b %-d, %Y %H:%M");
} else if (medStep >= 360 * DAY) {
  fmtDate = d3.utcFormat("%Y");
} else if (medStep >= 85 * DAY && medStep <= 95 * DAY) {
  fmtDate = d => "Q" + (Math.floor(d.getUTCMonth() / 3) + 1) + " " + d.getUTCFullYear();
} else if (medStep >= 27 * DAY) {
  fmtDate = d3.utcFormat("%B %Y");
} else {
  fmtDate = d3.utcFormat("%b %-d, %Y");
}

// ---- text measurement ----------------------------------------------------------
const measurer = svg.append("text").attr("x", -9999).attr("y", -9999)
  .style("font-family", font);
function tw(str, size, weight) {
  measurer.style("font-size", size + "px").style("font-weight", weight || 400).text(str);
  const w = measurer.node().getComputedTextLength();
  return w > 0 ? w : String(str).length * size * 0.6;
}

// ---- layout ---------------------------------------------------------------------
const padL = 14, padR = 14;
let top = 14;
const titleG = svg.append("g");
if (o.title) {
  titleG.append("text").attr("x", padL).attr("y", top + o.titleFontSize * 0.8)
    .style("font-size", o.titleFontSize + "px").style("font-weight", 700)
    .style("fill", axisCol).text(o.title);
  top += o.titleFontSize + 6;
}
if (o.subtitle) {
  titleG.append("text").attr("x", padL).attr("y", top + o.subtitleFontSize * 0.8)
    .style("font-size", o.subtitleFontSize + "px").style("fill", axisCol)
    .style("opacity", 0.65).text(o.subtitle);
  top += o.subtitleFontSize + 6;
}

// range buttons (dates only)
let buttons = [];
if (isTime && o.rangeButtons !== false) {
  const span = full[1] - full[0];
  const cand = [
    ["1M", e => d3.utcMonth.offset(e, -1)], ["6M", e => d3.utcMonth.offset(e, -6)],
    ["YTD", e => { const s = d3.utcYear.floor(e); return +s === +e ? d3.utcYear.offset(s, -1) : s; }],
    ["1Y", e => d3.utcYear.offset(e, -1)], ["5Y", e => d3.utcYear.offset(e, -5)],
    ["10Y", e => d3.utcYear.offset(e, -10)], ["3M", e => d3.utcMonth.offset(e, -3)],
    ["2Y", e => d3.utcYear.offset(e, -2)], ["1W", e => d3.utcDay.offset(e, -7)],
    ["20Y", e => d3.utcYear.offset(e, -20)]
  ];
  const end = new Date(full[1]);
  cand.forEach(([label, f]) => {
    if (buttons.length >= 6) return;
    const start = +f(end);
    const len = full[1] - start;
    if (len < span * 0.92 && len >= 4 * medStep) buttons.push({ label, start });
  });
  buttons.sort((a, b) => b.start - a.start);
  if (buttons.length) buttons.push({ label: "All", start: full[0] });
}
const btnH = 22, btnGap = 4;
buttons.forEach(b => { b.w = tw(b.label, 11, 600) + 16; });
const buttonsW = buttons.length ? d3.sum(buttons, b => b.w) + btnGap * (buttons.length - 1) : 0;

// legend items, wrapped
const legendOn = o.legend && series.length > 0;
const legendItems = [];
let headerRows = 0;
if (legendOn || buttons.length) {
  const availW = W - padL - padR - (buttons.length ? buttonsW + 16 : 0);
  let lx = 0, row = 0;
  if (legendOn) {
    series.forEach(s => {
      const w = 22 + tw(s.name, 12, 400) + 14;
      if (lx > 0 && lx + w > availW) { row++; lx = 0; }
      legendItems.push({ s, x: lx, row, w });
      lx += w;
    });
  }
  headerRows = legendOn ? row + 1 : 1;
  top += 4;
}
const headerTop = top;
top += headerRows * 22 + (headerRows ? 8 : 0);
if (o.ytitle) top += o.ytitleFontSize + 8;
top += 6;

// navigator / bottom area
const navOn = o.navigator !== false && H >= 280;
const navH = 44;
let bottom = 8 + 22;                         // x axis
if (o.xtitle) bottom += o.xtitleFontSize + 8;
if (navOn) bottom += 12 + navH + 16;

// right margin: end labels
const endOn = !!o.endLabels;
const endW = endOn ? Math.min(150, d3.max(series, s => tw(s.name, 11.5, 600)) + 18) : 0;

let px0, px1 = W - padR - endW, py0 = top, py1 = H - bottom;

// ---- value helpers -----------------------------------------------------------
const mainKey = o.rollmean ? "ma" : "v";
function bisectIdx(s, t) { return d3.bisectLeft(s.tn, t); }
function baseOf(s) {
  if (transform === "none") return 1;
  const i0 = bisectIdx(s, view[0]);
  for (let i = i0; i < s.pts.length; i++) {
    const v = s.pts[i][mainKey] !== null ? s.pts[i][mainKey] : s.pts[i].v;
    if (v !== null && v !== 0) return v;
  }
  return null;
}
function tf(v, base) {
  if (v === null || v === undefined) return null;
  if (transform === "none") return v;
  if (base === null) return null;
  return transform === "index" ? v / base * o.indexBase : v / base - 1;
}
const logOK = v => o.yScale !== "log" || (v !== null && v > 0);

function visibleSeries() { return series.filter(s => !hidden.has(s.name)); }

function yDomain() {
  let lo = Infinity, hi = -Infinity;
  visibleSeries().forEach(s => {
    const b = baseOf(s);
    s.base = b;
    const i0 = Math.max(0, bisectIdx(s, view[0]) - 1);
    const i1 = Math.min(s.pts.length - 1, d3.bisectRight(s.tn, view[1]));
    for (let i = i0; i <= i1; i++) {
      const p = s.pts[i];
      [p.v, p.lo, p.hi, p.ma].forEach(raw => {
        const v = tf(raw, b);
        if (v === null || v === undefined || !isFinite(v) || !logOK(v)) return;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      });
    }
  });
  if (transform === "none") arr(o.hlines).forEach(h => {
    const v = num(h.value);
    if (v !== null && logOK(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  });
  if (!isFinite(lo)) { lo = o.yScale === "log" ? 1 : 0; hi = o.yScale === "log" ? 10 : 1; }
  if (o.yScale === "log") {
    if (lo === hi) { lo /= 2; hi *= 2; }
    return [lo / 1.08, hi * 1.08];
  }
  if (o.yZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
  const pad = (hi - lo) * 0.06;
  return [(o.yZero && lo === 0) ? 0 : lo - pad, (o.yZero && hi === 0) ? 0 : hi + pad];
}

// y tick format
function yTickFormat(scale, n) {
  let f;
  if (transform === "percent") f = scale.tickFormat(n, "+%");
  else if (o.yScale === "log") f = scale.tickFormat(n, "~s");
  else {
    const m = d3.max(scale.domain(), Math.abs);
    // compact SI ticks (12k, 3.4M) unless the user supplied their own unit
    f = (m >= 1e4 && !pre && !suf) ? scale.tickFormat(n, "~s") : scale.tickFormat(n, m >= 1e4 ? ",~f" : undefined);
  }
  return d => {
    const s = f(d);
    if (s === "") return "";
    return pre + s.replace("G", "B") + suf;
  };
}

// ---- scales ------------------------------------------------------------------
const xScale = () => (isTime ? d3.scaleUtc() : d3.scaleLinear());
const x = xScale().domain(view);
const y = (o.yScale === "log" ? d3.scaleLog() : d3.scaleLinear());
y.domain(yDomain()).range([py1, py0]).nice();

const plotHeight = py1 - py0;
const nYTicks = o.yticks || Math.max(3, Math.round(plotHeight / 55));
{
  const f = yTickFormat(y, nYTicks);
  const labels = y.ticks(nYTicks).map(f);
  px0 = padL + Math.max(28, d3.max(labels, l => tw(l, o.yFontSize)) + 14);
}
x.range([px0, px1]);
const plotW = px1 - px0;
const xNav = xScale().domain(full).range([px0, px1]);

// ---- defs ---------------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "-clip").append("rect")
  .attr("x", px0).attr("y", py0 - 2).attr("width", plotW).attr("height", plotHeight + 4);
const shadow = defs.append("filter").attr("id", uid + "-shadow")
  .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
shadow.append("feDropShadow").attr("dx", 0).attr("dy", 2).attr("stdDeviation", 3)
  .attr("flood-color", "#000").attr("flood-opacity", 0.15);
if (o.area) {
  series.forEach(s => {
    const g = defs.append("linearGradient").attr("id", uid + "-grad-" + s.i)
      .attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
    g.append("stop").attr("offset", "0%").attr("stop-color", s.color)
      .attr("stop-opacity", series.length > 1 ? 0.18 : 0.32);
    g.append("stop").attr("offset", "100%").attr("stop-color", s.color).attr("stop-opacity", 0.02);
  });
}

// ---- layers --------------------------------------------------------------------
const gBands = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gGrid = svg.append("g").attr("class", "y-grid");
const gHlines = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gEvents = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gSeries = svg.append("g").attr("clip-path", `url(#${uid}-clip)`);
const gEventLabels = svg.append("g");
const gXAxis = svg.append("g").attr("transform", `translate(0,${py1})`);
const gEnd = svg.append("g");
const gInteract = svg.append("g");
const gCross = svg.append("g").style("pointer-events", "none").style("display", "none");
const gTip = svg.append("g").style("pointer-events", "none").style("display", "none");

if (o.ytitle) {
  svg.append("text").attr("x", padL).attr("y", py0 - 12)
    .style("font-size", o.ytitleFontSize + "px").style("fill", axisCol)
    .style("opacity", 0.8).text(o.ytitle);
}
if (o.xtitle) {
  svg.append("text").attr("x", px1).attr("y", py1 + 22 + o.xtitleFontSize + 4)
    .attr("text-anchor", "end").style("font-size", o.xtitleFontSize + "px")
    .style("fill", axisCol).style("opacity", 0.8).text(o.xtitle);
}

// ---- path generators ---------------------------------------------------------
const curve = d3[o.curve] || d3.curveLinear;
function lineFor(s, key) {
  return d3.line()
    .defined(p => { const v = tf(p[key], s.base); return v !== null && isFinite(v) && logOK(v); })
    .x(p => x(p.t)).y(p => y(tf(p[key], s.base))).curve(curve);
}
function ribbonFor(s) {
  return d3.area()
    .defined(p => {
      const a = tf(p.lo, s.base), b = tf(p.hi, s.base);
      return a !== null && b !== null && logOK(a) && logOK(b);
    })
    .x(p => x(p.t)).y0(p => y(tf(p.lo, s.base))).y1(p => y(tf(p.hi, s.base))).curve(curve);
}
function areaFor(s) {
  const floor = () => {
    const d = y.domain();
    return o.yScale === "log" ? py1 : y(Math.max(d[0], Math.min(d[1], 0)));
  };
  return d3.area()
    .defined(p => { const v = tf(p[mainKey], s.base); return v !== null && logOK(v); })
    .x(p => x(p.t)).y0(floor).y1(p => y(tf(p[mainKey], s.base))).curve(curve);
}

// ---- series groups -------------------------------------------------------------
series.forEach(s => {
  const g = gSeries.append("g").attr("class", "series");
  s.g = g;
  if (s.hasRibbon) s.ribbon = g.append("path").attr("fill", s.color).attr("fill-opacity", 0.16);
  if (o.area) s.area = g.append("path").attr("fill", `url(#${uid}-grad-${s.i})`);
  if (o.rollmean && o.showRaw) {
    s.raw = g.append("path").attr("fill", "none").attr("stroke", s.color)
      .attr("stroke-width", Math.max(1, o.strokeWidth * 0.5)).attr("stroke-opacity", 0.35);
  }
  s.line = g.append("path").attr("fill", "none").attr("stroke", s.color)
    .attr("stroke-width", o.strokeWidth).attr("stroke-opacity", o.opacity)
    .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
  if (o.points) {
    s.dots = g.append("g").selectAll("circle")
      .data(s.pts.filter(p => p[mainKey] !== null)).enter().append("circle")
      .attr("r", Math.max(2, o.strokeWidth * 1.2)).attr("fill", s.color)
      .attr("stroke", bgcol).attr("stroke-width", 1);
  }
});

// ---- helpers for transitions ---------------------------------------------------
function T(sel, dur) {
  if (dur > 0) return sel.transition().duration(dur).ease(d3.easeCubicOut);
  sel.interrupt();
  return sel;
}

// ---- axes ---------------------------------------------------------------------------
const nXTicks = o.xticks || Math.max(2, Math.floor(plotW / 95));
function drawAxes(dur) {
  const xa = d3.axisBottom(x).ticks(nXTicks).tickSizeOuter(0).tickSize(5).tickPadding(6);
  if (!isTime) xa.tickFormat(fmtXNum);
  T(gXAxis, dur).call(xa);
  gXAxis.select(".domain").attr("stroke", axisCol).attr("stroke-opacity", 0.5);
  gXAxis.selectAll(".tick line").attr("stroke", axisCol).attr("stroke-opacity", 0.5);
  gXAxis.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.8)
    .style("font-size", o.xFontSize + "px").style("font-family", font);

  const ya = d3.axisLeft(y).ticks(nYTicks).tickFormat(yTickFormat(y, nYTicks))
    .tickSize(-(px1 - px0)).tickPadding(8);
  gGrid.attr("transform", `translate(${px0},0)`);
  T(gGrid, dur).call(ya);
  gGrid.select(".domain").remove();
  gGrid.selectAll(".tick line").attr("stroke", gridCol).attr("stroke-width", 1);
  gGrid.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.75)
    .style("font-size", o.yFontSize + "px").style("font-family", font);
}

// ---- annotations ------------------------------------------------------------------
const bandsData = arr(o.bands).map(b => ({ t0: +parseT(b.t0), t1: +parseT(b.t1), label: b.label || "", color: b.color || "" }))
  .filter(b => isFinite(b.t0) && isFinite(b.t1));
const bandRects = gBands.selectAll("rect").data(bandsData).enter().append("rect")
  .attr("fill", b => b.color || axisCol).attr("fill-opacity", b => b.color ? 0.18 : 0.07);
const bandLabels = gBands.selectAll("text").data(bandsData.filter(b => b.label)).enter().append("text")
  .style("font-size", "10px").style("fill", axisCol).style("fill-opacity", 0.6).text(b => b.label);

const eventsData = arr(o.events).map(e => ({ t: +parseT(e.t), label: e.label || "" }))
  .filter(e => isFinite(e.t)).sort((a, b) => a.t - b.t);
const eventLines = gEvents.selectAll("line").data(eventsData).enter().append("line")
  .attr("stroke", axisCol).attr("stroke-opacity", 0.5).attr("stroke-dasharray", "4,3");
const eventLabels = gEventLabels.selectAll("text").data(eventsData.filter(e => e.label)).enter()
  .append("text").style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.8)
  .attr("paint-order", "stroke").attr("stroke", bgcol).attr("stroke-width", 3)
  .text(e => e.label);
eventLabels.each(function (e) { e.w = tw(e.label, 10.5); });

const hlinesData = transform === "none" ? arr(o.hlines).map(h => ({ value: num(h.value), label: h.label || "" }))
  .filter(h => h.value !== null && logOK(h.value)) : [];
const hlineSel = gHlines.selectAll("g").data(hlinesData).enter().append("g");
hlineSel.append("line").attr("stroke", axisCol).attr("stroke-opacity", 0.55).attr("stroke-dasharray", "5,4");
hlineSel.append("text").attr("text-anchor", "end").style("font-size", "10.5px")
  .style("fill", axisCol).style("fill-opacity", 0.75)
  .attr("paint-order", "stroke").attr("stroke", bgcol).attr("stroke-width", 3)
  .text(h => h.label);

function drawAnnotations(dur) {
  T(bandRects, dur).attr("x", b => x(b.t0)).attr("width", b => Math.max(0, x(b.t1) - x(b.t0)))
    .attr("y", py0).attr("height", plotHeight);
  T(bandLabels, dur).attr("x", b => Math.max(x(b.t0), px0) + 4).attr("y", py1 - 6)
    .style("opacity", b => (x(b.t1) - Math.max(x(b.t0), px0)) > tw(b.label, 10) + 8 ? 1 : 0);
  T(eventLines, dur).attr("x1", e => x(e.t)).attr("x2", e => x(e.t)).attr("y1", py0).attr("y2", py1);
  // stack labels in up to 3 rows to avoid overlaps
  const rowsEnd = [-Infinity, -Infinity, -Infinity];
  eventLabels.each(function (e) {
    const ex = x(e.t);
    e.visible = ex >= px0 && ex <= px1;
    e.ax = ex + 4 + e.w > px1 ? ex - 4 - e.w : ex + 4;
    e.row = rowsEnd.findIndex(end => e.ax > end + 6);
    if (e.row < 0) e.row = 2;
    if (e.visible) rowsEnd[e.row] = e.ax + e.w;
  });
  T(eventLabels, dur).attr("x", e => e.ax).attr("y", e => py0 + 12 + e.row * 13)
    .style("opacity", e => e.visible ? 1 : 0);
  T(hlineSel.select("line"), dur).attr("x1", px0).attr("x2", px1)
    .attr("y1", h => y(h.value)).attr("y2", h => y(h.value));
  T(hlineSel.select("text"), dur).attr("x", px1 - 4).attr("y", h => y(h.value) - 5);
}

// ---- series drawing ------------------------------------------------------------
function drawSeries(dur) {
  series.forEach(s => {
    const vis = !hidden.has(s.name);
    T(s.g, dur).style("opacity", vis ? 1 : 0);
    s.g.style("pointer-events", vis ? null : "none");
    if (!vis) return;
    if (s.ribbon) T(s.ribbon, dur).attr("d", ribbonFor(s)(s.pts));
    if (s.area) T(s.area, dur).attr("d", areaFor(s)(s.pts));
    if (s.raw) T(s.raw, dur).attr("d", lineFor(s, "v")(s.pts));
    T(s.line, dur).attr("d", lineFor(s, mainKey)(s.pts));
    if (s.dots) T(s.dots, dur).attr("cx", p => x(p.t)).attr("cy", p => {
      const v = tf(p[mainKey], s.base);
      return v === null || !logOK(v) ? -99 : y(v);
    });
  });
}

// ---- end labels ----------------------------------------------------------------
function lastVisible(s) {
  const i1 = Math.min(s.pts.length - 1, d3.bisectRight(s.tn, view[1]) - 1);
  const i0 = bisectIdx(s, view[0]);
  for (let i = i1; i >= i0; i--) {
    const v = tf(s.pts[i][mainKey], s.base);
    if (v !== null && isFinite(v) && logOK(v)) return { p: s.pts[i], v };
  }
  return null;
}
function drawEndLabels(dur) {
  if (!endOn) return;
  const items = [];
  visibleSeries().forEach(s => {
    const lv = lastVisible(s);
    if (lv) items.push({ s, y0: y(lv.v), x0: x(lv.p.t), v: lv.v });
  });
  items.sort((a, b) => a.y0 - b.y0);
  const lh = 14;
  items.forEach((it, i) => { it.y = i ? Math.max(it.y0, items[i - 1].y + lh) : it.y0; });
  const over = items.length ? items[items.length - 1].y - (py1 - 2) : 0;
  if (over > 0) {
    items.forEach(it => { it.y -= over; });
    for (let i = items.length - 2; i >= 0; i--) items[i].y = Math.min(items[i].y, items[i + 1].y - lh);
  }
  const sel = gEnd.selectAll("g.endlab").data(items, d => d.s.name);
  sel.exit().remove();
  const ent = sel.enter().append("g").attr("class", "endlab").style("cursor", "pointer");
  ent.append("path").attr("fill", "none").attr("stroke-width", 1).attr("stroke-opacity", 0.6);
  ent.append("text").style("font-size", "11.5px").style("font-weight", 600).attr("dy", "0.35em");
  const all = ent.merge(sel);
  all.select("path").attr("stroke", d => d.s.color);
  all.select("text").style("fill", d => d.s.color).text(d => truncate(d.s.name, endW - 14, 11.5, 600));
  T(all.select("path"), dur).attr("d", d => `M${px1 + 1},${d.y0}L${px1 + 4},${d.y}L${px1 + 7},${d.y}`);
  T(all.select("text"), dur).attr("x", px1 + 9).attr("y", d => d.y);
  all.on("mouseenter", function () { const d = d3.select(this).datum(); focusSeries(d.s.name); })
     .on("mouseleave", () => focusSeries(null));
}
function truncate(str, maxW, size, weight) {
  if (tw(str, size, weight) <= maxW) return str;
  let s = str;
  while (s.length > 1 && tw(s + "…", size, weight) > maxW) s = s.slice(0, -1);
  return s + "…";
}

// ---- focus (highlight one series) -----------------------------------------------
let focused = null;
function focusSeries(name) {
  if (focused === name || series.length < 2) return;
  focused = name;
  series.forEach(s => {
    const on = name === null || s.name === name;
    s.line.interrupt("focus").transition("focus").duration(150)
      .attr("stroke-opacity", on ? o.opacity : 0.18)
      .attr("stroke-width", name !== null && on ? o.strokeWidth + 0.75 : o.strokeWidth);
    [s.ribbon, s.area, s.raw].forEach(el => {
      if (el) el.interrupt("focus").transition("focus").duration(150).style("opacity", on ? 1 : 0.15);
    });
    if (s.dots) s.dots.style("opacity", on ? 1 : 0.15);
  });
  legendG.selectAll("g.item").style("opacity", d => hidden.has(d.s.name) ? 0.4 : (name === null || d.s.name === name ? 1 : 0.45));
  gEnd.selectAll("g.endlab").style("opacity", d => name === null || d.s.name === name ? 1 : 0.3);
}

// ---- legend ---------------------------------------------------------------------
const legendG = svg.append("g").attr("transform", `translate(${padL},${headerTop})`);
if (legendOn) {
  const items = legendG.selectAll("g.item").data(legendItems).enter().append("g")
    .attr("class", "item").attr("transform", d => `translate(${d.x},${d.row * 22})`)
    .style("cursor", "pointer");
  items.append("rect").attr("x", -4).attr("y", 0).attr("height", 22).attr("width", d => d.w - 6)
    .attr("rx", 4).attr("fill", axisCol).attr("fill-opacity", 0);
  items.append("line").attr("x1", 2).attr("x2", 18).attr("y1", 11).attr("y2", 11)
    .attr("stroke", d => d.s.color).attr("stroke-width", 3).attr("stroke-linecap", "round");
  items.append("text").attr("x", 24).attr("y", 11).attr("dy", "0.35em")
    .style("font-size", "12px").style("fill", axisCol).text(d => d.s.name);
  let clickTimer = null;
  items
    .on("mouseenter", function () {
      const d = d3.select(this).datum();
      d3.select(this).select("rect").attr("fill-opacity", 0.06);
      if (!hidden.has(d.s.name)) focusSeries(d.s.name);
    })
    .on("mouseleave", function () {
      d3.select(this).select("rect").attr("fill-opacity", 0);
      focusSeries(null);
    })
    .on("click", function () {
      const d = d3.select(this).datum();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; return; }
      clickTimer = ddplotTrack(setTimeout(() => { clickTimer = null; toggleSeries(d.s.name); }, 230));
    })
    .on("dblclick", function () {
      const d = d3.select(this).datum();
      if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
      isolateSeries(d.s.name);
    });
}
function styleLegend() {
  legendG.selectAll("g.item").style("opacity", d => hidden.has(d.s.name) ? 0.4 : 1);
  legendG.selectAll("g.item text").style("text-decoration", d => hidden.has(d.s.name) ? "line-through" : null);
}
function toggleSeries(name) {
  if (!hidden.has(name)) {
    if (visibleSeries().length <= 1) return;
    hidden.add(name);
  } else hidden.delete(name);
  afterVisibilityChange();
}
function isolateSeries(name) {
  const onlyThis = visibleSeries().length === 1 && !hidden.has(name);
  hidden.clear();
  if (!onlyThis) series.forEach(s => { if (s.name !== name) hidden.add(s.name); });
  afterVisibilityChange();
}
function afterVisibilityChange() {
  state.line.hidden = Array.from(hidden);
  focused = undefined;
  focusSeries(null);
  styleLegend();
  update(450);
  drawNavigator();
  hideCrosshair();
}

// ---- range buttons -------------------------------------------------------------
const btnG = svg.append("g").attr("transform", `translate(${W - padR - buttonsW},${headerTop})`);
let bx = 0;
buttons.forEach(b => { b.x = bx; bx += b.w + btnGap; });
const btnSel = btnG.selectAll("g").data(buttons).enter().append("g")
  .attr("transform", b => `translate(${b.x},0)`).style("cursor", "pointer");
btnSel.append("rect").attr("width", b => b.w).attr("height", btnH).attr("rx", 5)
  .attr("fill", ACCENT).attr("fill-opacity", 0)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.15);
btnSel.append("text").attr("x", b => b.w / 2).attr("y", btnH / 2).attr("dy", "0.35em")
  .attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600)
  .style("fill", axisCol).text(b => b.label);
btnSel
  .on("mouseenter", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.4); })
  .on("mouseleave", function () { d3.select(this).select("rect").attr("stroke-opacity", 0.15); })
  .on("click", function () {
    const b = d3.select(this).datum();
    setView([b.start, full[1]], 650);
  });
function styleButtons() {
  const tol = Math.max(medStep, DAY) * 0.6;
  btnSel.each(function (b) {
    const active = Math.abs(view[0] - Math.max(b.start, full[0])) <= tol && Math.abs(view[1] - full[1]) <= tol;
    d3.select(this).select("rect").attr("fill-opacity", active ? 0.14 : 0);
    d3.select(this).select("text").style("fill", active ? ACCENT : axisCol);
  });
}

// ---- crosshair + tooltip ---------------------------------------------------------
const crossLine = gCross.append("line").attr("y1", py0).attr("y2", py1)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "3,3");
const crossDots = gCross.append("g");
const xPill = gCross.append("g");
const xPillRect = xPill.append("rect").attr("rx", 4).attr("height", 20).attr("fill", axisCol);
const xPillText = xPill.append("text").attr("y", 10).attr("dy", "0.35em").attr("text-anchor", "middle")
  .style("font-size", "11px").style("fill", bgcol).style("font-weight", 600);
const tipRect = gTip.append("rect").attr("rx", 6).attr("fill", bgcol)
  .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("filter", `url(#${uid}-shadow)`);
const tipBody = gTip.append("g");

let allTimesVisible = [];
function refreshTimes() {
  const set = new Set();
  visibleSeries().forEach(s => s.tn.forEach(t => set.add(t)));
  allTimesVisible = Array.from(set).sort((a, b) => a - b);
}

function nearestInSeries(s, t) {
  const i = bisectIdx(s, t);
  let best = null;
  [i - 1, i].forEach(j => {
    if (j < 0 || j >= s.pts.length) return;
    if (best === null || Math.abs(s.tn[j] - t) < Math.abs(s.tn[best] - t)) best = j;
  });
  if (best === null) return null;
  const tol = (s.step || medStep) * 0.51;
  return Math.abs(s.tn[best] - t) <= tol ? s.pts[best] : null;
}

let brushing = false, lastKey = null;
function hideCrosshair() {
  gCross.style("display", "none");
  gTip.style("display", "none");
  lastKey = null;
  if (focused) focusSeries(null);
}
function onMove(mx, my) {
  if (o.tooltip === false || brushing) return;
  if (mx < px0 || mx > px1 || my < py0 - 4 || my > py1 + 4 || !allTimesVisible.length) { hideCrosshair(); return; }
  const t0 = +x.invert(mx);
  let k = d3.bisectLeft(allTimesVisible, t0);
  if (k > 0 && (k >= allTimesVisible.length || t0 - allTimesVisible[k - 1] < allTimesVisible[k] - t0)) k--;
  const tSnap = allTimesVisible[k];
  if (tSnap < view[0] || tSnap > view[1]) { hideCrosshair(); return; }
  const cx = x(tSnap);

  const rows = [];
  visibleSeries().forEach(s => {
    const p = nearestInSeries(s, tSnap);
    if (!p) return;
    const v = tf(p[mainKey], s.base);
    if (v === null || !isFinite(v) || !logOK(v)) return;
    rows.push({ s, p, v, py: y(v) });
  });
  // nearest series to the pointer is focused
  let near = null;
  if (rows.length > 1) {
    const r = d3.least ? d3.least(rows, r => Math.abs(r.py - my)) : rows.slice().sort((a, b) => Math.abs(a.py - my) - Math.abs(b.py - my))[0];
    if (r && Math.abs(r.py - my) < 26) near = r.s.name;
  }
  focusSeries(near);

  gCross.style("display", null);
  crossLine.attr("x1", cx).attr("x2", cx);
  const dots = crossDots.selectAll("circle").data(rows, r => r.s.name);
  dots.exit().remove();
  dots.enter().append("circle").attr("r", 4.5).attr("stroke", bgcol).attr("stroke-width", 2)
    .merge(dots).attr("fill", r => r.s.color).attr("cx", r => x(r.p.t)).attr("cy", r => r.py)
    .style("opacity", r => near === null || r.s.name === near ? 1 : 0.35);

  const label = fmtDate(isTime ? new Date(tSnap) : tSnap);
  xPillText.text(label);
  const pw = tw(label, 11, 600) + 14;
  const pxl = Math.max(px0 - 10, Math.min(px1 + 10 - pw, cx - pw / 2));
  xPill.attr("transform", `translate(${pxl},${py1 + 3})`);
  xPillRect.attr("width", pw);
  xPillText.attr("x", pw / 2);

  if (!rows.length) { gTip.style("display", "none"); return; }
  const key = tSnap + "|" + near + "|" + rows.length;
  if (key !== lastKey) {
    lastKey = key;
    buildTip(label, rows, near);
  }
  gTip.style("display", null);
  const tipW = +tipRect.attr("width"), tipH = +tipRect.attr("height");
  let tx = cx + 16;
  if (tx + tipW > W - 4) tx = cx - 16 - tipW;
  if (tx < 4) tx = 4;
  const ty = Math.max(py0, Math.min(py1 - tipH, my - tipH / 2));
  gTip.attr("transform", `translate(${tx},${ty})`);
}

function buildTip(label, rows, near) {
  tipBody.selectAll("*").remove();
  const sorted = rows.slice().sort((a, b) => b.v - a.v);
  const maxRows = 12;
  const shown = sorted.slice(0, maxRows);
  const pad = 10, lh = 18;
  tipBody.append("text").attr("x", pad).attr("y", pad + 9)
    .style("font-size", "11.5px").style("font-weight", 700).style("fill", axisCol).text(label);
  let maxName = 0, maxVal = 0, maxExtra = 0;
  shown.forEach(r => {
    r.name = truncate(r.s.name, 170, 11.5, r.s.name === near ? 700 : 400);
    r.val = fmtValue(r.v);
    if (r.p.lo !== null && r.p.hi !== null && r.s.hasRibbon) {
      r.extra = "[" + fmtValue(tf(r.p.lo, r.s.base)) + " – " + fmtValue(tf(r.p.hi, r.s.base)) + "]";
    } else if (o.rollmean && r.p.v !== null) {
      r.extra = "raw " + fmtValue(tf(r.p.v, r.s.base));
    } else if (transform !== "none" && r.p.v !== null) {
      r.extra = fmtRaw(r.p.v);
    } else r.extra = "";
    maxName = Math.max(maxName, tw(r.name, 11.5, 700));
    maxVal = Math.max(maxVal, tw(r.val, 11.5, 700));
    maxExtra = Math.max(maxExtra, r.extra ? tw(r.extra, 10.5) + 8 : 0);
  });
  const colName = pad + 14, colVal = colName + maxName + 16 + maxVal;
  const w = Math.max(tw(label, 11.5, 700) + pad * 2, colVal + maxExtra + pad);
  shown.forEach((r, i) => {
    const yy = pad + 9 + (i + 1) * lh + 2;
    const bold = r.s.name === near ? 700 : 400;
    tipBody.append("circle").attr("cx", pad + 4).attr("cy", yy - 4).attr("r", 4).attr("fill", r.s.color);
    tipBody.append("text").attr("x", colName).attr("y", yy)
      .style("font-size", "11.5px").style("font-weight", bold).style("fill", axisCol).text(r.name);
    tipBody.append("text").attr("x", colVal).attr("y", yy).attr("text-anchor", "end")
      .style("font-size", "11.5px").style("font-weight", 700).style("fill", axisCol).text(r.val);
    if (r.extra) tipBody.append("text").attr("x", colVal + 8).attr("y", yy)
      .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.55).text(r.extra);
  });
  let h = pad + 9 + shown.length * lh + pad + 4;
  if (sorted.length > maxRows) {
    tipBody.append("text").attr("x", colName).attr("y", h)
      .style("font-size", "10.5px").style("fill", axisCol).style("fill-opacity", 0.6)
      .text("+ " + (sorted.length - maxRows) + " more");
    h += lh - 4;
  }
  tipRect.attr("width", w).attr("height", h);
}

// interaction surface: brush (drag to zoom) or a plain rect
function pointerOf(ev) {
  return isV6 ? d3.pointer(ev, svg.node()) : d3.mouse(svg.node());
}
let surface;
if (o.zoom !== false) {
  const brushMain = d3.brushX().extent([[px0, py0], [px1, py1]])
    .on("start", function (e) { const ev = isV6 ? e : d3.event; if (ev.sourceEvent) { brushing = true; hideCrosshair(); } })
    .on("end", function (e) {
      const ev = isV6 ? e : d3.event;
      brushing = false;
      if (!ev.sourceEvent || !ev.selection) return;
      const [a, b] = ev.selection.map(v => +x.invert(v));
      surface.call(brushMain.move, null);
      if (b - a >= Math.max(medStep * 2, 1e-9) && ev.selection[1] - ev.selection[0] > 6) setView([a, b], 600);
    });
  surface = gInteract.append("g").attr("class", "zoom-brush").call(brushMain);
  surface.select(".selection").attr("fill", ACCENT).attr("fill-opacity", 0.1).attr("stroke", "none");
  surface.selectAll(".handle").style("display", "none");
  surface.select(".overlay").style("cursor", "crosshair");
} else {
  surface = gInteract.append("rect").attr("x", px0).attr("y", py0).attr("width", plotW)
    .attr("height", plotHeight).attr("fill", "transparent");
}
surface
  .on("mousemove.ddlc", function (e) { const [mx, my] = pointerOf(e); onMove(mx, my); })
  .on("mouseleave.ddlc", hideCrosshair)
  .on("dblclick.ddlc", () => setView(full.slice(), 600));

// ---- navigator -------------------------------------------------------------------
let navBrush = null, navG = null;
const ny0 = py1 + 30 + (o.xtitle ? o.xtitleFontSize + 8 : 0), ny1 = ny0 + navH;
if (navOn) {
  navG = svg.append("g");
  navG.append("rect").attr("x", px0).attr("y", ny0).attr("width", plotW).attr("height", navH)
    .attr("fill", axisCol).attr("fill-opacity", 0.03)
    .attr("stroke", axisCol).attr("stroke-opacity", 0.12).attr("rx", 3);
  navG.append("g").attr("class", "navlines");
  const na = d3.axisBottom(xNav).ticks(Math.max(2, Math.floor(plotW / 110))).tickSize(0).tickPadding(4);
  if (!isTime) na.tickFormat(fmtXNum);
  const nax = navG.append("g").attr("transform", `translate(0,${ny1})`).call(na);
  nax.select(".domain").remove();
  nax.selectAll(".tick text").style("fill", axisCol).style("fill-opacity", 0.5)
    .style("font-size", "9.5px").style("font-family", font);
  navG.append("rect").attr("class", "mask-l").attr("y", ny0).attr("height", navH)
    .attr("fill", axisCol).attr("fill-opacity", 0.07).style("pointer-events", "none");
  navG.append("rect").attr("class", "mask-r").attr("y", ny0).attr("height", navH)
    .attr("fill", axisCol).attr("fill-opacity", 0.07).style("pointer-events", "none");

  navBrush = d3.brushX().extent([[px0, ny0], [px1, ny1]])
    .on("brush end", function (e) {
      const ev = isV6 ? e : d3.event;
      if (!ev.sourceEvent) return;
      if (!ev.selection) {
        if (ev.type === "end") setView(full.slice(), 500);
        return;
      }
      const v = ev.selection.map(s => +xNav.invert(s));
      if (v[1] - v[0] < medStep) return;
      view = v;
      update(0, true);
    });
  navG.append("g").attr("class", "navbrush").call(navBrush);
  const nb = navG.select(".navbrush");
  nb.select(".selection").attr("fill", ACCENT).attr("fill-opacity", 0.12)
    .attr("stroke", ACCENT).attr("stroke-opacity", 0.6).attr("rx", 3);
  nb.selectAll(".handle").attr("fill", bgcol).attr("stroke", ACCENT).attr("stroke-opacity", 0.8)
    .attr("rx", 2);
}
function drawNavigator() {
  if (!navOn) return;
  const vis = visibleSeries();
  let lo = Infinity, hi = -Infinity;
  vis.forEach(s => s.pts.forEach(p => {
    if (p.v !== null && logOK(p.v)) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v); }
  }));
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  const yN = (o.yScale === "log" && transform === "none" ? d3.scaleLog() : d3.scaleLinear())
    .domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]).range([ny1 - 4, ny0 + 4]);
  const ln = d3.line().defined(p => p.v !== null && logOK(p.v)).x(p => xNav(p.t)).y(p => yN(p.v));
  const sel = navG.select(".navlines").selectAll("path").data(vis, s => s.name);
  sel.exit().remove();
  sel.enter().append("path").attr("fill", "none").attr("stroke-width", 1)
    .merge(sel).attr("stroke", s => s.color).attr("stroke-opacity", 0.75).attr("d", s => ln(s.pts));
}
function syncNavigator() {
  if (!navOn) return;
  const a = xNav(view[0]), b = xNav(view[1]);
  navG.select(".navbrush").call(navBrush.move, [a, b]);
  navG.select(".mask-l").attr("x", px0).attr("width", Math.max(0, a - px0));
  navG.select(".mask-r").attr("x", b).attr("width", Math.max(0, px1 - b));
}

// ---- update cycle -----------------------------------------------------------------
function setView(v, dur) {
  let a = Math.max(full[0], v[0]), b = Math.min(full[1], v[1]);
  if (b - a < medStep) { const c = (a + b) / 2; a = Math.max(full[0], c - medStep); b = Math.min(full[1], c + medStep); }
  view = [a, b];
  update(dur);
}
function update(dur, fromNav) {
  state.line.view = view.slice();
  x.domain(view);
  y.domain(yDomain()).nice();
  hideCrosshair();
  refreshTimes();
  drawAxes(dur);
  drawAnnotations(dur);
  drawSeries(dur);
  drawEndLabels(dur);
  styleButtons();
  if (!fromNav) syncNavigator();
  else if (navOn) {
    const a = xNav(view[0]), b = xNav(view[1]);
    navG.select(".mask-l").attr("x", px0).attr("width", Math.max(0, a - px0));
    navG.select(".mask-r").attr("x", b).attr("width", Math.max(0, px1 - b));
  }
}

// ---- first render ---------------------------------------------------------------
styleLegend();
drawNavigator();
update(0);

if (o.animate !== false && firstRender) {
  const dur = 1300;
  series.forEach(s => {
    if (hidden.has(s.name)) return;
    const node = s.line.node();
    const len = node.getTotalLength ? node.getTotalLength() : 0;
    if (len > 0) {
      s.line.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
        .transition("intro").duration(dur).ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0)
        .on("end interrupt", function () {
          d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
        });
    }
    [s.ribbon, s.area, s.raw].forEach(el => {
      if (el) el.style("opacity", 0).transition("intro").delay(dur * 0.5).duration(dur * 0.6).style("opacity", 1);
    });
    if (s.dots) s.dots.style("opacity", 0).transition("intro").delay(dur * 0.6).duration(400).style("opacity", 1);
  });
  gEnd.style("opacity", 0).transition("intro").delay(dur * 0.8).duration(400).style("opacity", 1);
}
state.line.drawn = true;
