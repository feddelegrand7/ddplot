// flower() -- a blooming, slowly turning flower. Petals can be plucked
// ("loves me, loves me not"), or sized by values to make a small flower chart.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const dark = d3.hsl(bgcol).l < 0.5;
const ink = dark ? "#f2f2f2" : "#333333";
const values = pkArr(o.petalValues).map(v => pkNum(v, 0));
const dataMode = values.length > 0;
const n = dataMode ? values.length : Math.max(1, Math.round(pkNum(o.petalCount, 6)));
const labels = pkArr(o.petalLabels).map(String);
const colors = pkArr(o.petalColor).length ? pkArr(o.petalColor) : ["#ff8ab7"];
const petalStroke = o.petalStroke || null;
const centerColor = o.centerColor || "#f6c445";
const centerStroke = o.centerStroke || "#e09a1a";
const send = pkShiny(svg);
const tw = pkMeasure(svg, font);
const uid = pkUid("flower");
const fmt = v => d3.format(",")(Math.round(v * 100) / 100) + (o.valueSuffix || "");

svg.style("background-color", bgcol).style("font-family", font).attr("role", "img")
  .attr("aria-label", dataMode ? "Flower chart: " + d3.range(n).map(i => (labels[i] || "Petal " + (i + 1)) + " " + fmt(values[i])).join(", ")
    : "Flower with " + n + " petals");

// ---- layout ---------------------------------------------------------------------------
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabels = dataMode && o.showLabels !== false;
const labelPad = showLabels ? Math.min(90, d3.max(d3.range(n), i => tw(labels[i] || "", 11)) + 14) : 0;
const avail = Math.min(W - 2 * labelPad, H - (hasTitle ? titleFs + 16 : 0) - (showLabels ? 36 : 0)) / 2 - 12;
const Lmax = Math.max(20, Math.min(pkPx(o.petalLength, avail * 0.98), avail));
const cr = Math.min(pkPx(o.centerRadius, Lmax * 0.2), Lmax * 0.6);
const pw = pkPx(o.petalWidth, Lmax * (dataMode ? 0.42 : 0.55) * Math.min(1, 7 / n * 1.1));
const cx = W / 2, cy = (H - (hasTitle ? titleFs + 16 : 0)) / 2;
const vmax = dataMode ? (d3.max(values) || 1) : 1;
const lenOf = i => dataMode ? Math.max(cr + 8, Lmax * Math.max(0, values[i]) / vmax) : Lmax;
const colorOf = i => colors[i % colors.length];

// ---- defs: one radial gradient per colour, centred on the flower -----------------------
const defs = svg.append("defs");
const gradId = {};
colors.forEach((c, k) => {
  if (gradId[c]) return;
  const id = uid + "p" + k;
  gradId[c] = id;
  const g = defs.append("radialGradient").attr("id", id).attr("gradientUnits", "userSpaceOnUse")
    .attr("cx", 0).attr("cy", 0).attr("r", Lmax);
  g.append("stop").attr("offset", 0).attr("stop-color", pkMix(c, "#ffffff", 0.7));
  g.append("stop").attr("offset", cr / Lmax + 0.08).attr("stop-color", pkMix(c, "#ffffff", 0.45));
  g.append("stop").attr("offset", 0.75).attr("stop-color", c);
  g.append("stop").attr("offset", 1).attr("stop-color", d3.color(c).darker(0.25));
});
const cg = defs.append("radialGradient").attr("id", uid + "c").attr("cx", "40%").attr("cy", "35%").attr("r", "70%");
cg.append("stop").attr("offset", 0).attr("stop-color", d3.color(centerColor).brighter(0.6));
cg.append("stop").attr("offset", 0.6).attr("stop-color", centerColor);
cg.append("stop").attr("offset", 1).attr("stop-color", pkMix(centerColor, centerStroke, 0.6));
defs.append("filter").attr("id", uid + "s").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%")
  .append("feDropShadow").attr("dx", 0).attr("dy", Math.max(1, Lmax * 0.02)).attr("stdDeviation", Math.max(1.5, Lmax * 0.03))
  .attr("flood-color", "#000").attr("flood-opacity", dark ? 0.5 : 0.16);

const petalD = (L, w) => `M0,0 C${w * 0.62},${-L * 0.16} ${w * 0.6},${-L * 0.86} 0,${-L} C${-w * 0.6},${-L * 0.86} ${-w * 0.62},${-L * 0.16} 0,0Z`;

// ---- drawing --------------------------------------------------------------------------
const root = svg.append("g").attr("transform", `translate(${cx},${cy})`);
const spin = root.append("g").attr("filter", `url(#${uid}s)`);
const back = spin.append("g");
const front = spin.append("g");
const step = 360 / n;
const backOn = !dataMode && pkNum(o.layers, 2) >= 2 && n >= 3;
if (backOn) {
  d3.range(n).forEach(i => {
    back.append("path").attr("d", petalD(Lmax * 0.84, pw * 0.95))
      .attr("fill", d3.color(colorOf(i)).darker(0.45)).attr("fill-opacity", 0.9)
      .attr("data-a", i * step + step / 2);
  });
}
const P = d3.range(n).map(i => ({ i, a: i * step, L: lenOf(i), s: 0, hover: 0, plucked: false, dim: 0 }));
const petalG = front.selectAll("g.pk-petal").data(P).enter().append("g").attr("class", "pk-petal")
  .style("cursor", "pointer");
petalG.append("path").attr("class", "blade")
  .attr("d", d => petalD(d.L, Math.min(pw, d.L * 0.8)))
  .attr("fill", d => `url(#${gradId[colorOf(d.i)]})`)
  .attr("stroke", d => petalStroke || d3.color(colorOf(d.i)).darker(0.6)).attr("stroke-width", 1.2)
  .attr("stroke-opacity", petalStroke ? 0.9 : 0.35);
petalG.append("path").attr("class", "vein").style("pointer-events", "none")
  .attr("d", d => `M0,${-cr * 1.05} Q${pw * 0.04},${-d.L * 0.55} 0,${-d.L * 0.86}`)
  .attr("fill", "none").attr("stroke", "white").attr("stroke-opacity", 0.4).attr("stroke-width", 1);

// the centre: a disc with stamens laid out on a golden-angle spiral
const centreG = root.append("g").style("cursor", "pointer");
centreG.append("circle").attr("r", cr).attr("fill", `url(#${uid}c)`).attr("stroke", centerStroke).attr("stroke-width", 1.5);
const ns = Math.min(160, Math.max(8, Math.round(cr * cr / 9)));
const dots = centreG.append("g").style("pointer-events", "none")
  .attr("opacity", o.centerText ? 0.3 : (o.stamens === false ? 0 : 0.75));
d3.range(ns).forEach(k => {
  const r = cr * 0.86 * Math.sqrt((k + 0.5) / ns), a = k * 137.508 * Math.PI / 180;
  dots.append("circle").attr("cx", r * Math.cos(a)).attr("cy", r * Math.sin(a))
    .attr("r", Math.max(0.6, cr * 0.055 * (1 - 0.4 * r / cr))).attr("fill", d3.color(centerStroke).darker(0.6));
});
const centreText = centreG.append("text").attr("text-anchor", "middle").attr("dy", "0.35em")
  .style("font-size", pkPx(o.centerTextSize, 16) + "px").style("font-weight", 700)
  .style("fill", o.centerTextColor || "#222222").style("pointer-events", "none").text(o.centerText || "");

const labelG = root.append("g").style("pointer-events", "none");
const labelSel = showLabels ? labelG.selectAll("text").data(P).enter().append("text")
  .attr("dy", "0.35em").style("font-size", "11px").style("fill", ink).text(d => labels[d.i] || "") : null;
if (hasTitle) {
  svg.append("text").attr("x", cx).attr("y", H - 8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", o.titleColor || ink).style("fill-opacity", 0.8).text(o.titleText);
}
const tip = pkTip(svg, { font, color: "#333333", bgcol: "white", W, H, measure: tw });
const say = svg.append("text").attr("text-anchor", "middle").style("font-size", "15px").style("font-weight", 700)
  .style("fill", ink).style("pointer-events", "none").attr("opacity", 0);

// ---- animation ----------------------------------------------------------------------
const st = pkState("flower");
const speed = pkCalm ? 0 : pkNum(o.rotationSpeed, 0.5);   // degrees per 20 ms (50 frames a second)
let angle = st.angle || 0, spinK = 1, hovering = false, lastNow = pkNow();
let bloomT0 = null;
const bloomOn = o.bloom !== false && !pkCalm && !st.bloomed;
if (!bloomOn) P.forEach(d => { d.s = 1; });

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow); lastNow = now;
  spinK += ((hovering ? 0 : 1) - spinK) * Math.min(1, dt / 250);
  angle = (angle + speed * spinK * dt / 20) % 360;
  st.angle = angle;
  spin.attr("transform", `rotate(${angle})`);
  const breathe = pkCalm ? 0 : 1;
  const bt = bloomT0 === null ? null : now - bloomT0;
  P.forEach(d => {
    if (bt !== null && !d.plucked) d.s = d3.easeBackOut.overshoot(1.4)(pkClamp((bt - d.i * (700 / n) - 150) / 650, 0, 1));
    d.hover += ((d.hoverTo || 0) - d.hover) * Math.min(1, dt / 120);
  });
  petalG.attr("transform", d => `rotate(${d.a}) scale(${d.s * (1 + 0.1 * d.hover + 0.015 * breathe * Math.sin(now / 900 + d.i))})`)
    .style("display", d => d.plucked ? "none" : null)
    .attr("opacity", d => 1 - 0.65 * d.dim);
  if (backOn) {
    const bs = bt === null ? 1 : d3.easeCubicOut(pkClamp(bt / 600, 0, 1));
    back.selectAll("path").attr("transform", function () { return `rotate(${+this.getAttribute("data-a")}) scale(${bs})`; });
  }
  const cs = bt === null ? 1 : d3.easeBackOut(pkClamp(bt / 450, 0, 1));
  centreG.attr("transform", `scale(${cs})`);
  if (labelSel) {
    labelSel.each(function (d) {
      const a = (d.a + angle - 90) * Math.PI / 180, r = d.L * d.s + 9;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      d3.select(this).attr("x", x).attr("y", y).attr("text-anchor", Math.abs(x) < 6 ? "middle" : x > 0 ? "start" : "end")
        .attr("opacity", d.s * (1 - 0.6 * d.dim));
    });
  }
  if (bt !== null && bt > 700 + 900) { bloomT0 = null; st.bloomed = true; }
});
loop.onVisible(() => { if (bloomOn) { P.forEach(d => { d.s = 0; }); bloomT0 = pkNow(); } });

// ---- interactions -------------------------------------------------------------------
let plucked = 0, selected = null;
function head(d) { return labels[d.i] || ("Petal " + (d.i + 1)); }
petalG.on("mouseenter", function (a, dd) {
  const d = pkIsV6 ? dd : a;
  hovering = true; d.hoverTo = 1;
  if (dataMode) {
    const p = pkPtr(pkIsV6 ? a : null, svg.node());
    const tot = d3.sum(values);
    tip.show(head(d), [{ name: "Value", value: fmt(values[d.i]) },
      { name: "Share", value: tot ? Math.round(values[d.i] / tot * 1000) / 10 + "%" : "–" }], p[0], p[1], colorOf(d.i));
  }
}).on("mousemove", function (a) {
  if (dataMode) { const p = pkPtr(pkIsV6 ? a : null, svg.node()); tip.move(p[0], p[1]); }
}).on("mouseleave", function (a, dd) {
  const d = pkIsV6 ? dd : a;
  hovering = false; d.hoverTo = 0; tip.hide();
}).on("click", function (a, dd) {
  const d = pkIsV6 ? dd : a;
  if (dataMode) {
    selected = selected === d.i ? null : d.i;
    P.forEach(q => { q.dim = selected === null || q.i === selected ? 0 : 1; });
    send("clicked", selected === null ? null : { petal: d.i + 1, label: labels[d.i] || null, value: values[d.i] });
    return;
  }
  if (o.pluck === false) { send("clicked", { petal: d.i + 1 }); return; }
  pluck(d, this);
});
centreG.on("click", () => { if (!dataMode) regrow(); send("clicked", { petal: 0 }); })
  .on("mouseenter", () => { hovering = true; }).on("mouseleave", () => { hovering = false; });

function pluck(d, node) {
  d.plucked = true; d.hoverTo = 0; d.hover = 0;
  plucked += 1;
  const remaining = P.filter(q => !q.plucked).length;
  const lovesMe = plucked % 2 === 1;
  send("clicked", { petal: d.i + 1, plucked, remaining, lovesMe });
  // a copy of the petal falls to the ground
  const a = d.a + angle;
  const rad = (a - 90) * Math.PI / 180;
  const sx = cx + Math.cos(rad) * cr * 0.4, sy = cy + Math.sin(rad) * cr * 0.4;
  const drift = (Math.random() - 0.5) * W * 0.3, spinTo = a + (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 200);
  const fall = svg.insert("g", ".pk-tip").style("pointer-events", "none")
    .attr("transform", `translate(${sx},${sy}) rotate(${a})`);
  fall.node().appendChild(node.querySelector(".blade").cloneNode(true));
  fall.transition().duration(1500 + Math.random() * 500).ease(d3.easeQuadIn)
    .attrTween("transform", () => k => {
      const x = sx + drift * k + Math.sin(k * 9) * 18 * k, y = sy + (H - sy + 60) * k;
      return `translate(${x},${y}) rotate(${a + (spinTo - a) * k}) scale(${1 - 0.25 * k})`;
    })
    .style("opacity", 0.2).remove();
  // loves me, loves me not
  const msg = remaining === 0 ? (lovesMe ? "Loves me!" : "Loves me not…") : (lovesMe ? "loves me" : "loves me not");
  say.interrupt().text(msg).attr("x", cx).attr("y", Math.max(18, cy - Lmax - 10)).attr("opacity", 0)
    .style("font-size", remaining === 0 ? "19px" : "15px").style("fill", lovesMe ? d3.color(colorOf(0)).darker(0.6) : ink)
    .transition().duration(200).attr("opacity", 1)
    .transition().delay(remaining === 0 ? 1600 : 650).duration(400).attr("opacity", 0);
  if (remaining === 0) ddplotTrack(d3.timeout(regrow, 2300));
}
// every petal grows back (clicking the centre also replays the bloom)
function regrow() {
  P.forEach(d => { d.plucked = false; d.s = 0; });
  plucked = 0;
  bloomT0 = pkNow();
}
