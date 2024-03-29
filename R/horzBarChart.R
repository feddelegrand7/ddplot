
#' Create a horizontal bar chart
#'
#' @param data The data frame containing the variables to consider.
#' @param value The numeric variable to consider. Will be plotted on the x-axis.
#' @param label The categorical variable to consider. Will be plotted on the y-axis.
#' @param fill The color of the bars. Defaults to 'crimson'.
#' @param stroke Optional. The color of the stroke of the bars.
#' @param strokeWidth The width of the stroke of the bars. Defaults to 1 when the 'stroke' parameter is used.
#' @param paddingWidth The distance between each bar.
#' The value goes from 0 to 0.99 included. Defaults to 0.1.
#' @param valueTicks Optional. the number of x-axis ticks to consider.
#' @param valueFontSize  The font size of the x-axis values. Defaults to 10.
#' @param labelFontSize The font size of the y-axis labels. Defaults to 10.
#' @param valueTitle Optional. The title of the x-axis.
#' @param valueTitleFontSize The font size of the x-axis title if specified. Defaults to 14.
#' @param labelTitle Optional. The title of the y-axis.
#' @param labelTitleFontSize The font size of the y-axis title. Defaults to 14.
#' @param font The font family of the text. Defaults to "Verdana, Geneva, Tahoma, sans-serif"
#' @param title Optional. The title of the overall graphic.
#' @param titleFontSize The font size of the overall graphic's title when specified.
#' @param opacity The color opacity of the bars. Goes from 0 to 1. Defaults to 1.
#' @param axisCol the color of the x and y axis. It includes the ticks, the labels and titles.
#' Defaults to 'black'.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param sort Optional. Takes the following arguments:
#' 'none', 'ascending' or 'descending', default to 'none'
#'
#' @param bgcol Optional. The color of the background, default to:
#' '#CAD0D3'
#'
#' @return A SVG horizontal bar chart.
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for the data wrangling process
#'
#' mpg %>% group_by(manufacturer) %>%
#'  summarise(median_hwy = median(hwy)) %>%
#'  horzBarChart(
#'    label = "manufacturer",
#'    value = "median_hwy",
#'    sort = "ascending"
#'  )

horzBarChart <- function(data,
                         label,
                         value,
                         fill = "crimson",
                         sort = "none",
                         paddingWidth = 0.1,
                         stroke = NULL,
                         strokeWidth = 1,
                         bgcol = "#CAD0D3",
                         valueTicks = NULL,
                         valueFontSize = 10,
                         labelFontSize = 10,
                         valueTitle = NULL,
                         valueTitleFontSize = 14,
                         labelTitle = NULL,
                         labelTitleFontSize = 14,
                         font = "Verdana, Geneva, Tahoma, sans-serif",
                         title = NULL,
                         titleFontSize = 20,
                         opacity = 1,
                         axisCol = "black",
                         width = NULL,
                         height = NULL
                         ) {


  if (is.null(data[[value]]) || is.null(data[[label]])) {
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
      "d3/scatterplot/horzbarchart.js",
      package = "ddplot"
    ),
    options = list(
      value = value,
      label = label,
      fill = fill,
      paddingWidth = paddingWidth,
      valueTicks = valueTicks,
      valueFontSize = valueFontSize,
      labelFontSize = labelFontSize,
      valueTitle = valueTitle,
      valueTitleFontSize = valueTitleFontSize,
      labelTitle = labelTitle,
      labelTitleFontSize = labelTitleFontSize,
      font = font,
      title = title,
      titleFontSize = titleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      opacity = opacity,
      width = width,
      height = height,
      sort = sort,
      bgcol = bgcol,
      axisCol = axisCol
    )
  )


}
