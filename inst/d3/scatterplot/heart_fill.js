const size = options.heartSize || 150;
const centerX = width / 2;
const centerY = height / 2;

// Heart shape path
const heartPath = d3.path();
heartPath.moveTo(centerX, centerY + size * 0.3);
heartPath.bezierCurveTo(centerX + size / 2, centerY - size / 3,
                        centerX + size, centerY + size / 2,
                        centerX, centerY + size);
heartPath.bezierCurveTo(centerX - size, centerY + size / 2,
                        centerX - size / 2, centerY - size / 3,
                        centerX, centerY + size * 0.3);

// Define clip path
svg.append("defs").append("clipPath")
  .attr("id", "heart-clip")
  .append("path")
  .attr("d", heartPath.toString());

// Group to apply transform for animation
const heartGroup = svg.append("g")
  .attr("transform", `translate(0, 0)`);

// Draw heart outline
heartGroup.append("path")
  .attr("d", heartPath.toString())
  .attr("fill", "none")
  .attr("stroke", options.strokeColor || "#C00")
  .attr("stroke-width", options.strokeWidth || 4);

// Calculate fill
const fillHeight = size * data;
const fillY = centerY + size - fillHeight;

// Draw filled area inside clip
heartGroup.append("rect")
  .attr("x", centerX - size)
  .attr("y", fillY)
  .attr("width", size * 2)
  .attr("height", fillHeight)
  .attr("fill", options.fillColor || "red")
  .attr("clip-path", "url(#heart-clip)");

// Add label if enabled
if (options.renderFillLabel) {
  svg.append("text")
    .attr("x", centerX)
    .attr("y", centerY - size * 0.01)
    .attr("text-anchor", "middle")
    .attr("fill", options.labelColor || "#333")
    .attr("font-size", options.labelFontSize || "16px")
    .attr("font-family", options.font || "sans-serif")
    .text(Math.round(data * 100) + "% full");
}

// Add hover wiggle animation
heartGroup
  .style("cursor", "pointer")
  .on("mouseover", function () {
    d3.select(this)
      .transition()
      .duration(100)
      .attr("transform", "rotate(-3," + centerX + "," + centerY + ")")
      .transition()
      .duration(100)
      .attr("transform", "rotate(3," + centerX + "," + centerY + ")")
      .transition()
      .duration(100)
      .attr("transform", "rotate(-2," + centerX + "," + centerY + ")")
      .transition()
      .duration(100)
      .attr("transform", "rotate(2," + centerX + "," + centerY + ")")
      .transition()
      .duration(100)
      .attr("transform", "rotate(0," + centerX + "," + centerY + ")");
  });

svg.append("text")
  .attr("x", centerX)
  .attr("y", centerY + size + 40)
  .attr("text-anchor", "middle")
  .attr("fill", options.titleColor || "#333")
  .attr("font-size", options.titleFontSize || "14px")
  .attr("font-family", options.font)
  .text(options.titleText);
