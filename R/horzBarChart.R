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
#' @param stroke_width Optional. The stroke width of the bars.
#' @param padding_width The space between bars, from 0 to 0.99. Defaults to
#'   0.2.
#' @param value_ticks Optional. The approximate number of value axis ticks.
#' @param value_font_size The font size of the value axis labels. Defaults to 11.
#' @param label_font_size The font size of the category labels. Defaults to 12.
#' @param value_title Optional. The title of the value axis. Defaults to the
#'   name of \code{value} (or "Count"); use \code{""} to hide it.
#' @param value_title_font_size The font size of the value axis title. Defaults
#'   to 13.
#' @param label_title Optional. The title of the category axis, drawn above the
#'   labels.
#' @param label_title_font_size The font size of the category axis title.
#'   Defaults to 13.
#' @param sort The initial order of the bars: \code{"none"} (default, the
#'   order of the data or of the factor levels), \code{"ascending"} or
#'   \code{"descending"}. Descending puts the largest bar at the top.
#' @param bg_col The background color of the SVG. Defaults to "white".
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
#'   sort = "descending", negative_fill = "#ff725c",
#'   value_suffix = "%", value_title = "GDP growth",
#'   title = "Annual GDP growth"
#' )
#'
horz_bar_chart <- function(data,
                           label,
                           value = NULL,
                           fill = NULL,
                           sort = "none",
                           padding_width = 0.2,
                           stroke = NULL,
                           stroke_width = NULL,
                           bg_col = "white",
                           value_ticks = NULL,
                           value_font_size = 11,
                           label_font_size = 12,
                           value_title = NULL,
                           value_title_font_size = 13,
                           label_title = NULL,
                           label_title_font_size = 13,
                           font = "Verdana, Geneva, Tahoma, sans-serif",
                           title = NULL,
                           title_font_size = 20,
                           opacity = 1,
                           axis_col = "#333333",
                           width = NULL,
                           height = NULL,
                           group = NULL,
                           position = c("grouped", "stacked", "percent"),
                           agg = c("sum", "mean", "median", "min", "max", "count"),
                           labels = TRUE,
                           highlight = NULL,
                           ref_lines = NULL,
                           negative_fill = NULL,
                           corner_radius = 3,
                           legend = NULL,
                           controls = TRUE,
                           tooltip = TRUE,
                           animate = TRUE,
                           value_format = NULL,
                           value_prefix = "",
                           value_suffix = "",
                           subtitle = NULL,
                           subtitle_font_size = 13,
                           grid_col = "#e9e9e9"
                           ) {

  if (!is.data.frame(data) || !is.character(label) || length(label) != 1 || is.null(data[[label]]) ||
      (!is.null(value) && (!is.character(value) || length(value) != 1 || is.null(data[[value]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  bar_widget(
    data = data, cat = label, val = value, orientation = "horizontal",
    fill = fill, sort = sort, padding_width = padding_width,
    cat_font_size = label_font_size, val_font_size = value_font_size, val_ticks = value_ticks,
    cat_title = label_title, cat_title_font_size = label_title_font_size,
    val_title = value_title, val_title_font_size = value_title_font_size,
    title = title, title_font_size = title_font_size,
    subtitle = subtitle, subtitle_font_size = subtitle_font_size,
    stroke = stroke, stroke_width = stroke_width, font = font, bg_col = bg_col,
    opacity = opacity, axis_col = axis_col, grid_col = grid_col,
    width = width, height = height,
    group = group, position = match.arg(position), agg = match.arg(agg),
    labels = labels, highlight = highlight, ref_lines = ref_lines,
    negative_fill = negative_fill, corner_radius = corner_radius, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    value_format = value_format, value_prefix = value_prefix, value_suffix = value_suffix
  )
}
