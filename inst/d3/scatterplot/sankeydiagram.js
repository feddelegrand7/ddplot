// sankey_diagram() -- flows between nodes laid out in columns. The layout (a
// small version of d3-sankey, which is not part of D3) is computed here.
// Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "sankey_diagram");
const names = pkArr(o.nodes).map(String);
const nodes = names.map((name, i) => ({ i, name, out: [], inc: [] }));
const links = (data || []).map(d => ({ s: nodes[+d.s], t: nodes[+d.t], v: +d.v }))
  .filter(l => l.s && l.t && isFinite(l.v) && l.v > 0);
if (!links.length) { ck.empty(); return; }
links.forEach(l => { l.s.out.push(l); l.t.inc.push(l); });
nodes.forEach(n => { n.value = Math.max(d3.sum(n.out, l => l.v), d3.sum(n.inc, l => l.v)); });
const live = nodes.filter(n => n.value > 0);

const fmt = ckFormat(o.valueFormat, ",.0f"), pct = d3.format(".1%");
const colors = ckPalette(nodes.length, o.colors);
const nw = pkNum(o.nodeWidth, 14), lfs = pkPx(o.labelFontSize, 11);
const linkOp = pkNum(o.linkOpacity, 0.4);

// ---- layout ------------------------------------------------------------------------------
// depth = longest path from a start node, height = longest path to an end node
const order = [], indeg = new Map(live.map(n => [n, n.inc.length]));
let queue = live.filter(n => !n.inc.length);
while (queue.length) {
  const n = queue.shift(); order.push(n);
  n.out.forEach(l => { indeg.set(l.t, indeg.get(l.t) - 1); if (!indeg.get(l.t)) queue.push(l.t); });
}
order.forEach(n => { n.depth = d3.max(n.inc, l => l.s.depth + 1) || 0; });
order.slice().reverse().forEach(n => { n.height = d3.max(n.out, l => l.t.height + 1) || 0; });
const maxDepth = d3.max(live, n => n.depth);
live.forEach(n => {
  n.col = o.align === "left" ? n.depth
    : o.align === "right" ? maxDepth - n.height
    : o.align === "center" ? (n.inc.length ? n.depth : (n.out.length ? d3.min(n.out, l => l.t.depth) - 1 : 0))
    : (n.out.length ? n.depth : maxDepth);
});
const nCols = d3.max(live, n => n.col) + 1;
const cols = d3.range(nCols).map(c => live.filter(n => n.col === c));

const m = { top: ck.top + 8, right: 10, bottom: 12, left: 10 };
const W = Math.max(60, width - m.left - m.right), H = Math.max(60, height - m.top - m.bottom);
const maxLen = d3.max(cols, c => c.length);
const pad = Math.min(pkNum(o.nodePadding, 12), H * 0.5 / Math.max(1, maxLen - 1));
const ky = d3.min(cols, c => (H - (c.length - 1) * pad) / d3.sum(c, n => n.value));
live.forEach(n => {
  n.x0 = nCols > 1 ? n.col * (W - nw) / (nCols - 1) : (W - nw) / 2;
  n.x1 = n.x0 + nw;
  n.h = Math.max(1, n.value * ky);
});
cols.forEach(c => {
  const total = d3.sum(c, n => n.h) + (c.length - 1) * pad;
  let y = (H - total) / 2;
  c.forEach(n => { n.y0 = y; y += n.h + pad; });
});
const center = n => n.y0 + n.h / 2;
function collide(c) {
  c.sort((a, b) => a.y0 - b.y0);
  let y = 0;
  c.forEach(n => { if (n.y0 < y) n.y0 = y; y = n.y0 + n.h + pad; });
  y = H;
  for (let k = c.length - 1; k >= 0; k--) {
    const n = c[k];
    if (n.y0 + n.h > y) n.y0 = y - n.h;
    y = n.y0 - pad;
  }
}
for (let it = 0, iters = 32; it < iters; it++) {
  const alpha = Math.pow(0.97, it);
  for (let c = 1; c < nCols; c++) {
    cols[c].forEach(n => {
      if (!n.inc.length) return;
      const w = d3.sum(n.inc, l => l.v);
      n.y0 += (d3.sum(n.inc, l => center(l.s) * l.v) / w - center(n)) * alpha;
    });
    collide(cols[c]);
  }
  for (let c = nCols - 2; c >= 0; c--) {
    cols[c].forEach(n => {
      if (!n.out.length) return;
      const w = d3.sum(n.out, l => l.v);
      n.y0 += (d3.sum(n.out, l => center(l.t) * l.v) / w - center(n)) * alpha;
    });
    collide(cols[c]);
  }
}
// where every flow leaves its source and reaches its target
function placeLinks() {
  live.forEach(n => {
    n.out.sort((a, b) => a.t.y0 - b.t.y0 || a.t.i - b.t.i);
    n.inc.sort((a, b) => a.s.y0 - b.s.y0 || a.s.i - b.s.i);
    let y = n.y0 + (n.h - d3.sum(n.out, l => l.v) * ky) / 2;
    n.out.forEach(l => { l.w = Math.max(1, l.v * ky); l.y0 = y + l.v * ky / 2; y += l.v * ky; });
    y = n.y0 + (n.h - d3.sum(n.inc, l => l.v) * ky) / 2;
    n.inc.forEach(l => { l.y1 = y + l.v * ky / 2; y += l.v * ky; });
  });
}
placeLinks();
const linkPath = l => {
  const x0 = l.s.x1, x1 = l.t.x0, xm = (x0 + x1) / 2;
  return `M${x0},${l.y0}C${xm},${l.y0} ${xm},${l.y1} ${x1},${l.y1}`;
};

// ---- drawing -----------------------------------------------------------------------------
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);
const defs = svg.append("defs");
const linkCol = l => o.linkColor === "target" ? colors[l.t.i] : o.linkColor === "grey" ? "#9aa3ad"
  : o.linkColor === "gradient" ? `url(#${l.gid})` : colors[l.s.i];
if (o.linkColor === "gradient") {
  links.forEach(l => {
    l.gid = pkUid("ckg");
    l.grad = defs.append("linearGradient").attr("id", l.gid).attr("gradientUnits", "userSpaceOnUse");
    l.grad.append("stop").attr("offset", "0%").attr("stop-color", colors[l.s.i]);
    l.grad.append("stop").attr("offset", "100%").attr("stop-color", colors[l.t.i]);
  });
}
const linkSel = root.append("g").attr("fill", "none").selectAll("path").data(links).enter().append("path")
  .attr("stroke", linkCol).attr("stroke-opacity", linkOp);
const nodeSel = root.append("g").selectAll("g").data(live).enter().append("g");
nodeSel.append("rect").attr("width", nw).attr("rx", 2).attr("fill", n => colors[n.i]);
const labels = root.append("g").style("pointer-events", "none").selectAll("text").data(live).enter().append("text")
  .style("font-size", lfs + "px").style("fill", ck.textCol);
labels.append("tspan").attr("class", "nm").style("font-weight", 700);
labels.append("tspan").attr("class", "vl").style("fill-opacity", 0.7);

function redraw() {
  linkSel.attr("d", linkPath).attr("stroke-width", l => l.w);
  if (o.linkColor === "gradient") links.forEach(l => l.grad.attr("x1", l.s.x1).attr("x2", l.t.x0));
  nodeSel.attr("transform", n => `translate(${n.x0},${n.y0})`).select("rect").attr("height", n => n.h);
  labels.each(function (n) {
    const right = n.col < nCols - 1 || nCols === 1;
    const two = o.showValues !== false && n.h >= lfs * 2.3;
    const t = d3.select(this).attr("text-anchor", right ? "start" : "end");
    const x = right ? n.x1 + 6 : n.x0 - 6;
    t.select(".nm").attr("x", x).attr("y", center(n)).attr("dy", two ? "-0.15em" : "0.35em").text(n.name);
    t.select(".vl").attr("x", x).attr("y", center(n)).attr("dy", two ? "1.05em" : "0.35em")
      .attr("dx", 0).text(o.showValues !== false ? (two ? fmt(n.value) : "") : "");
    if (o.showValues !== false && !two) t.select(".nm").text(n.name + "  " + fmt(n.value));
  });
}
redraw();

// the flows run from left to right
if (ck.animate) {
  linkSel.each(function (l) {
    const len = this.getTotalLength();
    d3.select(this).attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
      .transition().duration(700).delay(l.s.col * 450 + 150).ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0).on("end", function () { d3.select(this).attr("stroke-dasharray", null); });
  });
  nodeSel.style("opacity", 0).transition().duration(400).delay(n => n.col * 450).style("opacity", 1);
  labels.style("opacity", 0).transition().duration(400).delay(n => n.col * 450 + 200).style("opacity", 1);
}

// ---- interactions ------------------------------------------------------------------------
function focus(test) {
  linkSel.attr("stroke-opacity", l => test === null ? linkOp : test(l) ? Math.min(0.85, linkOp + 0.35) : linkOp * 0.25);
}
ckOn(linkSel, {
  move: (a, l) => {
    if (!ck.hover) return;
    focus(k => k === l);
    ckTipAt(ck, a, l.s.name + " → " + l.t.name, [
      { name: "Value", value: fmt(l.v) },
      { name: "Share of " + l.s.name, value: pct(l.v / d3.sum(l.s.out, k => k.v)) },
      { name: "Share of " + l.t.name, value: pct(l.v / d3.sum(l.t.inc, k => k.v)) }
    ], colors[l.s.i]);
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, l) => ck.send("clicked", { source: l.s.name, target: l.t.name, value: l.v })
});
ckOn(nodeSel, {
  move: (a, n) => {
    if (!ck.hover) return;
    focus(l => l.s === n || l.t === n);
    const rows = [];
    if (n.inc.length) rows.push({ name: "In", value: fmt(d3.sum(n.inc, l => l.v)) });
    if (n.out.length) rows.push({ name: "Out", value: fmt(d3.sum(n.out, l => l.v)) });
    ckTipAt(ck, a, n.name, rows, colors[n.i]);
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, n) => ck.send("clicked", { node: n.name, value: n.value })
});
if (o.draggable !== false) {
  let start = null;
  nodeSel.style("cursor", "ns-resize").call(d3.drag()
    .on("start", function (a) { const n = d3.select(this).datum(); start = { y: ckPtr(a)[1], y0: n.y0 }; ck.tip.hide(); })
    .on("drag", function (a) {
      const n = d3.select(this).datum();
      n.y0 = pkClamp(start.y0 + ckPtr(a)[1] - start.y, 0, H - n.h);
      placeLinks();
      redraw();
    }));
}
