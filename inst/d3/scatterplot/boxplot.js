// box_plot() -- boxes and whiskers per group, with outliers or all the points.
// The summary statistics are computed in R. Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "box_plot");
const groups = pkArr(o.groups);
if (!groups.length) { ck.empty(); return; }

const horiz = !!o.horizontal;
const fmt = ckFormat(o.valueFormat, ",.2~f");
const colors = groups.length === 1 && pkArr(o.colors).length === 0 ? [CK_PALETTE[0]] : ckPalette(groups.length, o.colors);
const pr = pkNum(o.pointRadius, 3);
const axFs = pkPx(o.axisTitleFontSize, 12);
const xFs = pkPx(o.xFontSize, 11), yFs = pkPx(o.yFontSize, 11);
const catFs = horiz ? yFs : xFs, valFs = horiz ? xFs : yFs;
groups.forEach(g => { g.out = pkArr(g.out); g.values = pkArr(g.values); });

// ---- scales ----------------------------------------------------------------------------
const lo = d3.min(groups, g => Math.min(g.lo, g.min, g.notch && o.notch ? g.median - g.notch : Infinity));
const hi = d3.max(groups, g => Math.max(g.hi, g.max, g.notch && o.notch ? g.median + g.notch : -Infinity));
const pad = (hi - lo) * 0.04 || 1;
const names = groups.map(g => String(g.name));
const catW = horiz ? Math.min(width * 0.32, d3.max(names, n => ck.measure(n, catFs)) + 14) : 0;
const m = {
  top: ck.top + 6,
  right: 18,
  bottom: 26 + (o.hasGroup || horiz ? 0 : 0) + ((horiz ? o.valueTitle : o.groupTitle) ? axFs + 12 : 0),
  left: (horiz ? catW : 48) + ((horiz ? o.groupTitle : o.valueTitle) ? axFs + 12 : 0)
};
const W = Math.max(40, width - m.left - m.right), H = Math.max(40, height - m.top - m.bottom);
const vs = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range(horiz ? [0, W] : [H, 0]);
const bs = d3.scaleBand().domain(names).range(horiz ? [0, H] : [0, W]).paddingInner(0.25).paddingOuter(0.15);
// a point at band position c (pixels) and value v
const P = (c, v) => horiz ? [vs(v), c] : [c, vs(v)];
const pt = (c, v) => P(c, v).join(",");

const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);

// grid and axes
const ticks = vs.ticks(horiz ? Math.max(3, W / 80) : Math.max(3, H / 50));
if (o.gridCol) {
  root.append("g").selectAll("line").data(ticks).enter().append("line")
    .attr("x1", d => horiz ? vs(d) : 0).attr("x2", d => horiz ? vs(d) : W)
    .attr("y1", d => horiz ? 0 : vs(d)).attr("y2", d => horiz ? H : vs(d))
    .attr("stroke", o.gridCol);
}
const vAxis = horiz ? d3.axisBottom(vs) : d3.axisLeft(vs);
vAxis.tickValues(ticks).tickFormat(d3.format("~s")).tickSizeOuter(0);
if (Math.abs(hi - lo) < 1e4 && Math.abs(hi) < 1e4) vAxis.tickFormat(d3.format("~g"));
ckAxis(root.append("g").attr("transform", horiz ? `translate(0,${H})` : null).call(vAxis), ck, valFs, true);
const cAxis = (horiz ? d3.axisLeft(bs) : d3.axisBottom(bs)).tickSize(0).tickPadding(8);
const cAxisG = root.append("g").attr("transform", horiz ? null : `translate(0,${H})`).call(cAxis);
ckAxis(cAxisG, ck, catFs, !horiz);
if (!o.hasGroup && !horiz) cAxisG.selectAll(".tick text").remove();
if (horiz) cAxisG.selectAll(".tick text").text(d => ckFit(ck, d, catFs, catW - 12));
// axis titles
const vt = o.valueTitle, gt = o.hasGroup ? o.groupTitle : null;
if (horiz) {
  ckLabel(ck, vt, m.left + W / 2, height - 8, axFs);
  ckLabel(ck, gt, 4 + axFs * 0.8, m.top + H / 2, axFs, true);
} else {
  ckLabel(ck, gt, m.left + W / 2, height - 8, axFs);
  ckLabel(ck, vt, 4 + axFs * 0.8, m.top + H / 2, axFs, true);
}

// ---- boxes ----------------------------------------------------------------------------
const jit = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
const bw = bs.bandwidth(), hw = bw * pkNum(o.boxWidth, 0.6) / 2;
const boxes = root.selectAll(".ck-box").data(groups).enter().append("g").attr("class", "ck-box");

boxes.each(function (g, i) {
  const sel = d3.select(this), col = colors[i];
  const c = bs(String(g.name)) + bw / 2;
  const body = sel.append("g").attr("class", "ck-body");
  // whiskers and caps
  body.append("path").attr("fill", "none").attr("stroke", col).attr("stroke-width", 1.4)
    .attr("d", `M${pt(c, g.lo)}L${pt(c, g.q1)}M${pt(c, g.q3)}L${pt(c, g.hi)}` +
      `M${pt(c - hw * 0.45, g.lo)}L${pt(c + hw * 0.45, g.lo)}M${pt(c - hw * 0.45, g.hi)}L${pt(c + hw * 0.45, g.hi)}`);
  // the box (notched or not)
  let d;
  if (o.notch) {
    const n1 = Math.max(g.q1, g.median - g.notch), n2 = Math.min(g.q3, g.median + g.notch);
    d = [[c - hw, g.q1], [c - hw, n1], [c - hw * 0.6, g.median], [c - hw, n2], [c - hw, g.q3],
      [c + hw, g.q3], [c + hw, n2], [c + hw * 0.6, g.median], [c + hw, n1], [c + hw, g.q1]];
  } else {
    d = [[c - hw, g.q1], [c - hw, g.q3], [c + hw, g.q3], [c + hw, g.q1]];
  }
  body.append("path").attr("class", "ck-boxshape").attr("d", "M" + d.map(p => pt(p[0], p[1])).join("L") + "Z")
    .attr("fill", col).attr("fill-opacity", 0.22).attr("stroke", col).attr("stroke-width", 1.6).attr("stroke-linejoin", "round");
  const mw = o.notch ? hw * 0.6 : hw;
  body.append("path").attr("d", `M${pt(c - mw, g.median)}L${pt(c + mw, g.median)}`)
    .attr("stroke", d3.color(col).darker(0.6).toString()).attr("stroke-width", 3).attr("stroke-linecap", "round");
  if (o.mean) {
    const [mx, my] = P(c, g.mean), r = Math.max(3.5, Math.min(6, hw * 0.18));
    body.append("path").attr("d", `M${mx},${my - r}L${mx + r},${my}L${mx},${my + r}L${mx - r},${my}Z`)
      .attr("fill", ck.bgcol).attr("stroke", col).attr("stroke-width", 1.6);
  }
  // grow from the median
  if (ck.animate) {
    const [ox, oy] = P(c, g.median);
    const from = horiz ? `translate(${ox},0) scale(0.001,1) translate(${-ox},0)` : `translate(0,${oy}) scale(1,0.001) translate(0,${-oy})`;
    body.attr("transform", from).transition().duration(700).delay(i * 70).ease(d3.easeCubicOut)
      .attr("transform", horiz ? `translate(0,0) scale(1,1) translate(0,0)` : `translate(0,0) scale(1,1) translate(0,0)`);
  }
  // an invisible area that catches the mouse over the whole group
  const a = P(c - bw / 2, vs.domain()[0]), b = P(c + bw / 2, vs.domain()[1]);
  sel.append("rect").attr("class", "ck-hit").attr("x", Math.min(a[0], b[0])).attr("y", Math.min(a[1], b[1]))
    .attr("width", Math.abs(b[0] - a[0])).attr("height", Math.abs(b[1] - a[1])).attr("fill", "transparent");
  // points
  const pts = o.points === "all" ? g.values : (o.points === "outliers" ? g.out : []);
  const spread = o.points === "all" ? hw * 0.85 : hw * 0.25;
  sel.append("g").selectAll("circle").data(pts.map((v, k) => ({ v, k, g }))).enter().append("circle")
    .attr("class", "ck-pt")
    .attr("cx", p => P(c + jit(p.k + i * 977) * 2 * spread, p.v)[0])
    .attr("cy", p => P(c + jit(p.k + i * 977) * 2 * spread, p.v)[1])
    .attr("r", pr)
    .attr("fill", o.points === "all" ? col : ck.bgcol).attr("fill-opacity", o.points === "all" ? 0.55 : 1)
    .attr("stroke", col).attr("stroke-width", o.points === "all" ? 0.6 : 1.4)
    .style("opacity", ck.animate ? 0 : 1)
    .call(s => ckT(s, ck, 400, 500 + i * 70).style("opacity", 1));
});

// ---- interactions ----------------------------------------------------------------------
function rows(g) {
  const r = [
    { name: "Count", value: d3.format(",")(g.n) },
    { name: "Upper whisker", value: fmt(g.hi) },
    { name: "Q3", value: fmt(g.q3) },
    { name: "Median", value: fmt(g.median) },
    { name: "Q1", value: fmt(g.q1) },
    { name: "Lower whisker", value: fmt(g.lo) }
  ];
  if (o.mean) r.splice(4, 0, { name: "Mean", value: fmt(g.mean) });
  if (g.out.length) r.push({ name: "Outliers", value: d3.format(",")(g.out.length) });
  return r;
}
function focus(g) {
  boxes.transition().duration(150).style("opacity", d => (g === null || d === g) ? 1 : 0.3);
}
ckOn(boxes.selectAll(".ck-hit"), {
  move: (a, g) => { if (!ck.hover) return; focus(g); ckTipAt(ck, a, String(g.name), rows(g), colors[groups.indexOf(g)]); },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, g) => ck.send("clicked", { group: String(g.name), n: g.n, median: g.median, q1: g.q1, q3: g.q3, mean: g.mean })
});
ckOn(boxes.selectAll(".ck-pt"), {
  move: (a, p) => {
    if (!ck.hover) return;
    focus(p.g);
    ckTipAt(ck, a, fmt(p.v), [{ name: o.hasGroup ? "Group" : "Variable", value: String(p.g.name) },
      { name: p.v < p.g.lo || p.v > p.g.hi ? "Outlier" : "Value", value: "" }], colors[groups.indexOf(p.g)]);
  },
  out: () => { focus(null); ck.tip.hide(); }
});
