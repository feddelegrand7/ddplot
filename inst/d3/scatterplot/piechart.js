let pie = d3.pie()
    .value(d => d[options.value]);

let radius = Math.min(width, height) / 2 -1;

let pieData = pie(data);

let colorCategory = "scheme" + options.colorCategory;

let colorSeq = d3.scaleOrdinal(d3[colorCategory]);

let arc = d3.arc()
    .innerRadius(options.innerRadius)
    .outerRadius(radius)

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
    .style('stroke-width', options.strokeWidth);


