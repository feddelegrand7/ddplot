// likert_chart() -- diverging stacked bars for answers on an ordered scale.
// The shares are computed in R. Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "likert_chart");
const qs = pkArr(o.questions).map(String), lv = pkArr(o.levels).map(String);
const rows = (data || []).map(d => ({ q: +d.q, r: +d.r, n: +d.n, p: +d.p })).filter(d => isFinite(d.p));
if (!rows.length || !qs.length) { ck.empty(); return; }

const K = lv.length, odd = K % 2 === 1, mid = Math.floor(K / 2);
const isNeg = r => r < mid, isPos = r => odd ? r > mid : r >= mid;
const defaultRamp = odd ? ["#c4352b", "#f4a99a", "#e3e3e3", "#a9c4f5", "#2b4fb0"] : ["#c4352b", "#f4a99a", "#a9c4f5", "#2b4fb0"];
const colors = pkArr(o.colors).length === K ? pkArr(o.colors)
  : d3.range(K).map(i => d3.interpolateRgbBasis(defaultRamp)(K === 1 ? 0.5 : i / (K - 1)));
const pct = d3.format(".0%"), lfs = pkPx(o.labelFontSize, 11);
const ink = c => { const rgb = d3.rgb(c); return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) > 150 ? "#222" : "#fff"; };

// every question: its segments from left to right, starting left of the centre
const byQ = qs.map((name, q) => {
  const segs = d3.range(K).map(r => rows.find(d => d.q === q && d.r === r) || { q, r, n: 0, p: 0 });
  const neg = d3.sum(segs.filter(s => isNeg(s.r)), s => s.p), pos = d3.sum(segs.filter(s => isPos(s.r)), s => s.p);
  const neu = odd ? segs[mid].p : 0;
  let x = -(neg + neu / 2);
  segs.forEach(s => { s.x0 = x; x += s.p; s.x1 = x; });
  return { name, q, segs, neg, pos, neu, total: d3.sum(segs, s => s.n) };
});

// ---- layout ------------------------------------------------------------------------------
let top = ck.top;
let legend = null;
if (o.legend !== false) {
  legend = ckLegend(ck, lv, colors, top + 4, pkPx(o.legendFontSize, 11));
  top += legend.height + 8;
}
const labW = Math.min(width * 0.36, d3.max(qs, s => ck.measure(s, lfs)) + 14);
const tot = o.showTotals !== false ? 40 : 6;
const m = { top: top + 4, right: tot + 8, bottom: 26, left: labW + tot };
const W = Math.max(60, width - m.left - m.right), H = Math.max(30, height - m.top - m.bottom);
const D = Math.max(0.05, d3.max(byQ, b => Math.max(-b.segs[0].x0, b.segs[K - 1].x1)));
const xs = d3.scaleLinear().domain([-D, D]).range([0, W]).nice();
const ys = d3.scaleBand().domain(d3.range(qs.length)).range([0, H]).paddingInner(1 - pkNum(o.barHeight, 0.7)).paddingOuter(0.2);
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);

// grid, axis and the centre line
const ticks = xs.ticks(Math.max(3, Math.min(8, W / 70)));
root.append("g").selectAll("line").data(ticks).enter().append("line")
  .attr("x1", xs).attr("x2", xs).attr("y1", 0).attr("y2", H).attr("stroke", "#ececec");
ckAxis(root.append("g").attr("transform", `translate(0,${H})`)
  .call(d3.axisBottom(xs).tickValues(ticks).tickFormat(v => pct(Math.abs(v))).tickSizeOuter(0)), ck, 10);
root.append("g").selectAll("text").data(byQ).enter().append("text")
  .attr("x", -tot - 6).attr("y", b => ys(b.q) + ys.bandwidth() / 2).attr("dy", "0.35em")
  .attr("text-anchor", "end").style("font-size", lfs + "px").style("fill", ck.textCol)
  .text(b => ckFit(ck, b.name, lfs, labW - 10));

const bars = root.selectAll(".ck-bar").data(byQ).enter().append("g").attr("class", "ck-bar")
  .attr("transform", b => `translate(0,${ys(b.q)})`);
const bh = ys.bandwidth();
const seg = bars.selectAll(".ck-seg").data(b => b.segs.filter(s => s.p > 0)).enter().append("g").attr("class", "ck-seg");
seg.append("rect").attr("height", bh).attr("fill", s => colors[s.r]).attr("stroke", ck.bgcol).attr("stroke-width", 1)
  .attr("x", s => ck.animate ? xs(0) : xs(s.x0)).attr("width", s => ck.animate ? 0 : Math.max(0, xs(s.x1) - xs(s.x0)))
  .call(sel => ckT(sel, ck, 750, 0).ease(d3.easeCubicOut).attr("x", s => xs(s.x0)).attr("width", s => Math.max(0, xs(s.x1) - xs(s.x0))));
const vfs = Math.max(8, Math.min(11, bh * 0.5));
if (o.showValues !== false) {
  seg.append("text").attr("x", s => (xs(s.x0) + xs(s.x1)) / 2).attr("y", bh / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
    .style("font-size", vfs + "px").style("fill", s => ink(colors[s.r])).style("pointer-events", "none")
    .text(s => xs(s.x1) - xs(s.x0) >= ck.measure(pct(s.p), vfs) + 6 ? pct(s.p) : "")
    .style("opacity", ck.animate ? 0 : 1).call(sel => ckT(sel, ck, 300, 650).style("opacity", 1));
}
root.append("line").attr("x1", xs(0)).attr("x2", xs(0)).attr("y1", -4).attr("y2", H)
  .attr("stroke", ck.textCol).attr("stroke-opacity", 0.55).attr("stroke-width", 1.2);
if (o.showTotals !== false) {
  const tfs = Math.max(9, Math.min(12, bh * 0.55));
  bars.append("text").attr("x", -6)
    .attr("y", bh / 2).attr("dy", "0.35em").attr("text-anchor", "end").style("font-size", tfs + "px").style("font-weight", 700)
    .style("fill", colors[0]).text(b => pct(b.neg));
  bars.append("text").attr("x", W + 6).attr("y", bh / 2).attr("dy", "0.35em").style("font-size", tfs + "px").style("font-weight", 700)
    .style("fill", colors[K - 1]).text(b => pct(b.pos));
}

// ---- interactions ------------------------------------------------------------------------
function focus(r) {
  seg.transition().duration(150).style("opacity", s => r === null || s.r === r ? 1 : 0.3);
}
ckOn(seg, {
  move: (a, s) => {
    if (!ck.hover) return;
    focus(s.r);
    const b = byQ[s.q];
    ckTipAt(ck, a, lv[s.r], [
      { name: "Share", value: pct(s.p) },
      { name: "Answers", value: d3.format(",~g")(s.n) + " of " + d3.format(",~g")(b.total) },
      { name: "All negative", value: pct(b.neg) },
      { name: "All positive", value: pct(b.pos) }
    ], colors[s.r]);
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, s) => ck.send("clicked", { question: qs[s.q], response: lv[s.r], count: s.n, percent: s.p })
});
if (legend && ck.hover) {
  legend.nodes.forEach((it, r) => it.on("mouseover", () => focus(r)).on("mouseout", () => focus(null)));
}
