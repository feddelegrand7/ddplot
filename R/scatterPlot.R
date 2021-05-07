
#' Create a scatter plot
#'
#' @param data the data frame containing the quantitative variables
#' @param x the x-variable to plot.
#' @param y the y-variable to plot
#' @param col the color of the dots. Defaults to 'crimson'
#' @param size the size of the dots. Defaults to 2
#' @param id optional. the id of the SVG output.
#' @param xticks optional. the number of x-axis ticks to consider
#' @param yticks optional. the number of y-axis ticks to consider
#' @param xtitle optional. the title of the x-axis
#' @param xtitleFontSize the font size of the x-axis title. Defaults to 16
#' @param ytitle optional. the title of the y-axis
#' @param ytitleFontSize the font size of the y-axis title. Defaults to 16
#' @param title optional. the title of the plot
#' @param titleFontSize the font size of the plot title. Defaults to 22
#' @param stroke optional. the stroke color of the dots
#' @param strokeWidth optional. the stroke width of the dots
#' @param font the font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif"
#' @param bgcol the background color of the SVG. Defaults to "#CAD0D3" HEX color
#' @param opacity the color opacity of the dots (from 0 to 1). Defaults to 1
#' @param width optional. the width of the SVG output
#' @param height optional. the height of the SVG output
#'
#' @return a SVG scatter plot
#' @export
#'
#' @examples
#'
#'scatterPlot(
#'   data = mpg,
#'   x = "cty",
#'   y = "hwy"
#'   )
#'
#'
#'

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



  if (is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x or y belongs to the specified data frame")
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
      id = id,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity
    )
  )
}
