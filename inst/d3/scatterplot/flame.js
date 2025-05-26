const centerX = width / 2;
const centerY = height * 0.75;

const flameColor0 = options.flameColor0 || "white";
const flameColor1 = options.flameColor1 || "orange";
const flameColor2 = options.flameColor2 || "red";

const flameOutline = options.flameOutline || "darkred";
const bgcol = options.bgcol || "black";

const rawIntensity = data.intensity || 1;
const minInput = 0.1, maxInput = 100;
const minScale = 0.2, maxScale = 2.5;

// Map intensity to scale, no upper clamp; linear up to 100, then scale grows linearly beyond
function mapIntensityToScale(intensity) {
  if (intensity <= maxInput) {
    return minScale + (intensity - minInput) * (maxScale - minScale) / (maxInput - minInput);
  } else {
    // For intensity > 100, continue scaling linearly beyond maxScale
    const extraScalePerUnit = 0.02; // adjust to control growth speed above 100
    return maxScale + (intensity - maxInput) * extraScalePerUnit;
  }
}

const baseScale = mapIntensityToScale(rawIntensity);

svg.style("background-color", bgcol);

// Define a radial gradient for the flame
const defs = svg.append("defs");

const gradient = defs.append("radialGradient")
  .attr("id", "flameGradient")
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "50%");

gradient.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", flameColor0);

gradient.append("stop")
  .attr("offset", "50%")
  .attr("stop-color", flameColor1);

gradient.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", flameColor2);

// Generate a teardrop flame-like path string
function flamePath(scale = 1, wobble = 0) {
  const x = 30 * scale + wobble;
  const y = 80 * scale;
  const h = 150 * scale;
  return `
    M 0 0
    Q ${x} ${-y}, 0 ${-h}
    Q ${-x} ${-y}, 0 0
    Z
  `;
}

// Flame group
const flameGroup = svg.append("g")
  .attr("transform", `translate(${centerX}, ${centerY})`);

// Append flame path
const flame = flameGroup.append("path")
  .attr("d", flamePath(baseScale))
  .attr("fill", "url(#flameGradient)")
  .attr("stroke", flameOutline)
  .attr("stroke-width", 2)
  .attr("opacity", 0.9);

function randomizeColor(color) {
  const c = d3.color(color);
  if (!c) return color;
  const factor = 0.85 + 0.3 * Math.random();
  c.r = Math.min(255, c.r * factor);
  c.g = Math.min(255, c.g * factor);
  c.b = Math.min(255, c.b * factor);
  return c.formatRgb();
}

function animateFlame() {
  const scale = baseScale * (0.9 + 0.15 * Math.random());
  const wobble = (Math.random() - 0.5) * 20;

  gradient.select("stop[offset='0%']")
    .attr("stop-color", randomizeColor(flameColor0));

  gradient.select("stop[offset='50%']")
    .attr("stop-color", randomizeColor(flameColor1));

  gradient.select("stop[offset='100%']")
    .attr("stop-color", randomizeColor(flameColor2));

  flame
    .transition()
    .duration(100)
    .attr("d", flamePath(scale, wobble))
    .on("end", animateFlame);
}

animateFlame();
