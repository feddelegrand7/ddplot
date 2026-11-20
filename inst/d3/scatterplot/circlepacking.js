// circle_packing() -- a hierarchy as nested circles, with zoom into groups.
// Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "circle_packing");
const depth = pkNum(o.depth, 0);
const rowsIn = (data || []).map(d => ({ label: String(d.label), value: +d.value, path: d3.range(depth).map(k => String(d["g" + k])) }))
  .filter(r => isFinite(r.value) && r.value > 0);
if (!rowsIn.length) { ck.empty(); return; }
const topGroups = pkArr(o.topGroups).map(String);
const groupNames = pkArr(o.groupNames).map(String);
const colors = ckPalette(Math.max(1, topGroups.length), o.colors);
const fmt = ckFormat(o.valueFormat, ",.0f"), pct = d3.format(".1%");
const lfs = pkPx(o.labelFontSize, 11);

// ---- the tree ----------------------------------------------------------------------------
const tree = { name: o.title || "All", children: [], kids: new Map() };
rowsIn.forEach(r => {
  let node = tree;
  r.path.forEach(p => {
    if (!node.kids.has(p)) { const c = { name: p, children: [], kids: new Map() }; node.kids.set(p, c); node.children.push(c); }
    node = node.kids.get(p);
  });
  node.children.push({ name: r.label, value: r.value, leaf: true });
});
const h = d3.hierarchy(tree, d => d.leaf ? null : d.children).sum(d => d.leaf ? d.value : 0)
  .sort((a, b) => b.value - a.value);

// ---- layout ------------------------------------------------------------------------------
let top = ck.top;
if (o.legend !== false && topGroups.length > 1) {
  top += ckLegend(ck, topGroups, colors, top + 4, pkPx(o.legendFontSize, 11)).height + 4;
}
const W = width - 12, H = Math.max(40, height - top - 8);
const D = Math.max(40, Math.min(W, H));
const cx = width / 2, cy = top + 4 + H / 2;
d3.pack().size([D, D]).padding(pkNum(o.padding, 3))(h);
const nodes = h.descendants();
const colorOf = n => {
  if (!topGroups.length) return colors[0];
  const a = n.ancestors().find(k => k.depth === 1);
  return a ? colors[Math.max(0, topGroups.indexOf(a.data.name))] : colors[0];
};
const fillOf = n => n.depth === 0 ? pkMix(ck.textCol, ck.bgcol, 0.95)
  : n.children ? pkMix(colorOf(n), ck.bgcol, Math.max(0.55, 0.85 - 0.12 * (n.depth - 1)))
  : pkMix(colorOf(n), ck.bgcol, 0.12);

const root = svg.insert("g", ".pk-tip");
const circles = root.selectAll("circle").data(nodes).enter().append("circle")
  .attr("fill", fillOf)
  .attr("stroke", n => n.children && n.depth ? colorOf(n) : "none").attr("stroke-opacity", 0.45);
const labelG = root.append("g").style("pointer-events", "none");
const labels = labelG.selectAll("text").data(nodes.filter(n => n.depth > 0)).enter().append("text")
  .attr("text-anchor", "middle").style("fill", ck.textCol)
  .style("paint-order", "stroke").style("stroke-linejoin", "round");
labels.append("tspan").attr("class", "nm");
labels.append("tspan").attr("class", "vl").style("fill-opacity", 0.7);

// ---- view (zoom) -------------------------------------------------------------------------
let focus = h, view = [h.x, h.y, h.r * 2], grow = ck.animate ? 0 : 1;
function place(v) {
  view = v;
  const k = D / v[2];
  circles.attr("cx", n => cx + (n.x - v[0]) * k).attr("cy", n => cy + (n.y - v[1]) * k)
    .attr("r", n => Math.max(0, n.r * k * Math.min(1, Math.max(0, grow * (depth + 1) - n.depth))));
  labels.each(function (n) {
    const r = n.r * k, t = d3.select(this), x = cx + (n.x - v[0]) * k, y = cy + (n.y - v[1]) * k;
    const visible = o.showLabels !== false && grow >= 1 && (n.parent === focus || (!n.children && n.ancestors().includes(focus)));
    if (!visible || r < 12) { t.style("display", "none"); return; }
    if (n.children) {   // a group: its name at the top of its circle
      const fs = Math.min(lfs + 1, Math.max(9, r / 5));
      const name = ckFit(ck, n.data.name, fs, r * 1.5, 700);
      t.style("display", name ? null : "none").attr("x", x).attr("y", y - r + fs + 4)
        .style("font-size", fs + "px").style("font-weight", 700).style("stroke", fillOf(n)).style("stroke-width", 3);
      t.select(".nm").attr("x", x).attr("dy", 0).text(name);
      t.select(".vl").text("");
      return;
    }
    const fs = Math.min(lfs, Math.max(8, r / 3.2));
    let name = ckFit(ck, n.data.name, fs, r * 1.8);
    // only label items whose name (almost) fits, so small circles stay clean
    if (r < 18 || name.length < Math.min(n.data.name.length, 6)) name = "";
    const two = r > fs * 2.6;
    t.style("display", name ? null : "none").attr("x", x).attr("y", y).style("font-size", fs + "px")
      .style("font-weight", null).style("stroke", "none");
    t.select(".nm").attr("x", x).attr("dy", two ? "-0.2em" : "0.35em").text(name);
    t.select(".vl").attr("x", x).attr("dy", two ? "1.15em" : 0).text(two ? fmt(n.value) : "");
  });
}
place(view);
if (ck.animate) {
  const tm = ddplotTrack(d3.timer(el => {
    grow = Math.min(1, el / 1100);
    place(view);
    if (grow >= 1) tm.stop();
  }));
}
function zoomTo(n) {
  if (o.zoom === false) return;
  focus = n;
  ck.tip.hide();
  const i = d3.interpolateZoom(view, [n.x, n.y, n.r * 2]);
  root.transition().duration(pkCalm ? 0 : 750).tween("zoom", () => t => place(i(t)));
}

// ---- interactions ------------------------------------------------------------------------
function rows(n) {
  const r = [{ name: o.valueName || "Value", value: fmt(n.value) }];
  if (n.parent) r.push({ name: "Share of " + n.parent.data.name, value: pct(n.value / n.parent.value) });
  if (n.depth > 0 && n.depth <= depth) r.push({ name: groupNames[n.depth - 1] || "Group", value: n.data.name });
  if (n.children) r.push({ name: "Items", value: d3.format(",")(n.leaves().length) });
  return r;
}
ckOn(circles, {
  over: (a, n) => { if (ck.hover && n.depth) d3.select(circles.nodes()[nodes.indexOf(n)]).attr("stroke", ck.textCol).attr("stroke-opacity", 0.8); },
  move: (a, n) => {
    if (!ck.hover || n === focus) { ck.tip.hide(); return; }
    ckTipAt(ck, a, n.data.name, rows(n), n.depth ? colorOf(n) : null);
  },
  out: (a, n) => {
    d3.select(circles.nodes()[nodes.indexOf(n)]).attr("stroke", n.children && n.depth ? colorOf(n) : "none").attr("stroke-opacity", 0.45);
    ck.tip.hide();
  },
  click: (a, n) => {
    const ev = pkEvOf(a);
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (!n.children) {
      ck.send("clicked", { label: n.data.name, value: n.value, path: n.ancestors().slice(1, -1).reverse().map(k => k.data.name) });
      if (n.parent !== focus) zoomTo(n.parent);
    } else if (n === focus) zoomTo(focus.parent || h);
    else zoomTo(n);
  }
});
svg.on("click.ckzoom", () => { if (focus !== h) zoomTo(focus.parent || h); });
