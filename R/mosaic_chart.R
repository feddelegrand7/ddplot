#' Create a mosaic (Marimekko) chart.
#'
#' @description
#' A mosaic chart, also called a Marimekko or Mekko chart, shows how two
#' categorical variables relate to each other and to the whole. Each column
#' stands for one category of \code{x}, and its width is that category's share
#' of the grand total. Each column is then split into stacked segments, one per
#' category of \code{fill}, normalised to 100\% of the column. So the area of
#' every cell is proportional to its count (or summed value), and you can read
#' both marginal and conditional shares in a single picture. The look follows
#' the mosaic example from the Vega-Lite gallery: white gaps between cells,
#' percentage axes, column labels across the top and in-cell labels wherever
#' they fit.
#'
#' Hovering a cell highlights it and shows a tooltip with its count, the share
#' of its column in the total and its share within the column. Hovering a
#' legend entry highlights every cell of that \code{fill} category, and
#' hovering a column label highlights the whole column.
#'
#' Column and segment order follow the factor levels of \code{x} and
#' \code{fill}. Character columns are ordered alphabetically and numeric
#' columns in increasing order.
#'
#' @param data The data frame containing the variables to consider.
#' @param x The name of the categorical column that defines the columns. The
#' width of each column is its share of the total.
#' @param fill The name of the categorical column that splits each column into
#' stacked segments, normalised to 100\% within the column.
#' @param value Optional. The name of a numeric (non-negative) column that is
#' summed for each \code{x}/\code{fill} combination. Defaults to \code{NULL},
#' which counts rows instead.
#' @param colors Optional. A vector of colors, one per \code{fill} category,
#' recycled if needed. Defaults to \code{NULL}, which uses D3's Tableau 10
#' palette.
#' @param gap Width in pixels of the white gaps between columns and between
#' segments. Defaults to \code{2}.
#' @param labelType What to print inside each cell when there is room for it:
#' \code{"percent"} (the share within the column, the default),
#' \code{"count"} (the count or summed value), \code{"both"}, or
#' \code{"none"}.
#' @param valueFormat A d3-format specifier used to display counts or values
#' in the labels and the tooltip (e.g. \code{",.0f"}, \code{".3~s"}).
#' Defaults to \code{",.0f"}.
#' @param labelFontSize Font size of the in-cell labels. Defaults to
#' \code{11}.
#' @param labelCol Optional. Color of the in-cell labels. Defaults to
#' \code{NULL}, which picks white or near-black automatically for contrast
#' with each cell's fill.
#' @param columnFontSize Font size of the column (\code{x} category) labels
#' drawn above the chart. Labels that do not fit their column are shortened
#' or hidden. Defaults to \code{12}.
#' @param hover Whether to highlight the hovered cell and show a tooltip.
#' Defaults to \code{TRUE}.
#' @param animate Whether the columns grow into place with a short staggered
#' animation on first render. Defaults to \code{TRUE}.
#' @param legend Whether to display a legend of the \code{fill} categories.
#' Defaults to \code{TRUE}.
#' @param legendTitle Optional. Title of the legend. Defaults to \code{NULL},
#' which uses the name of the \code{fill} column. Use \code{""} to hide it.
#' @param legendFontSize Font size of the legend text. Defaults to \code{11}.
#' @param xtitle Optional. Title of the x-axis (bottom).
#' @param ytitle Optional. Title of the y-axis (left).
#' @param axisTitleFontSize Font size of the axis titles. Defaults to
#' \code{12}.
#' @param xFontSize Font size of the x-axis tick labels. Defaults to
#' \code{10}.
#' @param yFontSize Font size of the y-axis tick labels. Defaults to
#' \code{10}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. It is also the color of the gaps
#' between cells. Defaults to \code{"white"}.
#' @param axisCol Color of the axes, the axis labels, the column labels, the
#' legend text and the title. Defaults to \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG mosaic chart.
#' @export
#'
#' @examples
#' # Survival on the Titanic by passenger class (pre-aggregated counts)
#' titanic <- as.data.frame(Titanic)
#'
#' mosaic_chart(
#'   data   = titanic,
#'   x      = "Class",
#'   fill   = "Survived",
#'   value  = "Freq",
#'   colors = c("#e45756", "#4c78a8"),
#'   xtitle = "Share of passengers and crew",
#'   ytitle = "Share within class",
#'   title  = "Who survived the Titanic?"
#' )
#'
#' # Counting rows: gears by number of cylinders. Factor levels set the order
#' # of both the columns and the stacked segments.
#' cars <- mtcars
#' cars$cyl  <- factor(cars$cyl,  levels = c(8, 6, 4),
#'                     labels = c("8 cyl", "6 cyl", "4 cyl"))
#' cars$gear <- factor(cars$gear, levels = c(3, 4, 5),
#'                     labels = c("3 gears", "4 gears", "5 gears"))
#'
#' mosaic_chart(
#'   data        = cars,
#'   x           = "cyl",
#'   fill        = "gear",
#'   labelType   = "both",
#'   legendTitle = "Gears",
#'   title       = "Motor Trend cars: gears by cylinders"
#' )
#'
#' # Hair and eye color of statistics students (counts are summed over Sex)
#' hair_eye <- as.data.frame(HairEyeColor)
#' hair_eye$Eye <- factor(hair_eye$Eye,
#'                        levels = c("Brown", "Hazel", "Green", "Blue"))
#'
#' mosaic_chart(
#'   data   = hair_eye,
#'   x      = "Hair",
#'   fill   = "Eye",
#'   value  = "Freq",
#'   colors = c("#8c564b", "#bcbd22", "#2ca02c", "#1f77b4"),
#'   gap    = 3,
#'   xtitle = "Hair color",
#'   title  = "Hair and eye color of 592 students"
#' )
mosaic_chart <- function(
    data,
    x,
    fill,
    value             = NULL,
    colors            = NULL,
    gap               = 2,
    labelType         = c("percent", "count", "both", "none"),
    valueFormat       = ",.0f",
    labelFontSize     = 11,
    labelCol          = NULL,
    columnFontSize    = 12,
    hover             = TRUE,
    animate           = TRUE,
    legend            = TRUE,
    legendTitle       = NULL,
    legendFontSize    = 11,
    xtitle            = NULL,
    ytitle            = NULL,
    axisTitleFontSize = 12,
    xFontSize         = 10,
    yFontSize         = 10,
    title             = NULL,
    titleFontSize     = 16,
    font              = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol             = "white",
    axisCol           = "black",
    width             = NULL,
    height            = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (!is.character(x) || length(x) != 1) {
    stop("'x' must be a single column name.")
  }
  if (!is.character(fill) || length(fill) != 1) {
    stop("'fill' must be a single column name.")
  }
  if (is.null(data[[x]]))    stop("Column '", x,    "' not found in data.")
  if (is.null(data[[fill]])) stop("Column '", fill, "' not found in data.")

  if (!is.null(value)) {
    if (!is.character(value) || length(value) != 1) {
      stop("'value' must be NULL or a single column name.")
    }
    if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
    if (!is.numeric(data[[value]])) {
      stop("Column '", value, "' must be numeric.")
    }
    if (any(data[[value]] < 0, na.rm = TRUE)) {
      stop("Column '", value, "' must contain non-negative values only.")
    }
  }

  labelType <- match.arg(labelType)

  if (!is.numeric(gap) || length(gap) != 1 || is.na(gap) || gap < 0) {
    stop("'gap' must be a single non-negative number.")
  }

  if (!is.character(valueFormat) || length(valueFormat) != 1) {
    stop("'valueFormat' must be a single d3-format string, e.g. ',.0f'.")
  }

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be a character vector of colors.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  # Category order: factor levels when available, alphabetical otherwise
  level_order <- function(v) {
    if (is.factor(v)) return(levels(v))
    if (is.numeric(v)) return(as.character(sort(unique(v))))
    sort(unique(as.character(v)))
  }

  xv <- data[[x]]
  fv <- data[[fill]]
  vv <- if (is.null(value)) rep(1, nrow(data)) else data[[value]]

  keep <- !is.na(xv) & !is.na(fv) & !is.na(vv)
  if (any(!keep)) {
    warning(sum(!keep), " row(s) with missing values were removed.")
  }

  x_levels    <- level_order(xv[keep])
  fill_levels <- level_order(fv[keep])

  long <- data.frame(
    x     = as.character(xv[keep]),
    fill  = as.character(fv[keep]),
    value = as.numeric(vv[keep]),
    stringsAsFactors = FALSE
  )

  if (nrow(long) == 0 || sum(long$value) <= 0) {
    stop("Nothing to plot: the total of '",
         if (is.null(value)) "counts" else value,
         "' must be greater than zero.")
  }

  agg <- stats::aggregate(value ~ x + fill, data = long, FUN = sum)

  # Keep only the levels that carry a positive total
  x_tot    <- tapply(agg$value, agg$x,    sum)
  fill_tot <- tapply(agg$value, agg$fill, sum)
  x_levels    <- x_levels[x_levels %in% names(x_tot)[x_tot > 0]]
  fill_levels <- fill_levels[fill_levels %in% names(fill_tot)[fill_tot > 0]]

  r2d3::r2d3(
    data   = agg,
    script = system.file("d3/scatterplot/mosaicchart.js", package = "ddplot"),
    options = list(
      xLevels           = as.list(x_levels),
      fillLevels        = as.list(fill_levels),
      xName             = x,
      fillName          = fill,
      valueName         = if (is.null(value)) "Count" else value,
      colors            = if (is.null(colors)) NULL else as.list(colors),
      gap               = gap,
      labelType         = labelType,
      valueFormat       = valueFormat,
      labelFontSize     = labelFontSize,
      labelCol          = labelCol,
      columnFontSize    = columnFontSize,
      hover             = hover,
      animate           = animate,
      legend            = legend,
      legendTitle       = if (is.null(legendTitle)) fill else legendTitle,
      legendFontSize    = legendFontSize,
      xtitle            = xtitle,
      ytitle            = ytitle,
      axisTitleFontSize = axisTitleFontSize,
      xFontSize         = xFontSize,
      yFontSize         = yFontSize,
      title             = title,
      titleFontSize     = titleFontSize,
      font              = font,
      bgcol             = bgcol,
      axisCol           = axisCol
    ),
    width  = width,
    height = height
  )
}
