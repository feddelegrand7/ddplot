

lollipopChart <- function(data,
                         x,
                         y,
                         xticks = NULL,
                         yticks = NULL,
                         xFontSize = 14,
                         yFontSize = 14,
                         font = "Verdana, Geneva, Tahoma, sans-serif",
                         xtitle = NULL,
                         xtitleFontSize = 14,
                         ytitle = NULL,
                         ytitleFontSize = 14,
                         title = NULL,
                         titleFontSize = 20,
                         lineStroke = "maroon",
                         lineStrokeWidth = 4,
                         circleFill = "lime",
                         circleStroke = "lime",
                         circleStrokeWidth = 1,
                         circleRadius = 10

                         ) {




  if (is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }



  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/lollipopchart.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      y = y,
      xticks = xticks,
      yticks = yticks,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      font = font,
      xtitle = xtitle,
      xtitleFontSize = xtitleFontSize,
      ytitle = ytitle,
      ytitleFontSize = ytitleFontSize,
      title = title,
      titleFontSize = titleFontSize,
      lineStroke = lineStroke,
      lineStrokeWidth = lineStrokeWidth,
      circleStroke = circleStroke,
      circleStrokeWidth = circleStrokeWidth,
      circleFill = circleFill,
      circleRadius = circleRadius

    )
  )

}
