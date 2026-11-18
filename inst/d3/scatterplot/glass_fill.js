// glass_fill() -- a glass of water filled up to a level, with a moving surface,
// rising bubbles and water that sloshes when the mouse moves.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const fillColor = o.fillColor || "#5aa9e6";
const strokeColor = o.strokeColor || "#555555";
const strokeWidth = pkNum(o.strokeWidth, 2.5);
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const tw = pkMeasure(svg, font);
const uid = pkUid("glass");

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(level));

// ---- layout ---------------------------------------------------------------------------
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabel = o.renderFillLabel !== false;
const ticks = !!o.ticks;
const sideSpace = (target !== null || ticks) ? 64 : 12;
const availH = H - (hasTitle ? titleFs + 22 : 10) - 14;
let gh = o.glassHeight ? pkPx(o.glassHeight, 200) : Math.min(340, availH * 0.78);
let gw = o.glassWidth ? pkPx(o.glassWidth, 80) : gh * 0.64;
const labelFs = pkPx(o.labelFontSize, Math.max(16, Math.min(40, gw * 0.3)));
const labelSpace = showLabel ? labelFs + 16 : 0;
const fit = Math.min(1, (availH - labelSpace) / gh, (W - 2 * sideSpace - 10) / gw);
gh *= Math.max(0.2, fit); gw *= Math.max(0.2, fit);
const gx = (W - gw) / 2;
const gy = Math.max(8 + labelSpace, (H - (hasTitle ? titleFs + 22 : 10) - gh + labelSpace) / 2);

// the glass, in local coordinates (0,0 = top left of the rim)
const taper = gw * 0.1;           // the glass narrows towards the base
const wall = Math.max(2, gw * 0.035);
const base = Math.max(6, gh * 0.075);
const rimRy = Math.max(2, gw * 0.06);
const rad = gw * 0.07;
const cavTop = 0, cavBot = gh - base;
// x of the inner walls at height y
const leftIn = y => wall + taper * (y / gh);
const rightIn = y => gw - wall - taper * (y / gh);
const yOf = v => cavBot - v * (cavBot - gh * 0.035);

const outerD = `M0,0 L${taper - rad * 0.3},${gh - rad} Q${taper},${gh} ${taper + rad},${gh}` +
  ` L${gw - taper - rad},${gh} Q${gw - taper},${gh} ${gw - taper + rad * 0.3},${gh - rad} L${gw},0`;
const cavityD = `M${leftIn(0)},${-rimRy} L${leftIn(cavBot)},${cavBot - 2} Q${leftIn(cavBot)},${cavBot} ${leftIn(cavBot) + 3},${cavBot}` +
  ` L${rightIn(cavBot) - 3},${cavBot} Q${rightIn(cavBot)},${cavBot} ${rightIn(cavBot)},${cavBot - 2} L${rightIn(0)},${-rimRy} Z`;

// ---- defs -----------------------------------------------------------------------------
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "c").append("path").attr("d", cavityD);
const waterClip = defs.append("clipPath").attr("id", uid + "w").append("path");
const glassG = defs.append("linearGradient").attr("id", uid + "gl");
[[0, 0.16], [0.22, 0.03], [0.75, 0.03], [1, 0.14]].forEach(s =>
  glassG.append("stop").attr("offset", s[0]).attr("stop-color", strokeColor).attr("stop-opacity", s[1]));
const waterG = defs.append("linearGradient").attr("id", uid + "wg").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
waterG.append("stop").attr("offset", "0%").attr("stop-color", d3.color(fillColor).brighter(0.35));
waterG.append("stop").attr("offset", "100%").attr("stop-color", d3.color(fillColor).darker(0.45));
const sh = defs.append("radialGradient").attr("id", uid + "sh");
sh.append("stop").attr("offset", "0%").attr("stop-color", "#000").attr("stop-opacity", 0.16);
sh.append("stop").attr("offset", "100%").attr("stop-color", "#000").attr("stop-opacity", 0);

// ---- drawing --------------------------------------------------------------------------
const root = svg.append("g").attr("transform", `translate(${gx},${gy})`);
root.append("ellipse").attr("cx", gw / 2).attr("cy", gh + 3).attr("rx", gw * 0.62).attr("ry", Math.max(4, gw * 0.08))
  .attr("fill", `url(#${uid}sh)`);
root.append("path").attr("d", outerD + " Z").attr("fill", `url(#${uid}gl)`);
const water = root.append("g").attr("clip-path", `url(#${uid}c)`);
const backWave = water.append("path").attr("fill", pkMix(fillColor, "#ffffff", 0.45)).attr("fill-opacity", 0.8);
const frontWave = water.append("path").attr("fill", `url(#${uid}wg)`);
const bubbleG = root.append("g").attr("clip-path", `url(#${uid}w)`).style("pointer-events", "none");
// the thick glass base
root.append("path").attr("d", `M${taper * (cavBot / gh)},${cavBot} L${gw - taper * (cavBot / gh)},${cavBot} L${gw - taper},${gh} L${taper},${gh} Z`)
  .attr("fill", strokeColor).attr("fill-opacity", 0.1);
root.append("line").attr("x1", leftIn(cavBot)).attr("x2", rightIn(cavBot)).attr("y1", cavBot).attr("y2", cavBot)
  .attr("stroke", strokeColor).attr("stroke-opacity", 0.35).attr("stroke-width", 1);
// reflections
const refl = (x0, w0, op) => root.append("path").style("pointer-events", "none")
  .attr("d", `M${x0},${gh * 0.08} L${x0 + w0},${gh * 0.08} L${x0 + w0 + taper * 0.75},${gh * 0.86} L${x0 + taper * 0.75},${gh * 0.86} Z`)
  .attr("fill", "white").attr("fill-opacity", op);
refl(wall + gw * 0.07, gw * 0.07, 0.55);
refl(wall + gw * 0.17, gw * 0.025, 0.4);
root.append("path").attr("d", outerD).attr("fill", "none").attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth).attr("stroke-linejoin", "round").attr("stroke-opacity", 0.85);
root.append("ellipse").attr("cx", gw / 2).attr("cy", 0).attr("rx", gw / 2).attr("ry", rimRy)
  .attr("fill", "none").attr("stroke", strokeColor).attr("stroke-width", Math.max(1, strokeWidth * 0.7)).attr("stroke-opacity", 0.7);

// ticks (a measuring scale on the right)
if (ticks) {
  const tg = root.append("g").style("pointer-events", "none");
  [0.25, 0.5, 0.75, 1].forEach(v => {
    const y = yOf(v), x1 = rightIn(y) + wall + 2;
    tg.append("line").attr("x1", x1).attr("x2", x1 + 7).attr("y1", y).attr("y2", y)
      .attr("stroke", labelColor).attr("stroke-opacity", 0.45);
    tg.append("text").attr("x", x1 + 10).attr("y", y).attr("dy", "0.35em").style("font-size", "10px")
      .style("fill", labelColor).style("fill-opacity", 0.55).text(pkPct(v));
    root.append("line").attr("x1", rightIn(y) - gw * 0.12).attr("x2", rightIn(y) - 1).attr("y1", y).attr("y2", y)
      .attr("stroke", strokeColor).attr("stroke-opacity", 0.35).attr("stroke-width", 1).style("pointer-events", "none");
  });
}
// target
if (target !== null) {
  const y = yOf(target);
  const tg = root.append("g").style("pointer-events", "none");
  tg.append("line").attr("x1", -10).attr("x2", gw + 10).attr("y1", y).attr("y2", y)
    .attr("stroke", labelColor).attr("stroke-width", 1.4).attr("stroke-dasharray", "5,4").attr("stroke-opacity", 0.7);
  const lx = ticks ? -14 : gw + 14, anc = ticks ? "end" : "start";
  tg.append("text").attr("x", lx).attr("y", y).attr("dy", "-0.15em").attr("text-anchor", anc)
    .style("font-size", "11px").style("fill", labelColor).style("fill-opacity", 0.7).text("Target");
  tg.append("text").attr("x", lx).attr("y", y).attr("dy", "1.05em").attr("text-anchor", anc)
    .style("font-size", "12px").style("font-weight", 700).style("fill", labelColor).text(pkPct(target));
}

// the percentage above the glass
let pctText = null;
if (showLabel) {
  const lt = svg.append("text").attr("x", W / 2).attr("y", gy - rimRy - 12).attr("text-anchor", "middle")
    .style("fill", labelColor).style("font-variant-numeric", "tabular-nums");
  pctText = lt.append("tspan").style("font-size", labelFs + "px").style("font-weight", 700);
  lt.append("tspan").attr("dx", 5).style("font-size", Math.max(11, labelFs * 0.45) + "px")
    .style("fill-opacity", 0.6).text("full");
}
if (hasTitle) {
  svg.append("text").attr("x", W / 2).attr("y", gy + gh + 22 + titleFs * 0.8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", titleColor).style("fill-opacity", 0.8).text(o.titleText);
}

// ---- state & animation --------------------------------------------------------------
const st = pkState("glass");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
const waves = o.waves !== false && !pkCalm;
const bubbles = o.bubbles !== false && !pkCalm;
let tilt = 0, tiltV = 0, splash = 0, lastNow = pkNow(), lastMx = null;
const bub = [];

function surfaceD(v, now, phase, amp) {
  const y0 = yOf(v);
  const a = amp * (1 + splash * 2.2) * Math.min(1, v * 12, (1 - v) * 12 + 0.25);
  const lam = gw * 0.75;
  const p = [];
  for (let x = -2; x <= gw + 2; x += 3) {
    const y = y0 + tilt * (x - gw / 2) + a * Math.sin(2 * Math.PI * x / lam + now / 1000 * 2 + phase);
    p.push(x.toFixed(1) + "," + y.toFixed(1));
  }
  return "M" + p.join("L") + `L${gw + 2},${gh + 4}L-2,${gh + 4}Z`;
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  // a damped spring for the slosh
  tiltV += (-tilt * 60 - tiltV * 3.2) * dt;
  tilt = pkClamp(tilt + tiltV * dt, -0.35, 0.35);
  splash *= Math.exp(-dt * 1.6);
  const v = lv.get(now);
  const amp = waves ? Math.max(1.2, gw * 0.022) : 0;
  backWave.attr("d", surfaceD(v, now, 2.4, amp * 0.9));
  const fd = surfaceD(v, now * 1.2, 0, amp);
  frontWave.attr("d", fd);
  waterClip.attr("d", fd);
  if (pctText) pctText.text(pkPct(v));
  // bubbles rise from the base and pop at the surface
  if (bubbles && v > 0.04 && Math.random() < dt * (1.5 + 5 * v)) {
    bub.push({ x: leftIn(cavBot) + 4 + Math.random() * (rightIn(cavBot) - leftIn(cavBot) - 8), y: cavBot - 2,
      r: 0.8 + Math.random() * Math.max(1.5, gw * 0.025), sp: 18 + Math.random() * 30, ph: Math.random() * 6 });
  }
  const top = yOf(v) - 4;
  for (let k = bub.length - 1; k >= 0; k--) {
    const b = bub[k];
    b.y -= b.sp * dt * (1 + b.r * 0.15);
    if (b.y < top) bub.splice(k, 1);
  }
  const sel = bubbleG.selectAll("circle").data(bub);
  sel.exit().remove();
  sel.enter().append("circle").attr("fill", "white").attr("fill-opacity", 0.35).attr("stroke", "white")
    .attr("stroke-opacity", 0.8).attr("stroke-width", 0.8)
    .merge(sel).attr("r", b => b.r).attr("cy", b => b.y)
    .attr("cx", b => b.x + Math.sin(now / 300 + b.ph) * 1.5);
});
loop.onVisible(() => {
  if (startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 1700 : 900);
    tiltV += 0.25;
  }
});

function setLevel(v, instant) {
  const before = lv.target();
  lv.set(v, instant ? 120 : 500);
  st.level = v;
  if (!pkCalm) tiltV += (v > before ? 1 : -1) * 0.05;
  svg.attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(v));
}

// ---- interactions -------------------------------------------------------------------
// moving the mouse across the chart rocks the water
svg.on("mousemove.slosh", function (a) {
  const p = pkPtr(a, svg.node());
  if (lastMx !== null && !pkCalm) tiltV += pkClamp((p[0] - lastMx) * 0.0016, -0.08, 0.08);
  lastMx = p[0];
}).on("mouseleave.slosh", () => { lastMx = null; });

const hit = root.append("path").attr("d", outerD + " Z").attr("fill", "transparent").style("cursor", "pointer");
hit.on("click", function (a) {
  const p = pkPtr(a, root.node());
  drop(pkClamp(p[0], leftIn(0) + 6, rightIn(0) - 6));
  send("clicked", { value: lv.target() });
});
if (o.draggable) {
  pkLevelInput(svg, hit, {
    yToLevel: y => (cavBot - (y - gy)) / (cavBot - gh * 0.035),
    onLevel: setLevel,
    current: () => lv.target(),
    send
  });
}

// a drop falls into the glass and makes a splash
const dropD = "M0,-7 C3,-2 5,1 5,3.5 A5,5 0 0 1 -5,3.5 C-5,1 -3,-2 0,-7Z";
function drop(x) {
  if (pkCalm) return;
  const sy = yOf(lv.get(pkNow()));
  const d = root.append("path").attr("d", dropD).attr("fill", fillColor).style("pointer-events", "none")
    .attr("transform", `translate(${x},${-gy + 6}) scale(${Math.max(0.8, gw / 120)})`);
  d.transition().duration(Math.max(250, (sy + gy) * 1.4)).ease(d3.easeQuadIn)
    .attr("transform", `translate(${x},${sy}) scale(${Math.max(0.8, gw / 120)})`)
    .on("end", function () {
      d3.select(this).remove();
      splash = Math.min(1.5, splash + 0.8);
      tiltV += (x - gw / 2) / gw * 0.3;
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + (k - 2) * 0.45;
        root.append("circle").attr("cx", x).attr("cy", sy).attr("r", 1.8).attr("fill", fillColor)
          .style("pointer-events", "none")
          .transition().duration(420).ease(d3.easeQuadOut)
          .attr("cx", x + Math.cos(ang) * gw * 0.13).attr("cy", sy + Math.sin(ang) * gw * 0.16)
          .attr("r", 0.5).style("opacity", 0).remove();
      }
    });
}
