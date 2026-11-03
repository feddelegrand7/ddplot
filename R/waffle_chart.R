#' Create a waffle chart.
#'
#' @description
#' A waffle chart is a grid of squares (by default 10 x 10 = 100 cells) in
#' which each category fills a number of cells proportional to its share of
#' the whole. Each cell therefore reads as "one percent" (or one unit of the
#' total), which makes part-to-whole comparisons far easier to read than a pie
#' chart. The format is a staple of Pew Research Center, FiveThirtyEight,
#' The Economist and the Washington Post, and was popularised in R by Bob
#' Rudis's \code{waffle} package.
#'
#' Cells are allocated with the largest-remainder method, so the cell counts
#' always add up exactly to \code{rows * cols}. Unlike
#' \code{\link{parliament_chart}}, which draws individual seats along a
#' hemicycle, a waffle chart uses a rectangular grid to show proportions of a
#' whole rather than absolute counts.
#'
#' @param data The data frame containing the variables to consider. It should
#' contain one row per category.
#' @param category The name of the categorical column used as labels.
#' @param value The name of the numeric (non-negative) column holding each
#' category's value.
#' @param rows Number of rows in the grid. Defaults to \code{10}.
#' @param cols Number of columns in the grid. Defaults to \code{10}. The total
#' number of cells is \code{rows * cols}.
#' @param total Optional. The value represented by the whole grid. Defaults to
#' the sum of \code{value}. When larger than that sum, the remaining cells are
#' left unfilled and drawn with \code{emptyCol}.
#' @param colors Optional. A character vector of colors, one per category
#' (recycled if shorter). Defaults to a Tableau-10 style palette.
#' @param emptyCol Color of the unfilled cells. Defaults to \code{"#e5e5e5"}.
#' @param cellPadding Gap between cells in pixels. Defaults to \code{2}.
#' @param cellRadius Corner radius of each cell in pixels. Defaults to
#' \code{2}. Use \code{0} for sharp squares.
#' @param direction Fill direction. \code{"row"} (default) fills row by row
#' starting from the bottom-left corner (the Pew Research style), \code{"col"}
#' fills column by column starting from the bottom-left corner.
#' @param legend Whether to display a legend showing each category and its
#' percentage. Defaults to \code{TRUE}.
#' @param legendFontSize Font size of the legend text. Defaults to \code{12}.
#' @param hover Whether hovering a cell or a legend entry highlights that
#' category and shows a label with its value and percentage. Defaults to
#' \code{TRUE}.
#' @param animate Whether the cells pop in sequentially when the chart loads.
#' Defaults to \code{TRUE}.
#' @param animationDuration Total duration of the load animation in
#' milliseconds. Defaults to \code{1200}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param textCol Color of the title and legend text. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG waffle chart.
#' @export
#'
#' @examples
#' # How respondents answered a survey question
#' survey <- data.frame(
#'   response = c("Strongly agree", "Agree", "Neutral",
#'                "Disagree", "Strongly disagree"),
#'   n = c(312, 405, 158, 87, 38)
#' )
#'
#' waffle_chart(
#'   data     = survey,
#'   category = "response",
#'   value    = "n",
#'   colors   = c("#1a9641", "#a6d96a", "#bdbdbd", "#fdae61", "#d7191c"),
#'   title    = "Do you support the new policy?"
#' )
#'
#' # Share of the world population by continent in 2007, filled by column
#' library(gapminder)
#'
#' pop_2007 <- gapminder[gapminder$year == 2007, ]
#' pop_continent <- aggregate(pop ~ continent, data = pop_2007, FUN = sum)
#'
#' waffle_chart(
#'   data      = pop_continent,
#'   category  = "continent",
#'   value     = "pop",
#'   direction = "col",
#'   rows      = 10,
#'   cols      = 20,
#'   title     = "World population by continent, 2007"
#' )
waffle_chart <- function(
    data,
    category,
    value,
    rows              = 10,
    cols              = 10,
    total             = NULL,
    colors            = NULL,
    emptyCol          = "#e5e5e5",
    cellPadding       = 2,
    cellRadius        = 2,
    direction         = "row",
    legend            = TRUE,
    legendFontSize    = 12,
    hover             = TRUE,
    animate           = TRUE,
    animationDuration = 1200,
    title             = NULL,
    titleFontSize     = 16,
    font              = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol             = "white",
    textCol           = "black",
    width             = NULL,
    height            = NULL
) {

  if (is.null(data[[category]])) stop("Column '", category, "' not found in data.")
  if (is.null(data[[value]]))    stop("Column '", value,    "' not found in data.")

  if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  if (any(data[[value]] < 0, na.rm = TRUE)) {
    stop("Column '", value, "' must not contain negative values.")
  }

  is_count <- function(x) {
    is.numeric(x) && length(x) == 1 && !is.na(x) && x >= 1 && x == round(x)
  }
  if (!is_count(rows)) stop("'rows' must be a single positive whole number.")
  if (!is_count(cols)) stop("'cols' must be a single positive whole number.")

  if (!direction %in% c("row", "col")) {
    stop("'direction' must be one of 'row' or 'col'.")
  }

  value_sum <- sum(data[[value]], na.rm = TRUE)

  if (!is.null(total)) {
    if (!is.numeric(total) || length(total) != 1 || is.na(total) || total <= 0) {
      stop("'total' must be a single positive number.")
    }
    if (total < value_sum) {
      stop("'total' (", total, ") must be greater than or equal to the sum of '",
           value, "' (", value_sum, ").")
    }
  }

  if (!is.numeric(animationDuration) || animationDuration < 0) {
    stop("'animationDuration' must be a non-negative number.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(colors)) {
    colors <- c("#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
                "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac")
  }
  n_cat <- nrow(data)
  if (n_cat > 0) colors <- rep_len(colors, n_cat)

  plot_data <- data.frame(
    category = as.character(data[[category]]),
    value    = data[[value]],
    stringsAsFactors = FALSE
  )

  r2d3::r2d3(
    data   = plot_data,
    script = ddplot_script("wafflechart.js"),
    options = list(
      rows              = rows,
      cols              = cols,
      total             = total,
      colors            = as.list(colors),
      emptyCol          = emptyCol,
      cellPadding       = cellPadding,
      cellRadius        = cellRadius,
      direction         = direction,
      legend            = legend,
      legendFontSize    = legendFontSize,
      hover             = hover,
      animate           = animate,
      animationDuration = animationDuration,
      title             = title,
      titleFontSize     = titleFontSize,
      font              = font,
      bgcol             = bgcol,
      textCol           = textCol
    ),
    width  = width,
    height = height
  )
}
