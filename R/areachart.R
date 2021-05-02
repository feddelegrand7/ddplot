
areaChart <- function(
  data,
  x,
  y,
  fill = "crimson",
  stroke = NULL,
  strokeWidth = NULL,
  id = NULL,
  xticks = NULL,
  yticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 16,
  ytitle = NULL,
  ytitleFontSize = 16,
  title = NULL,
  titleFontSize = 22,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "#CAD0D3",
  opacity = 1,
  width = NULL,
  height = NULL
) {



  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }



  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/areachart.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      y = y,
      fill = fill,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height,
      id = id,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity
    )
  )
}
