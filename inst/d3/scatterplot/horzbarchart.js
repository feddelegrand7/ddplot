let margin = {
  top: 50,
  right: 10,
  bottom: 50,
  left: 100,
};

data.sort(function (a, b) {
  if (options.sort === "none") {
    return null;
  } else if (options.sort === "ascending") {
    return d3.ascending(a[options.value], b[options.value]);
  } else {
    return d3.descending(a[options.value], b[options.value]);
  }
});

let x = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d[options.value])])
  .range([margin.left, width - margin.right]);

let y = d3
  .scaleBand()
  .domain(d3.range(data.length))
  .rangeRound([margin.top, height - margin.bottom])
  .padding(options.paddingWidth);

let xAxis = (g) =>
  g
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(options.valueTicks))
    .call((g) => g.select(".domain").remove());

let yAxis = (g) =>
  g
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).tickFormat((i) => data[i][options.label]));

svg
  .attr("viewBox", [0, 0, width, height])
  .style("background-color", options.bgcol);

svg
  .append("g")
  .attr("fill", options.fill)
  .selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("x", x(0))
  .attr("y", (d, i) => y(i))
  .attr("width", (d) => x(d[options.value]) - x(0))
  .attr("height", y.bandwidth())
  .attr("opacity", options.opacity)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth);

svg.append("g").call(xAxis).attr("font-size", options.valueFontSize);

svg
  .append("g")
  .call(yAxis)
  .attr("font-size", options.labelFontSize)
  .style("font-family", options.font);

// rendering the x-axis title

svg
  .append("text")
  .attr("transform", "translate(" + width / 2 + " ," + (height - 3) + ")")
  .attr("dx", "0em")
  .attr("dy", "-0.4em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.valueTitleFontSize)
  .text(options.valueTitle)
  .style("fill", options.axisCol);

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 2 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-size", options.labelTitleFontSize)
  .style("font-family", options.font)
  .text(options.labelTitle)
  .style("fill", options.axisCol);

// Rendering the chart title
svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2)
  .attr("text-anchor", "middle")
  .attr("dx", "0em")
  .style("font-size", options.titleFontSize)
  .style("font-family", options.font)
  .text(options.title)
  .style("fill", options.axisCol);

// Modifying the color of the ticks and labels
svg.selectAll(".tick line").attr("stroke", options.axisCol);
svg.selectAll(".tick text").style("fill", options.axisCol);
svg.selectAll("path.domain").attr("stroke", options.axisCol);
