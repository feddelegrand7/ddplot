let pie = d3.pie()
    .value(d => d[options.value]);

let radius = Math.min(width, height) / 2 -1;

if (options.outerRadius != "auto") {
    radius = options.outerRadius
}


let pieData = pie(data);

let colorCategory = "scheme" + options.colorCategory;

let colorSeq = d3.scaleOrdinal(d3[colorCategory]);

let arc = d3.arc()
    .innerRadius(options.innerRadius)
    .outerRadius(radius)
    .padRadius(options.padRadius)
    .padAngle(options.padAngle)
    .cornerRadius(options.cornerRadius)


let labelHeight = options.labelHeight;

svg
.append('g')
.attr('transform', `translate(${radius},${radius})`)
.selectAll(null)
    .data(pieData)
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => colorSeq(d.data[options.label]))
    .attr('stroke', options.stroke)
    .attr('stroke-width', options.strokeWidth)
    .attr('opacity', options.opacity)



const legend = svg
    .append('g')
    .attr('transform', `translate(${radius * 2 + 20},0)`);


legend
    .selectAll(null)
    .data(pieData)
    .enter()
    .append('rect')
    .attr('y', d => labelHeight * d.index * 1.8)
    .attr('width', labelHeight)
    .attr('height', labelHeight)
    .attr('fill', d => colorSeq(d.data[options.label]))

  legend
    .selectAll(null)
    .data(pieData)
    .enter()
    .append('text')
    .text(d => d.data[options.label])
    .attr('x', labelHeight * 1.2)
    .attr('y', d => labelHeight * d.index * 1.8 + labelHeight)
    .style('font-family', 'sans-serif')
    .style('font-size', `${labelHeight}px`);
