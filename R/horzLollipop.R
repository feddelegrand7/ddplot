#' Create an interactive horizontal lollipop chart
#'
#' The horizontal version of \code{\link{lollipop_chart}()}: categories are
#' listed down the left side, which suits many categories and long labels. It
#' has the same features (groups, aggregation, value labels, sort buttons,
#' tooltips, legend); see \code{\link{lollipop_chart}()} for the interactions
#' and the Shiny inputs.
#'
#' @inheritParams lollipop_chart
#' @param label The name of the categorical variable, listed on the y-axis.
#' @param value The name of the numeric variable, plotted along the x-axis.
#'   When \code{NULL}, the rows of each category are counted.
#' @param sort The initial order of the lollipops: \code{"none"} (default, the
#'   order of the data or of the factor levels), \code{"ascending"} or
#'   \code{"descending"}. Descending puts the largest value at the top.
#' @param valueTicks Optional. The approximate number of value axis ticks.
#' @param labelTicks Not used; kept for compatibility.
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
#'
#' @return An interactive SVG horizontal lollipop chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(ggplot2) # needed for the mpg data frame
#' library(dplyr) # needed for data wrangling
#'
#' mpg %>% group_by(manufacturer) %>%
#'   summarise(median_cty = median(cty)) %>%
#'   horz_lollipop(
#'     label = "manufacturer",
#'     value = "median_cty",
#'     sort = "descending",
#'     title = "Median city miles per gallon"
#'   )
#'
#' # Count rows, with an average line
#' counts <- count(mpg, manufacturer)
#' horz_lollipop(
#'   mpg, label = "manufacturer", sort = "descending",
#'   refLines = c(Average = mean(counts$n)),
#'   title = "Models per manufacturer"
#' )
#'
#' # Positive and negative values
#' change <- data.frame(
#'   country = c("Spain", "France", "Italy", "Germany", "Poland", "Sweden"),
#'   growth  = c(2.4, 0.9, -0.3, -0.6, 3.1, 1.2)
#' )
#' horz_lollipop(
#'   change, label = "country", value = "growth",
#'   sort = "descending", negativeFill = "#ff725c",
#'   valueSuffix = "%", valueTitle = "GDP growth",
#'   title = "Annual GDP growth"
#' )
#'
horz_lollipop <- function(data,
                          label,
                          value = NULL,
                          sort = "none",
                          bgcol = "white",
                          valueTicks = NULL,
                          labelTicks = NULL,
                          valueFontSize = 11,
                          labelFontSize = 12,
                          font = "Verdana, Geneva, Tahoma, sans-serif",
                          valueTitle = NULL,
                          valueTitleFontSize = 13,
                          labelTitle = NULL,
                          labelTitleFontSize = 13,
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

  if (!is.data.frame(data) || !is.character(label) || length(label) != 1 || is.null(data[[label]]) ||
      (!is.null(value) && (!is.character(value) || length(value) != 1 || is.null(data[[value]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  lollipop_widget(
    data = data, cat = label, val = value, orientation = "horizontal", sort = sort,
    catFontSize = labelFontSize, valFontSize = valueFontSize, valTicks = valueTicks,
    catTitle = labelTitle, catTitleFontSize = labelTitleFontSize,
    valTitle = valueTitle, valTitleFontSize = valueTitleFontSize,
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
