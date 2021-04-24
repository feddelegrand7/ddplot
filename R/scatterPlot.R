
scatterPlot <- function(
                        data,
                        x,
                        y,
                        col = "crimson",
                        size = 2,
                        xticks = 5,
                        yticks = 5,
                        xlab = NULL,
                        ylab = NULL,
                        title = NULL,
                        stroke = NULL,
                        strokeWidth = NULL,
                        font = "Verdana, Geneva, Tahoma, sans-serif",
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
      xlab = xlab,
      ylab = ylab,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height
    )
  )
}
