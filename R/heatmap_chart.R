#' Create a heatmap
#'
#' Draws a grid of coloured cells, one per combination of two categorical
#' columns, coloured by a value (or by the number of rows when \code{value} is
#' \code{NULL}). Rows sharing the same pair are aggregated. With a
#' \code{midpoint}, the colours diverge around it (useful for correlations or
#' changes); with \code{cluster = TRUE}, the rows and the columns are reordered
#' by hierarchical clustering so that similar ones sit together.
#'
#' @section Interactions:
#' Hover a cell to see its value, outline it, highlight its row and column
#' labels and mark it on the colour legend. Cells fade in diagonally when the
#' chart is drawn. Inside Shiny, clicking a cell sets
#' \code{input$<id>_clicked} to a list with \code{x}, \code{y} and
#' \code{value}.
#'
#' @param data A data frame.
#' @param x,y The names of the columns giving the columns and the rows of the
#'   grid. Factor levels give the order.
#' @param value Optional. The name of a numeric column giving the colour. When
#'   \code{NULL}, cells count the rows of each pair.
#' @param aggregate How to combine several rows of the same pair: \code{"sum"}
#'   (the default), \code{"mean"}, \code{"median"}, \code{"min"} or
#'   \code{"max"}.
#' @param colors The colour ramp, from low to high (two colours or more). By
#'   default a light to dark blue ramp, or red - white - blue with a
#'   \code{midpoint}.
#' @param midpoint Optional. A value at the centre of a diverging colour ramp
#'   (e.g. 0 for correlations). The ramp is symmetric around it.
#' @param cluster Logical. Reorder the rows and columns by hierarchical
#'   clustering (\code{stats::hclust()}). Defaults to FALSE.
#' @param show_values Logical. Write the values in the cells. By default they
#'   are shown when the cells are large enough.
#' @param value_format A d3 format for the values. Defaults to ",.2~f".
#' @param cell_gap The gap between cells in pixels. Defaults to 1.
#' @param cell_radius The corner radius of the cells in pixels. Defaults to 2.
#' @param na_col The colour of missing pairs. Defaults to "#f2f2f2".
#' @param legend Logical. Show the colour legend. Defaults to TRUE.
#' @param x_title,y_title Optional. The titles of the axes.
#' @param axis_title_font_size The font size of the axis titles. Defaults to 12.
#' @param x_font_size,y_font_size The font sizes of the labels. Default to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Fade the cells in when the chart is drawn. Defaults
#'   to TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text. Defaults to "#333333".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' # A correlation matrix
#' cors <- as.data.frame(as.table(cor(mtcars)))
#' names(cors) <- c("var1", "var2", "correlation")
#' heatmap_chart(cors, x = "var1", y = "var2", value = "correlation",
#'               midpoint = 0, cluster = TRUE, title = "Correlations in mtcars")
#'
#' # Average temperature by month and day of the week
#' aq <- airquality
#' aq$Month <- factor(month.abb[aq$Month], levels = month.abb[5:9])
#' aq$Week <- paste("Week", (aq$Day - 1) %/% 7 + 1)
#' heatmap_chart(aq, x = "Month", y = "Week", value = "Temp", aggregate = "mean",
#'               colors = c("#fff3d6", "#ffb15c", "#d6402b"),
#'               value_format = ".0f", title = "Temperature in New York (F)")
#'
#' # Counts of two categorical variables
#' heatmap_chart(ggplot2::mpg, x = "class", y = "manufacturer", show_values = TRUE)
#'
#' @export
heatmap_chart <- function(
    data,
    x,
    y,
    value = NULL,
    aggregate = c("sum", "mean", "median", "min", "max"),
    colors = NULL,
    midpoint = NULL,
    cluster = FALSE,
    show_values = NULL,
    value_format = ",.2~f",
    cell_gap = 1,
    cell_radius = 2,
    na_col = "#f2f2f2",
    legend = TRUE,
    x_title = NULL,
    y_title = NULL,
    axis_title_font_size = 12,
    x_font_size = 11,
    y_font_size = 11,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, x, "x")
  ck_col(data, y, "y")
  ck_col(data, value, "value", numeric = TRUE, null_ok = TRUE)
  aggregate <- match.arg(aggregate)
  if (!is.null(midpoint)) ck_num(midpoint, "midpoint")
  for (a in c("cluster", "legend", "hover", "animate")) ck_flag(get(a), a)
  if (!is.null(show_values)) ck_flag(show_values, "show_values")
  ck_num(cell_gap, "cell_gap", 0)
  ck_num(cell_radius, "cell_radius", 0)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)
  if (is.null(colors)) {
    colors <- if (is.null(midpoint)) c("#eef3fb", "#97bbf5", "#4269d0", "#1c2e6b")
              else c("#c4352b", "#ff9a85", "#f7f7f7", "#97bbf5", "#2b4fb0")
  }
  if (!is.character(colors) || length(colors) < 2) stop("'colors' must have two colours or more")

  xv <- data[[x]]
  yv <- data[[y]]
  vv <- if (is.null(value)) rep(1, nrow(data)) else data[[value]]
  keep <- !is.na(xv) & !is.na(yv) & is.finite(vv)
  if (!any(keep)) stop("'data' has no complete rows")
  x_lev <- ck_levels(xv[keep])
  y_lev <- ck_levels(yv[keep])
  fun <- if (is.null(value)) sum else switch(aggregate, sum = sum, mean = base::mean,
                                              median = stats::median, min = min, max = max)
  cells <- stats::aggregate(list(v = vv[keep]),
                            list(x = as.character(xv[keep]), y = as.character(yv[keep])), fun)
  cells$n <- stats::aggregate(list(n = vv[keep]),
                              list(x = as.character(xv[keep]), y = as.character(yv[keep])), length)$n

  if (cluster && length(x_lev) > 2 && length(y_lev) > 2) {
    mat <- matrix(0, length(y_lev), length(x_lev), dimnames = list(y_lev, x_lev))
    mat[cbind(match(cells$y, y_lev), match(cells$x, x_lev))] <- cells$v
    y_lev <- y_lev[stats::hclust(stats::dist(mat))$order]
    x_lev <- x_lev[stats::hclust(stats::dist(t(mat)))$order]
  }
  cells$i <- match(cells$x, x_lev) - 1L
  cells$j <- match(cells$y, y_lev) - 1L

  r2d3::r2d3(
    data = cells[, c("i", "j", "v", "n")],
    script = chart_script("heatmapchart.js"),
    width = width,
    height = height,
    options = list(
      xLevels = as.list(x_lev),
      yLevels = as.list(y_lev),
      valueName = if (is.null(value)) "Count" else value,
      showCount = !is.null(value) && any(cells$n > 1),
      aggregate = aggregate,
      colors = as.list(colors),
      midpoint = midpoint,
      showValues = show_values,
      valueFormat = value_format,
      cellGap = cell_gap,
      cellRadius = cell_radius,
      naCol = na_col,
      legend = legend,
      xtitle = x_title,
      ytitle = y_title,
      axisTitleFontSize = axis_title_font_size,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col
    )
  )
}
