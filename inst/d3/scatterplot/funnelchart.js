// funnel_chart() -- the stages of a process as centred bars, with the
// conversion between them. Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "funnel_chart");
const st = (data || []).map((d, i) => ({ i, name: String(d.stage), v: +d.value })).filter(d => isFinite(d.v));
if (!st.length) { ck.empty(); return; }
const n = st.length, first = st[0].v || 1;
st.forEach((s, i) => { s.pFirst = s.v / first; s.pPrev = i ? (st[i - 1].v ? s.v / st[i - 1].v : 0) : 1; });

const fmt = ckFormat(o.valueFormat, ",.0f"), pct = d3.format(".1~%");
const lfs = pkPx(o.labelFontSize, 12);
const uc = pkArr(o.colors);
const colors = uc.length === n && n > 1 ? uc
  : st.map((s, i) => pkMix(uc[0] || "#2b4fb0", "#ffffff", n > 1 ? 0.62 * i / (n - 1) : 0));
const ink = c => { const rgb = d3.rgb(c); return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) > 160 ? "#222" : "#fff"; };

// ---- layout ------------------------------------------------------------------------------
const labW = Math.min(width * 0.3, d3.max(st, s => ck.measure(s.name, lfs)) + 16);
const pctW = o.showPercent !== false ? ck.measure("100%", lfs, 700) + 18 : 8;
const m = { top: ck.top + 6, right: pctW, bottom: 10, left: labW };
const W = Math.max(60, width - m.left - m.right), H = Math.max(40, height - m.top - m.bottom);
const band = H / n;
const gapK = o.showConversion !== false ? 0.36 : 0.2;
const bh = band * (1 - gapK);
const maxV = d3.max(st, s => s.v) || 1;
const wOf = v => Math.max(2, W * v / maxV);
const cx = W / 2;
const yOf = i => i * band + (band - bh) / 2;
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);

// the funnel between the bars
if (o.shape !== "bars") {
  root.append("g").selectAll("path").data(st.slice(0, -1)).enter().append("path")
    .attr("d", (s, i) => {
      const y0 = yOf(i) + bh, y1 = yOf(i + 1), w0 = wOf(s.v) / 2, w1 = wOf(st[i + 1].v) / 2;
      return `M${cx - w0},${y0}L${cx + w0},${y0}L${cx + w1},${y1}L${cx - w1},${y1}Z`;
    })
    .attr("fill", (s, i) => colors[i]).attr("fill-opacity", 0.22)
    .style("opacity", ck.animate ? 0 : 1).call(sel => ckT(sel, ck, 400, 0).delay((s, i) => ck.animate ? i * 160 + 300 : 0).style("opacity", 1));
}
const bars = root.selectAll(".ck-stage").data(st).enter().append("g").attr("class", "ck-stage")
  .attr("transform", (s, i) => `translate(0,${yOf(i)})`);
bars.append("rect").attr("height", bh).attr("rx", Math.min(4, bh / 4)).attr("fill", (s, i) => colors[i])
  .attr("x", s => ck.animate ? cx : cx - wOf(s.v) / 2).attr("width", s => ck.animate ? 0 : wOf(s.v))
  .call(sel => ckT(sel, ck, 600, 0).delay((s, i) => ck.animate ? i * 160 : 0).ease(d3.easeCubicOut)
    .attr("x", s => cx - wOf(s.v) / 2).attr("width", s => wOf(s.v)));
const vfs = Math.max(9, Math.min(lfs + 2, bh * 0.45));
bars.append("text").attr("x", s => ck.measure(fmt(s.v), vfs, 700) + 12 <= wOf(s.v) ? cx : cx + wOf(s.v) / 2 + 6)
  .attr("text-anchor", s => ck.measure(fmt(s.v), vfs, 700) + 12 <= wOf(s.v) ? "middle" : "start")
  .attr("y", bh / 2).attr("dy", "0.35em").style("font-size", vfs + "px").style("font-weight", 700)
  .style("fill", (s, i) => ck.measure(fmt(s.v), vfs, 700) + 12 <= wOf(s.v) ? ink(colors[i]) : ck.textCol)
  .style("pointer-events", "none").text(s => fmt(s.v))
  .style("opacity", ck.animate ? 0 : 1).call(sel => ckT(sel, ck, 300, 0).delay((s, i) => ck.animate ? i * 160 + 450 : 0).style("opacity", 1));
// stage names and shares of the first stage
bars.append("text").attr("x", -10).attr("y", bh / 2).attr("dy", "0.35em").attr("text-anchor", "end")
  .style("font-size", lfs + "px").style("fill", ck.textCol).text(s => ckFit(ck, s.name, lfs, labW - 14));
if (o.showPercent !== false) {
  bars.append("text").attr("x", W + 10).attr("y", bh / 2).attr("dy", "0.35em").style("font-size", lfs + "px")
    .style("font-weight", 700).style("fill", ck.textCol).style("fill-opacity", 0.75).text(s => d3.format(".0%")(s.pFirst));
}
// conversion between the stages
if (o.showConversion !== false && n > 1) {
  const cfs = Math.max(8, Math.min(lfs - 1, (band - bh) * 0.62));
  const conv = root.append("g").style("pointer-events", "none").selectAll("g").data(st.slice(1)).enter().append("g")
    .attr("transform", s => `translate(${cx},${yOf(s.i) - (band - bh) / 2})`);
  conv.each(function (s) {
    const t = "↓ " + pct(s.pPrev), w = ck.measure(t, cfs, 700) + 14, h = cfs + 6;
    const g = d3.select(this);
    g.append("rect").attr("x", -w / 2).attr("y", -h / 2).attr("width", w).attr("height", h).attr("rx", h / 2)
      .attr("fill", ck.bgcol).attr("stroke", ck.textCol).attr("stroke-opacity", 0.2);
    g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").style("font-size", cfs + "px").style("font-weight", 700)
      .style("fill", ck.textCol).text(t);
  });
  conv.style("opacity", ck.animate ? 0 : 1).call(sel => ckT(sel, ck, 300, 0).delay(s => ck.animate ? s.i * 160 + 450 : 0).style("opacity", 1));
}

// ---- interactions ------------------------------------------------------------------------
const hit = bars.append("rect").attr("x", -m.left).attr("y", -(band - bh) / 2).attr("width", width).attr("height", band)
  .attr("fill", "transparent");
function focus(s) { bars.transition().duration(150).style("opacity", d => s === null || d === s ? 1 : 0.4); }
ckOn(hit, {
  move: (a, s) => {
    if (!ck.hover) return;
    focus(s);
    const rows = [{ name: "Value", value: fmt(s.v) }, { name: "Share of the first stage", value: pct(s.pFirst) }];
    if (s.i) {
      rows.push({ name: "Conversion from " + st[s.i - 1].name, value: pct(s.pPrev) });
      rows.push({ name: "Lost on the way", value: fmt(st[s.i - 1].v - s.v) });
    }
    ckTipAt(ck, a, s.name, rows, colors[s.i]);
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, s) => ck.send("clicked", { stage: s.name, value: s.v, percent_of_first: s.pFirst, conversion: s.pPrev })
});
