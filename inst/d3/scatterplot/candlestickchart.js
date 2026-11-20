// candlestick_chart() -- open / high / low / close candles, volumes, moving
// averages, a crosshair and zoom. The periods are placed side by side (no gaps
// for closed days). Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "candlestick_chart");
const rows = (data || []).map((d, i) => ({ i, t: +d.t, o: +d.o, h: +d.h, l: +d.l, c: +d.c, v: d.v === undefined ? null : pkNum(d.v, null) }));
if (!rows.length) { ck.empty(); return; }
const N = rows.length;
rows.forEach((r, i) => { r.up = r.c >= r.o; r.chg = i ? r.c / rows[i - 1].c - 1 : null; });
const mas = pkArr(o.mas).map((m, k) => ({ k: +m.k, v: pkArr(m.v).map(v => pkNum(v, null)), col: pkArr(o.maColors)[k] || CK_PALETTE[k] }));
const fmt = ckFormat(o.valueFormat, ",.2f");
const tfmt = d3.utcFormat(o.dateFormat || (o.day ? "%b %-d, %Y" : "%b %-d, %Y %H:%M"));
const upCol = o.upCol || "#2e9d5b", downCol = o.downCol || "#e5484d";
const vfmt = d3.format(".3~s"), pfmt = d3.format("+.2%");

// ---- layout ------------------------------------------------------------------------------
const readH = 18;
const m = { top: ck.top + readH + 6, right: 58, bottom: 26, left: o.ytitle ? 26 : 10 };
const W = Math.max(60, width - m.left - m.right), Hall = Math.max(60, height - m.top - m.bottom);
const hasVol = !!o.hasVolume && rows.some(r => r.v !== null);
const Hp = hasVol ? Hall * 0.76 : Hall, volTop = Hp + 10, Hv = hasVol ? Hall - Hp - 10 : 0;
const x0 = d3.scaleLinear().domain([-0.5, N - 0.5]).range([0, W]);
let x = x0;
const y = d3.scaleLinear().range([Hp, 0]);
const yv = d3.scaleLinear().range([Hv, 0]);
const clipId = pkUid("ckclip");
svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("width", W).attr("height", Hall);
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);
const gridG = root.append("g"), yAxisG = root.append("g").attr("transform", `translate(${W},0)`);
const xAxisG = root.append("g").attr("transform", `translate(0,${Hall})`);
const plot = root.append("g").attr("clip-path", `url(#${clipId})`);
const volG = plot.append("g").attr("transform", `translate(0,${volTop})`);
const candleG = plot.append("g"), maG = plot.append("g").attr("fill", "none");
if (o.ytitle) ckLabel(ck, o.ytitle, 4 + 12 * 0.8, m.top + Hp / 2, 12, true);

const vols = hasVol ? volG.selectAll("rect").data(rows).enter().append("rect")
  .attr("fill", r => r.up ? upCol : downCol).attr("fill-opacity", 0.35) : null;
const candles = candleG.selectAll("g").data(rows).enter().append("g");
candles.append("line").attr("class", "wick").attr("stroke", r => r.up ? upCol : downCol).attr("stroke-width", 1.2);
candles.append("rect").attr("class", "body").attr("fill", r => r.up ? upCol : downCol)
  .attr("stroke", r => r.up ? upCol : downCol).attr("stroke-width", 0.6);
const maLines = mas.map(ma => maG.append("path").attr("stroke", ma.col).attr("stroke-width", 1.6).attr("stroke-linejoin", "round"));

// the readout above the chart
const read = svg.append("text").attr("x", m.left).attr("y", ck.top + 12).style("font-size", "11px").style("fill", ck.textCol);
function readout(r) {
  read.selectAll("*").remove();
  read.append("tspan").style("font-weight", 700).text(tfmt(new Date(r.t)) + "   ");
  [["O", r.o], ["H", r.h], ["L", r.l], ["C", r.c]].forEach(p => {
    read.append("tspan").style("fill-opacity", 0.6).text(p[0] + " ");
    read.append("tspan").style("fill", r.up ? upCol : downCol).text(fmt(p[1]) + "  ");
  });
  if (r.chg !== null) read.append("tspan").style("fill", r.chg >= 0 ? upCol : downCol).style("font-weight", 700).text(pfmt(r.chg) + "  ");
  if (r.v !== null) { read.append("tspan").style("fill-opacity", 0.6).text("Vol "); read.append("tspan").text(vfmt(r.v) + "  "); }
  mas.forEach(ma => {
    const v = ma.v[r.i];
    if (v === null) return;
    read.append("tspan").style("fill", ma.col).style("font-weight", 700).text("MA" + ma.k + " ");
    read.append("tspan").text(fmt(v) + "  ");
  });
}
readout(rows[N - 1]);

function draw() {
  const i0 = Math.max(0, Math.floor(x.invert(0))), i1 = Math.min(N - 1, Math.ceil(x.invert(W)));
  const vis = rows.slice(i0, i1 + 1);
  let lo = d3.min(vis, r => r.l), hi = d3.max(vis, r => r.h);
  mas.forEach(ma => { for (let i = i0; i <= i1; i++) if (ma.v[i] !== null) { lo = Math.min(lo, ma.v[i]); hi = Math.max(hi, ma.v[i]); } });
  const pad = (hi - lo) * 0.06 || 1;
  y.domain([lo - pad, hi + pad]);
  const step = x(1) - x(0), cw = Math.max(1, Math.min(step * 0.7, 24));
  candles.attr("transform", r => `translate(${x(r.i)},0)`);
  candles.select(".wick").attr("y1", r => y(r.h)).attr("y2", r => y(r.l));
  candles.select(".body").attr("x", -cw / 2).attr("width", cw)
    .attr("y", r => y(Math.max(r.o, r.c))).attr("height", r => Math.max(1, Math.abs(y(r.o) - y(r.c))));
  if (hasVol) {
    yv.domain([0, d3.max(vis, r => r.v) || 1]);
    vols.attr("x", r => x(r.i) - cw / 2).attr("width", cw).attr("y", r => r.v === null ? Hv : yv(r.v))
      .attr("height", r => r.v === null ? 0 : Hv - yv(r.v));
  }
  maLines.forEach((p, k) => p.attr("d", d3.line().defined(v => v !== null).x((v, i) => x(i)).y(v => y(v))(mas[k].v)));
  // axes and grid
  const ticks = y.ticks(Math.max(3, Hp / 45));
  gridG.selectAll("*").remove();
  if (o.gridCol) ticks.forEach(t => gridG.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", o.gridCol));
  yAxisG.selectAll("*").remove();
  ckAxis(yAxisG.call(d3.axisRight(y).tickValues(ticks).tickFormat(d3.format("~s")).tickSizeOuter(0)), ck, 10, true);
  if (Math.abs(hi) < 1e5) yAxisG.selectAll(".tick text").text(d3.format(",~g"));
  const every = Math.max(1, Math.ceil((i1 - i0 + 1) / Math.max(2, W / 90)));
  const xt = d3.range(i0, i1 + 1).filter(i => i % every === 0);
  xAxisG.selectAll("*").remove();
  const xfmt = d3.utcFormat(o.day ? ((rows[i1].t - rows[i0].t) > 400 * 864e5 ? "%b %Y" : "%b %-d") : "%b %-d %H:%M");
  ckAxis(xAxisG.call(d3.axisBottom(x).tickValues(xt).tickFormat(i => xfmt(new Date(rows[i].t))).tickSizeOuter(0)), ck, 10, true);
}
draw();
if (ck.animate) {
  candles.style("opacity", 0).transition().duration(250).delay(r => r.i / N * 900).style("opacity", 1);
  if (vols) vols.style("opacity", 0).transition().duration(250).delay(r => r.i / N * 900).style("opacity", 1);
  maLines.forEach(p => p.style("opacity", 0).transition().duration(400).delay(900).style("opacity", 1));
}

// ---- crosshair ---------------------------------------------------------------------------
const cross = root.append("g").style("pointer-events", "none").style("display", "none");
const vline = cross.append("line").attr("y1", 0).attr("y2", Hall).attr("stroke", ck.textCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "3,3");
const hline = cross.append("line").attr("x1", 0).attr("x2", W).attr("stroke", ck.textCol).attr("stroke-opacity", 0.35).attr("stroke-dasharray", "3,3");
const tag = cross.append("g");
const tagRect = tag.append("rect").attr("height", 17).attr("y", -8.5).attr("rx", 3).attr("fill", ck.textCol);
const tagText = tag.append("text").attr("x", 5).attr("dy", "0.35em").style("font-size", "10px").style("fill", ck.bgcol);
const overlay = root.append("rect").attr("width", W).attr("height", Hall).attr("fill", "transparent").style("cursor", "crosshair");
const nearest = a => rows[pkClamp(Math.round(x.invert(pkPtr(a, root.node())[0])), 0, N - 1)];
overlay.on("mousemove", function (a) {
  if (o.hover === false) return;
  const p = pkPtr(a, root.node()), r = nearest(a);
  cross.style("display", null);
  vline.attr("x1", x(r.i)).attr("x2", x(r.i));
  const py = pkClamp(p[1], 0, Hp);
  hline.attr("y1", py).attr("y2", py).style("display", p[1] <= Hp ? null : "none");
  tag.attr("transform", `translate(${W + 2},${py})`).style("display", p[1] <= Hp ? null : "none");
  tagText.text(fmt(y.invert(py)));
  tagRect.attr("width", ck.measure(fmt(y.invert(py)), 10) + 10);
  readout(r);
}).on("mouseleave", function () { cross.style("display", "none"); readout(rows[N - 1]); })
  .on("click", function (a) {
    const r = nearest(a);
    ck.send("clicked", { date: tfmt(new Date(r.t)), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v });
  });

if (o.zoom !== false) {
  const zoom = d3.zoom().scaleExtent([1, Math.max(1, N / 8)]).translateExtent([[0, 0], [W, Hall]]).extent([[0, 0], [W, Hall]])
    .on("zoom", function (a) { x = pkEvOf(a).transform.rescaleX(x0); draw(); });
  overlay.call(zoom).on("dblclick.zoom", null)
    .on("dblclick", () => overlay.transition().duration(500).call(zoom.transform, d3.zoomIdentity));
}
