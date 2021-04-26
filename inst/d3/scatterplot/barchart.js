// Setting the margin object
let margin = { top: 50, right: 50, bottom: 50, left: 50 };

// Setting the scaling of the x variable
let xScale = d3
  .scaleBand()
  .domain(d3.range(data.length))
  .range([margin.left, width - margin.right])
  .padding(options.paddingWidth);

// Setting the scaling of the y variable
let yScale = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d[options.y])])
  .range([height - margin.bottom, margin.top]);

// Setting the x-axis
xAx = d3
  .axisBottom(xScale)
  .ticks(options.xticks)
  .tickFormat((i) => data[i][options.x]);

// Setting the y-axis
yAx = d3.axisLeft(yScale).ticks(options.yticks);

// Rendering the x-axis
svg
  .append("g")
  .attr("transform", "translate(0," + (height - margin.bottom) + ")")
  .call(xAx)
  .attr("font-size", options.xFontSize);

// Rendering the y-axis
gy = svg
  .append("g")
  .attr("transform", "translate(" + margin.left + ", 0)")
  .call(yAx);

// Removing the y ticks
gy.call((g) => g.select(".domain").remove());

// Rendering the bar chart
svg
  .attr("id", options.id)
  .attr("viewBox", [0, 0, width, height])
  .selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .sort(function (a, b) {
    if (options.sort === "none") {
      return null;
    } else if (options.sort === "ascending") {
      return d3.ascending(a[options.y], b[options.y]);
    } else {
      return d3.descending(a[options.y], b[options.y]);
    }
  })
  .attr("x", (d, i) => xScale(i))
  .attr("y", (d) => yScale(d[options.y]))
  .attr("width", xScale.bandwidth())
  .attr("height", (d) => yScale(0) - yScale(d[options.y]))
  .attr("fill", options.fill)
  .attr("stroke", options.stroke)
  .attr("stroke-width", options.strokeWidth);
