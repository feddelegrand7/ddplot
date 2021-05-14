
#' Create a scatter plot.
#'
#' @param data The data frame containing the quantitative variables.
#' @param x The x-variable to consider.
#' @param y The y-variable to consider.
#' @param col The color of the dots. Defaults to 'crimson'.
#' @param size The size of the dots. Defaults to 2.
#' @param xticks Optional. The number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. the title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. the title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param stroke Optional. the stroke color of the dots.
#' @param strokeWidth Optional. the stroke width of the dots.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the dots (from 0 to 1). Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. the width of the SVG output.
#' @param height Optional. the height of the SVG output.
#'
#' @return A SVG scatter plot.
#' @export
#'
#' @examples
#'
#'scatterPlot(
#'   data = mtcars,
#'   x = "mpg",
#'   y = "wt"
#'   )
#'

scatterPlot <- function(
                        data,
                        x,
                        y,
                        col = "crimson",
                        size = 2,
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
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol
    )
  )
}
