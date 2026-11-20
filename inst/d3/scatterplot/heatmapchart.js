// heatmap_chart() -- a grid of coloured cells for two categorical columns.
// The aggregation (and the clustering order) is done in R.
// Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "heatmap_chart");
const xl = pkArr(o.xLevels).map(String), yl = pkArr(o.yLevels).map(String);
const cells = (data || []).map(d => ({ i: +d.i, j: +d.j, v: +d.v, n: +d.n })).filter(d => isFinite(d.v));
if (!cells.length) { ck.empty(); return; }

const fmt = ckFormat(o.valueFormat, ",.2~f");
const axFs = pkPx(o.axisTitleFontSize, 12), xFs = pkPx(o.xFontSize, 11), yFs = pkPx(o.yFontSize, 11);
const ramp = pkArr(o.colors);
const gap = pkNum(o.cellGap, 1), rad = pkNum(o.cellRadius, 2);

// ---- colour scale ------------------------------------------------------------------------
let vmin = d3.min(cells, d => d.v), vmax = d3.max(cells, d => d.v);
const mid = pkNum(o.midpoint, null);
if (mid !== null) {
  const D = Math.max(Math.abs(vmin - mid), Math.abs(vmax - mid)) || 1;
  vmin = mid - D; vmax = mid + D;
}
if (vmin === vmax) { vmin -= 1; vmax += 1; }
const color = d3.scaleLinear().domain(ramp.map((c, k) => vmin + (vmax - vmin) * k / (ramp.length - 1)))
  .range(ramp).interpolate(d3.interpolateLab).clamp(true);
const ink = c => { const l = d3.hsl(c).l, rgb = d3.rgb(c); return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) > 150 || l > 0.7 ? "#222" : "#fff"; };

// ---- layout ------------------------------------------------------------------------------
let top = ck.top;
const legH = o.legend !== false ? 34 : 0;
top += legH;
const yLabW = Math.min(width * 0.3, d3.max(yl, s => ck.measure(s, yFs)) + 12);
const left = yLabW + (o.ytitle ? axFs + 10 : 0);
const availW = width - left - 14;
const bandX0 = availW / xl.length;
const maxXLab = d3.max(xl, s => ck.measure(s, xFs));
const rotate = maxXLab > bandX0 - 6;
const xLabH = rotate ? Math.min(height * 0.3, maxXLab * 0.72 + 14) : xFs + 12;
const m = { top: top + 6, right: 14, bottom: xLabH + (o.xtitle ? axFs + 10 : 0) + 4, left };
const W = Math.max(30, width - m.left - m.right), H = Math.max(30, height - m.top - m.bottom);
const bx = d3.scaleBand().domain(d3.range(xl.length)).range([0, W]);
const by = d3.scaleBand().domain(d3.range(yl.length)).range([0, H]);
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);

// missing cells
root.append("rect").attr("width", W).attr("height", H).attr("fill", o.naCol || "#f2f2f2").attr("rx", rad);
const cw = Math.max(1, bx.bandwidth() - gap), chh = Math.max(1, by.bandwidth() - gap);
const valFs = Math.max(8, Math.min(13, chh * 0.42, cw / 4.2));
const showVals = o.showValues === null || o.showValues === undefined
  ? (cw >= d3.max(cells, d => ck.measure(fmt(d.v), 10)) + 6 && chh >= 14)
  : !!o.showValues;

const g = root.selectAll(".ck-cell").data(cells).enter().append("g").attr("class", "ck-cell")
  .attr("transform", d => `translate(${bx(d.i) + gap / 2},${by(d.j) + gap / 2})`);
g.append("rect").attr("width", cw).attr("height", chh).attr("rx", Math.min(rad, cw / 3, chh / 3))
  .attr("fill", d => color(d.v));
if (showVals) {
  g.append("text").attr("x", cw / 2).attr("y", chh / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
    .style("font-size", valFs + "px").style("fill", d => ink(color(d.v))).style("pointer-events", "none")
    .text(d => fmt(d.v));
}
if (ck.animate) {
  const n = xl.length + yl.length;
  g.style("opacity", 0).transition().duration(350).delay(d => (d.i + d.j) / n * 700).style("opacity", 1);
}
// outline of the hovered cell
const outline = root.append("rect").attr("fill", "none").attr("stroke", ck.textCol).attr("stroke-width", 2)
  .attr("rx", rad).style("pointer-events", "none").style("display", "none");

// labels
const yLab = root.append("g").selectAll("text").data(yl).enter().append("text")
  .attr("x", -8).attr("y", (d, j) => by(j) + by.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "end")
  .style("font-size", yFs + "px").style("fill", ck.textCol).text(d => ckFit(ck, d, yFs, yLabW - 10));
const xLab = root.append("g").selectAll("text").data(xl).enter().append("text")
  .style("font-size", xFs + "px").style("fill", ck.textCol)
  .attr("transform", (d, i) => rotate
    ? `translate(${bx(i) + bx.bandwidth() / 2},${H + 8}) rotate(-40)`
    : `translate(${bx(i) + bx.bandwidth() / 2},${H + 6 + xFs})`)
  .attr("text-anchor", rotate ? "end" : "middle")
  .text(d => rotate ? ckFit(ck, d, xFs, xLabH / 0.72 - 10) : ckFit(ck, d, xFs, bx.bandwidth() - 2));
ckLabel(ck, o.xtitle, m.left + W / 2, height - 8, axFs);
ckLabel(ck, o.ytitle, 4 + axFs * 0.8, m.top + H / 2, axFs, true);

// ---- colour legend -----------------------------------------------------------------------
let marker = null, legX = null;
if (o.legend !== false) {
  const lw = Math.min(220, width * 0.45), lx = width - lw - 16, ly = ck.top + 4;
  const gid = pkUid("ckgrad");
  const grad = svg.append("defs").append("linearGradient").attr("id", gid);
  d3.range(11).forEach(k => grad.append("stop").attr("offset", (k * 10) + "%").attr("stop-color", color(vmin + (vmax - vmin) * k / 10)));
  const lg = svg.insert("g", ".pk-tip").attr("transform", `translate(${lx},${ly})`);
  lg.append("rect").attr("width", lw).attr("height", 9).attr("rx", 3).attr("fill", `url(#${gid})`);
  legX = d3.scaleLinear().domain([vmin, vmax]).range([0, lw]);
  ckAxis(lg.append("g").attr("transform", "translate(0,9)")
    .call(d3.axisBottom(legX).ticks(4).tickSize(4).tickFormat(d3.format(Math.max(Math.abs(vmin), Math.abs(vmax)) >= 1e4 ? "~s" : "~g"))), ck, 10);
  lg.append("text").attr("x", -6).attr("y", 8).attr("text-anchor", "end").style("font-size", "11px")
    .style("fill", ck.textCol).style("fill-opacity", 0.8).text(ckFit(ck, o.valueName, 11, width - lw - 40));
  marker = lg.append("path").attr("d", "M0,0 l-5,-7 h10 Z").attr("fill", ck.textCol).style("display", "none");
}

// ---- interactions ------------------------------------------------------------------------
function focus(d) {
  if (!d) {
    outline.style("display", "none");
    yLab.style("font-weight", null).style("fill-opacity", 1);
    xLab.style("font-weight", null).style("fill-opacity", 1);
    if (marker) marker.style("display", "none");
    return;
  }
  outline.attr("x", bx(d.i) + gap / 2 - 1).attr("y", by(d.j) + gap / 2 - 1).attr("width", cw + 2).attr("height", chh + 2)
    .style("display", null).raise();
  yLab.style("font-weight", (s, j) => j === d.j ? 700 : null).style("fill-opacity", (s, j) => j === d.j ? 1 : 0.55);
  xLab.style("font-weight", (s, i) => i === d.i ? 700 : null).style("fill-opacity", (s, i) => i === d.i ? 1 : 0.55);
  if (marker) marker.attr("transform", `translate(${legX(pkClamp(d.v, vmin, vmax))},0)`).style("display", null);
}
ckOn(g, {
  move: (a, d) => {
    if (!ck.hover) return;
    focus(d);
    const rows = [{ name: o.valueName, value: fmt(d.v) }];
    if (o.showCount) rows.push({ name: "Rows (" + o.aggregate + ")", value: d3.format(",")(d.n) });
    ckTipAt(ck, a, xl[d.i] + " · " + yl[d.j], rows, color(d.v));
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, d) => ck.send("clicked", { x: xl[d.i], y: yl[d.j], value: d.v })
});
