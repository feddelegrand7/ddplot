// Glass dimensions
const glassWidth = options.glassWidth || 80;
const glassHeight = options.glassHeight || 200;
const glassX = (width - glassWidth) / 2;
const glassY = (height - glassHeight) / 2;
const strokeColor = options.strokeColor || "#555";
const strokeWidth = options.strokeWidth || 3;
const fillColor = options.fillColor || "skyblue";
const fontFamily = options.font || "Verdana, Geneva, Tahoma, sans-serif";

// Group for animation
const glassGroup = svg.append("g");

// Draw left side of the glass
glassGroup.append("line")
  .attr("x1", glassX)
  .attr("y1", glassY)
  .attr("x2", glassX)
  .attr("y2", glassY + glassHeight)
  .attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth);

// Draw right side of the glass
glassGroup.append("line")
  .attr("x1", glassX + glassWidth)
  .attr("y1", glassY)
  .attr("x2", glassX + glassWidth)
  .attr("y2", glassY + glassHeight)
  .attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth);

// Draw bottom of the glass
glassGroup.append("line")
  .attr("x1", glassX)
  .attr("y1", glassY + glassHeight)
  .attr("x2", glassX + glassWidth)
  .attr("y2", glassY + glassHeight)
  .attr("stroke", strokeColor)
  .attr("stroke-width", strokeWidth);

// Calculate water height and position
const waterHeight = glassHeight * data;
const waterY = glassY + glassHeight - waterHeight;

// Draw water
glassGroup.append("rect")
  .attr("x", glassX)
  .attr("y", waterY)
  .attr("width", glassWidth)
  .attr("height", waterHeight)
  .attr("fill", fillColor)
  .attr("rx", 5);

// Hover wiggle animation
glassGroup
  .style("cursor", "pointer")
  .on("mouseover", function () {
    d3.select(this)
      .transition()
      .duration(100)
      .attr("transform", `rotate(-2,${width / 2},${height / 2})`)
      .transition()
      .duration(100)
      .attr("transform", `rotate(2,${width / 2},${height / 2})`)
      .transition()
      .duration(100)
      .attr("transform", `rotate(-1,${width / 2},${height / 2})`)
      .transition()
      .duration(100)
      .attr("transform", `rotate(1,${width / 2},${height / 2})`)
      .transition()
      .duration(100)
      .attr("transform", `rotate(0,${width / 2},${height / 2})`);
  });

// Percentage label
if (options.renderFillLabel) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", glassY - 10)
    .attr("text-anchor", "middle")
    .attr("fill", options.labelColor)
    .attr("font-size", options.labelFontSize)
    .text(Math.round(data * 100) + "% full")
    .style("font-family", fontFamily);
}

// Title label
svg.append("text")
  .attr("x", width / 2)
  .attr("y", glassY + glassHeight + 50)
  .attr("text-anchor", "middle")
  .attr("fill", options.titleColor)
  .attr("font-size", options.titleFontSize)
  .text(options.titleText)
  .style("font-family", fontFamily);
