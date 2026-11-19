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
#' @param value_ticks Optional. The approximate number of value axis ticks.
#' @param label_ticks Not used; kept for compatibility.
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
#'   ref_lines = c(Average = mean(counts$n)),
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
#'   sort = "descending", negative_fill = "#ff725c",
#'   value_suffix = "%", value_title = "GDP growth",
#'   title = "Annual GDP growth"
#' )
#'
horz_lollipop <- function(data,
                          label,
                          value = NULL,
                          sort = "none",
                          bg_col = "white",
                          value_ticks = NULL,
                          label_ticks = NULL,
                          value_font_size = 11,
                          label_font_size = 12,
                          font = "Verdana, Geneva, Tahoma, sans-serif",
                          value_title = NULL,
                          value_title_font_size = 13,
                          label_title = NULL,
                          label_title_font_size = 13,
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

  if (!is.data.frame(data) || !is.character(label) || length(label) != 1 || is.null(data[[label]]) ||
      (!is.null(value) && (!is.character(value) || length(value) != 1 || is.null(data[[value]])))) {
    stop("Please check that x and y belong to the specified data frame")
  }

  lollipop_widget(
    data = data, cat = label, val = value, orientation = "horizontal", sort = sort,
    cat_font_size = label_font_size, val_font_size = value_font_size, val_ticks = value_ticks,
    cat_title = label_title, cat_title_font_size = label_title_font_size,
    val_title = value_title, val_title_font_size = value_title_font_size,
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
