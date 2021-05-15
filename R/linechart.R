
#' Create a line chart
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider. Must be a date variable in 'yyyy-mm-dd' format.
#' @param y The y-variable to consider.
#' @param curve Optional. The line's curve type to render.
#' A complete list can be found here <https://github.com/d3/d3-shape#curves>.
#' Defaults to 'curveLinear'.
#' @param stroke The color of the line. Defaults to 'crimson'.
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
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG line chart.
#' @export
#'


lineChart <- function(
                      data,
                      x,
                      y,
                      curve = "curveLinear",
                      stroke = "crimson",
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
                      width = NULL,
                      height = NULL
                      ) {

  if (is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }


  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  r2d3::r2d3(
    data = data,
    script = system.file(
      "d3/scatterplot/linechart.js",
       package = "ddplot"
    ),
    options = list(
      x = x,
      y = y,
      curve = curve,
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
      opacity = opacity,
      axisCol = axisCol
    )
  )
}
