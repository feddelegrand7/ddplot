// network_graph() -- a force-directed network with groups, drag, zoom and
// neighbour highlighting. Uses playkit.js and chartkit.js.

const o = options || {};
const ck = ckInit(o, "network_graph");
const nt = o.nodes || {};
const ids = pkArr(nt.id).map(String);
if (!ids.length) { ck.empty(); return; }
const labs = pkArr(nt.label).map(String), grps = pkArr(nt.group), sizes = pkArr(nt.size);
const groups = pkArr(o.groups).map(String);
const nodes = ids.map((id, i) => ({
  i, id, label: labs[i] || id, g: grps.length ? +grps[i] : -1, size: sizes.length ? pkNum(sizes[i], null) : null, deg: 0, nb: new Set()
}));
const links = (data || []).map(d => ({ source: +d.s, target: +d.t, w: +d.w }))
  .filter(l => nodes[l.source] && nodes[l.target]);
links.forEach(l => {
  const a = nodes[l.source], b = nodes[l.target];
  a.deg += l.w; b.deg += l.w; a.nb.add(b); b.nb.add(a);
});
const colors = ckPalette(Math.max(1, groups.length), o.colors);
const colorOf = n => n.g >= 0 ? colors[n.g] : colors[0];
const rr = pkArr(o.nodeRadius).map(Number);
const valOf = n => o.sizeName ? (n.size === null ? 0 : n.size) : n.deg;
const rs = d3.scaleSqrt().domain([0, d3.max(nodes, valOf) || 1]).range([rr[0] || 5, rr[1] || 18]);
nodes.forEach(n => { n.r = rs(Math.max(0, valOf(n))); });
const wMax = d3.max(links, l => l.w) || 1;
const lw = l => o.weighted ? 1 + 4 * l.w / wMax : 1.3;
const lfs = pkPx(o.labelFontSize, 10);
const fmt = d3.format(",~g");

// ---- layout ------------------------------------------------------------------------------
let top = ck.top;
let legend = null, legendOn = null;
if (o.legend !== false && groups.length > 1) {
  legend = ckLegend(ck, groups, colors, top + 4, pkPx(o.legendFontSize, 11), k => {
    legendOn = legendOn === k ? null : k;
    legend.nodes.forEach((it, j) => it.style("opacity", legendOn === null || legendOn === j ? 1 : 0.35));
    highlight(null);
  });
  top += legend.height + 4;
}
const m = { top: top + 4, right: 6, bottom: 6, left: 6 };
const W = Math.max(60, width - m.left - m.right), H = Math.max(60, height - m.top - m.bottom);
const clipId = pkUid("ckclip");
svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("width", W).attr("height", H);
const frame = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`).attr("clip-path", `url(#${clipId})`);
const bg = frame.append("rect").attr("width", W).attr("height", H).attr("fill", "transparent");
const root = frame.append("g");

// arrows
const arrowId = pkUid("ckarrow");
if (o.directed) {
  svg.select("defs").append("marker").attr("id", arrowId).attr("viewBox", "0 -5 10 10").attr("refX", 10)
    .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
    .append("path").attr("d", "M0,-4L10,0L0,4Z").attr("fill", o.linkCol || "#a7b0ba");
}
const linkSel = root.append("g").selectAll("line").data(links).enter().append("line")
  .attr("stroke", o.linkCol || "#a7b0ba").attr("stroke-opacity", 0.7).attr("stroke-width", lw)
  .attr("marker-end", o.directed ? `url(#${arrowId})` : null);
const nodeSel = root.append("g").selectAll("circle").data(nodes).enter().append("circle")
  .attr("r", n => n.r).attr("fill", colorOf).attr("stroke", ck.bgcol).attr("stroke-width", 1.5);
const autoLabels = o.showLabels === null || o.showLabels === undefined;
const bigEnough = autoLabels && nodes.length > 40 ? d3.quantile(nodes.map(n => n.r).sort(d3.ascending), 0.85) : 0;
const labelOn = n => o.showLabels === false ? false : (nodes.length <= 40 || !autoLabels || n.r >= bigEnough);
const labelSel = root.append("g").style("pointer-events", "none").selectAll("text").data(nodes).enter().append("text")
  .style("font-size", lfs + "px").style("fill", ck.textCol).attr("dy", "0.35em")
  .style("paint-order", "stroke").style("stroke", ck.bgcol).style("stroke-width", 3).style("stroke-linejoin", "round")
  .text(n => n.label).style("display", n => labelOn(n) ? null : "none");

// ---- the simulation ----------------------------------------------------------------------
nodes.forEach((n, k) => {   // start from a small spiral in the middle
  const a = k * 2.39996, r = 6 * Math.sqrt(k + 0.5);
  n.x = W / 2 + r * Math.cos(a); n.y = H / 2 + r * Math.sin(a);
});
const sim = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).distance(pkNum(o.linkDistance, pkClamp(Math.sqrt(W * H / nodes.length) * 0.45, 25, 120))).strength(l => 1 / Math.min(l.source.nb.size, l.target.nb.size)))
  .force("charge", d3.forceManyBody().strength(pkNum(o.charge, -160)))
  .force("x", d3.forceX(W / 2).strength(0.06))
  .force("y", d3.forceY(H / 2).strength(0.08))
  .force("collide", d3.forceCollide(n => n.r + 2))
  .on("tick", draw);
ddplotTrack(sim);
function draw() {
  nodes.forEach(n => { n.x = pkClamp(n.x, n.r + 2, W - n.r - 2); n.y = pkClamp(n.y, n.r + 2, H - n.r - 2); });
  linkSel.each(function (l) {
    const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, d = Math.hypot(dx, dy) || 1;
    const end = o.directed ? l.target.r + 2 : 0;
    d3.select(this).attr("x1", l.source.x).attr("y1", l.source.y)
      .attr("x2", l.target.x - dx / d * end).attr("y2", l.target.y - dy / d * end);
  });
  nodeSel.attr("cx", n => n.x).attr("cy", n => n.y);
  labelSel.attr("x", n => n.x + n.r + 3).attr("y", n => n.y);
}
if (!ck.animate) {
  sim.stop();
  for (let k = 0; k < 300; k++) sim.tick();
  draw();
}

// ---- interactions ------------------------------------------------------------------------
let hovered = null;
function highlight(n) {
  hovered = n;
  const inGroup = k => legendOn === null || k.g === legendOn;
  if (!n) {
    nodeSel.style("opacity", k => inGroup(k) ? 1 : 0.15);
    linkSel.style("opacity", l => legendOn === null || (inGroup(l.source) && inGroup(l.target)) ? 1 : 0.08)
      .attr("stroke", o.linkCol || "#a7b0ba");
    labelSel.style("display", k => labelOn(k) && inGroup(k) ? null : "none").style("font-weight", null);
    return;
  }
  const near = k => k === n || n.nb.has(k);
  nodeSel.style("opacity", k => near(k) ? 1 : 0.15);
  linkSel.style("opacity", l => l.source === n || l.target === n ? 1 : 0.06)
    .attr("stroke", l => l.source === n || l.target === n ? d3.color(colorOf(n)).darker(0.3).toString() : (o.linkCol || "#a7b0ba"));
  labelSel.style("display", k => near(k) ? null : "none").style("font-weight", k => k === n ? 700 : null);
}
ckOn(nodeSel, {
  over: (a, n) => { if (ck.hover) highlight(n); },
  move: (a, n) => {
    if (!ck.hover) return;
    const rows = [];
    if (n.g >= 0) rows.push({ name: "Group", value: groups[n.g] });
    rows.push({ name: "Links", value: String(n.nb.size) });
    if (o.weighted) rows.push({ name: "Total weight", value: fmt(n.deg) });
    if (o.sizeName && n.size !== null) rows.push({ name: o.sizeName, value: fmt(n.size) });
    ckTipAt(ck, a, n.label, rows, colorOf(n));
  },
  out: () => { highlight(null); ck.tip.hide(); },
  click: (a, n) => ck.send("clicked", { id: n.id, label: n.label, group: n.g >= 0 ? groups[n.g] : null, degree: n.nb.size })
});
nodeSel.style("cursor", "grab").call(d3.drag()
  .on("start", function (a) {
    const n = d3.select(this).datum();
    if (!pkEvOf(a).active) sim.alphaTarget(0.3).restart();
    n.fx = n.x; n.fy = n.y; ck.tip.hide();
  })
  .on("drag", function (a) {
    const n = d3.select(this).datum(), p = pkPtr(a, root.node());
    n.fx = p[0]; n.fy = p[1];
  })
  .on("end", function (a) {
    const n = d3.select(this).datum();
    if (!pkEvOf(a).active) sim.alphaTarget(0);
    n.fx = null; n.fy = null;
  }));

if (o.zoom !== false) {
  const zoom = d3.zoom().scaleExtent([0.3, 6]).on("zoom", function (a) {
    root.attr("transform", pkEvOf(a).transform);
  });
  frame.call(zoom).on("dblclick.zoom", null);
  bg.style("cursor", "move");
}
