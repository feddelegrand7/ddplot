#' Create a radar chart.
#'
#' @description
#' A radar chart (also called a spider or web chart) compares several
#' quantitative variables at once by placing each one on its own spoke
#' radiating from a common center. Each series (a row of the data) is drawn
#' as a closed, translucent polygon joining its values on every spoke, so
#' series can be compared by their overall shape and footprint. Concentric
#' grid rings mark the scale. The look and feel is inspired by the radar
#' chart of the \href{https://www.chartjs.org/}{Chart.js} JavaScript library,
#' reimplemented here in plain D3.
#'
#' The chart is interactive: the polygons grow out from the center on first
#' render, hovering a point shows a tooltip with its value while the other
#' series fade, hovering a polygon focuses that series, and clicking a legend
#' entry toggles the corresponding series on or off.
#'
#' @param data The data frame containing the variables to consider, in wide
#' format (one row per series).
#' @param group The name of the column holding the series labels. Its values
#' must be unique (one row per series).
#' @param axes Optional. A character vector of at least three numeric column
#' names, each drawn as a spoke of the radar. Defaults to \code{NULL}, which
#' uses every numeric column except \code{group}.
#' @param axisLabels Optional. A character vector, the same length as
#' \code{axes}, of labels displayed at the end of each spoke. Defaults to the
#' column names.
#' @param maxValue Optional. The value of the outer ring. With a shared scale,
#' a single positive number; with \code{scaleEachAxis = TRUE}, either a single
#' number or one number per axis. Defaults to \code{NULL}, which rounds the
#' data maximum up to a "nice" value. Values above \code{maxValue} are drawn
#' on the outer ring.
#' @param scaleEachAxis Whether every axis gets its own scale running from 0 to
#' that axis' (nice) maximum. Useful when the axes are measured in different
#' units. The ring tick labels are then hidden and each axis label shows its
#' maximum instead. Defaults to \code{FALSE} (one scale shared by all axes).
#' @param levels The number of concentric grid rings. Defaults to \code{5}.
#' @param gridShape Shape of the grid rings, either \code{"polygon"} (default)
#' or \code{"circle"}.
#' @param colors Optional. A vector of colors, one per series (recycled if
#' shorter). Defaults to \code{NULL}, which uses a soft palette in the spirit
#' of Chart.js.
#' @param fillOpacity Opacity of the polygon fills, between 0 and 1. Defaults
#' to \code{0.2}.
#' @param lineWidth Width of the polygon outlines in pixels. Defaults to
#' \code{2}.
#' @param pointRadius Radius of the point markers in pixels. Defaults to
#' \code{3}. Use \code{0} to hide the markers.
#' @param showTicks Whether to print the value of each grid ring along the top
#' spoke (shared scale only). Defaults to \code{TRUE}.
#' @param valueFormat A d3-format specifier used to display values in the
#' ticks and the tooltip, e.g. \code{".1f"} or \code{".0\%"}. Defaults to
#' \code{","} (thousands separator, insignificant zeros trimmed).
#' @param gridCol Color of the grid rings and spokes. Defaults to
#' \code{"#dddddd"}.
#' @param hover Whether to show a tooltip and highlight the hovered series.
#' Defaults to \code{TRUE}.
#' @param animate Whether the polygons grow out from the center on first
#' render. Defaults to \code{TRUE}.
#' @param legend Whether to display a clickable legend of the series. Defaults
#' to \code{TRUE}.
#' @param legendFontSize Font size of the legend text. Defaults to \code{12}.
#' @param labelFontSize Font size of the axis labels. Defaults to \code{12}.
#' @param tickFontSize Font size of the grid ring tick labels. Defaults to
#' \code{10}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of the axis labels, tick labels, legend text and
#' title. Defaults to \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG radar chart.
#' @export
#'
#' @examples
#' # Skill ratings of three football players (shared 0-100 scale)
#' players <- data.frame(
#'   player    = c("Ana", "Ben", "Chloe"),
#'   speed     = c(88, 72, 65),
#'   power     = c(60, 91, 70),
#'   passing   = c(79, 58, 93),
#'   dribbling = c(92, 64, 81),
#'   defending = c(45, 83, 74),
#'   stamina   = c(70, 77, 88)
#' )
#'
#' radar_chart(
#'   data     = players,
#'   group    = "player",
#'   axes     = c("speed", "power", "passing", "dribbling",
#'                "defending", "stamina"),
#'   maxValue = 100,
#'   title    = "Player skill ratings"
#' )
#'
#' # Variables measured in different units: give every axis its own scale
#' cyl_means <- aggregate(cbind(mpg, hp, wt, qsec, disp) ~ cyl, data = mtcars,
#'                   FUN = mean)
#' cyl_means$cyl <- paste(cyl_means$cyl, "cylinders")
#'
#' radar_chart(
#'   data          = cyl_means,
#'   group         = "cyl",
#'   axisLabels    = c("Miles/gallon", "Horsepower", "Weight (1000 lbs)",
#'                     "1/4 mile time (s)", "Displacement (cu.in.)"),
#'   scaleEachAxis = TRUE,
#'   levels        = 4,
#'   gridShape     = "circle",
#'   valueFormat   = ".1f",
#'   title         = "mtcars averages by number of cylinders"
#' )
radar_chart <- function(
    data,
    group,
    axes           = NULL,
    axisLabels     = NULL,
    maxValue       = NULL,
    scaleEachAxis  = FALSE,
    levels         = 5,
    gridShape      = c("polygon", "circle"),
    colors         = NULL,
    fillOpacity    = 0.2,
    lineWidth      = 2,
    pointRadius    = 3,
    showTicks      = TRUE,
    valueFormat    = ",",
    gridCol        = "#dddddd",
    hover          = TRUE,
    animate        = TRUE,
    legend         = TRUE,
    legendFontSize = 12,
    labelFontSize  = 12,
    tickFontSize   = 10,
    title          = NULL,
    titleFontSize  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axisCol        = "black",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (missing(group) || !is.character(group) || length(group) != 1) {
    stop("'group' must be a single column name.")
  }
  if (is.null(data[[group]])) stop("Column '", group, "' not found in data.")

  if (is.null(axes)) {
    axes <- setdiff(names(data)[vapply(data, is.numeric, logical(1))], group)
  }

  if (!is.character(axes)) {
    stop("'axes' must be a character vector of column names.")
  }
  if (length(axes) < 3) {
    stop("A radar chart needs at least 3 numeric axes; got ", length(axes), ".")
  }
  if (anyDuplicated(axes)) stop("'axes' must not contain duplicated names.")
  if (group %in% axes) stop("'group' cannot also be one of the 'axes'.")

  missing_cols <- setdiff(axes, names(data))
  if (length(missing_cols) > 0) {
    stop("Column(s) not found in data: ", paste(missing_cols, collapse = ", "))
  }

  for (a in axes) {
    if (!is.numeric(data[[a]])) stop("Column '", a, "' must be numeric.")
    if (anyNA(data[[a]])) {
      stop("Column '", a, "' contains missing values; ",
           "a radar polygon needs a value on every axis.")
    }
    if (any(data[[a]] < 0)) {
      stop("Column '", a, "' must contain non-negative values only.")
    }
  }

  if (nrow(data) == 0) stop("'data' has no rows.")

  if (anyNA(data[[group]])) {
    stop("Column '", group, "' contains missing values.")
  }
  if (anyDuplicated(as.character(data[[group]]))) {
    stop("Column '", group, "' must contain unique values (one row per series).")
  }

  if (is.null(axisLabels)) axisLabels <- axes
  if (length(axisLabels) != length(axes)) {
    stop("'axisLabels' must have the same length as 'axes' (", length(axes), ").")
  }
  axisLabels <- as.character(axisLabels)

  if (!is.logical(scaleEachAxis) || length(scaleEachAxis) != 1 ||
      is.na(scaleEachAxis)) {
    stop("'scaleEachAxis' must be TRUE or FALSE.")
  }

  if (!is.null(maxValue)) {
    if (!is.numeric(maxValue) || anyNA(maxValue) || any(maxValue <= 0)) {
      stop("'maxValue' must be NULL or positive number(s).")
    }
    if (!scaleEachAxis && length(maxValue) != 1) {
      stop("'maxValue' must be a single number when 'scaleEachAxis = FALSE'.")
    }
    if (scaleEachAxis && !length(maxValue) %in% c(1, length(axes))) {
      stop("'maxValue' must be a single number or one number per axis (",
           length(axes), ").")
    }
    if (scaleEachAxis) maxValue <- rep(maxValue, length.out = length(axes))
  }

  if (!is.numeric(levels) || length(levels) != 1 || is.na(levels) ||
      levels < 1 || levels != round(levels)) {
    stop("'levels' must be a single positive whole number.")
  }

  gridShape <- match.arg(gridShape)

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be NULL or a character vector of colors.")
  }

  if (!is.numeric(fillOpacity) || length(fillOpacity) != 1 ||
      fillOpacity < 0 || fillOpacity > 1) {
    stop("'fillOpacity' must be a single number between 0 and 1.")
  }

  if (!is.numeric(lineWidth) || length(lineWidth) != 1 || lineWidth < 0) {
    stop("'lineWidth' must be a single non-negative number.")
  }

  if (!is.numeric(pointRadius) || length(pointRadius) != 1 || pointRadius < 0) {
    stop("'pointRadius' must be a single non-negative number.")
  }

  if (!is.character(valueFormat) || length(valueFormat) != 1) {
    stop("'valueFormat' must be a single d3-format string, e.g. ',.1f'.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  plot_data <- data.frame(
    group = as.character(data[[group]]),
    data[axes],
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  names(plot_data)[1] <- group

  r2d3::r2d3(
    data   = plot_data,
    script = ddplot_script("radarchart.js"),
    options = list(
      group          = group,
      axes           = as.list(axes),
      axisLabels     = as.list(axisLabels),
      maxValue       = if (is.null(maxValue)) NULL else as.list(maxValue),
      scaleEachAxis  = scaleEachAxis,
      levels         = levels,
      gridShape      = gridShape,
      colors         = as.list(colors),
      fillOpacity    = fillOpacity,
      lineWidth      = lineWidth,
      pointRadius    = pointRadius,
      showTicks      = showTicks,
      valueFormat    = valueFormat,
      gridCol        = gridCol,
      hover          = hover,
      animate        = animate,
      legend         = legend,
      legendFontSize = legendFontSize,
      labelFontSize  = labelFontSize,
      tickFontSize   = tickFontSize,
      title          = title,
      titleFontSize  = titleFontSize,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axisCol
    ),
    width  = width,
    height = height
  )
}
