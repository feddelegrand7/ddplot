const val = Math.min(Math.max(data, options.min), options.max);
const minVal = options.min;
const maxVal = options.max;
const title = options.title || "";
const warningZone = options.warningZone;
const warningColor = options.warningColor || "orange";
const dangerZone = options.dangerZone;
const dangerColor = options.dangerColor || "red";
const arcBgColor = options.arcBgColor || "#ddd";
const needleColor = options.needleColor || "crimson";
const pivotColor = options.pivotColor || "steelblue";
const titleFontSize = options.titleFontSize || 16;
const valueFontSize = options.valueFontSize || 14;
const fontFamily = options.font || "Verdana, Geneva, Tahoma, sans-serif";
const bgcol = options.bgcol || "white";
// Needle animation (default on): the needle sweeps from the minimum up to the
// value on load and settles with a small wobble, like a car dashboard.
const animate = options.animate === undefined ? true : options.animate;
const animationDuration = options.animationDuration || 1500;

const cx = width / 2;
const cy = height / 2;
const radius = Math.min(width, height) / 2 * 0.82;
const arcWidth = radius * 0.16;

// Gauge spans 240 degrees: from -120° to +120° measured clockwise from north (12 o'clock)
// In D3 arc convention (0 = north, clockwise positive):
const startAngle = -(2 * Math.PI / 3);  // -120° = 8 o'clock
const endAngle   =  (2 * Math.PI / 3);  // +120° = 4 o'clock
const totalSpan  = endAngle - startAngle;

// Background SVG fill
svg.style("background-color", bgcol);

// Outer decorative circle (gives the bezel look)
const bezelGradId = "bezelGrad";
const bezelGrad = svg.append("defs").append("radialGradient")
  .attr("id", bezelGradId)
  .attr("cx", "40%")
  .attr("cy", "35%")
  .attr("r", "60%");
bezelGrad.append("stop").attr("offset", "0%").attr("stop-color", "#f5f5f5");
bezelGrad.append("stop").attr("offset", "70%").attr("stop-color", "#d0d0d0");
bezelGrad.append("stop").attr("offset", "100%").attr("stop-color", "#b0b0b0");

svg.append("circle")
  .attr("cx", cx)
  .attr("cy", cy)
  .attr("r", radius + arcWidth * 0.8)
  .attr("fill", `url(#${bezelGradId})`)
  .attr("stroke", "#999")
  .attr("stroke-width", 1.5);

// Inner face circle
svg.append("circle")
  .attr("cx", cx)
  .attr("cy", cy)
  .attr("r", radius - arcWidth * 0.15)
  .attr("fill", "#fafafa");

// Arc background track
const arcGen = d3.arc()
  .innerRadius(radius - arcWidth)
  .outerRadius(radius)
  .startAngle(startAngle)
  .endAngle(endAngle);

svg.append("path")
  .attr("transform", `translate(${cx},${cy})`)
  .attr("d", arcGen())
  .attr("fill", arcBgColor);

// Warning zone arc (e.g. orange)
const warningFraction = (warningZone - minVal) / (maxVal - minVal);
const warningStartAngle = startAngle + warningFraction * totalSpan;

const dangerFraction = (dangerZone - minVal) / (maxVal - minVal);
const dangerStartAngle = startAngle + dangerFraction * totalSpan;

if (warningFraction < 1) {
  // Clamp warning zone to end where danger zone begins
  const warningEndAngle = dangerFraction < 1 ? dangerStartAngle : endAngle;

  const warningArcGen = d3.arc()
    .innerRadius(radius - arcWidth)
    .outerRadius(radius)
    .startAngle(warningStartAngle)
    .endAngle(warningEndAngle);

  svg.append("path")
    .attr("transform", `translate(${cx},${cy})`)
    .attr("d", warningArcGen())
    .attr("fill", warningColor);
}

// Danger zone arc (e.g. red)
if (dangerFraction < 1) {
  const dangerArcGen = d3.arc()
    .innerRadius(radius - arcWidth)
    .outerRadius(radius)
    .startAngle(dangerStartAngle)
    .endAngle(endAngle);

  svg.append("path")
    .attr("transform", `translate(${cx},${cy})`)
    .attr("d", dangerArcGen())
    .attr("fill", dangerColor);
}

// Tick marks — 11 major ticks (one per 10% of range)
const numTicks = 11;
const tickInnerR = radius - arcWidth - 2;
const tickOuterR = radius - arcWidth - 10;

for (let i = 0; i < numTicks; i++) {
  const fraction = i / (numTicks - 1);
  const angle = startAngle + fraction * totalSpan;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  svg.append("line")
    .attr("x1", cx + tickInnerR * sinA)
    .attr("y1", cy - tickInnerR * cosA)
    .attr("x2", cx + tickOuterR * sinA)
    .attr("y2", cy - tickOuterR * cosA)
    .attr("stroke", "#555")
    .attr("stroke-width", i === 0 || i === numTicks - 1 ? 2 : 1.5);
}

// Minor ticks — 4 per major interval
const numMinorTicks = (numTicks - 1) * 4;
const minorTickInnerR = radius - arcWidth - 2;
const minorTickOuterR = radius - arcWidth - 6;

for (let i = 0; i <= numMinorTicks; i++) {
  if (i % 4 === 0) continue; // skip positions that coincide with major ticks
  const fraction = i / numMinorTicks;
  const angle = startAngle + fraction * totalSpan;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);

  svg.append("line")
    .attr("x1", cx + minorTickInnerR * sinA)
    .attr("y1", cy - minorTickInnerR * cosA)
    .attr("x2", cx + minorTickOuterR * sinA)
    .attr("y2", cy - minorTickOuterR * cosA)
    .attr("stroke", "#888")
    .attr("stroke-width", 1);
}

// Min / max value labels
const labelRadius = radius - arcWidth - 30;
const startLabelAngle = startAngle;
const endLabelAngle = endAngle;

svg.append("text")
  .attr("x", cx + labelRadius * Math.sin(startLabelAngle))
  .attr("y", cy - labelRadius * Math.cos(startLabelAngle) + 4)
  .attr("text-anchor", "middle")
  .attr("font-size", Math.max(10, radius * 0.1))
  .attr("fill", "#555")
  .attr("font-family", fontFamily)
  .text(minVal);

svg.append("text")
  .attr("x", cx + labelRadius * Math.sin(endLabelAngle))
  .attr("y", cy - labelRadius * Math.cos(endLabelAngle) + 4)
  .attr("text-anchor", "middle")
  .attr("font-size", Math.max(10, radius * 0.1))
  .attr("fill", "#555")
  .attr("font-family", fontFamily)
  .text(maxVal);

// Needle — drawn pointing straight up (north) inside a group centred on the
// pivot, then rotated to the target angle. Rotating a group (rather than
// recomputing the polygon) lets us animate the sweep smoothly.
const valueFraction = (val - minVal) / (maxVal - minVal);
const needleAngle = startAngle + valueFraction * totalSpan;   // radians
const needleAngleDeg = needleAngle * 180 / Math.PI;
const startAngleDeg  = startAngle  * 180 / Math.PI;
const endAngleDeg    = endAngle    * 180 / Math.PI;

const needleLength = radius - arcWidth - 12;
const needleTailLength = radius * 0.12;
const needleHalfBase = Math.max(4, radius * 0.04);

// Polygon pointing up: tip → right base → tail → left base
const needlePoints = [
  `0,${-needleLength}`,
  `${needleHalfBase},0`,
  `0,${needleTailLength}`,
  `${-needleHalfBase},0`
].join(" ");

const needleGroup = svg.append("g")
  .attr("transform",
    `translate(${cx},${cy}) rotate(${animate ? startAngleDeg : needleAngleDeg})`);

needleGroup.append("polygon")
  .attr("points", needlePoints)
  .attr("fill", needleColor);

// Sweep from the minimum up to the value, overshooting slightly and settling
// back — the way an analog car needle jumps and wobbles into place. The angle
// is clamped so the wobble never swings visibly past the ends of the gauge.
if (animate) {
  const clampLo = startAngleDeg - 6;
  const clampHi = endAngleDeg + 6;
  needleGroup.transition()
    .duration(animationDuration)
    .ease(d3.easeElasticOut.amplitude(1).period(0.6))
    .attrTween("transform", () => {
      const interp = d3.interpolate(startAngleDeg, needleAngleDeg);
      return t => {
        const a = Math.max(clampLo, Math.min(clampHi, interp(t)));
        return `translate(${cx},${cy}) rotate(${a})`;
      };
    });
}

// Center pivot circle
svg.append("circle")
  .attr("cx", cx)
  .attr("cy", cy)
  .attr("r", Math.max(6, radius * 0.07))
  .attr("fill", pivotColor)
  .attr("stroke", "white")
  .attr("stroke-width", 2);

// Title text (upper center of gauge face)
if (title) {
  svg.append("text")
    .attr("x", cx)
    .attr("y", cy - radius * 0.28)
    .attr("text-anchor", "middle")
    .attr("font-size", titleFontSize)
    .attr("fill", "#333")
    .attr("font-family", fontFamily)
    .attr("font-weight", "bold")
    .text(title);
}

// Current value text (below center)
svg.append("text")
  .attr("x", cx)
  .attr("y", cy + radius * 0.52)
  .attr("text-anchor", "middle")
  .attr("font-size", valueFontSize)
  .attr("fill", "#333")
  .attr("font-family", fontFamily)
  .text(val);
