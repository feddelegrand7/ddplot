#' Create a bar chart.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The x-variable to consider.
#' @param y The y-variable to consider.
#' @param fill The color of the bars. Defaults to 'crimson'.
#' @param sort Whether to sort or not the bars. Takes three values
#' 'none' which is the default, 'ascending' or 'descending'.
#' @param paddingWidth The distance between each bar.
#' The value goes from 0 to 0.99 included. Defaults to 0.1.
#' @param xticks Optional. the number of x-axis ticks to consider.
#' @param xFontSize the font size of the x-axis labels. Defaults to 10.
#' @param yFontSize the font size of the y-axis labels. Defaults to 10.
#' @param yticks Optional. The number of y-axis ticks to consider.
#' @param xtitle Optional. The title of the x-axis.
#' @param xtitleFontSize The font size of the x-axis title. Defaults to 16.
#' @param ytitle Optional. The title of the y-axis.
#' @param ytitleFontSize The font size of the y-axis title. Defaults to 16.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 22.
#' @param stroke The stroke color of the bars. Defaults to 'crimson'.
#' @param strokeWidth Optional. the stroke width of the bars.
#' @param font The font family to consider for the titles. Defaults to
#' "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "#CAD0D3" HEX color.
#' @param opacity The color opacity of the bars (from 0 to 1). Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return A SVG bar chart.
#' @export
#'
#' @examples
#'library(ggplot2) #needed for the mpg data frame
#'library(dplyr) #needed for data wrangling
#'
#'mpg %>% group_by(manufacturer) %>%
#'  summarise(mean_cty = mean(cty)) %>%
#'  barChart(
#'    x = "manufacturer",
#'    y = "mean_cty",
#'    sort = "ascending",
#'    xFontSize = 10,
#'    yFontSize = 10,
#'    fill = "orange",
#'    strokeWidth = 1,
#'    ytitle = "average cty value",
#'    title = "Average City Miles per Gallon by manufacturer",
#'    titleFontSize = 16
#'  )

barChart <- function(
                     data,
                     x,
                     y,
                     fill = "crimson",
                     sort = "none",
                     paddingWidth = 0.1,
                     xticks = NULL,
                     xFontSize = 10,
                     yFontSize = 10,
                     yticks = NULL,
                     xtitle = NULL,
                     xtitleFontSize = 16,
                     ytitle = NULL,
                     ytitleFontSize = 16,
                     title = NULL,
                     titleFontSize = 22,
                     stroke = "crimson",
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
      xtitle = xtitle,
      ytitle = ytitle,
      title = title,
      font = font,
      stroke = stroke,
      strokeWidth = strokeWidth,
      width = width,
      height = height,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      xtitleFontSize = xtitleFontSize,
      ytitleFontSize = ytitleFontSize,
      titleFontSize = titleFontSize,
      bgcol = bgcol,
      opacity = opacity,
      axisCol = axisCol
    )
  )
}
