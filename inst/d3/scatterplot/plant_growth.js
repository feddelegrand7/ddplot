d3.select("head").append("style").html(`
  .plant_growth_flower:hover {
    animation: wiggle 0.4s ease-in-out infinite alternate;
    transform-origin: center;
  }

  @keyframes wiggle {
    0%   { transform: rotate(0deg); }
    50%  { transform: rotate(3deg); }
    100% { transform: rotate(-3deg); }
  }
`);

const potWidth = options.potWidth || 100;
const potHeight = options.potHeight || 40;
const plantMaxHeight = options.plantMaxHeight || 150;
const stemColor = options.stemColor || "#228B22";
const potColor = options.potColor || "#8B4513";
const flowerColor = options.flowerColor || "#FF69B4";
const strokeColor = options.strokeColor || "#333";
const strokeWidth = options.strokeWidth || 2;
const fontFamily = options.font || "sans-serif";

const centerX = width / 2;
const groundY = height / 2 + 50;

const plantGroup = svg.append("g");

// Draw pot
plantGroup.append("rect")
  .attr("x", centerX - potWidth / 2)
  .attr("y", groundY)
  .attr("width", potWidth)
  .attr("height", potHeight)
  .attr("fill", potColor)
  .attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth)
  .attr("rx", 10);

// Draw stem
const stemHeight = plantMaxHeight * data;
const stemY = groundY - stemHeight;

plantGroup.append("line")
  .attr("x1", centerX)
  .attr("y1", groundY)
  .attr("x2", centerX)
  .attr("y2", stemY)
  .attr("stroke", stemColor)
  .attr("stroke-width", 6)
  .attr("stroke-linecap", "round");

// Add leaves
plantGroup.append("ellipse")
  .attr("cx", centerX - 10)
  .attr("cy", stemY + 10)
  .attr("rx", 8)
  .attr("ry", 4)
  .attr("fill", stemColor)
  .attr("transform", `rotate(-25,${centerX - 10},${stemY + 10})`);

plantGroup.append("ellipse")
  .attr("cx", centerX + 10)
  .attr("cy", stemY + 15)
  .attr("rx", 8)
  .attr("ry", 4)
  .attr("fill", stemColor)
  .attr("transform", `rotate(25,${centerX + 10},${stemY + 15})`);

// Add flowers based on growth level
if (data > 0.5) {
  const flowerSize = Math.max(0, 6 + 6 * (data - 0.8) * 5); // bloom size increases with growth

  // Top flower
  plantGroup.append("circle")
    .attr("cx", centerX)
    .attr("cy", stemY - 8)
    .attr("r", flowerSize)
    .attr("fill", flowerColor)
    .attr("class", "plant_growth_flower");

  // Leaf flowers
  plantGroup.append("circle")
    .attr("cx", centerX - 15)
    .attr("cy", stemY + 8)
    .attr("r", flowerSize * 0.6)
    .attr("fill", flowerColor)
    .attr("class", "plant_growth_flower");

  plantGroup.append("circle")
    .attr("cx", centerX + 15)
    .attr("cy", stemY + 12)
    .attr("r", flowerSize * 0.6)
    .attr("fill", flowerColor)
    .attr("class", "plant_growth_flower");
}

// Growth label
if (options.renderFillLabel) {
  svg.append("text")
    .attr("x", centerX)
    .attr("y", stemY - 50)
    .attr("text-anchor", "middle")
    .attr("fill", options.labelColor || "#333")
    .attr("font-size", options.labelFontSize || "16px")
    .attr("font-family", fontFamily)
    .text(Math.round(data * 100) + "% grown");
}

// Title below pot
svg.append("text")
  .attr("x", centerX)
  .attr("y", groundY + potHeight + 40)
  .attr("text-anchor", "middle")
  .attr("fill", options.titleColor || "#333")
  .attr("font-size", options.titleFontSize || "14px")
  .attr("font-family", fontFamily)
  .text(options.titleText || "Plant Growth");



