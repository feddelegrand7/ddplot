#' Create a slope chart.
#'
#' @description
#' A slope chart (or slopegraph) compares two values per category by placing
#' them on two vertical axes, typically "before" and "after" or two years,
#' and connecting them with a straight line. The steepness and direction of
#' each line show at a glance which categories rose, which fell, and how
#' their ranking changed. The form was popularised by Edward Tufte in
#' \emph{The Visual Display of Quantitative Information} (1983) and is a
#' staple of the New York Times graphics desk.
#'
#' Each line is labelled with its category name and value at both ends;
#' labels that would overlap are nudged apart vertically. Lines can be colored
#' by direction (increase, decrease, no change), a subset of categories can
#' be emphasised with \code{highlight}, and hovering over a line fades the
#' others.
#'
#' @param data The data frame containing the variables to consider, in wide
#' format (one row per category).
#' @param start The name of the numeric column holding the values plotted on
#' the left axis.
#' @param end The name of the numeric column holding the values plotted on
#' the right axis.
#' @param group The name of the column holding the category labels (one line
#' per category).
#' @param start_label Header displayed above the left axis. Defaults to the
#' value of \code{start}.
#' @param end_label Header displayed above the right axis. Defaults to the
#' value of \code{end}.
#' @param color_by_direction Whether to color lines by direction of change
#' (\code{up_col}, \code{down_col}, \code{flat_col}). If \code{FALSE}, every
#' line uses \code{line_col}. Defaults to \code{TRUE}.
#' @param up_col Color of lines that increase. Defaults to \code{"#1a9850"}.
#' @param down_col Color of lines that decrease. Defaults to \code{"#d73027"}.
#' @param flat_col Color of lines with no change. Defaults to \code{"#888888"}.
#' @param line_col Color of all lines when \code{color_by_direction = FALSE}.
#' Defaults to \code{"steelblue"}.
#' @param highlight Optional. A character vector of categories (values of the
#' \code{group} column) to emphasise. All other lines are drawn in
#' \code{muted_col}. Defaults to \code{NULL} (no emphasis).
#' @param muted_col Color of non-highlighted lines when \code{highlight} is
#' used (their labels are drawn semi-transparent). Defaults to
#' \code{"#cccccc"}.
#' @param line_width Width of the lines in pixels. Defaults to \code{2}.
#' @param circle_radius Radius of the end-point dots in pixels. Defaults to
#' \code{4}. Use \code{0} to hide the dots.
#' @param show_values Whether to print the value next to each category label.
#' Defaults to \code{TRUE}.
#' @param digits Optional. Number of decimal places used to print the values.
#' Defaults to \code{NULL}, which prints the values as they are.
#' @param label_font_size Font size of the category and value labels. Defaults
#' to \code{11}.
#' @param header_font_size Font size of the two axis headers. Defaults to
#' \code{13}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of the two vertical axes, the headers, the title and
#' the labels. Defaults to \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG slope chart.
#' @export
#'
#' @examples
#' # Current receipts of government as a percentage of GDP, 1970 vs 1979
#' # (adapted from Edward Tufte's classic slopegraph)
#' receipts <- data.frame(
#'   country = c("Sweden", "Netherlands", "Norway", "Britain", "France",
#'               "Germany", "Belgium", "Canada", "Finland", "Italy",
#'               "United States", "Greece", "Switzerland", "Spain", "Japan"),
#'   y1970 = c(46.9, 44.0, 43.5, 40.7, 39.0, 37.5, 35.2, 35.2, 34.9, 30.4,
#'             30.3, 26.8, 26.5, 22.5, 20.7),
#'   y1979 = c(57.4, 55.8, 52.2, 39.0, 43.4, 42.9, 43.2, 35.8, 38.2, 35.7,
#'             32.5, 30.6, 33.2, 27.1, 26.6)
#' )
#'
#' slope_chart(
#'   data       = receipts,
#'   start      = "y1970",
#'   end        = "y1979",
#'   group      = "country",
#'   start_label = "1970",
#'   end_label   = "1979",
#'   digits     = 1,
#'   title      = "Government receipts as % of GDP",
#'   height     = 520
#' )
#'
#' # Life expectancy in 1952 vs 2007, highlighting two countries
#' library(gapminder)
#' library(dplyr)
#' library(tidyr)
#'
#' countries <- c("China", "India", "Japan", "Brazil", "Nigeria",
#'                "Egypt", "Germany", "United States", "South Africa")
#'
#' life <- filter(gapminder, year %in% c(1952, 2007), country %in% countries)
#' life <- select(life, country, year, lifeExp)
#' life <- pivot_wider(life, names_from = year, values_from = lifeExp,
#'                     names_prefix = "y")
#'
#' slope_chart(
#'   data       = life,
#'   start      = "y1952",
#'   end        = "y2007",
#'   group      = "country",
#'   start_label = "1952",
#'   end_label   = "2007",
#'   highlight  = c("China", "South Africa"),
#'   digits     = 1,
#'   title      = "Life expectancy: 1952 vs 2007"
#' )
slope_chart <- function(
    data,
    start,
    end,
    group,
    start_label       = NULL,
    end_label         = NULL,
    color_by_direction = TRUE,
    up_col            = "#1a9850",
    down_col          = "#d73027",
    flat_col          = "#888888",
    line_col          = "steelblue",
    highlight        = NULL,
    muted_col         = "#cccccc",
    line_width        = 2,
    circle_radius     = 4,
    show_values       = TRUE,
    digits           = NULL,
    label_font_size    = 11,
    header_font_size   = 13,
    title            = NULL,
    title_font_size    = 16,
    font             = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol            = "white",
    axis_col          = "black",
    width            = NULL,
    height           = NULL
) {

  if (is.null(data[[start]])) stop("Column '", start, "' not found in data.")
  if (is.null(data[[end]]))   stop("Column '", end,   "' not found in data.")
  if (is.null(data[[group]])) stop("Column '", group, "' not found in data.")

  if (!is.numeric(data[[start]])) stop("Column '", start, "' must be numeric.")
  if (!is.numeric(data[[end]]))   stop("Column '", end,   "' must be numeric.")

  if (!is.null(highlight) && !is.character(highlight)) {
    stop("'highlight' must be NULL or a character vector of categories.")
  }

  if (!is.null(highlight) && !any(highlight %in% as.character(data[[group]]))) {
    warning("None of the 'highlight' values were found in column '", group, "'.")
  }

  if (!is.null(digits) &&
      (!is.numeric(digits) || length(digits) != 1 || digits < 0)) {
    stop("'digits' must be NULL or a single non-negative number.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(start_label)) start_label <- start
  if (is.null(end_label))   end_label   <- end

  r2d3::r2d3(
    data   = data,
    script = ddplot_script("slopechart.js"),
    options = list(
      start            = start,
      end              = end,
      group            = group,
      startLabel       = start_label,
      endLabel         = end_label,
      colorByDirection = color_by_direction,
      upCol            = up_col,
      downCol          = down_col,
      flatCol          = flat_col,
      lineCol          = line_col,
      highlight        = as.list(highlight),
      mutedCol         = muted_col,
      lineWidth        = line_width,
      circleRadius     = circle_radius,
      showValues       = show_values,
      digits           = digits,
      labelFontSize    = label_font_size,
      headerFontSize   = header_font_size,
      title            = title,
      titleFontSize    = title_font_size,
      font             = font,
      bgcol            = bgcol,
      axisCol          = axis_col
    ),
    width  = width,
    height = height
  )
}
