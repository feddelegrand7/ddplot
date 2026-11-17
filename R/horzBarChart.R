#' Create an interactive horizontal bar chart
#'
#' The horizontal version of \code{\link{bar_chart}()}: categories are listed
#' down the left side, which suits many categories and long labels. It has
#' the same features (groups, stacking, aggregation, value labels, sorting
#' and layout buttons, tooltips, legend); see \code{\link{bar_chart}()} for
#' the interactions and the Shiny inputs.
#'
#' @inheritParams bar_chart
#' @param value The name of the numeric variable, plotted along the x-axis.
#'   When \code{NULL}, the rows of each category are counted.
#' @param label The name of the categorical variable, listed on the y-axis.
#' @param fill The colour of the bars. A single colour, or, without
#'   \code{group}, one colour per category (recycled; a named vector maps
#'   colours to categories). With \code{group}, one colour per group (a named
#'   vector maps colours to groups). Defaults to a built-in palette.
#' @param stroke Optional. The stroke colour of the bars.
#' @param strokeWidth Optional. The stroke width of the bars.
#' @param paddingWidth The space between bars, from 0 to 0.99. Defaults to
#'   0.2.
#' @param valueTicks Optional. The approximate number of value axis ticks.
#' @param valueFontSize The font size of the value axis labels. Defaults to 11.
#' @param labelFontSize The font size of the category labels. Defaults to 12.
#' @param valueTitle Optional. The title of the value axis. Defaults to the
#'   name of \code{value} (or "Count"); use \code{""} to hide it.
#' @param valueTitleFontSize The font size of the value axis title. Defaults
#'   to 13.
#' @param labelTitle Optional. The title of the category axis, drawn above the
#'   labels.
#' @param labelTitleFontSize The font size of the category axis title.
#'   Defaults to 13.
#' @param sort The initial order of the bars: \code{"none"} (default, the
#'   order of the data or of the factor levels), \code{"ascending"} or
#'   \code{"descending"}. Descending puts the largest bar at the top.
#' @param bgcol The background color of the SVG. Defaults to "white".
#'
#' @return An interactive SVG horizontal bar chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for the data wrangling process
#'
#' mpg %>% group_by(manufacturer) %>%
#'   summarise(median_hwy = median(hwy)) %>%
#'   horz_bar_chart(
#'     label = "manufacturer",
#'     value = "median_hwy",
#'     sort = "descending",
#'     title = "Median highway miles per gallon"
#'   )
#'
#' # 100% stacked bars from raw rows
#' horz_bar_chart(
#'   data = mpg,
#'   label = "manufacturer",
#'   group = "drv",
#'   position = "percent",
#'   sort = "descending",
#'   title = "Drive train by manufacturer"
#' )
#'
#' # Positive and negative values
#' change <- data.frame(
#'   country = c("Spain", "France", "Italy", "Germany", "Poland", "Sweden"),
#'   growth  = c(2.4, 0.9, -0.3, -0.6, 3.1, 1.2)
#' )
#' horz_bar_chart(
#'   change, label = "country", value = "growth",
#'   sort = "descending", negativeFill = "#ff725c",
#'   valueSuffix = "%", valueTitle = "GDP growth",
#'   title = "Annual GDP growth"
#' )
#'
horz_bar_chart <- function(data,
                           label,
                           value = NULL,
                           fill = NULL,
                           sort = "none",
                           paddingWidth = 0.2,
                           stroke = NULL,
                           strokeWidth = NULL,
                           bgcol = "white",
                           valueTicks = NULL,
                           valueFontSize = 11,
                           labelFontSize = 12,
                           valueTitle = NULL,
                           valueTitleFontSize = 13,
                           labelTitle = NULL,
                           labelTitleFontSize = 13,
                           font = "Verdana, Geneva, Tahoma, sans-serif",
                           title = NULL,
                           titleFontSize = 20,
                           opacity = 1,
                           axisCol = "#333333",
                           width = NULL,
                           height = NULL,
                           group = NULL,
                           position = c("grouped", "stacked", "percent"),
                           agg = c("sum", "mean", "median", "min", "max", "count"),
                           labels = TRUE,
                           highlight = NULL,
                           refLines = NULL,
                           negativeFill = NULL,
                           cornerRadius = 3,
                           legend = NULL,
                           controls = TRUE,
                           tooltip = TRUE,
                           animate = TRUE,
                           valueFormat = NULL,
                           valuePrefix = "",
                           valueSuffix = "",
                           subtitle = NULL,
                           subtitleFontSize = 13,
                           gridCol = "#e9e9e9"
                           ) {

  if (!is.data.frame(data) || !is.character(label) || length(label) != 1 || is.null(data[[label]]) ||
      (!is.null(value) && (!is.character(value) || length(value) != 1 || is.null(data[[value]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  bar_widget(
    data = data, cat = label, val = value, orientation = "horizontal",
    fill = fill, sort = sort, paddingWidth = paddingWidth,
    catFontSize = labelFontSize, valFontSize = valueFontSize, valTicks = valueTicks,
    catTitle = labelTitle, catTitleFontSize = labelTitleFontSize,
    valTitle = valueTitle, valTitleFontSize = valueTitleFontSize,
    title = title, titleFontSize = titleFontSize,
    subtitle = subtitle, subtitleFontSize = subtitleFontSize,
    stroke = stroke, strokeWidth = strokeWidth, font = font, bgcol = bgcol,
    opacity = opacity, axisCol = axisCol, gridCol = gridCol,
    width = width, height = height,
    group = group, position = match.arg(position), agg = match.arg(agg),
    labels = labels, highlight = highlight, refLines = refLines,
    negativeFill = negativeFill, cornerRadius = cornerRadius, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    valueFormat = valueFormat, valuePrefix = valuePrefix, valueSuffix = valueSuffix
  )
}
