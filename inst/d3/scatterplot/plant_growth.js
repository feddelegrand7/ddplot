// plant_growth() -- a potted plant that grows with a level: a seed, a sprout,
// leaves, a bud and finally a flower that opens. It sways in the breeze.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const stemColor = o.stemColor || "#3ca951";
const potColor = o.potColor || "#c96f45";
const flowerColor = o.flowerColor || "#ff8ab7";
const soilColor = o.soilColor || "#5b3a29";
const potStroke = o.strokeColor || d3.color(potColor).darker(0.9).toString();
const strokeWidth = pkNum(o.strokeWidth, 1.5);
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const uid = pkUid("plant");
const STAGES = [[0.05, "Seed"], [0.25, "Sprout"], [0.6, "Growing"], [0.85, "Budding"], [1.01, "In bloom"]];
const stageOf = g => STAGES.find(s => g < s[0])[1];

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(level) + " grown");

// ---- layout ---------------------------------------------------------------------------
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabel = o.renderFillLabel !== false;
const labelFs = pkPx(o.labelFontSize, Math.max(16, Math.min(34, H * 0.065)));
const topSpace = showLabel ? labelFs + 30 : 10;
const bottomSpace = hasTitle ? titleFs + 20 : 8;
let pw = o.potWidth ? pkPx(o.potWidth, 100) : Math.min(150, W * 0.3, H * 0.26);
let ph = o.potHeight ? pkPx(o.potHeight, 40) : pw * 0.66;
const rimH = ph * 0.22;
// keep everything (with the open flower on top) inside the chart
const room = H - topSpace - bottomSpace - 14;
const flowerR = Math.max(8, Math.min(pw * 0.36, (room - ph) * 0.13));
let Hmax = o.plantMaxHeight ? pkPx(o.plantMaxHeight, 150) : room - ph - flowerR * 1.15;
if (Hmax + ph + flowerR * 1.15 > room) {
  const k = room / (Hmax + ph + flowerR * 1.15); Hmax *= k; ph *= k; pw *= Math.max(k, 0.6);
}
const bx = W / 2;
const by = topSpace + (room - Hmax - ph - flowerR * 1.15) / 2 + flowerR * 1.15 + Hmax + 6;   // soil level

// ---- defs -----------------------------------------------------------------------------
const defs = svg.append("defs");
const potG = defs.append("linearGradient").attr("id", uid + "p");
potG.append("stop").attr("offset", "0%").attr("stop-color", d3.color(potColor).brighter(0.35));
potG.append("stop").attr("offset", "45%").attr("stop-color", potColor);
potG.append("stop").attr("offset", "100%").attr("stop-color", d3.color(potColor).darker(0.6));
const leafG = defs.append("linearGradient").attr("id", uid + "l");
leafG.append("stop").attr("offset", "0%").attr("stop-color", d3.color(stemColor).darker(0.25));
leafG.append("stop").attr("offset", "100%").attr("stop-color", d3.color(stemColor).brighter(0.55));
const petG = defs.append("radialGradient").attr("id", uid + "f").attr("cx", "50%").attr("cy", "100%").attr("r", "100%");
petG.append("stop").attr("offset", "0%").attr("stop-color", pkMix(flowerColor, "#ffffff", 0.55));
petG.append("stop").attr("offset", "100%").attr("stop-color", flowerColor);
const shG = defs.append("radialGradient").attr("id", uid + "s");
shG.append("stop").attr("offset", "0%").attr("stop-color", "#000").attr("stop-opacity", 0.18);
shG.append("stop").attr("offset", "100%").attr("stop-color", "#000").attr("stop-opacity", 0);

// ---- static parts -------------------------------------------------------------------
const scene = svg.append("g");
scene.append("ellipse").attr("cx", bx).attr("cy", by + ph + 2).attr("rx", pw * 0.75).attr("ry", Math.max(4, pw * 0.08))
  .attr("fill", `url(#${uid}s)`);
const targetG = scene.append("g").style("pointer-events", "none");
const plantG = scene.append("g");
const stem = plantG.append("path").attr("fill", d3.color(stemColor).darker(0.15));
const leavesG = plantG.append("g");
const topG = plantG.append("g");
const seed = plantG.append("ellipse").attr("rx", Math.max(3, pw * 0.05)).attr("ry", Math.max(2, pw * 0.033))
  .attr("fill", "#8c6a43").attr("stroke", "#6b4f30").attr("stroke-width", 0.8);
// pot: body, soil, rim
const potTop = by + rimH * 0.4, potBot = by + ph;
const pwTop = pw * 0.92, pwBot = pw * 0.7;
const pot = scene.append("g");
pot.append("path").attr("d", `M${bx - pwTop / 2},${potTop} L${bx + pwTop / 2},${potTop} L${bx + pwBot / 2},${potBot - 4}` +
  ` Q${bx + pwBot / 2},${potBot} ${bx + pwBot / 2 - 4},${potBot} L${bx - pwBot / 2 + 4},${potBot} Q${bx - pwBot / 2},${potBot} ${bx - pwBot / 2},${potBot - 4} Z`)
  .attr("fill", `url(#${uid}p)`).attr("stroke", potStroke).attr("stroke-width", strokeWidth).attr("stroke-linejoin", "round");
pot.append("ellipse").attr("cx", bx).attr("cy", by).attr("rx", pw * 0.47).attr("ry", Math.max(3, rimH * 0.42))
  .attr("fill", soilColor);
pot.append("rect").attr("x", bx - pw / 2).attr("y", by - rimH * 0.15).attr("width", pw).attr("height", rimH)
  .attr("rx", Math.min(4, rimH / 3)).attr("fill", `url(#${uid}p)`).attr("stroke", potStroke).attr("stroke-width", strokeWidth);
pot.append("rect").attr("x", bx - pw / 2 + 3).attr("y", by - rimH * 0.15 + 2).attr("width", pw * 0.18).attr("height", Math.max(1, rimH - 4))
  .attr("rx", 2).attr("fill", "white").attr("fill-opacity", 0.22);
if (target !== null) {
  const ty = by - target * Hmax;
  targetG.append("line").attr("x1", bx - pw * 0.9).attr("x2", bx + pw * 0.9).attr("y1", ty).attr("y2", ty)
    .attr("stroke", labelColor).attr("stroke-width", 1.4).attr("stroke-dasharray", "5,4").attr("stroke-opacity", 0.6);
  targetG.append("text").attr("x", bx + pw * 0.9 + 6).attr("y", ty).attr("dy", "-0.15em")
    .style("font-size", "11px").style("fill", labelColor).style("fill-opacity", 0.7).text("Target");
  targetG.append("text").attr("x", bx + pw * 0.9 + 6).attr("y", ty).attr("dy", "1.05em")
    .style("font-size", "12px").style("font-weight", 700).style("fill", labelColor).text(pkPct(target));
}

let pctText = null, stageText = null;
if (showLabel) {
  const lt = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85).attr("text-anchor", "middle")
    .style("fill", labelColor).style("font-variant-numeric", "tabular-nums");
  pctText = lt.append("tspan").style("font-size", labelFs + "px").style("font-weight", 700);
  lt.append("tspan").attr("dx", 5).style("font-size", Math.max(11, labelFs * 0.45) + "px").style("fill-opacity", 0.6).text("grown");
  stageText = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85 + 18).attr("text-anchor", "middle")
    .style("font-size", "11.5px").style("font-weight", 700).style("letter-spacing", "0.06em")
    .style("fill", d3.color(stemColor).darker(0.6)).style("text-transform", "uppercase");
}
if (hasTitle) {
  svg.append("text").attr("x", W / 2).attr("y", potBot + 14 + titleFs * 0.8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", titleColor).style("fill-opacity", 0.8).text(o.titleText);
}

// ---- shapes ---------------------------------------------------------------------------
const leafD = L => `M0,0 C${L * 0.25},${-L * 0.34} ${L * 0.72},${-L * 0.3} ${L},0 C${L * 0.72},${L * 0.24} ${L * 0.25},${L * 0.22} 0,0Z`;
const LEAVES = [0.14, 0.27, 0.4, 0.52, 0.63, 0.73, 0.82].map((f, i) => ({ f, side: i % 2 ? 1 : -1 }));
const leafSel = leavesG.selectAll("g").data(LEAVES).enter().append("g");
leafSel.append("path").attr("class", "blade").attr("fill", `url(#${uid}l)`);
leafSel.append("path").attr("class", "rib").attr("fill", "none").attr("stroke", d3.color(stemColor).darker(0.7))
  .attr("stroke-opacity", 0.45).attr("stroke-width", 0.9);
const sepals = topG.append("g");
[-1, 1].forEach(s => sepals.append("path").attr("data-side", s).attr("fill", d3.color(stemColor).darker(0.1)));
const NP = 9;
const petals = topG.append("g");
const petalSel = petals.selectAll("ellipse").data(d3.range(NP)).enter().append("ellipse")
  .attr("fill", `url(#${uid}f)`).attr("stroke", d3.color(flowerColor).darker(0.5)).attr("stroke-opacity", 0.35)
  .attr("stroke-width", 0.8);
const centre = topG.append("circle").attr("fill", "#f6c445").attr("stroke", "#e09a1a").attr("stroke-width", 1);
const sprout = topG.append("g");
[-1, 1].forEach(s => sprout.append("path").attr("data-side", s).attr("fill", d3.color(stemColor).brighter(0.3)));

// ---- state & animation --------------------------------------------------------------
const st = pkState("plant");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
const sway = o.sway !== false && !pkCalm;
let wind = 0, windTo = 0, bounce = 0, lastNow = pkNow();

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  wind += (windTo - wind) * Math.min(1, dt * 3);
  bounce *= Math.exp(-dt * 2.5);
  const g = lv.get(now);
  draw(g, now);
  if (pctText) pctText.text(pkPct(g));
  if (stageText) stageText.text(stageOf(g));
});
loop.onVisible(() => {
  if (startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 2400 : 1200);
  }
});

function draw(g, now) {
  const h = g * Hmax;
  const amp = sway ? (0.035 + 0.11 * wind + 0.08 * bounce * Math.sin(now / 90)) : 0;
  const sw = Math.sin(now / 900) * 0.7 + Math.sin(now / 410 + 1) * 0.3;
  // the centre line of the stem
  const N = 22, P = [];
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    P.push([bx + h * 0.06 * Math.sin(Math.PI * 1.25 * s) + sw * amp * h * s * s, by - s * h]);
  }
  const w0 = Math.max(2.5, pw * 0.05) * Math.min(1, 0.35 + h / 60);
  const left = [], right = [];
  P.forEach((p, k) => {
    const a = P[Math.max(0, k - 1)], b = P[Math.min(N, k + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    const w = w0 * (1 - 0.6 * k / N) / 2;
    left.push([p[0] + nx * w, p[1] + ny * w]);
    right.push([p[0] - nx * w, p[1] - ny * w]);
  });
  const visible = h > 2;
  stem.style("display", visible ? null : "none")
    .attr("d", visible ? d3.line().curve(d3.curveCatmullRomClosed)(left.concat(right.reverse())) : null);
  seed.style("display", h < 10 ? null : "none").attr("cx", bx).attr("cy", by - 1)
    .attr("opacity", Math.max(0, 1 - h / 10));
  // a point on the stem at height y, and its angle
  const at = y => {
    const s = pkClamp(y / Math.max(h, 1e-6), 0, 1), f = s * N, k = Math.min(N - 1, Math.floor(f)), r = f - k;
    const p = [P[k][0] + (P[k + 1][0] - P[k][0]) * r, P[k][1] + (P[k + 1][1] - P[k][1]) * r];
    const ang = Math.atan2(P[k + 1][1] - P[k][1], P[k + 1][0] - P[k][0]) * 180 / Math.PI;
    return [p, ang];
  };
  // leaves appear once the stem has passed them, and keep growing for a while
  const Lbase = Math.max(10, Math.min(pw * 0.6, Hmax * 0.22));
  leafSel.each(function (d, i) {
    const y = d.f * Hmax;
    const grow = pkClamp((h - y - 4) / (Hmax * 0.16), 0, 1);
    const sel = d3.select(this);
    if (grow <= 0) { sel.style("display", "none"); return; }
    const [p, ang] = at(y);
    const L = Lbase * (1 - 0.45 * d.f) * d3.easeBackOut(grow);
    const flutter = sway ? Math.sin(now / (380 + i * 37) + i) * (3 + 9 * wind + 6 * bounce) : 0;
    // the stem points up (angle about -90): leaves leave it at 52 degrees
    sel.style("display", null)
      .attr("transform", `translate(${p[0]},${p[1]}) rotate(${ang + d.side * 52 + flutter}) scale(1,${d.side})`);
    sel.select(".blade").attr("d", leafD(L));
    sel.select(".rib").attr("d", `M0,0 Q${L * 0.5},${-L * 0.04} ${L * 0.9},0`);
  });
  // the top of the plant: sprout leaves, then a bud, then the flower
  const [tp, tang] = at(h);
  topG.attr("transform", `translate(${tp[0]},${tp[1]}) rotate(${tang + 90})`).style("display", h > 2 ? null : "none");
  const sproutK = pkClamp(1 - (g - 0.45) / 0.15, 0, 1) * pkClamp(h / 14, 0, 1);
  const sl = Math.max(6, Math.min(pw * 0.17, Hmax * 0.07));
  sprout.style("display", sproutK > 0.01 ? null : "none").selectAll("path").each(function () {
    const s = +this.getAttribute("data-side");
    d3.select(this).attr("d", leafD(sl * sproutK)).attr("transform", `rotate(${-90 + s * 55}) scale(1,${s})`);
  });
  const budK = pkClamp((g - 0.55) / 0.25, 0, 1);       // the bud forms
  const openK = d3.easeCubicInOut(pkClamp((g - 0.8) / 0.2, 0, 1));   // the flower opens
  petals.style("display", budK > 0 ? null : "none");
  const R = flowerR * (0.45 + 0.55 * budK) * (1 + 0.04 * Math.sin(now / 700) * openK);
  petalSel.each(function (i) {
    const fan = (i - (NP - 1) / 2) / ((NP - 1) / 2);   // -1..1
    const closedA = fan * 22, openA = i * 360 / NP;
    const a = closedA + (((openA - closedA + 540) % 360) - 180) * openK;
    const len = R * (0.55 + 0.45 * openK) * Math.sqrt(budK);
    const wid = R * (0.26 + 0.16 * openK) * Math.sqrt(budK);
    d3.select(this).attr("rx", wid).attr("ry", len / 2).attr("cx", 0).attr("cy", -len / 2 - R * 0.06)
      .attr("transform", `rotate(${a})`);
  });
  sepals.style("display", budK > 0 && openK < 0.98 ? null : "none").selectAll("path").each(function () {
    const s = +this.getAttribute("data-side");
    const L = R * 0.55 * budK * (1 - openK * 0.6);
    d3.select(this).attr("d", leafD(L)).attr("transform", `rotate(${-90 + s * 28}) scale(1,${s})`);
  });
  centre.style("display", openK > 0 ? null : "none").attr("r", R * 0.3 * openK);
}

function setLevel(v, instant) {
  lv.set(v, instant ? 150 : 700);
  st.level = v;
  svg.attr("aria-label", (o.titleText ? o.titleText + ": " : "") + pkPct(v) + " grown");
}

// ---- interactions -------------------------------------------------------------------
const hit = scene.append("rect").attr("x", bx - Math.max(pw, flowerR * 2.4) * 0.75).attr("y", by - Hmax - flowerR)
  .attr("width", Math.max(pw, flowerR * 2.4) * 1.5).attr("height", Hmax + flowerR + ph)
  .attr("fill", "transparent").style("cursor", "pointer");
hit.on("mouseenter", () => { windTo = 1; }).on("mouseleave", () => { windTo = 0; })
  .on("click", () => { water(); send("clicked", { value: lv.target(), stage: stageOf(lv.target()) }); });
if (o.draggable) {
  pkLevelInput(svg, hit, {
    yToLevel: y => (by - y) / Hmax,
    onLevel: setLevel,
    current: () => lv.target(),
    send
  });
}

// a watering can pours a few drops, and the plant perks up
let watering = false;
function water() {
  if (pkCalm || watering) return;
  watering = true;
  const cs = Math.max(0.6, pw / 110);
  const cx0 = bx - pw * 0.55 - 40 * cs, cy0 = Math.max(30 * cs, by - Math.max(60, pw * 0.9));
  const can = scene.append("g").style("pointer-events", "none").attr("opacity", 0)
    .attr("transform", `translate(${cx0},${cy0}) scale(${cs}) rotate(0)`);
  can.append("path").attr("d", "M-18,-10 L14,-10 L12,14 L-16,14 Z").attr("fill", "#9498a0");
  can.append("path").attr("d", "M14,-2 L36,-16 L38,-12 L16,4 Z").attr("fill", "#7d828a");
  can.append("path").attr("d", "M-14,-10 Q-2,-26 10,-10").attr("fill", "none").attr("stroke", "#7d828a").attr("stroke-width", 3.5);
  can.append("rect").attr("x", -18).attr("y", -2).attr("width", 32).attr("height", 4).attr("fill", "white").attr("fill-opacity", 0.25);
  can.transition().duration(300).attr("opacity", 1)
    .transition().duration(350).attr("transform", `translate(${cx0},${cy0}) scale(${cs}) rotate(28)`)
    .transition().delay(1100).duration(350).attr("transform", `translate(${cx0},${cy0}) scale(${cs}) rotate(0)`)
    .transition().duration(300).attr("opacity", 0).on("end", function () { d3.select(this).remove(); watering = false; });
  // the spout tip once the can is tilted
  const ang = 28 * Math.PI / 180;
  const sx = cx0 + cs * (37 * Math.cos(ang) + 14 * Math.sin(ang)), sy = cy0 + cs * (37 * Math.sin(ang) - 14 * Math.cos(ang));
  for (let k = 0; k < 16; k++) {
    const tx = bx - pw * 0.3 + Math.random() * pw * 0.45;
    scene.append("path").attr("d", "M0,-4 C2,-1 3,1 3,2.2 A3,3 0 0 1 -3,2.2 C-3,1 -2,-1 0,-4Z")
      .attr("fill", "#5aa9e6").attr("opacity", 0).style("pointer-events", "none")
      .attr("transform", `translate(${sx},${sy})`)
      .transition().delay(600 + k * 60).duration(0).attr("opacity", 0.9)
      .transition().duration(500 + Math.random() * 150).ease(d3.easeQuadIn)
      .attr("transform", `translate(${tx},${by - 2})`)
      .transition().duration(150).attr("opacity", 0).remove();
  }
  ddplotTrack(d3.timeout(() => { bounce = 1; sparkle(); }, 1250));
}
function sparkle() {
  const g = lv.get(pkNow()), y0 = by - g * Hmax;
  for (let k = 0; k < 7; k++) {
    const x = bx + (Math.random() - 0.5) * pw * 1.1, y = y0 + Math.random() * g * Hmax * 0.8;
    scene.append("path").attr("d", "M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5Z")
      .attr("fill", "#efb118").style("pointer-events", "none")
      .attr("transform", `translate(${x},${y}) scale(0)`)
      .transition().delay(k * 70).duration(380).attr("transform", `translate(${x},${y - 8}) scale(1)`)
      .transition().duration(420).attr("transform", `translate(${x},${y - 16}) scale(0)`).remove();
  }
}
