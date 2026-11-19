// muscle_growth() -- a sailor flexing both arms whose biceps grow with a level,
// from flat, skinny arms (0) to giant biceps (1). The face strains at low levels
// (squeezed eyes, gritted teeth, a red face and sweat) and grins at high ones;
// veins and sparkles show on the biggest arms. The eyes follow the mouse and a
// click makes the sailor flex harder.
// Uses playkit.js (prepended by play_script()).

const o = options || {};
const W = width, H = height;
const font = o.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = o.bgcol || "white";
const skinColor = o.skinColor || "#e8b48f";
const hairColor = o.hairColor || "#3b2a20";
const shirtColor = o.shirtColor || "#2a62b8";
const panelColor = o.panelColor || null;
const labelColor = o.labelColor || "#333333";
const titleColor = o.titleColor || "#333333";
const level = pkClamp(pkNum(o.level, 0), 0, 1);
const target = pkNum(o.target, null);
const send = pkShiny(svg);
const uid = pkUid("muscle");
const tw = pkMeasure(svg, font);
const STAGES = [[0.05, "Noodle arms"], [0.25, "Twigs"], [0.5, "Toned"], [0.75, "Strong"],
  [0.95, "Buff"], [1.01, "Mighty"]];
const stageOf = g => (STAGES.find(s => g < s[0]) || STAGES[STAGES.length - 1])[1];
const QUOTES = [[0.15, "Hnnngh!"], [0.4, "Ahoy!"], [0.7, "Feel that!"], [0.9, "Rock solid!"], [1.01, "Unstoppable!"]];
const quoteOf = g => (QUOTES.find(q => g < q[0]) || QUOTES[QUOTES.length - 1])[1];
const ariaOf = v => (o.titleText ? o.titleText + ": " : "") + pkPct(v) + " power, " + stageOf(v);
const ramp = (v, a, b) => pkClamp((v - a) / (b - a), 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;

svg.style("background-color", bgcol).style("font-family", font)
  .attr("role", "img").attr("aria-label", ariaOf(level));

// ---- layout ---------------------------------------------------------------------------
// Drawn in its own units (the head is about 75 units wide) inside a 340 x 268
// card wide enough for both arms fully flexed, scaled to fit the chart.
const titleFs = pkPx(o.titleFontSize, 14);
const hasTitle = !!o.titleText;
const showLabel = o.renderFillLabel !== false;
const labelFs = pkPx(o.labelFontSize, Math.max(16, Math.min(34, H * 0.065)));
const topSpace = showLabel ? labelFs + 34 : 8;
const bottomSpace = hasTitle ? titleFs + 20 : 8;
const CX0 = -170, CY0 = -118, CW = 340, CH = 268;
const s = Math.max(0.1, Math.min((W - 16) / CW, (H - topSpace - bottomSpace - 6) / CH));
const X0 = W / 2 - (CX0 + CW / 2) * s;
const Y0 = topSpace + (H - topSpace - bottomSpace - CH * s) / 2 - CY0 * s;
const toScreen = (x, y) => [X0 + x * s, Y0 + y * s];

// ---- the shape of an arm ---------------------------------------------------------------
// Each arm is drawn in its own frame: the upper arm runs from the shoulder (0,0)
// along +x to the elbow (UPPER,0) and the forearm goes up from the elbow. The
// biceps is a bulge on top of the upper arm that rises gently from the shoulder,
// peaks nearer the elbow and drops round towards it; it is flat at 0.
const UPPER = 82, FORE = 70;
const BX1 = 12, BX2 = UPPER - 8, BL = BX2 - BX1, BPEAK = BX1 + 0.56 * BL;
const upperT = g => lerp(13, 24, g);       // thickness of the upper arm
const foreT = g => lerp(12, 21, g);        // thickness of the forearm
const fistR = g => lerp(10, 17, g);
const bicepH = g => 38 * Math.pow(g, 1.1); // height of the biceps above the arm
function bicepPath(g, pump) {
  const y0 = -upperT(g) / 2 + 1.5, h = Math.max(0.01, bicepH(g) * (1 + pump));
  return `M${BX1 - 4},${y0} C${BX1 + 0.12 * BL},${y0} ${BX1 + 0.16 * BL},${y0 - h} ${BPEAK},${y0 - h}` +
    ` C${BX1 + 0.9 * BL},${y0 - h} ${BX2 + 3},${y0 - 0.5 * h} ${BX2},${y0 + 2} Z`;
}
// a point near the top of the biceps at angle t (0 = elbow end, PI = shoulder end)
function bicepAt(g, pump, t) {
  const y0 = -upperT(g) / 2 + 1.5, h = bicepH(g) * (1 + pump);
  const rx = Math.cos(t) > 0 ? BX2 - BPEAK : BPEAK - BX1;
  return [BPEAK + rx * Math.cos(t), y0 - h * Math.sin(t)];
}

// ---- colours & defs ---------------------------------------------------------------------
const skinDark = d3.color(skinColor).darker(0.35).toString();
const skinDeep = d3.color(skinColor).darker(1).toString();
const skinLight = pkMix(skinColor, "#ffffff", 0.45);
const hairDark = d3.color(hairColor).darker(0.4).toString();
const shirtBase = pkMix(shirtColor, "#ffffff", 0.93);
const inkColor = "#2c4f86";
const scarfColor = "#d9363e";
const defs = svg.append("defs");
defs.append("clipPath").attr("id", uid + "card").append("rect")
  .attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("rx", 22);
const tankClip = defs.append("clipPath").attr("id", uid + "tank").append("path");

// ---- drawing --------------------------------------------------------------------------
const scene = svg.append("g").attr("transform", `translate(${X0},${Y0}) scale(${s})`);
const card = scene.append("g").attr("clip-path", `url(#${uid}card)`);
if (panelColor) {
  card.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH).attr("fill", panelColor);
}
// the sea and two gulls far away
const sea = card.append("g").style("pointer-events", "none");
const waves = [118, 134].map((y, i) => sea.append("path").attr("fill", "none").attr("stroke", "white")
  .attr("stroke-opacity", 0.75 - i * 0.2).attr("stroke-width", 2.4).attr("stroke-linecap", "round")
  .attr("d", d3.range(-200, 200, 24).map((x, j) => (j ? "q6,-6 12,0 t12,0" : `M${x},${y} q6,-6 12,0 t12,0`)).join(" ")));
const gulls = [[-128, -86, 1], [-102, -70, 0.75], [118, -60, 0.85]].map(p => sea.append("path").attr("fill", "none")
  .attr("stroke", "#5b6b7c").attr("stroke-opacity", 0.55).attr("stroke-width", 1.6).attr("stroke-linecap", "round")
  .attr("stroke-linejoin", "round").datum(p));
const person = card.append("g");

// both arms (drawn before the body so that the top covers their roots)
function makeArm(side, decal) {
  const root = person.append("g");
  const upper = root.append("g");
  const upShade = upper.append("line").attr("x1", 0).attr("y1", 1.5).attr("x2", UPPER).attr("y2", 1.5)
    .attr("stroke", skinDark).attr("stroke-linecap", "round");
  const upSkin = upper.append("line").attr("x1", 0).attr("y1", 0).attr("x2", UPPER).attr("y2", 0)
    .attr("stroke", skinColor).attr("stroke-linecap", "round");
  const delt = upper.append("circle").attr("fill", skinColor);
  const fore = upper.append("g");
  const foShade = fore.append("line").attr("x1", 1.5).attr("y1", 0).attr("x2", 1.5)
    .attr("stroke", skinDark).attr("stroke-linecap", "round");
  const foSkin = fore.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0)
    .attr("stroke", skinColor).attr("stroke-linecap", "round");
  const vein = fore.append("path").attr("fill", "none").attr("stroke", skinDeep).attr("stroke-width", 1.3)
    .attr("stroke-linecap", "round");
  const fist = fore.append("g");
  fist.append("circle").attr("r", 1).attr("fill", skinColor);
  const knuckles = fist.append("path").attr("fill", "none").attr("stroke", skinDeep).attr("stroke-opacity", 0.55)
    .attr("stroke-width", 1.2).attr("stroke-linecap", "round");
  const bicep = upper.append("path").attr("fill", skinColor);
  const shine = upper.append("path").attr("fill", "none").attr("stroke", skinLight).attr("stroke-width", 3)
    .attr("stroke-linecap", "round");
  const crease = upper.append("path").attr("fill", "none").attr("stroke", skinDeep).attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.4).attr("stroke-linecap", "round");
  const tattoo = upper.append("g").style("display", o.tattoos === false ? "none" : null);
  if (decal === "anchor") {
    tattoo.append("path").attr("fill", "none").attr("stroke", inkColor).attr("stroke-width", 1.7)
      .attr("stroke-linecap", "round").attr("d", "M0,-5 V7 M-4,-2 H4 M-7,2.5 Q-6,8 0,8 Q6,8 7,2.5");
    tattoo.append("circle").attr("cy", -7).attr("r", 2).attr("fill", "none").attr("stroke", inkColor).attr("stroke-width", 1.5);
  } else {
    tattoo.append("path").attr("fill", scarfColor).attr("fill-opacity", 0.85).attr("stroke", inkColor).attr("stroke-width", 1.1)
      .attr("d", "M0,6 C-9,0 -8,-7 -3.5,-7 C-1.5,-7 0,-5.5 0,-4 C0,-5.5 1.5,-7 3.5,-7 C8,-7 9,0 0,6Z");
  }
  const ghostArm = upper.append("path").attr("fill", "none").attr("stroke", labelColor).attr("stroke-opacity", 0.55)
    .attr("stroke-width", 1.6 / s).attr("stroke-dasharray", `${6 / s},${4 / s}`).style("pointer-events", "none");
  const sparks = upper.append("g").style("pointer-events", "none");
  const starD = "M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4Z";
  const stars = [[0.35, 1], [1.05, 0.7], [1.75, 0.85]].map(p => sparks.append("path").attr("d", starD)
    .attr("fill", "#ffd84d").datum(p));
  const pow = sparks.append("path").attr("fill", "none").attr("stroke", labelColor).attr("stroke-opacity", 0.5)
    .attr("stroke-width", 2).attr("stroke-linecap", "round");
  if (target !== null && target > 0.02) ghostArm.attr("d", bicepPath(target, 0));
  else ghostArm.remove();

  return function update(g, sx, sy, rU, rF, pump, now, flash) {
    const tU = upperT(g), tF = foreT(g), rf = fistR(g);
    root.attr("transform", `translate(${side * sx},${sy}) scale(${side},1)`);
    upper.attr("transform", `rotate(${rU})`);
    upShade.attr("stroke-width", tU);
    upSkin.attr("stroke-width", tU - 3);
    delt.attr("r", lerp(9, 16, g));
    fore.attr("transform", `translate(${UPPER},0) rotate(${rF})`);
    foShade.attr("y2", -FORE).attr("stroke-width", tF);
    foSkin.attr("y2", -FORE).attr("stroke-width", tF - 3);
    const vk = ramp(g, 0.75, 0.95);
    vein.style("display", vk > 0 ? null : "none").attr("stroke-opacity", 0.35 * vk)
      .attr("d", `M-2,-12 q3,-8 0,-15 t1,-16 M-1,-32 q-3,-4 -2,-10`);
    fist.attr("transform", `translate(-1,${-FORE - 2})`).select("circle").attr("r", rf);
    knuckles.attr("d", [-0.45, 0, 0.45].map(k => `M${-rf * 0.95},${k * rf} L${-rf * 0.35},${k * rf}`).join(" "));
    // the biceps
    bicep.attr("d", bicepPath(g, pump));
    const sk = ramp(g, 0.2, 0.45);
    const p1 = bicepAt(g, pump, 2.2), p2 = bicepAt(g, pump, 1.75), p3 = bicepAt(g, pump, 1.35);
    shine.style("display", sk > 0 ? null : "none").attr("stroke-opacity", 0.55 * sk)
      .attr("d", `M${p1[0] + 3},${p1[1] + 4} Q${p2[0] + 1},${p2[1] + 5} ${p3[0]},${p3[1] + 4.5}`);
    const ck = ramp(g, 0.3, 0.6);
    crease.style("display", ck > 0 ? null : "none")
      .attr("d", `M${BX2 - 4},${-tU / 2 + 2} q4,${4 + 4 * g} 10,${3 * g}`).attr("stroke-opacity", 0.4 * ck);
    const top = bicepAt(g, pump, Math.PI / 2);
    const cy = lerp(0, top[1] * 0.45 + (-tU / 2) * 0.55, ramp(g, 0, 0.35));
    tattoo.attr("transform", `translate(${top[0]},${cy}) scale(${lerp(0.55, 1.35, g) * (1 + pump * 0.6)},${lerp(0.45, 1.45, g) * (1 + pump)})`);
    // sparkles on the biggest arms (and on a flex)
    const glow = Math.max(o.sparkles === false ? 0 : ramp(g, 0.85, 0.97), flash);
    sparks.style("display", glow > 0 ? null : "none");
    stars.forEach(st => {
      const [t, k] = st.datum();
      const [x, y] = bicepAt(g, pump, t);
      const tw2 = pkCalm ? 1 : 0.55 + 0.45 * Math.sin(now / 260 + t * 4);
      st.attr("transform", `translate(${x + Math.cos(t) * 10},${y - 9 - Math.sin(t) * 4}) scale(${glow * k * tw2})`);
    });
    const [px, py] = bicepAt(g, pump, Math.PI / 2);
    pow.style("display", flash > 0 ? null : "none").attr("stroke-opacity", 0.5 * flash)
      .attr("d", [-0.6, 0, 0.6].map(a => {
        const c = Math.sin(a), d = Math.cos(a);
        return `M${px + c * 14},${py - 6 - d * 8} L${px + c * 24},${py - 6 - d * 16}`;
      }).join(" "));
  };
}
const armR = makeArm(1, "anchor");
const armL = makeArm(-1, "heart");

// the body: skin, a striped tank top and a neckerchief
const neck = person.append("rect").attr("x", -14).attr("y", -10).attr("width", 28).attr("height", 34).attr("fill", skinDark);
const torso = person.append("path").attr("fill", skinColor);
const tank = person.append("path").attr("fill", shirtBase);
const stripes = person.append("g").attr("clip-path", `url(#${uid}tank)`);
d3.range(40, 200, 13).forEach(y => stripes.append("rect").attr("x", -120).attr("y", y).attr("width", 240).attr("height", 6)
  .attr("fill", shirtColor));
const pecs = person.append("path").attr("fill", "none").attr("stroke", shirtColor).attr("stroke-width", 2.2)
  .attr("stroke-linecap", "round");
person.append("path").attr("fill", scarfColor).attr("d", "M-17,15 Q0,31 17,15 L13,24 Q0,40 -13,24 Z");
person.append("path").attr("fill", d3.color(scarfColor).darker(0.4).toString()).attr("d", "M-3,30 L-11,52 L-2,47 L0,33 L2,47 L11,52 L3,30 Z");
person.append("circle").attr("cy", 30).attr("r", 5).attr("fill", scarfColor);

// the head (front view): big jaw, stubble, a handlebar moustache and a sailor cap
const head = person.append("g");
[-1, 1].forEach(k => head.append("ellipse").attr("cx", 36 * k).attr("cy", -50).attr("rx", 6.5).attr("ry", 10).attr("fill", skinDark));
const headD = "M-34,-64 C-34,-96 34,-96 34,-64 L37,-28 C38,-6 20,6 0,6 C-20,6 -38,-6 -37,-28 Z";
head.append("path").attr("d", headD).attr("fill", skinColor);
head.append("path").attr("fill", skinDeep).attr("fill-opacity", 0.16)
  .attr("d", "M-37,-30 C-38,-6 -20,6 0,6 C20,6 38,-6 37,-30 C30,-14 18,-20 0,-20 C-18,-20 -30,-14 -37,-30 Z");
[-1, 1].forEach(k => head.append("path").attr("fill", hairColor)
  .attr("d", `M${35 * k},-79 L${27 * k},-80 L${28 * k},-61 L${34.5 * k},-58 Z`));
const cheeks = [-1, 1].map(k => head.append("ellipse").attr("cx", 21 * k).attr("cy", -36).attr("rx", 8).attr("ry", 5)
  .attr("fill", "#ff5a4f"));
const flush = head.append("path").attr("d", headD).attr("fill", "#ff5a4f");
const eyes = [-1, 1].map(k => {
  const e = head.append("g");
  e.append("ellipse").attr("rx", 3.4).attr("ry", 4.4).attr("fill", "#221a16");
  e.append("circle").attr("cx", 1.1).attr("cy", -1.6).attr("r", 1.1).attr("fill", "white").attr("fill-opacity", 0.9);
  return e;
});
const brows = [-1, 1].map(() => head.append("path").attr("fill", "none").attr("stroke", hairColor).attr("stroke-width", 4.2)
  .attr("stroke-linecap", "round"));
head.append("ellipse").attr("cy", -42).attr("rx", 8).attr("ry", 7).attr("fill", skinDark);
head.append("circle").attr("cx", -2.5).attr("cy", -44.5).attr("r", 2.2).attr("fill", "white").attr("fill-opacity", 0.35);
const grin = head.append("g");
grin.append("path").attr("fill", "#5a2a22").attr("d", "M-13,-26 Q0,-9 13,-26 Q0,-22 -13,-26 Z");
grin.append("path").attr("fill", "white").attr("d", "M-11,-25.3 Q0,-21.6 11,-25.3 L10,-22.6 Q0,-19.6 -10,-22.6 Z");
const strain = head.append("g");
strain.append("rect").attr("x", -9).attr("y", -29).attr("width", 18).attr("height", 7.5).attr("rx", 2)
  .attr("fill", "white").attr("stroke", "#5a2a22").attr("stroke-width", 1.3);
strain.append("path").attr("d", "M-9,-25.25 H9 M-3,-29 V-21.5 M3,-29 V-21.5").attr("stroke", "#5a2a22").attr("stroke-width", 1);
const mouth = head.append("path").attr("fill", "none").attr("stroke", "#5a2a22").attr("stroke-width", 2.2).attr("stroke-linecap", "round");
const tache = head.append("g");
const tacheD = "M0,-37.5 C-6,-40 -13,-40 -19,-36.5 C-23,-34.5 -27,-35 -28,-39 C-28.5,-41 -26.5,-42.5 -25,-41.5" +
  " C-26,-39.5 -24.5,-37.5 -22,-38 C-24,-34 -26,-31 -19,-31 C-12,-31 -5,-32 0,-33 Z";
[-1, 1].forEach(k => tache.append("path").attr("d", tacheD).attr("fill", hairColor).attr("transform", `scale(${k},1)`));
tache.append("path").attr("d", "M-16,-35.5 C-10,-37 -5,-37 0,-35.5 C5,-37 10,-37 16,-35.5").attr("fill", "none")
  .attr("stroke", hairDark).attr("stroke-opacity", 0.5).attr("stroke-width", 1.1);
const sweat = [[-27, -70], [29, -66]].map(p => head.append("path")
  .attr("d", "M0,-5 C2.4,-1.5 3.6,1 3.6,2.6 A3.6,3.6 0 0 1 -3.6,2.6 C-3.6,1 -2.4,-1.5 0,-5Z")
  .attr("fill", "#8fd0ff").attr("stroke", "#4aa3df").attr("stroke-width", 0.8).datum(p));
const cap = head.append("g");
cap.append("path").attr("fill", "#ffffff").attr("d", "M-27,-80 C-28,-108 28,-108 27,-80 Z");
cap.append("path").attr("fill", "none").attr("stroke", "#c9d3de").attr("stroke-width", 1.4)
  .attr("d", "M-14,-82 C-15,-98 -6,-104 0,-104 M14,-82 C15,-98 6,-104 0,-104");
cap.append("rect").attr("x", -34).attr("y", -86).attr("width", 68).attr("height", 11).attr("rx", 5.5)
  .attr("fill", "#f1f4f8").attr("stroke", "#c9d3de").attr("stroke-width", 1.2);
cap.append("rect").attr("x", -30).attr("y", -82).attr("width", 60).attr("height", 2.4).attr("fill", shirtColor).attr("fill-opacity", 0.7);

// ---- labels ---------------------------------------------------------------------------------
let pctText = null, stageText = null;
if (showLabel) {
  const lt = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85).attr("text-anchor", "middle")
    .style("fill", labelColor).style("font-variant-numeric", "tabular-nums");
  pctText = lt.append("tspan").style("font-size", labelFs + "px").style("font-weight", 700);
  lt.append("tspan").attr("dx", 5).style("font-size", Math.max(11, labelFs * 0.45) + "px").style("fill-opacity", 0.6).text("power");
  stageText = svg.append("text").attr("x", W / 2).attr("y", 8 + labelFs * 0.85 + 19).attr("text-anchor", "middle")
    .style("font-size", "11.5px").style("font-weight", 700).style("letter-spacing", "0.06em")
    .style("fill", labelColor).style("fill-opacity", 0.65).style("text-transform", "uppercase");
}
if (hasTitle) {
  svg.append("text").attr("x", W / 2).attr("y", Y0 + (CY0 + CH) * s + 14 + titleFs * 0.8).attr("text-anchor", "middle")
    .style("font-size", titleFs + "px").style("fill", titleColor).style("fill-opacity", 0.8).text(o.titleText);
}
if (target !== null) {
  const [tx, ty] = toScreen(CX0 + CW - 12, CY0 + 10);
  const tg = svg.append("g").attr("transform", `translate(${tx},${ty})`).style("pointer-events", "none");
  tg.append("text").attr("text-anchor", "end").attr("dy", "0.9em").style("font-size", "11px")
    .style("fill", labelColor).style("fill-opacity", 0.75).text("Target");
  tg.append("text").attr("text-anchor", "end").attr("dy", "2.15em").style("font-size", "12px")
    .style("font-weight", 700).style("fill", labelColor).text(pkPct(target));
}

// ---- state & animation --------------------------------------------------------------
const st = pkState("muscle");
const startFrom = (st.level !== undefined) ? st.level : (o.animate === false ? level : 0);
const lv = pkTween(startFrom);
st.level = level;
const swayOn = o.sway !== false && !pkCalm;
let lastNow = pkNow();
let pump = 0, pumpV = 0;           // a flex makes the biceps swell like a spring
let flash = 0;                     // sparkles and lines after a flex (1..0)
let hopY = 0, hopV = 0;            // the cap jumps
let look = [0, 0], lookTo = [0, 0];
let nextBlink = lastNow + 1800 + Math.random() * 2500, blinkUntil = 0;

function draw(g, now) {
  const breath = swayOn ? Math.sin(now / 950) : 0;
  person.attr("transform", `translate(0,${breath * 0.8})`);
  // weak arms tremble with the effort; strong ones hold still
  const shake = swayOn ? (1 - ramp(g, 0, 0.3)) * 1.6 * Math.sin(now / 38) : 0;
  const sx = lerp(42, 52, g), sy = 26;
  const rU = lerp(10, -6, g) + shake - pump * 10;
  const rF = lerp(14, -8, g) - rU - pump * 14 - shake * 0.6;
  armR(g, sx, sy, rU, rF, pump, now, flash);
  armL(g, sx, sy, rU, rF, pump, now, flash);
  // a V-shaped body for the strongest
  const w = lerp(40, 37, g);
  const torsoD = `M-14,14 C-26,18 ${-sx + 8},18 ${-sx},${sy + 2} C${-sx - 6},${sy + 30} ${-sx + 2},90 ${-w},200` +
    ` L${w},200 C${sx - 2},90 ${sx + 6},${sy + 30} ${sx},${sy + 2} C${sx - 8},18 26,18 14,14 Z`;
  torso.attr("d", torsoD);
  const tankD = `M-23,16 L-13,16 Q0,42 13,16 L23,16 C25,34 ${sx - 16},42 ${sx - 9},58 C${sx - 4},90 ${w + 4},140 ${w},200` +
    ` L${-w},200 C${-w - 4},140 ${-sx + 4},90 ${-sx + 9},58 C${-sx + 16},42 -25,34 -23,16 Z`;
  tank.attr("d", tankD);
  tankClip.attr("d", tankD);
  const pk = ramp(g, 0.45, 0.85);
  pecs.style("display", pk > 0 ? null : "none").attr("stroke-opacity", 0.5 * pk)
    .attr("d", `M${-sx + 14},${70 + 4 * g} Q-18,${80 + 6 * g} -3,${68 + 3 * g} M${sx - 14},${70 + 4 * g} Q18,${80 + 6 * g} 3,${68 + 3 * g}`);
  // the face: straining when weak, grinning when strong
  const worry = 1 - ramp(g, 0.05, 0.4), conf = ramp(g, 0.5, 1);
  brows[0].attr("d", `M-21,${-63 - conf * 2} Q-14,${-67 - conf * 2 - worry} -6,${-64 - worry * 4 + conf * 1.5}`);
  brows[1].attr("d", `M21,${-63 - conf * 5} Q14,${-67 - conf * 5 - worry} 6,${-64 - worry * 4 + conf * 1.5}`);
  const squeeze = lerp(0.22, 1, ramp(g, 0.03, 0.3)) * (now < blinkUntil ? 0.12 : 1);
  eyes.forEach((e, i) => e.attr("transform", `translate(${(i ? 13 : -13) + look[0]},${-53 + look[1]}) scale(1,${squeeze})`));
  cheeks.forEach(c => c.attr("fill-opacity", 0.12 + 0.3 * worry));
  flush.attr("fill-opacity", 0.16 * worry * (swayOn ? 0.8 + 0.2 * Math.sin(now / 300) : 1));
  const gk = ramp(g, 0.5, 0.8), sk = 1 - ramp(g, 0.1, 0.25);
  grin.style("display", gk > 0 ? null : "none").style("opacity", gk);
  strain.style("display", sk > 0 ? null : "none").style("opacity", sk);
  const mk = pkClamp(1 - gk - sk, 0, 1);
  mouth.style("display", mk > 0 ? null : "none").attr("stroke-opacity", mk)
    .attr("d", `M-9,-26 Q0,${-26 + 4 * ramp(g, 0.2, 0.5)} 9,-26`);
  tache.attr("transform", `translate(0,${-1.5 * conf})`);
  const sp = swayOn ? (now / 1800) % 1 : 0.3;
  sweat.forEach((d, i) => {
    const [x, y] = d.datum(), ph = (sp + i * 0.5) % 1;
    d.style("display", worry > 0.3 ? null : "none")
      .attr("transform", `translate(${x},${y + ph * 18}) scale(${worry})`).style("opacity", worry * (1 - Math.pow(ph, 3)));
  });
  cap.attr("transform", `translate(0,${hopY}) rotate(${-6 + hopY * 0.5},0,-84)`);
  // the sea
  waves.forEach((wv, i) => wv.attr("transform", `translate(${swayOn ? ((now / (60 + i * 25)) % 24) * (i ? -1 : 1) : 0},0)`));
  gulls.forEach(gl => {
    const [x, y, k] = gl.datum(), f = swayOn ? Math.sin(now / 260 + x) : 0, dx = swayOn ? Math.sin(now / 4000 + y) * 8 : 0;
    gl.attr("d", `M${x + dx - 7 * k},${y - (2 + 2 * f) * k} Q${x + dx - 3 * k},${y - 4 * k} ${x + dx},${y}` +
      ` Q${x + dx + 3 * k},${y - 4 * k} ${x + dx + 7 * k},${y - (2 + 2 * f) * k}`);
  });
}

const loop = pkLoop(svg, now => {
  const dt = Math.min(50, now - lastNow) / 1000; lastNow = now;
  pumpV += (-pump * 120 - pumpV * 9) * dt;
  pump = pkClamp(pump + pumpV * dt, -0.3, 0.6);
  hopV += (-hopY * 220 - hopV * 9) * dt;
  hopY = pkClamp(hopY + hopV * dt, -30, 10);
  if (flash > 0) flash = Math.max(0, flash - dt * 1.1);
  look[0] += (lookTo[0] - look[0]) * Math.min(1, dt * 10);
  look[1] += (lookTo[1] - look[1]) * Math.min(1, dt * 10);
  if (!pkCalm && now > nextBlink) { blinkUntil = now + 130; nextBlink = now + 2200 + Math.random() * 3500; }
  // the springy ease overshoots a little: draw the overshoot, but not in the labels
  const g = pkClamp(lv.get(now), 0, 1.08), gl = Math.min(1, g);
  draw(g, now);
  if (pctText) pctText.text(pkPct(gl));
  if (stageText) stageText.text(stageOf(gl));
});

function flex(strength) {
  if (pkCalm) return;
  pumpV += 9 * strength;
  hopV -= 160 * strength * lv.target();
}
loop.onVisible(() => {
  if (startFrom !== level) {
    lv.set(startFrom, 0);
    lv.set(level, startFrom === 0 ? 2400 : 1100, d3.easeBackOut);
    ddplotTrack(d3.timeout(() => { flex(0.8); flash = Math.max(flash, ramp(level, 0.6, 0.9)); }, startFrom === 0 ? 2300 : 1000));
  }
});

function setLevel(v, instant) {
  const before = lv.target();
  lv.set(v, instant ? 150 : 700, instant ? d3.easeCubicOut : d3.easeBackOut);
  st.level = v;
  if (!instant && v > before) flex(0.5);
  svg.attr("aria-label", ariaOf(v));
}

// ---- interactions -------------------------------------------------------------------
// the eyes follow the mouse
svg.on("mousemove.eyes", function (a) {
  const p = pkPtr(a, svg.node());
  const [ex, ey] = toScreen(0, -53);
  const dx = (p[0] - ex) / s, dy = (p[1] - ey) / s;
  const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 60) * 1.8;
  lookTo = [dx / len * k, dy / len * k];
}).on("mouseleave.eyes", () => { lookTo = [0, 0]; });

// a speech bubble above the head
let bubble = null;
function shout(text) {
  if (bubble) bubble.remove();
  const fs = Math.max(11, Math.min(15, 13 * s));
  const w = tw(text, fs, 700) + 20, h = fs + 14;
  const [bx, by] = toScreen(62, -112);
  bubble = svg.append("g").style("pointer-events", "none").attr("transform", `translate(${bx},${by})`).style("opacity", 0);
  const [mx, my] = toScreen(26, -84);
  const ax = Math.max(-w / 2 + 12, -18);
  bubble.append("path").attr("fill", "white").attr("stroke", labelColor).attr("stroke-opacity", 0.25)
    .attr("d", `M${-w / 2 + 10},0 h${w - 20} a10,10 0 0 1 10,10 v${h - 20} a10,10 0 0 1 -10,10` +
      ` H${ax + 12} L${mx - bx},${my - by} L${ax},${h}` +
      ` H${-w / 2 + 10} a10,10 0 0 1 -10,-10 v${-(h - 20)} a10,10 0 0 1 10,-10Z`);
  bubble.append("text").attr("x", 0).attr("y", h / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
    .style("font-size", fs + "px").style("font-weight", 700).style("fill", labelColor).text(text);
  const b = bubble;
  b.transition().duration(180).style("opacity", 1).transition().delay(1300).duration(300).style("opacity", 0).remove();
}

const hit = scene.append("rect").attr("x", CX0).attr("y", CY0).attr("width", CW).attr("height", CH)
  .attr("fill", "transparent").style("cursor", o.draggable ? "ns-resize" : "pointer");
hit.on("mouseenter", () => flex(0.25))
  .on("click", () => {
    const g = lv.target();
    flex(1);
    if (!pkCalm) { flash = 1; blinkUntil = pkNow() + 160; }
    shout(quoteOf(g));
    send("clicked", { value: g, stage: stageOf(g) });
  });

if (o.draggable) {
  // drag up to grow the biceps and down to shrink them (150 units = the whole range)
  let anchor = null, moved = false;
  hit.call(d3.drag()
    .on("start", function (a) { const p = pkPtr(a, svg.node()); anchor = { y: p[1], v: lv.target() }; moved = false; })
    .on("drag", function (a) {
      const p = pkPtr(a, svg.node());
      const v = Math.round(pkClamp(anchor.v + (anchor.y - p[1]) / (150 * s), 0, 1) * 100) / 100;
      if (v !== lv.target()) { moved = true; setLevel(v, true); }
    })
    .on("end", function () { if (moved) send("value", lv.target()); anchor = null; }));
  svg.attr("tabindex", 0).style("outline", "none").on("keydown", function (a) {
    const ev = pkEvOf(a);
    const step = ev.shiftKey ? 0.1 : 0.01;
    let d = 0;
    if (ev.key === "ArrowUp" || ev.key === "ArrowRight") d = step;
    else if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") d = -step;
    else return;
    ev.preventDefault();
    const v = Math.round(pkClamp(lv.target() + d, 0, 1) * 100) / 100;
    setLevel(v, false);
    send("value", v);
  });
}
