barChart <- function(
                        data,
                        x,
                        y,
                        fill = "crimson",
                        sort = "ascending",
                        id = NULL,
                        paddingWidth = 0.1,
                        xticks = NULL,
                        yticks = NULL,
                        xlab = NULL,
                        ylab = NULL,
                        title = NULL,
                        stroke = "crimson",
                        strokeWidth = NULL,
                        font = "Verdana, Geneva, Tahoma, sans-serif",
                        width = NULL,
                        height = NULL) {
  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/barchart.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      y = y,
      fill = fill,
      sort = sort,
      paddingWidth = paddingWidth,
      xticks = xticks,
      yticks = yticks,
      xlab = xlab,
      ylab = ylab,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height,
      id = id
    )
  )
}
