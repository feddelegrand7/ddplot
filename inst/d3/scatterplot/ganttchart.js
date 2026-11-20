// gantt_chart() -- tasks as bars along a time axis, with groups, progress,
// dependencies, milestones, a "today" line and zoom. Uses playkit.js and
// chartkit.js.

const o = options || {};
const ck = ckInit(o, "gantt_chart");
const tasks = (data || []).map((d, i) => ({
  i, name: String(d.name), s: +d.s, e: +d.e, ms: d.milestone === true || d.milestone === "TRUE",
  g: d.g === undefined ? -1 : +d.g, p: d.p === undefined ? -1 : +d.p
})).filter(t => isFinite(t.s) && isFinite(t.e));
if (!tasks.length) { ck.empty(); return; }
const deps = pkArr(o.deps).map(pkArr);
tasks.forEach(t => { t.after = (deps[t.i] || []).map(k => tasks[+k]).filter(Boolean); t.before = []; });
tasks.forEach(t => t.after.forEach(a => a.before.push(t)));
const groups = pkArr(o.groups).map(String);
const colors = ckPalette(Math.max(1, groups.length), o.colors);
const colorOf = t => t.g >= 0 ? colors[t.g] : colors[0];
const lfs = pkPx(o.labelFontSize, 11);
const dayMs = 864e5;
const tfmt = d3.utcFormat(o.dateFormat || (o.day ? "%b %-d, %Y" : "%b %-d, %Y %H:%M"));
const endOf = t => o.day && !t.ms ? t.e - dayMs : t.e;   // the last day of a task
function duration(t) {
  const d = (t.e - t.s) / dayMs;
  if (o.day) return d3.format(",")(Math.round(d)) + (Math.round(d) === 1 ? " day" : " days");
  return d >= 2 ? d3.format(",.1~f")(d) + " days" : d3.format(",.1~f")(d * 24) + " hours";
}

// ---- layout ------------------------------------------------------------------------------
let top = ck.top;
if (o.legend !== false && groups.length > 1) {
  top += ckLegend(ck, groups, colors, top + 4, pkPx(o.legendFontSize, 11)).height + 4;
}
const labW = Math.min(width * 0.3, d3.max(tasks, t => ck.measure(t.name, lfs)) + 16);
const m = { top: top + 24, right: 16, bottom: 8, left: labW };
const W = Math.max(60, width - m.left - m.right), H = Math.max(30, height - m.top - m.bottom);
const t0 = d3.min(tasks, t => t.s), t1 = d3.max(tasks, t => t.e);
const span = Math.max(dayMs, t1 - t0);
let lo = t0 - span * 0.03, hi = t1 + span * 0.03;
if (o.today !== null && o.today !== undefined) { lo = Math.min(lo, +o.today - span * 0.03); hi = Math.max(hi, +o.today + span * 0.03); }
const x0 = d3.scaleUtc().domain([lo, hi]).range([0, W]);
let x = x0;
const ys = d3.scaleBand().domain(d3.range(tasks.length)).range([0, H]).padding(1 - pkNum(o.barHeight, 0.6));
const rowH = H / tasks.length, bh = ys.bandwidth();
const yc = k => ys(k) + bh / 2;

const clipId = pkUid("ckclip");
svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("x", 0).attr("y", -24).attr("width", W).attr("height", H + 24);
const arrowId = pkUid("ckarrow");
svg.select("defs").append("marker").attr("id", arrowId).attr("viewBox", "0 -5 10 10").attr("refX", 9)
  .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
  .append("path").attr("d", "M0,-4L10,0L0,4Z").attr("fill", ck.textCol).attr("fill-opacity", 0.55);
const root = svg.insert("g", ".pk-tip").attr("transform", `translate(${m.left},${m.top})`);
// zebra rows and task names
root.append("g").selectAll("rect").data(tasks).enter().append("rect").attr("x", -labW).attr("width", W + labW)
  .attr("y", (t, k) => k * rowH).attr("height", rowH).attr("fill", (t, k) => k % 2 ? "transparent" : ck.textCol)
  .attr("fill-opacity", 0.035);
const names = root.append("g").selectAll("text").data(tasks).enter().append("text")
  .attr("x", -10).attr("y", (t, k) => yc(k)).attr("dy", "0.35em").attr("text-anchor", "end")
  .style("font-size", lfs + "px").style("fill", ck.textCol).text(t => ckFit(ck, t.name, lfs, labW - 14));
const plot = root.append("g").attr("clip-path", `url(#${clipId})`);
const gridG = plot.append("g"), axisG = root.append("g");
const depG = plot.append("g").attr("fill", "none");
const barsG = plot.append("g");
const todayG = plot.append("g").style("pointer-events", "none");

const bars = barsG.selectAll(".ck-task").data(tasks).enter().append("g").attr("class", "ck-task");
bars.filter(t => !t.ms).append("rect").attr("class", "bg").attr("height", bh).attr("rx", Math.min(4, bh / 3))
  .attr("fill", colorOf).attr("fill-opacity", o.hasProgress ? 0.45 : 0.9);
if (o.hasProgress) {
  bars.filter(t => !t.ms && t.p > 0).append("rect").attr("class", "done").attr("height", bh).attr("rx", Math.min(4, bh / 3)).attr("fill", colorOf);
}
bars.filter(t => t.ms).append("path").attr("class", "ms").attr("fill", colorOf).attr("stroke", ck.bgcol).attr("stroke-width", 1.5)
  .attr("d", () => { const r = Math.min(bh * 0.62, 11); return `M0,${-r}L${r},0L0,${r}L${-r},0Z`; });
const blabel = bars.append("text").attr("dy", "0.35em").style("font-size", Math.max(9, Math.min(lfs, bh * 0.6)) + "px")
  .style("pointer-events", "none");
const depSel = depG.selectAll("path").data(d3.merge(tasks.map(t => t.after.map(a => ({ from: a, to: t }))))).enter().append("path")
  .attr("stroke", ck.textCol).attr("stroke-opacity", 0.4).attr("stroke-width", 1.2).attr("marker-end", `url(#${arrowId})`);

function draw() {
  const ticks = x.ticks(Math.max(2, Math.min(10, W / 90)));
  gridG.selectAll("line").remove();
  ticks.forEach(t => gridG.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", H)
    .attr("stroke", ck.textCol).attr("stroke-opacity", 0.08));
  axisG.selectAll("*").remove();
  ckAxis(axisG.call(d3.axisTop(x).tickValues(ticks).tickSize(4).tickSizeOuter(0)), ck, 10);
  axisG.selectAll(".tick").style("display", d => x(d) < -1 || x(d) > W + 1 ? "none" : null);
  bars.attr("transform", t => `translate(0,${ys(tasks.indexOf(t))})`);
  bars.select(".bg").attr("x", t => x(t.s)).attr("width", t => Math.max(2, x(t.e) - x(t.s)));
  bars.select(".done").attr("x", t => x(t.s)).attr("width", t => Math.max(0, (x(t.e) - x(t.s)) * t.p));
  bars.select(".ms").attr("transform", t => `translate(${x(t.s)},${bh / 2})`);
  blabel.each(function (t) {
    const w = x(t.e) - x(t.s), txt = o.hasProgress && t.p >= 0 && !t.ms ? d3.format(".0%")(t.p) : "";
    const lab = d3.select(this);
    const inside = txt && ck.measure(txt, 10) + 10 < w;
    lab.attr("x", inside ? x(t.s) + 6 : (t.ms ? x(t.s) + 12 : x(t.e) + 5)).attr("y", bh / 2)
      .style("fill", inside ? "#fff" : ck.textCol).style("fill-opacity", inside ? 1 : 0.75).text(t.ms ? "" : txt);
  });
  depSel.attr("d", d => {
    const a = d.from, b = d.to, ka = tasks.indexOf(a), kb = tasks.indexOf(b);
    const xa = a.ms ? x(a.s) + 6 : x(a.e), xb = b.ms ? x(b.s) - Math.min(bh * 0.62, 11) : x(b.s);
    const ya = yc(ka), yb = yc(kb);
    if (xb - xa >= 14) return `M${xa},${ya}H${xa + 6}C${xa + 18},${ya} ${xa + 6},${yb} ${xa + 18},${yb}H${xb - 1}`;
    const ymid = kb > ka ? kb * rowH : (kb + 1) * rowH;   // the edge of the target row
    return `M${xa},${ya}H${xa + 6}V${ymid}H${xb - 8}V${yb}H${xb - 1}`;
  });
  todayG.selectAll("*").remove();
  if (o.today !== null && o.today !== undefined) {
    const tx = x(+o.today);
    todayG.append("line").attr("x1", tx).attr("x2", tx).attr("y1", -4).attr("y2", H).attr("stroke", "#e5484d")
      .attr("stroke-width", 1.5).attr("stroke-dasharray", "4,3");
    todayG.append("text").attr("x", tx).attr("y", -10).attr("text-anchor", "middle").style("font-size", "10px")
      .style("font-weight", 700).style("fill", "#e5484d").style("paint-order", "stroke").style("stroke", ck.bgcol)
      .style("stroke-width", 3).text("Today");
  }
}
draw();
if (ck.animate) {
  bars.select(".bg").attr("width", 0).transition().duration(600).delay((t, k) => k * 60).ease(d3.easeCubicOut)
    .attr("width", t => Math.max(2, x(t.e) - x(t.s)));
  bars.select(".done").attr("width", 0).transition().duration(600).delay((t, k) => k * 60 + 300)
    .attr("width", t => Math.max(0, (x(t.e) - x(t.s)) * t.p));
  bars.select(".ms").style("opacity", 0).transition().duration(300).delay((t, k) => k * 60 + 300).style("opacity", 1);
  blabel.style("opacity", 0).transition().duration(300).delay((t, k) => k * 60 + 500).style("opacity", 1);
  depSel.style("opacity", 0).transition().duration(400).delay(tasks.length * 60 + 300).style("opacity", 1);
}

// ---- interactions ------------------------------------------------------------------------
function chain(t, key, set) { t[key].forEach(k => { if (!set.has(k)) { set.add(k); chain(k, key, set); } }); return set; }
function focus(t) {
  if (!t) {
    bars.style("opacity", 1); names.style("font-weight", null).style("fill-opacity", 1);
    depSel.attr("stroke-opacity", 0.4).attr("stroke-width", 1.2);
    return;
  }
  const rel = chain(t, "after", new Set([t]));
  chain(t, "before", rel);
  bars.style("opacity", k => rel.has(k) ? 1 : 0.25);
  names.style("font-weight", k => k === t ? 700 : null).style("fill-opacity", k => rel.has(k) ? 1 : 0.45);
  depSel.attr("stroke-opacity", d => rel.has(d.from) && rel.has(d.to) ? 0.85 : 0.1).attr("stroke-width", d => rel.has(d.from) && rel.has(d.to) ? 1.8 : 1.2);
}
const hits = bars.append("rect").attr("class", "hit").attr("y", -(rowH - bh) / 2).attr("height", rowH).attr("fill", "transparent");
const placeHits = () => hits.attr("x", t => x(t.s) - (t.ms ? 12 : 2)).attr("width", t => Math.max(24, x(t.e) - x(t.s) + (t.ms ? 0 : 4)));
placeHits();
ckOn(hits, {
  move: (a, t) => {
    if (!ck.hover) return;
    focus(t);
    const rows = [];
    if (t.g >= 0) rows.push({ name: "Group", value: groups[t.g] });
    if (t.ms) rows.push({ name: "Milestone", value: tfmt(new Date(t.s)) });
    else {
      rows.push({ name: "Start", value: tfmt(new Date(t.s)) });
      rows.push({ name: "End", value: tfmt(new Date(endOf(t))) });
      rows.push({ name: "Duration", value: duration(t) });
    }
    if (o.hasProgress && t.p >= 0 && !t.ms) rows.push({ name: "Done", value: d3.format(".0%")(t.p) });
    if (t.after.length) rows.push({ name: "After", value: t.after.map(k => k.name).join(", ") });
    ckTipAt(ck, a, t.name, rows, colorOf(t));
  },
  out: () => { focus(null); ck.tip.hide(); },
  click: (a, t) => ck.send("clicked", { task: t.name, start: tfmt(new Date(t.s)), end: tfmt(new Date(endOf(t))), group: t.g >= 0 ? groups[t.g] : null })
});

if (o.zoom !== false) {
  const zoom = d3.zoom().scaleExtent([1, 200]).translateExtent([[0, 0], [W, H]]).extent([[0, 0], [W, H]])
    .on("zoom", function (a) {
      x = pkEvOf(a).transform.rescaleX(x0);
      draw(); placeHits(); ck.tip.hide();
    });
  const zoomArea = root.insert("rect", ":first-child").attr("width", W).attr("height", H).attr("fill", "transparent");
  root.call(zoom).on("dblclick.zoom", null);
  root.on("dblclick", () => root.transition().duration(500).call(zoom.transform, d3.zoomIdentity));
  zoomArea.style("cursor", "grab");
}
