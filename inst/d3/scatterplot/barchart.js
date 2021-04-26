
margin = {top: 20, right: 0, bottom: 50, left: 40}


let xScale = d3.scaleBand()
    .domain(data.map(d => d[options.x]))
    .range([margin.left, width - margin.right])
    .padding(options.paddingWidth)


let yScale = d3.scaleLinear()
.domain([0, d3.max(data, d => d[options.y])])
.range([margin.bottom, height - margin.top])


xS = d3.axisBottom(xScale).ticks(options.xticks)
yS = d3.axisLeft(yScale).ticks(options.yticks)


svg.append('g')
   .attr('transform', 'translate(0,' + (height-margin.bottom) + ')')
   .call(xS)


svg.append('g')
   .attr('transform', 'translate(' + margin.left + ', 0)')
   .call(yS)



svg.attr('id', options.id)
  .selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("x", (d, i) => xScale(i))
  .attr("y", (d) => height - yScale(d[options.y]))
  .attr("width", xScale.bandwidth())
  .attr("height", (d) => yScale(d[options.y]))
  .attr("fill", options.fill)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth);


