
horzBarChart <- function(data,
                         value,
                         label,
                         fill = "crimson",
                         id = NULL,
                         paddingWidth = 0.1) {


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
      paddingWidth = paddingWidth
    )
  )









}
