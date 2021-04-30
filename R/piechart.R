
pieChart <- function(
  data,
  value,
  label,
  colorCategory = "Paired",
  stroke = NULL,
  strokeWidth = NULL,
  innerRadius = 0,
  outerRadius = "auto",
  padRadius = 0,
  padAngle = NULL,
  cornerRadius = 0,
  labelFont = 'sans-serif',
  id = NULL,
  title = NULL,
  titleFontSize = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  opacity = 1,
  labelHeight = 18,
  width = NULL,
  height = NULL
) {



  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }



  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/piechart.js",
      package = "ddplot"
    ),
    options = list(
      value = value,
      label = label,
      title = title,
      font = font,
      width = width,
      height = height,
      id = id,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      colorCategory = colorCategory,
      innerRadius = innerRadius,
      stroke = stroke,
      strokeWidth = strokeWidth,
      outerRadius = outerRadius,
      labelHeight = labelHeight,
      padRadius = padRadius,
      padAngle = padAngle,
      cornerRadius = cornerRadius,
      labelFont = labelFont
    )
  )
}
