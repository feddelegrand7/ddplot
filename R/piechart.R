
pieChart <- function(
  data,
  value,
  label,
  id = NULL,
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
      opacity = opacity
    )
  )
}
