

#' Create a lollipop chart
#'
#' @param data The data frame containing the variables to consider.
#' @param x The categorical variable to consider. Will be plotted on the x-axis.
#' @param y The numeric variable to consider. Will be plotted on the y-axis.
#' @param sort Whether to sort or not the vertical lines. Takes three values
#' 'none' which is the default, 'ascending' or 'descending'.
#' @param bgcol The background-color of the SVG output. Defaults to 'white'.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xFontSize the font size of the x-axis labels. Defaults to 10.
#' @param yFontSize the font size of the y-axis labels. Defaults to 10.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param lineStroke The stroke color of the vertical lines. Defaults to 'maroon'.
#' @param lineStrokeWidth The vertical lines stroke's width. Defaults to 4.
#' @param circleFill The color of the circles. Defaults to 'lime'.
#' @param circleStroke The color of the stroke surrounding the circle. Defaults to 'lime'.
#' @param circleStrokeWidth The width of the circles' stroke. Defaults to 1.
#' @param circleRadius The radius of the circles. Defaults to 10.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.

#' @return A SVG lollipop chart.
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for data wrangling
#'
#' mpg %>% group_by(drv) %>%
#'   summarise(median_cty = median(cty)) %>%
#'   lollipopChart(
#'     x = "drv",
#'     y = "median_cty",
#'     sort = "ascending",
#'     xtitle = "drv variable",
#'     ytitle = "median cty",
#'     title = "Median cty per drv"
#'   )

lollipopChart <- function(data,
                         x,
                         y,
                         sort = 'none',
                         bgcol = "white",
                         xticks = NULL,
                         yticks = NULL,
                         xFontSize = 12,
                         yFontSize = 12,
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
                         circleRadius = 10,
                         axisCol = "black",
                         width = NULL,
                         height = NULL

                         ) {



  if (is.null(data[[x]]) || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }

  if (!(any(c('none',
              'ascending',
              'descending') %in% sort))) {
    stop("
    the sort parameter can only take the following values:
    'none', 'ascending' or 'descending'
       ")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
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
      sort = sort,
      bgcol = bgcol,
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
      circleRadius = circleRadius,
      axisCol = axisCol,
      width = width,
      height = height
    )
  )

}
