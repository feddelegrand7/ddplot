
horzBarChart <- function(data,
                         value,
                         label,
                         fill = "crimson",
                         stroke = NULL,
                         strokeWidth = 1,
                         id = NULL,
                         paddingWidth = 0.1,
                         valueTicks = NULL,
                         valueFontSize = 10,
                         labelFontSize = 10,
                         valueTitle = NULL,
                         valueTitleFontSize = 14,
                         font = "Verdana, Geneva, Tahoma, sans-serif",
                         title = NULL,
                         titleFontSize = 20,
                         opacity = 1,
                         width = NULL,
                         height = NULL
                         ) {


  if (is.null(data[[value]]) || is.null(data[[label]])) {
    stop("Please check that x and y belong to the specified data frame")
  }


  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/horzbarchart.js",
      package = "ddplot"
    ),
    options = list(
      value = value,
      label = label,
      fill = fill,
      id = id,
      paddingWidth = paddingWidth,
      valueTicks = valueTicks,
      valueFontSize = valueFontSize,
      labelFontSize = labelFontSize,
      valueTitle = valueTitle,
      valueTitleFontSize = valueTitleFontSize,
      font = font,
      title = title,
      titleFontSize = titleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      opacity = opacity,
      width = width,
      height = height
    )
  )









}
