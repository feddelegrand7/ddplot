// set plot dimensions
const dims = {
  width: width,
  height: height,
  margin: {t: 40, r: 30, b: 50, l: 0}
}

// draw svg canvas
const svg = div
  .append("svg")
  .datum(data)
  .attr("width", dims.width)
  .attr("height", dims.height)
  .call(
    svg => {
      svg.append("rect")
        .attr("width", dims.width)
        .attr("height", dims.height)
        .attr("fill", options.bgcol)
    }
  )


// panel

//// adjust left plot margin to fit y-axis text (TODO this doesnt work)
const longestLabel = data.map(d => d[options.y]).sort((a, b) => b.length - a.length)
const longestText = svg
  .append("text")
  .text(longestLabel[0])
dims.margin.l = longestText.node().getComputedTextLength() * 1.1
longestText.remove()

//// compute panel dims
dims.panel = {
  width: width - dims.margin.r - dims.margin.l,
  height: dims.height - dims.margin.t - dims.margin.b
}

//// draw panel
const panel = svg.append("g")
  .attr("transform", `translate(${dims.margin.l}, ${dims.margin.t})`)
  .call(
    g => {
      g.append("rect")
        .attr("width", dims.panel.width)
        .attr("height", dims.panel.height)
        .attr("fill", options.panelcol)
    }
  )


// init static elements

const title = svg.append("text")
  .attr("x", dims.width / 2)
  .attr("y", dims.margin.t / 1.5)
  .style("text-anchor", "middle")
  .style("font-size", options.titleFontSize)
  .style("font-family", options.font)
  .text(options.title)

const xGridLines = panel.append("g")
  .attr("class", "x-gridlines")
  .attr("transform", `translate(0, ${dims.panel.height})`)

const layerBar = panel.append("g")
  .attr("class", "layer-bar")

let xAxis = panel.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${dims.panel.height})`)
  .style("font-size", options.xFontSize)
  .style("font-family", options.font)

let yAxis = panel.append("g")
  .attr("class", "y-axis")
  .style("font-size", options.yFontSize)
  .style("font-family", options.font)

const xAxisTitle = xAxis.append("text")
  .attr("x", dims.panel.width * 0.5)
  .attr("y", dims.margin.b * 0.8)
  .style("text-anchor", "middle")
  .style("fill", "black")
  .style("font-size", options.xtitleFontSize)
  .style("font-family", options.font)
  .text(options.xtitle)

const yAxisTitle = yAxis.append("text")
  .attr("y", - dims.margin.t * 0.3)
  .style("text-anchor", "middle")
  .style("fill", "black")
  .style("font-size", options.ytitleFontSize)
  .style("font-family", options.font)
  .text(options.ytitle)

const timeLabel = panel.append("g")
  .attr("class", "layer-timelabel")
const timeLabelText = timeLabel.append("text")
  .style("text-anchor", "end")
  .style("font-size", options.timeLabelOpts.size)
  .style("font-family", options.font)

// initialize scales

const xScale = d3.scaleLinear()
  .range([0, dims.panel.width])

const yScale = d3.scaleBand()
  .range([dims.panel.height, 0])

const colorScale = d3.scaleOrdinal()


// animating function
function update(frame, init = false) {

  const t = svg
    .transition()
    .ease(d3["ease" + options.ease])
    .duration(options.transitionDur)

  // setup data
  const frameData = data.filter(d => d[options.time] == frame)

  frameData.sort(function(a, b){
   return d3[options.sort](a[options.x], b[options.x]);
  })

  // update scales
  xScale
    .domain([0, d3.max(data, d => d[options.x]) * 1.05])
    .nice()
  //// y and color scale updated here for now for the
  //// future possibility of bars entering from out-of-frame
  const yLabels = [... new Set(frameData.map(d => d[options.y]))]
  yScale
    .domain(d3.reverse(yLabels))
	  .paddingInner(options.paddingWidth)
	  .paddingOuter(options.paddingWidth)
	 colorScale
	  .domain(yLabels)
	  .range(d3["scheme" + options.colorCategory].slice(0, yLabels.length))

  // draw bars

  layerBar
    .selectAll(".bar")
    .data(frameData, d => d[options.y])
    .join(
      enter => {
        enter.append("rect")
          .attr("class", "bar")
          .attr("width", d => xScale(d[options.x]))
          .attr("height", yScale.bandwidth())
          .attr("y", d => yScale(d[options.y]))
          .attr("fill", d => colorScale(d[options.y]))
          .style("opacity", options.opacity)
          .style("stroke", options.stroke)
          .style("stroke-width", options.strokeWidth)
      },
      update => {
        update.call(
          update =>
            update.transition(t)
              .attr("width", d => xScale(d[options.x]))
              .attr("y", d => yScale(d[options.y]))
        )
      }
    )

  // draw axes
  xGridLines
    .call(
      d3.axisBottom(xScale)
        .ticks(options.xticks)
        .tickSize(-dims.panel.height)
    )
    .call(
      g => g
        .selectAll("line")
        .style("stroke", options.xgridlinecol)
        .style("stroke-width", 2)
    )
    .call(
      g => {
        g.selectAll("path").remove()
        g.selectAll("text").remove()
      }
    )
  xAxis.call(
    d3.axisBottom(xScale)
      .ticks(options.xticks)
  )

  if (init) {
    yAxis.call(d3.axisLeft(yScale))
  } else {
    yAxis.call(g => g.transition(t).call(d3.axisLeft(yScale)))
  }

  // label the frame
  if (options.timeLabel) {

    timeLabelText
      .text(options.timeLabelOpts.prefix + frame + options.timeLabelOpts.suffix)

    const timeLabelDims = timeLabelText.node().getBBox()

    timeLabel
      .attr("transform", `translate(
        ${dims.panel.width - (timeLabelDims.width * options.timeLabelOpts.xOffset)},
        ${dims.panel.height - (timeLabelDims.height * options.timeLabelOpts.yOffset)}
      )`)

  }

}

// TODO format time and sort + expose method as parameter
const timeSet = [... new Set(data.map(d => d[options.time]))]

update(timeSet[0], init = true)
var counter = 1
setInterval(() => {
  update(timeSet[counter % timeSet.length])
  counter++
}, options.frameDur + options.transitionDur);
