
margin = {top: 20, right: 0, bottom: 50, left: 40}


let xScale = d3.scaleBand()
    .domain(data.map(d => d[options.xvar]))
    .range([margin.left, width - margin.right])
    .padding(options.paddingWidth)


let yScale = d3.scaleLinear()
.domain([0, d3.max(data, d => d[options.yvar])])
.range([margin.bottom, height - margin.top])


svg.selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("x", (d, i) => xScale(i))
  .attr("y", (d) => height - yScale(d[options.yvar]))
  .attr("width", xScale.bandwidth())
  .attr("height", (d) => yScale(d[options.yvar]))
  .attr("fill", options.fill)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth);


