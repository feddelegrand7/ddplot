let plotData = data
  .filter(
    (d) =>
      d[options.x] != null && d[options.y] != null && d[options.value] != null,
  )
  .map((d) => ({
    x: String(d[options.x]),
    y: String(d[options.y]),
    value: +d[options.value],
  }))
  .filter((d) => Number.isFinite(d.value));

svg.selectAll("*").remove();
svg
  .attr("viewBox", [0, 0, width, height])
  .style("background-color", options.bgcol);

if (!plotData.length) {
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .style("font-family", options.font)
    .style("font-size", 16)
    .style("fill", options.labelColor)
    .text("No data available for pulseGrid()");
} else {
  let unique = (values) => Array.from(new Set(values));

  let xLevels = unique(plotData.map((d) => d.x));
  let yLevels = unique(plotData.map((d) => d.y));

  let titleOffset = options.title ? options.titleFontSize + 44 : 24;
  let margin = {
    top: titleOffset,
    right: 24,
    bottom: 60,
    left: 96,
  };

  let xScale = d3
    .scaleBand()
    .domain(xLevels)
    .range([margin.left, width - margin.right])
    .padding(options.cellPadding);

  let yScale = d3
    .scaleBand()
    .domain(yLevels)
    .range([margin.top, height - margin.bottom])
    .padding(options.cellPadding);

  let valueExtent = d3.extent(plotData, (d) => d.value);
  let minValue = valueExtent[0];
  let maxValue = valueExtent[1];
  let uniformValue = minValue === maxValue;

  let colorScale = uniformValue
    ? () => options.high
    : d3
        .scaleLinear()
        .domain([minValue, maxValue])
        .range([options.low, options.high])
        .interpolate(d3.interpolateRgb);

  let normalizedValue = (value) => {
    if (uniformValue) {
      return 1;
    }

    return (value - minValue) / (maxValue - minValue);
  };

  let formatValue = d3.format(`,.${options.digits}f`);

  if (options.title) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 26)
      .attr("text-anchor", "middle")
      .style("font-family", options.font)
      .style("font-size", options.titleFontSize)
      .style("fill", options.titleColor)
      .text(options.title);
  }

  svg
    .append("g")
    .attr("transform", `translate(0,${margin.top - 12})`)
    .selectAll("text")
    .data(xLevels)
    .enter()
    .append("text")
    .attr("x", (d) => xScale(d) + xScale.bandwidth() / 2)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .style("font-family", options.font)
    .style("font-size", options.xFontSize)
    .style("fill", options.labelColor)
    .text((d) => d);

  svg
    .append("g")
    .selectAll("text")
    .data(yLevels)
    .enter()
    .append("text")
    .attr("x", margin.left - 12)
    .attr("y", (d) => yScale(d) + yScale.bandwidth() / 2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .style("font-family", options.font)
    .style("font-size", options.yFontSize)
    .style("fill", options.labelColor)
    .text((d) => d);

  let tiles = svg
    .append("g")
    .selectAll("g")
    .data(plotData)
    .enter()
    .append("g")
    .attr("transform", (d) => `translate(${xScale(d.x)},${yScale(d.y)})`);

  tiles
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", options.cornerRadius)
    .attr("ry", options.cornerRadius)
    .attr("fill", (d) => colorScale(d.value))
    .attr("stroke", options.stroke)
    .attr("stroke-width", options.strokeWidth)
    .attr("opacity", 0.95);

  tiles
    .append("rect")
    .attr("class", "pulse-halo")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", options.cornerRadius)
    .attr("ry", options.cornerRadius)
    .attr("fill", "none")
    .attr("stroke", options.high)
    .attr("stroke-width", 1)
    .attr("opacity", 0.15);

  if (options.showValues) {
    tiles
      .append("text")
      .attr("x", xScale.bandwidth() / 2)
      .attr("y", yScale.bandwidth() / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-family", options.font)
      .style("font-size", options.valueFontSize)
      .style("font-weight", 600)
      .style("fill", (d) =>
        normalizedValue(d.value) > 0.62 ? "white" : "#0F172A",
      )
      .text((d) => formatValue(d.value));
  }

  let animatePulse = (selection, normalized) => {
    let expandX = (xScale.bandwidth() * normalized * options.pulseStrength) / 2;
    let expandY = (yScale.bandwidth() * normalized * options.pulseStrength) / 2;
    let scaleTarget = 1 + normalized * options.pulseStrength;
    let haloOpacity = 0.18 + normalized * 0.5;
    let duration = 1800 - normalized * 700;

    selection
      .transition()
      .duration(duration)
      .ease(d3.easeSinInOut)
      .attr("x", -expandX)
      .attr("y", -expandY)
      .attr("width", xScale.bandwidth() * scaleTarget)
      .attr("height", yScale.bandwidth() * scaleTarget)
      .attr("opacity", haloOpacity)
      .transition()
      .duration(duration)
      .ease(d3.easeSinInOut)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("opacity", 0.15)
      .on("end", function () {
        animatePulse(d3.select(this), normalized);
      });
  };

  if (options.pulse) {
    tiles.select(".pulse-halo").each(function (d) {
      let normalized = normalizedValue(d.value);
      animatePulse(d3.select(this), normalized);
    });
  }
}
