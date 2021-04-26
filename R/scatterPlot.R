
scatterPlot <- function(
                        data,
                        x,
                        y,
                        col = "crimson",
                        size = 2,
                        id = NULL,
                        xticks = NULL,
                        yticks = NULL,
                        xtitle = NULL,
                        xtitleFontSize = 16,
                        ytitle = NULL,
                        ytitleFontSize = 16,
                        title = NULL,
                        titleFontSize = 22,
                        stroke = NULL,
                        strokeWidth = NULL,
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
      "d3/scatterplot/scatterplot.js",
       package = "ddplot"
    ),
    options = list(
      x = x,
      y = y,
      col = col,
      size = size,
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
