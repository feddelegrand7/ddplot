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
#' @param x_ticks Not used; kept for compatibility.
#' @param y_ticks Optional. The approximate number of y-axis ticks.
#' @param x_font_size The font size of the category labels. Defaults to 11.
#' @param y_font_size The font size of the value axis labels. Defaults to 11.
#' @param line_stroke Optional. The colour of the stems. Defaults to the colour
#'   of the dots.
#' @param line_stroke_width The width of the stems, in pixels. Defaults to 2.
#' @param circle_fill The colour of the dots. A single colour, or, without
#'   \code{group}, one colour per category (recycled; a named vector maps
#'   colours to categories). With \code{group}, one colour per group (a named
#'   vector maps colours to groups). Defaults to a built-in palette.
#' @param circle_stroke Optional. The colour of the ring around the dots.
#'   Defaults to the background colour.
#' @param circle_stroke_width The width of the ring around the dots. Defaults to
#'   1.5.
#' @param circle_radius The radius of the dots, in pixels. Defaults to 6. Dots
#'   are made smaller when there is not enough room for them.
#' @param opacity The opacity of the lollipops (from 0 to 1). Defaults to 1.
#' @param labels Logical. Write the values next to the dots (when every label
#'   fits). Defaults to \code{TRUE}.
#' @param highlight Optional. A character vector of categories to emphasise;
#'   the other lollipops are drawn in grey (or faded, with \code{group}).
#' @param negative_fill Optional. The colour of negative lollipops (without
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
#'     x_title = "drv variable",
#'     y_title = "median cty",
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
#'   value_format = ".1f", title = "City miles per gallon, 1999 and 2008"
#' )
#'
lollipop_chart <- function(data,
                           x,
                           y = NULL,
                           sort = "none",
                           bg_col = "white",
                           x_ticks = NULL,
                           y_ticks = NULL,
                           x_font_size = 11,
                           y_font_size = 11,
                           font = "Verdana, Geneva, Tahoma, sans-serif",
                           x_title = NULL,
                           x_title_font_size = 13,
                           y_title = NULL,
                           y_title_font_size = 13,
                           title = NULL,
                           title_font_size = 20,
                           line_stroke = NULL,
                           line_stroke_width = 2,
                           circle_fill = NULL,
                           circle_stroke = NULL,
                           circle_stroke_width = 1.5,
                           circle_radius = 6,
                           axis_col = "#333333",
                           width = NULL,
                           height = NULL,
                           group = NULL,
                           agg = c("sum", "mean", "median", "min", "max", "count"),
                           labels = TRUE,
                           highlight = NULL,
                           ref_lines = NULL,
                           negative_fill = NULL,
                           legend = NULL,
                           controls = TRUE,
                           tooltip = TRUE,
                           animate = TRUE,
                           value_format = NULL,
                           value_prefix = "",
                           value_suffix = "",
                           subtitle = NULL,
                           subtitle_font_size = 13,
                           grid_col = "#e9e9e9",
                           opacity = 1
                           ) {

  if (!is.data.frame(data) || !is.character(x) || length(x) != 1 || is.null(data[[x]]) ||
      (!is.null(y) && (!is.character(y) || length(y) != 1 || is.null(data[[y]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  lollipop_widget(
    data = data, cat = x, val = y, orientation = "vertical", sort = sort,
    cat_font_size = x_font_size, val_font_size = y_font_size, val_ticks = y_ticks,
    cat_title = x_title, cat_title_font_size = x_title_font_size,
    val_title = y_title, val_title_font_size = y_title_font_size,
    title = title, title_font_size = title_font_size,
    subtitle = subtitle, subtitle_font_size = subtitle_font_size,
    line_stroke = line_stroke, line_stroke_width = line_stroke_width,
    circle_fill = circle_fill, circle_stroke = circle_stroke,
    circle_stroke_width = circle_stroke_width, circle_radius = circle_radius,
    font = font, bg_col = bg_col, opacity = opacity, axis_col = axis_col, grid_col = grid_col,
    width = width, height = height, group = group, agg = match.arg(agg),
    labels = labels, highlight = highlight, ref_lines = ref_lines,
    negative_fill = negative_fill, legend = legend, controls = controls,
    tooltip = tooltip, animate = animate, value_format = value_format,
    value_prefix = value_prefix, value_suffix = value_suffix
  )
}


# Shared builder for lollipop_chart() and horz_lollipop(): checks the
# lollipop arguments and draws through bar_widget(shape = "lollipop").
# @noRd
lollipop_widget <- function(data, cat, val, orientation, sort,
                            cat_font_size, val_font_size, val_ticks,
                            cat_title, cat_title_font_size, val_title, val_title_font_size,
                            title, title_font_size, subtitle, subtitle_font_size,
                            line_stroke, line_stroke_width, circle_fill, circle_stroke,
                            circle_stroke_width, circle_radius,
                            font, bg_col, opacity, axis_col, grid_col, width, height,
                            group, agg, labels, highlight, ref_lines, negative_fill,
                            legend, controls, tooltip, animate,
                            value_format, value_prefix, value_suffix) {

  if (!is.numeric(circle_radius) || length(circle_radius) != 1 || circle_radius < 0) {
    stop("'circle_radius' must be a non-negative number")
  }
  if (!is.numeric(line_stroke_width) || length(line_stroke_width) != 1 || line_stroke_width <= 0) {
    stop("'line_stroke_width' must be a positive number")
  }
  if (!is.numeric(circle_stroke_width) || length(circle_stroke_width) != 1 || circle_stroke_width < 0) {
    stop("'circle_stroke_width' must be a non-negative number")
  }
  if (!is.null(line_stroke) && length(line_stroke) != 1) {
    stop("'line_stroke' must be a single colour")
  }

  bar_widget(
    data = data, cat = cat, val = val, orientation = orientation,
    fill = circle_fill, sort = sort, padding_width = 0.2,
    cat_font_size = cat_font_size, val_font_size = val_font_size, val_ticks = val_ticks,
    cat_title = cat_title, cat_title_font_size = cat_title_font_size,
    val_title = val_title, val_title_font_size = val_title_font_size,
    title = title, title_font_size = title_font_size,
    subtitle = subtitle, subtitle_font_size = subtitle_font_size,
    stroke = NULL, stroke_width = NULL, font = font, bg_col = bg_col,
    opacity = opacity, axis_col = axis_col, grid_col = grid_col,
    width = width, height = height,
    group = group, position = "grouped", agg = agg,
    labels = labels, highlight = highlight, ref_lines = ref_lines,
    negative_fill = negative_fill, corner_radius = 0, legend = legend,
    controls = controls, tooltip = tooltip, animate = animate,
    value_format = value_format, value_prefix = value_prefix, value_suffix = value_suffix,
    shape = "lollipop", stem_width = line_stroke_width, stem_color = line_stroke,
    dot_radius = circle_radius, dot_stroke = circle_stroke,
    dot_stroke_width = circle_stroke_width
  )
}
