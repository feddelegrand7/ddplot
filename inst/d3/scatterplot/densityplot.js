// density_plot() -- kernel density curves, overlapping, stacked or as shares.
// The densities are computed in R (stats::density) on a common grid.
// Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "density_plot");
const curves = pkArr(o.curves);
if (!curves.length) { ck.empty(); return; }
curves.forEach(c => { c.y = pkArr(c.y).map(Number); });

const N = curves[0].y.length;
const from = +o.from, to = +o.to;
const xs = d3.range(N).map(i => from + (to - from) * i / (N - 1));
const colors = ckPalette(curves.length, o.colors);
const pos = o.position || "identity";
const fmt = ckFormat(o.valueFormat, ",.2~f");
const dfmt = d3.format(".3~g"), pfmt = d3.format(".0%");
const axFs = pkPx(o.axisTitleFontSize, 12), xFs = pkPx(o.xFontSize, 11), yFs = pkPx(o.yFontSize, 11);
const hidden = curves.map(() => false);

// ---- layout ----------------------------------------------------------------------------
let top = ck.top;
let legend = null;
if (o.legend !== false && o.hasGroup && curves.length > 1) {
  legend = ckLegend(ck, curves.map(c => String(c.name)), colors, top + 4, pkPx(o.legendFontSize, 11), toggle);
  top += legend.height + 6;
}
const m = { top: top + 6, right: 18, bottom: 28 + (o.xtitle ? axFs + 10 : 0), left: 52 + (o.ytitle ? axFs + 8 : 0) };
const W = Math.max(40, width - m.left - m.right), H = Math.max(40, height - m.top - m.bottom);
const xsc = d3.scaleLinear().domain([from, to]).range([0, W]);
const ysc = d3.scaleLinear().range([H, 0]);
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);
const gridG = root.append("g"), yAxisG = root.append("g");
ckAxis(root.append("g").attr("transform", `translate(0,${H})`)
  .call(d3.axisBottom(xsc).ticks(Math.max(3, W / 80)).tickSizeOuter(0)), ck, xFs, true);
ckLabel(ck, o.xtitle, m.left + W / 2, height - 8, axFs);
ckLabel(ck, o.ytitle, 4 + axFs * 0.8, m.top + H / 2, axFs, true);

// ---- the series ------------------------------------------------------------------------
// [base, top] at every grid point for every curve, given the hidden ones
function series() {
  const out = curves.map(() => xs.map(() => [0, 0]));
  for (let i = 0; i < N; i++) {
    let acc = 0;
    const tot = d3.sum(curves, (c, k) => hidden[k] ? 0 : c.weight * c.y[i]);
    curves.forEach((c, k) => {
      if (hidden[k]) { out[k][i] = [acc, acc]; return; }
      let v = c.y[i];
      if (pos === "stack") v = c.weight * c.y[i];
      if (pos === "fill") v = tot > 0 ? c.weight * c.y[i] / tot : 0;
      out[k][i] = pos === "identity" ? [0, v] : [acc, acc + v];
      if (pos !== "identity") acc += v;
    });
  }
  return out;
}
const area = d3.area().x((d, i) => xsc(xs[i])).y0(d => ysc(d[0])).y1(d => ysc(d[1])).curve(d3.curveBasis);
const line = d3.line().x((d, i) => xsc(xs[i])).y(d => ysc(d[1])).curve(d3.curveBasis);
const layer = root.append("g");
const areas = curves.map((c, k) => layer.append("path").attr("fill", colors[k]).attr("fill-opacity", pkNum(o.fillOpacity, 0.35)));
const lines = curves.map((c, k) => layer.append("path").attr("fill", "none").attr("stroke", colors[k])
  .attr("stroke-width", pkNum(o.lineWidth, 2)).attr("stroke-linejoin", "round"));
const stats = root.append("g");
const rugG = root.append("g");
let S = null;

function at(k, xv) {
  const t = (xv - from) / (to - from) * (N - 1);
  const i = pkClamp(Math.floor(t), 0, N - 2), f = pkClamp(t - i, 0, 1);
  return [S[k][i][0] + (S[k][i + 1][0] - S[k][i][0]) * f, S[k][i][1] + (S[k][i + 1][1] - S[k][i][1]) * f];
}

function render(ms) {
  S = series();
  const ymax = pos === "fill" ? 1 : (d3.max(S, s => d3.max(s, d => d[1])) || 1) * 1.05;
  ysc.domain([0, ymax]);
  if (pos !== "fill") ysc.nice();
  const ticks = ysc.ticks(Math.max(3, H / 50));
  gridG.selectAll("line").remove();
  if (o.gridCol) {
    ticks.forEach(t => gridG.append("line").attr("x1", 0).attr("x2", W).attr("y1", ysc(t)).attr("y2", ysc(t)).attr("stroke", o.gridCol));
  }
  yAxisG.selectAll("*").remove();
  ckAxis(yAxisG.call(d3.axisLeft(ysc).tickValues(ticks).tickFormat(pos === "fill" ? pfmt : dfmt).tickSizeOuter(0)), ck, yFs, true);
  curves.forEach((c, k) => {
    ckT(areas[k], ck, ms).attr("d", area(S[k])).style("opacity", hidden[k] ? 0 : 1);
    ckT(lines[k], ck, ms).attr("d", line(S[k])).style("opacity", hidden[k] ? 0 : 1);
  });
  // mean or median of every curve
  stats.selectAll("*").remove();
  if (o.stat === "mean" || o.stat === "median") {
    curves.forEach((c, k) => {
      if (hidden[k]) return;
      const v = c[o.stat], [b, t] = at(k, v);
      stats.append("line").attr("x1", xsc(v)).attr("x2", xsc(v)).attr("y1", ysc(b)).attr("y2", ysc(t))
        .attr("stroke", d3.color(colors[k]).darker(0.7).toString()).attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3")
        .style("opacity", 0).call(s => ckT(s, ck, 300, ms).style("opacity", 1));
    });
  }
  rugG.selectAll("line").style("display", d => hidden[d.g] ? "none" : null);
}

// the rug
if (o.rug) {
  const rv = pkArr(o.rug.v), rg = pkArr(o.rug.g);
  rugG.selectAll("line").data(rv.map((v, i) => ({ v: +v, g: +rg[i] }))).enter().append("line")
    .attr("x1", d => xsc(d.v)).attr("x2", d => xsc(d.v)).attr("y1", H).attr("y2", H - 7)
    .attr("stroke", d => colors[d.g]).attr("stroke-opacity", 0.45).attr("stroke-width", 1);
}

// start flat, then rise
if (ck.animate) {
  S = curves.map(() => xs.map(() => [0, 0]));
  ysc.domain([0, 1]);
  curves.forEach((c, k) => { areas[k].attr("d", area(S[k])); lines[k].attr("d", line(S[k])); });
}
render(900);

function toggle(k, item) {
  if (!hidden[k] && hidden.filter(h => !h).length === 1) return;  // keep one curve
  hidden[k] = !hidden[k];
  item.style("opacity", hidden[k] ? 0.35 : 1);
  render(500);
}

// ---- hover: a guide and the densities at the pointer -------------------------------------
const guide = root.append("line").attr("y1", 0).attr("y2", H).attr("stroke", ck.textCol).attr("stroke-opacity", 0.4)
  .attr("stroke-dasharray", "3,3").style("display", "none").style("pointer-events", "none");
const dots = curves.map((c, k) => root.append("circle").attr("r", 4).attr("fill", colors[k]).attr("stroke", ck.bgcol)
  .attr("stroke-width", 1.5).style("display", "none").style("pointer-events", "none"));
function readAt(a) {
  const p = pkPtr(a, root.node());
  const xv = xsc.invert(pkClamp(p[0], 0, W));
  return { xv, vals: curves.map((c, k) => at(k, xv)) };
}
const overlay = root.append("rect").attr("width", W).attr("height", H).attr("fill", "transparent");
if (ck.hover) {
  overlay.on("mousemove", function (a) {
    const r = readAt(a);
    guide.attr("x1", xsc(r.xv)).attr("x2", xsc(r.xv)).style("display", null);
    const rows = [];
    curves.forEach((c, k) => {
      if (hidden[k]) { dots[k].style("display", "none"); return; }
      dots[k].attr("cx", xsc(r.xv)).attr("cy", ysc(r.vals[k][1])).style("display", null);
      const v = r.vals[k][1] - r.vals[k][0];
      rows.push({ name: String(c.name), value: pos === "fill" ? pfmt(v) : dfmt(pos === "stack" ? v / c.weight : v), color: colors[k] });
    });
    rows.reverse();
    if (!o.hasGroup) rows[0].name = pos === "fill" ? "Share" : "Density";
    ckTipAt(ck, a, (o.xtitle || "x") + ": " + fmt(r.xv), rows);
  }).on("mouseleave", function () {
    guide.style("display", "none"); dots.forEach(d => d.style("display", "none")); ck.tip.hide();
  });
}
overlay.on("click", function (a) {
  const r = readAt(a), dens = {};
  curves.forEach((c, k) => { dens[String(c.name)] = r.vals[k][1] - r.vals[k][0]; });
  ck.send("clicked", { x: r.xv, density: dens });
});
