// Setting the margin object
let margin = { top: 50, right: 50, bottom: 50, left: 50 };

// Sorting the data

data.sort(function (a, b) {
    if (options.sort === "none") {
      return null;
    } else if (options.sort === "ascending") {
      return d3.ascending(a[options.y], b[options.y]);
    } else {
      return d3.descending(a[options.y], b[options.y]);
    }
  })

// Setting the scaling of the x variable
let xScale = d3
  .scaleBand()
  .domain(
    data.map(function (d) {
      return d[options.x];
    })
  )
  .range([margin.left, width - margin.right])
  .padding(1);

// Setting the scaling of the y variable
let yScale = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d[options.y])])
  .range([height - margin.bottom, margin.top]);

// Setting the x-axis
xAx = d3.axisBottom(xScale).ticks(options.xticks);

// Setting the y-axis
yAx = d3.axisLeft(yScale).ticks(options.yticks);

// Rendering the x-axis
gx = svg
  .append("g")
  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
  .call(xAx)
  .attr("font-size", options.xFontSize);

// Rendering the y-axis
gy = svg
  .append("g")
  .attr("transform", "translate(" + margin.left + ", 0)")
  .call(yAx)
  .attr("font-size", options.yFontSize);

// Removing the y and x axis line
gx.call((g) => g.selectAll("line").remove());
gy.call((g) => g.select(".domain").remove());

// Rendering the x-axis title
svg
  .append("text")
  .attr("transform", "translate(" + width / 2 + " ," + (height - 1) + ")")
  .attr("dx", "0em")
  .attr("dy", "-0.4em")
  .style("text-anchor", "middle")
  .style("font-family", options.font)
  .style("font-size", options.xtitleFontSize)
  .text(options.xtitle)
  .style('fill', options.axisCol)

// Rendering the y-axis title
svg
  .append("text")
  .attr("transform", "translate(" + 0 + " ," + height / 2 + ") rotate(-90)")
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .style("font-size", options.ytitleFontSize)
  .style("font-family", options.font)
  .text(options.ytitle)
  .style('fill', options.axisCol)

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
  .style('fill', options.axisCol)

// Modifying the color of the ticks and labels
svg.selectAll(".tick line").attr("stroke", options.axisCol)
svg.selectAll(".tick text").style("fill", options.axisCol)
svg.selectAll("path.domain").attr("stroke", options.axisCol)
  

// Rendering the lines

svg.style("background-color", options.bgcol);

svg
  .selectAll("myline")
  .data(data)
  .enter()
  .append("line")
  .attr("x1", (d) => xScale(d[options.x]))
  .attr("y1", (d) => yScale(d[options.y]))
  .attr("x2", (d) => xScale(d[options.x]))
  .attr("y2", yScale(0))
  .attr("stroke", options.lineStroke)
  .attr("stroke-width", options.lineStrokeWidth);

// Rendering the circles
svg
  .selectAll("mycircle")
  .data(data)
  .enter()
  .append("circle")
  .attr("cx", (d) => xScale(d[options.x]))
  .attr("cy", (d) => yScale(d[options.y]))
  .attr("r", options.circleRadius)
  .style("fill", options.circleFill)
  .attr("stroke", options.circleStroke)
  .attr("stroke-width", options.circleStrokeWidth);
