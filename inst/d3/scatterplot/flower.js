// Center coordinates (no re-declaration of width/height)
const centerX = width / 2;
const centerY = height / 2;

// Flower configuration from options
const petalCount = options.petalCount || 5;
const petalLength = options.petalLength || 100;
const petalWidth = options.petalWidth || 50;
const petalColor = options.petalColor || "pink";
const petalStroke = options.petalStroke || "red";
const centerColor = options.centerColor || "yellow";
const centerStroke = options.centerStroke || "orange";
const centerRadius = options.centerRadius || 20;
const bgcol = options.bgcol || "white";
const centerText = options.centerText || "";

// Set background color
svg.style("background-color", bgcol);

// Petal group centered in the middle of the canvas
const petalGroup = svg.append("g")
  .attr("transform", `translate(${centerX}, ${centerY})`);

// Draw petals
for (let i = 0; i < petalCount; i++) {
  const angle = (360 / petalCount) * i;

  petalGroup.append("ellipse")
    .attr("cx", 0)
    .attr("cy", -petalLength / 2)
    .attr("rx", petalWidth / 2)
    .attr("ry", petalLength / 2)
    .attr("fill", petalColor)
    .attr("stroke", petalStroke)
    .attr("stroke-width", 2)
    .attr("transform", `rotate(${angle})`);
}

// Draw flower center
svg.append("circle")
  .attr("cx", centerX)
  .attr("cy", centerY)
  .attr("r", centerRadius)
  .attr("fill", centerColor)
  .attr("stroke", centerStroke)
  .attr("stroke-width", 2);



// Add the text in the center
svg.append("text")
  .attr("x", centerX)
  .attr("y", centerY)
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "middle")
  .style("font-size", options.centerTextSize || "16px")
  .style("fill", options.centerTextColor || "black")
  .style("font-family", options.font || "sans-serif")
  .text(centerText);

const rotationSpeed = options.rotationSpeed || 0
// Function to continuously rotate the petals around the center
function rotatePetals(angle = 0) {
  petalGroup
    .attr("transform", `translate(${centerX}, ${centerY}) rotate(${angle})`);

  d3.timeout(() => {
    rotatePetals((angle + rotationSpeed) % 360); // Adjust speed here
  }, 20); // 50 frames per second
}

// Start rotating
rotatePetals();
