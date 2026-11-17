#' Create an interactive lollipop chart
#'
#' A lighter alternative to \code{\link{bar_chart}()}: each value is drawn as
#' a thin stem ending in a dot. The data can be one row per category, or raw
#' rows that are aggregated for you (\code{agg}); leave \code{y} empty to count
#' rows. With \code{group}, each category gets one lollipop per group, side by
#' side. Lollipops grow in when the chart is drawn, show their values, and can
#' be re-sorted from the chart itself.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a lollipop to see its value, its share of the total and its
#'     rank; with \code{group}, the tooltip lists every group for that
#'     category.
#'   \item The buttons at the top right switch between the original order,
#'     largest first and smallest first.
#'   \item Click a legend entry to hide or show a group, double-click it to
#'     isolate it. Hovering a legend entry highlights the group.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a lollipop sets \code{input$id_clicked} to a list with the
#' \code{category} and \code{group} of the lollipop. The sort order and the
#' hidden groups are kept when the chart is re-rendered.
#'
#' @inheritParams bar_chart
#' @param x The name of the categorical variable (one lollipop per value),
#'   plotted along the x-axis.
#' @param y The name of the numeric variable, plotted along the y-axis. When
#'   \code{NULL}, the rows of each category are counted.
#' @param sort The initial order of the lollipops: \code{"none"} (default, the
#'   order of the data or of the factor levels), \code{"ascending"} or
#'   \code{"descending"}. With \code{group}, categories are sorted by their
#'   total.
#' @param xticks Not used; kept for compatibility.
#' @param yticks Optional. The approximate number of y-axis ticks.
#' @param xFontSize The font size of the category labels. Defaults to 11.
#' @param yFontSize The font size of the value axis labels. Defaults to 11.
#' @param lineStroke Optional. The colour of the stems. Defaults to the colour
#'   of the dots.
#' @param lineStrokeWidth The width of the stems, in pixels. Defaults to 2.
#' @param circleFill The colour of the dots. A single colour, or, without
#'   \code{group}, one colour per category (recycled; a named vector maps
#'   colours to categories). With \code{group}, one colour per group (a named
#'   vector maps colours to groups). Defaults to a built-in palette.
#' @param circleStroke Optional. The colour of the ring around the dots.
#'   Defaults to the background colour.
#' @param circleStrokeWidth The width of the ring around the dots. Defaults to
#'   1.5.
#' @param circleRadius The radius of the dots, in pixels. Defaults to 6. Dots
#'   are made smaller when there is not enough room for them.
#' @param opacity The opacity of the lollipops (from 0 to 1). Defaults to 1.
#' @param labels Logical. Write the values next to the dots (when every label
#'   fits). Defaults to \code{TRUE}.
#' @param highlight Optional. A character vector of categories to emphasise;
#'   the other lollipops are drawn in grey (or faded, with \code{group}).
#' @param negativeFill Optional. The colour of negative lollipops (without
#'   \code{group}).
#' @param group Optional. The name of a column that splits each category into
#'   groups, drawn side by side (one colour per group, with a clickable
#'   legend).
#' @param controls Logical. Show the sort buttons. Defaults to \code{TRUE}.
#' @param animate Logical. Animate the lollipops when the chart is first
#'   drawn. Defaults to \code{TRUE}.
#'
#' @return An interactive SVG lollipop chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for data wrangling
#'
#' mpg %>% group_by(drv) %>%
#'   summarise(median_cty = median(cty)) %>%
#'   lollipop_chart(
#'     x = "drv",
#'     y = "median_cty",
#'     sort = "ascending",
#'     xtitle = "drv variable",
#'     ytitle = "median cty",
#'     title = "Median cty per drv"
#'   )
#'
#' # Aggregate raw rows directly, and highlight two categories
#' lollipop_chart(
#'   mpg, x = "manufacturer", y = "hwy", agg = "median",
#'   sort = "descending", highlight = c("honda", "toyota"),
#'   title = "Median highway miles per gallon"
#' )
#'
#' # One lollipop per group
#' lollipop_chart(
#'   mpg, x = "class", y = "cty", group = "year", agg = "mean",
#'   valueFormat = ".1f", title = "City miles per gallon, 1999 and 2008"
#' )
#'
lollipop_chart <- function(data,
                           x,
                           y = NULL,
                           sort = "none",
                           bgcol = "white",
                           xticks = NULL,
                           yticks = NULL,
                           xFontSize = 11,
                           yFontSize = 11,
                           font = "Verdana, Geneva, Tahoma, sans-serif",
                           xtitle = NULL,
                           xtitleFontSize = 13,
                           ytitle = NULL,
                           ytitleFontSize = 13,
                           title = NULL,
                           titleFontSize = 20,
                           lineStroke = NULL,
                           lineStrokeWidth = 2,
                           circleFill = NULL,
                           circleStroke = NULL,
                           circleStrokeWidth = 1.5,
                           circleRadius = 6,
                           axisCol = "#333333",
                           width = NULL,
                           height = NULL,
                           group = NULL,
                           agg = c("sum", "mean", "median", "min", "max", "count"),
                           labels = TRUE,
                           highlight = NULL,
                           refLines = NULL,
                           negativeFill = NULL,
                           legend = NULL,
                           controls = TRUE,
                           tooltip = TRUE,
                           animate = TRUE,
                           valueFormat = NULL,
                           valuePrefix = "",
                           valueSuffix = "",
                           subtitle = NULL,
                           subtitleFontSize = 13,
                           gridCol = "#e9e9e9",
                           opacity = 1
                           ) {

  if (!is.data.frame(data) || !is.character(x) || length(x) != 1 || is.null(data[[x]]) ||
      (!is.null(y) && (!is.character(y) || length(y) != 1 || is.null(data[[y]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  lollipop_widget(
    data = data, cat = x, val = y, orientation = "vertical", sort = sort,
    catFontSize = xFontSize, valFontSize = yFontSize, valTicks = yticks,
    catTitle = xtitle, catTitleFontSize = xtitleFontSize,
    valTitle = ytitle, valTitleFontSize = ytitleFontSize,
    title = title, titleFontSize = titleFontSize,
    subtitle = subtitle, subtitleFontSize = subtitleFontSize,
    lineStroke = lineStroke, lineStrokeWidth = lineStrokeWidth,
    circleFill = circleFill, circleStroke = circleStroke,
    circleStrokeWidth = circleStrokeWidth, circleRadius = circleRadius,
    font = font, bgcol = bgcol, opacity = opacity, axisCol = axisCol, gridCol = gridCol,
    width = width, height = height, group = group, agg = match.arg(agg),
    labels = labels, highlight = highlight, refLines = refLines,
    negativeFill = negativeFill, legend = legend, controls = controls,
    tooltip = tooltip, animate = animate, valueFormat = valueFormat,
    valuePrefix = valuePrefix, valueSuffix = valueSuffix
  )
}


# Shared builder for lollipop_chart() and horz_lollipop(): checks the
# lollipop arguments and draws through bar_widget(shape = "lollipop").
# @noRd
lollipop_widget <- function(data, cat, val, orientation, sort,
                            catFontSize, valFontSize, valTicks,
                            catTitle, catTitleFontSize, valTitle, valTitleFontSize,
                            title, titleFontSize, subtitle, subtitleFontSize,
                            lineStroke, lineStrokeWidth, circleFill, circleStroke,
                            circleStrokeWidth, circleRadius,
                            font, bgcol, opacity, axisCol, gridCol, width, height,
                            group, agg, labels, highlight, refLines, negativeFill,
                            legend, controls, tooltip, animate,
                            valueFormat, valuePrefix, valueSuffix) {

  if (!is.numeric(circleRadius) || length(circleRadius) != 1 || circleRadius < 0) {
    stop("'circleRadius' must be a non-negative number")
  }
  if (!is.numeric(lineStrokeWidth) || length(lineStrokeWidth) != 1 || lineStrokeWidth <= 0) {
    stop("'lineStrokeWidth' must be a positive number")
  }
  if (!is.numeric(circleStrokeWidth) || length(circleStrokeWidth) != 1 || circleStrokeWidth < 0) {
    stop("'circleStrokeWidth' must be a non-negative number")
  }
  if (!is.null(lineStroke) && length(lineStroke) != 1) {
    stop("'lineStroke' must be a single colour")
  }

  bar_widget(
    data = data, cat = cat, val = val, orientation = orientation,
    fill = circleFill, sort = sort, paddingWidth = 0.2,
    catFontSize = catFontSize, valFontSize = valFontSize, valTicks = valTicks,
    catTitle = catTitle, catTitleFontSize = catTitleFontSize,
    valTitle = valTitle, valTitleFontSize = valTitleFontSize,
    title = title, titleFontSize = titleFontSize,
    subtitle = subtitle, subtitleFontSize = subtitleFontSize,
    stroke = NULL, strokeWidth = NULL, font = font, bgcol = bgcol,
    opacity = opacity, axisCol = axisCol, gridCol = gridCol,
    width = width, height = height,
    group = group, position = "grouped", agg = agg,
    labels = labels, highlight = highlight, refLines = refLines,
    negativeFill = negativeFill, cornerRadius = 0, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    valueFormat = valueFormat, valuePrefix = valuePrefix, valueSuffix = valueSuffix,
    shape = "lollipop", stemWidth = lineStrokeWidth, stemColor = lineStroke,
    dotRadius = circleRadius, dotStroke = circleStroke,
    dotStrokeWidth = circleStrokeWidth
  )
}
