#' Create a dumbbell chart.
#'
#' @description
#' A dumbbell chart (also called a connected dot plot) displays two values per
#' category as dots connected by a horizontal line. It is ideal for showing
#' the change or gap between two groups, time points, or conditions across
#' multiple categories — a clean alternative to grouped bar charts favoured
#' by outlets such as the New York Times and The Economist.
#'
#' @param data The data frame containing the variables to consider.
#' @param x1 The name of the column for the first value (left dot).
#' @param x2 The name of the column for the second value (right dot).
#' @param y The name of the categorical column used as row labels.
#' @param x1_label Legend label for the first value. Defaults to the value of
#' \code{x1}.
#' @param x2_label Legend label for the second value. Defaults to the value of
#' \code{x2}.
#' @param col1 Color of the first dot. Defaults to \code{"steelblue"}.
#' @param col2 Color of the second dot. Defaults to \code{"crimson"}.
#' @param line_col Color of the line connecting the two dots. Defaults to
#' \code{"#aaaaaa"}.
#' @param line_width Width of the connecting line in pixels. Defaults to
#' \code{2}.
#' @param circle_radius Radius of the dots in pixels. Defaults to \code{6}.
#' @param sort Whether to sort the rows. One of \code{"none"} (default),
#' \code{"ascending"}, or \code{"descending"}, ordered by the \code{x1}
#' value.
#' @param xtitle Optional. Title of the x-axis.
#' @param xtitle_font_size Font size of the x-axis title. Defaults to \code{13}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param x_font_size Font size of the x-axis tick labels. Defaults to \code{11}.
#' @param y_font_size Font size of the y-axis category labels. Defaults to
#' \code{11}.
#' @param legend Whether to display a legend. Defaults to \code{TRUE}.
#' @param legend_font_size Font size of the legend text. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of axis lines, ticks, and labels. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG dumbbell chart.
#' @export
#'
#' @examples
#' # Life expectancy change between 1952 and 2007 for selected countries
#' life_exp <- data.frame(
#'   country = c("Brazil", "China", "Egypt", "India",
#'               "Japan", "Mexico", "Nigeria", "Turkey"),
#'   year_1952 = c(50.9, 44.0, 41.9, 37.4, 63.0, 50.8, 36.3, 43.6),
#'   year_2007 = c(72.4, 72.9, 71.3, 64.7, 82.6, 76.2, 46.9, 71.8)
#' )
#'
#' dumbbell_chart(
#'   data     = life_exp,
#'   x1       = "year_1952",
#'   x2       = "year_2007",
#'   y        = "country",
#'   x1_label  = "1952",
#'   x2_label  = "2007",
#'   title    = "Life expectancy: 1952 vs 2007",
#'   xtitle   = "Life expectancy (years)",
#'   sort     = "ascending"
#' )
#'
#' # Comparing city vs highway fuel economy by car class
#' library(ggplot2)
#' library(dplyr)
#'
#' mpg_summary <- summarise(group_by(mpg, class),
#'   city = mean(cty), highway = mean(hwy))
#'
#' dumbbell_chart(
#'   data    = mpg_summary,
#'   x1      = "city",
#'   x2      = "highway",
#'   y       = "class",
#'   x1_label = "City",
#'   x2_label = "Highway",
#'   col1    = "steelblue",
#'   col2    = "darkorange",
#'   title   = "City vs highway fuel economy by class",
#'   xtitle  = "Miles per gallon",
#'   sort    = "ascending"
#' )
dumbbell_chart <- function(
    data,
    x1,
    x2,
    y,
    x1_label       = NULL,
    x2_label       = NULL,
    col1          = "steelblue",
    col2          = "crimson",
    line_col       = "#aaaaaa",
    line_width     = 2,
    circle_radius  = 6,
    sort          = "none",
    xtitle        = NULL,
    xtitle_font_size = 13,
    title         = NULL,
    title_font_size  = 16,
    x_font_size     = 11,
    y_font_size     = 11,
    legend        = TRUE,
    legend_font_size = 11,
    font          = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol         = "white",
    axis_col       = "black",
    width         = NULL,
    height        = NULL
) {

  if (is.null(data[[x1]])) stop("Column '", x1, "' not found in data.")
  if (is.null(data[[x2]])) stop("Column '", x2, "' not found in data.")
  if (is.null(data[[y]]))  stop("Column '", y,  "' not found in data.")

  if (!is.numeric(data[[x1]])) stop("Column '", x1, "' must be numeric.")
  if (!is.numeric(data[[x2]])) stop("Column '", x2, "' must be numeric.")

  if (!sort %in% c("none", "ascending", "descending")) {
    stop("'sort' must be one of 'none', 'ascending', or 'descending'.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(x1_label)) x1_label <- x1
  if (is.null(x2_label)) x2_label <- x2

  r2d3::r2d3(
    data   = data,
    script = ddplot_script("dumbbellchart.js"),
    options = list(
      x1            = x1,
      x2            = x2,
      y             = y,
      x1Label       = x1_label,
      x2Label       = x2_label,
      col1          = col1,
      col2          = col2,
      lineCol       = line_col,
      lineWidth     = line_width,
      circleRadius  = circle_radius,
      sort          = sort,
      xtitle        = xtitle,
      xtitleFontSize = xtitle_font_size,
      title         = title,
      titleFontSize  = title_font_size,
      xFontSize     = x_font_size,
      yFontSize     = y_font_size,
      legend        = legend,
      legendFontSize = legend_font_size,
      font          = font,
      bgcol         = bgcol,
      axisCol       = axis_col
    ),
    width  = width,
    height = height
  )
}
