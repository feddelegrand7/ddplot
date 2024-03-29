
#' Create a stacked area chart
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider. Must be a date variable in 'yyyy-mm-dd' format.
#' @param colorCategory A D3 categorical color scheme, you can find more
#' here <https://github.com/d3/d3-scale-chromatic#categorical>. Defaults to 'Category10'.
#' @param curve The line's curve type to render.
#' A complete list can be found here <https://github.com/d3/d3-shape#curves>.
#' Defaults to 'curveLinear'.
#' @param stroke Optional. The color of the stroke of the area.
#' @param strokeWidth The width of the line. Defaults to 1.5.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the area chart (from 0 to 1). Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param legendBoxSize The size of the legend rectangles. Defaults to 18.
#' @param legendTextSize The font size of the legend text Defaults to 18.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return a SVG stacked area chart
#' @export
#' @examples
#' data <- data.frame(
#'   date = c(
#'     "2000-01-01", "2000-02-01", "2000-03-01", "2000-04-01",
#'     "2000-05-01", "2000-06-01", "2000-07-01",
#'     "2000-08-01", "2000-09-01", "2000-10-01"
#'   ),
#'   Trade = c(
#'     2000,1023, 983, 2793, 1821, 1837, 1792, 1853, 791, 739
#'   ),
#'   Manufacturing = c(
#'     734, 694, 739, 736, 685, 621, 708, 685, 667, 693
#'   ),
#'   Leisure = c(
#'     1782, 1779, 1789, 658, 675, 833, 786, 675, 636, 691
#'   ),
#'   Agriculture = c(
#'     655, 587,623, 517, 561, 2545, 636, 584, 559, 2504
#'   )
#' )
#'
#' stackedAreaChart(
#'   data = data,
#'   x = "date",
#'   legendTextSize = 14,
#'   curve = "curveCardinal",
#'   colorCategory = "Accent",
#'   bgcol = "white",
#'   stroke = "black",
#'   strokeWidth = 1
#' )
#'


stackedAreaChart <- function(
  data,
  x,
  colorCategory = "Category10",
  curve = "curveLinear",
  stroke = NULL,
  strokeWidth = 1.5,
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
  axisCol = "black",
  legendBoxSize = 18,
  legendTextSize = 18,
  width = NULL,
  height = NULL
) {


  columnNames <- Filter(function(column) column != x, names(data))


  if (is.null(data[[x]])) {
    stop("Please check that x belongs to the specified data frame")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/stackedareachart.js",
      package = "ddplot"
    ),
    options = list(
      x = x,
      colorCategory = colorCategory,
      curve = curve,
      stroke = stroke,
      strokeWidth = strokeWidth,
      xticks = xticks,
      yticks = yticks,
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      width = width,
      height = height,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol,
      columnNames = columnNames,
      legendBoxSize = legendBoxSize,
      legendTextSize = legendTextSize
    )
  )
}
