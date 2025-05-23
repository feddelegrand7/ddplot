#' Display a Parliament  Chart
#'
#' @param data A data frame with a categorical column and a numerical column
#' @param categorical_column The categorical column to consider
#' @param numerical_column The numerical column to consider
#' @param seatSize The size of each seat. Defaults to 6.
#' @param padding The padding between seats. Defaults to 2.
#' @param maxRows The maximum number of rows. Optional.
#' @param title The title of the chart. Optional.
#' @param titleFontSize Font size for the title. Defaults to 22.
#' @param font Font family for text. Defaults to "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol Background color of the chart. Defaults to "#CAD0D3".
#' @param width Width of the SVG canvas. Optional.
#' @param height Height of the SVG canvas. Optional.
#'
#' @return A D3-rendered Parliament chart
#' @export
#'
#' @examples
#' political_results_example <- data.frame(
#'     political_party = c("SDP", "CDU", "Linke"),
#'     number_of_seats = c(200, 40, 30)
#' )
#' parliament_chart(
#'   data = political_results_example,
#'   categorical_column = "political_party",
#'   numerical_column = "number_of_seats",
#'   title = "German Bundestag (results not real, just an example)",
#'   seatSize = 10,
#'   bgcol = "#fefefe"
#' )
parliament_chart <- function(
    data,
    categorical_column,
    numerical_column,
    seatSize = 6,
    padding = 2,
    maxRows = NULL,
    title = NULL,
    titleFontSize = 22,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol = "#CAD0D3",
    width = NULL,
    height = NULL
) {
  if (grepl(";", font)) {
    stop("Please remove the ';' character from your font argument.")
  }

  if (!is.data.frame(data)) {
    stop("data must be a data.frame")
  }

  if (!categorical_column %in% names(data)) {
    stop("the categorical column is not in your data.frame")
  }

  if (!numerical_column %in% names(data)) {
    stop("the numerical column is not in your data.frame")
  }

  categorical_column_to_consider <- data[[categorical_column]]
  numerical_column_to_consider <- data[[numerical_column]]

  data <- data.frame(categorical_column_to_consider, numerical_column_to_consider)
  names(data) <- c(categorical_column, numerical_column)

  r2d3::r2d3(
    data = data,
    script = system.file("d3/scatterplot/parliamant_chart.js", package = "ddplot"),
    options = list(
      seatSize = seatSize,
      padding = padding,
      maxRows = maxRows,
      title = title,
      titleFontSize = titleFontSize,
      font = font,
      bgcol = bgcol,
      width = width,
      height = height
    )
  )
}
