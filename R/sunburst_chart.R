#' Create a zoomable sunburst chart.
#'
#' @description
#' A sunburst chart displays hierarchical data as concentric rings. The centre
#' represents the whole, each ring is one level of the hierarchy, and every
#' sector's angle is proportional to its value. The look and feel is inspired
#' by the sunburst series of Apache ECharts, reimplemented here in plain D3.
#'
#' The chart is interactive: hovering a sector highlights it together with
#' its ancestors and shows a tooltip with its full path, value and shares;
#' clicking a sector zooms into it (its children then fill the whole circle
#' with a smooth arc transition) and clicking the centre zooms back out one
#' level.
#'
#' @param data The data frame containing the variables to consider.
#' @param levels A character vector of column names that define the
#' hierarchy, from the outermost category (inner ring) to the most detailed
#' one (outer ring), e.g. \code{c("continent", "country")}. A missing value
#' (\code{NA} or \code{""}) at some level ends that row's path early, which
#' makes ragged hierarchies possible. Rows that share the same path are
#' summed.
#' @param value Optional. The name of a numeric (non-negative) column that
#' determines the size of each sector. Defaults to \code{NULL}, in which case
#' each row counts as 1 (sector sizes are row counts).
#' @param colors Optional. A vector of colors, one per first-level category
#' (recycled if needed). Deeper levels use progressively lighter shades of
#' their branch color. Defaults to \code{NULL}, which uses a built-in
#' 10-color palette.
#' @param valueFormat A d3-format specifier used to display values in the
#' centre and the tooltip (e.g. \code{",.0f"}, \code{"$,.2s"},
#' \code{".3~s"}). Defaults to \code{",.0f"}.
#' @param innerRadius Radius of the centre circle as a fraction of the
#' chart's radius, between \code{0} and \code{0.9}. The centre shows the
#' current root and its value, and is clicked to zoom out. Defaults to
#' \code{0.22}.
#' @param cornerRadius Corner radius of the sectors in pixels. Defaults to
#' \code{0}.
#' @param padAngle Angular padding between sectors in radians (e.g.
#' \code{0.005}). Defaults to \code{0}.
#' @param strokeCol Color of the sector borders. Defaults to \code{"white"}.
#' @param strokeWidth Width of the sector borders in pixels. Defaults to
#' \code{1}.
#' @param showLabels Whether to display the sector labels. Labels are
#' truncated or hidden automatically when a sector is too small. Defaults to
#' \code{TRUE}.
#' @param labelRotate Orientation of the sector labels: \code{"radial"}
#' (default, along the radius) or \code{"tangential"} (along the arc).
#' @param labelFontSize Font size of the sector labels. Defaults to
#' \code{11}.
#' @param labelCol Optional. Color of the sector labels. Defaults to
#' \code{NULL}, which picks white or near-black automatically for contrast
#' with each sector's fill.
#' @param rootLabel Label shown in the centre (and used as the root name)
#' when the chart is not zoomed. Defaults to \code{"Total"}.
#' @param centerFontSize Maximum font size of the centre label. Defaults to
#' \code{13}.
#' @param zoom Whether clicking a sector zooms into it and clicking the centre
#' zooms out. Defaults to \code{TRUE}.
#' @param hover Whether to highlight the hovered sector (and its ancestors)
#' and show a tooltip. Defaults to \code{TRUE}.
#' @param animate Whether the sectors sweep in with an entrance animation.
#' Defaults to \code{TRUE}.
#' @param duration Duration of the zoom transition in milliseconds. Defaults
#' to \code{750}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param textCol Color of the title and the centre label. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG sunburst chart.
#' @export
#'
#' @examples
#' # World population in 2007 by continent and country
#' library(gapminder)
#'
#' pop_2007 <- gapminder[gapminder$year == 2007, ]
#'
#' sunburst_chart(
#'   data        = pop_2007,
#'   levels      = c("continent", "country"),
#'   value       = "pop",
#'   valueFormat = ".3~s",
#'   rootLabel   = "World",
#'   title       = "World population in 2007"
#' )
#'
#' # A three-level hierarchy: a toy company's headcount
#' staff <- data.frame(
#'   division = c(rep("Engineering", 6), rep("Sales", 4), rep("Operations", 4)),
#'   team     = c("Platform", "Platform", "Data", "Data", "Mobile", "Mobile",
#'                "EMEA", "EMEA", "Americas", "APAC",
#'                "Finance", "Finance", "HR", "Legal"),
#'   role     = c("Backend", "SRE", "Engineers", "Analysts", "iOS", "Android",
#'                "Account execs", "Sales engineers", "Account execs",
#'                "Account execs", "Accounting", "FP&A", "Recruiting", NA),
#'   people   = c(42, 12, 18, 9, 11, 13, 25, 8, 31, 14, 10, 6, 9, 5)
#' )
#'
#' sunburst_chart(
#'   data        = staff,
#'   levels      = c("division", "team", "role"),
#'   value       = "people",
#'   rootLabel   = "Company",
#'   labelRotate = "tangential",
#'   padAngle    = 0.006,
#'   cornerRadius = 3,
#'   title       = "Headcount by division, team and role"
#' )
#'
#' # Without a value column, sectors are sized by row counts
#' library(ggplot2) # for the mpg dataset
#'
#' sunburst_chart(
#'   data      = mpg,
#'   levels    = c("class", "manufacturer"),
#'   rootLabel = "Cars",
#'   title     = "Number of car models by class and manufacturer"
#' )
sunburst_chart <- function(
    data,
    levels,
    value          = NULL,
    colors         = NULL,
    valueFormat    = ",.0f",
    innerRadius    = 0.22,
    cornerRadius   = 0,
    padAngle       = 0,
    strokeCol      = "white",
    strokeWidth    = 1,
    showLabels     = TRUE,
    labelRotate    = c("radial", "tangential"),
    labelFontSize  = 11,
    labelCol       = NULL,
    rootLabel      = "Total",
    centerFontSize = 13,
    zoom           = TRUE,
    hover          = TRUE,
    animate        = TRUE,
    duration       = 750,
    title          = NULL,
    titleFontSize  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    textCol        = "black",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (missing(levels) || !is.character(levels) || length(levels) == 0) {
    stop("'levels' must be a character vector of one or more column names.")
  }
  missing_cols <- setdiff(levels, names(data))
  if (length(missing_cols) > 0) {
    stop("Column(s) not found in data: ", paste(missing_cols, collapse = ", "))
  }
  if (anyDuplicated(levels)) stop("'levels' must not contain duplicates.")

  if (!is.null(value)) {
    if (!is.character(value) || length(value) != 1) {
      stop("'value' must be a single column name.")
    }
    if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
    if (!is.numeric(data[[value]])) {
      stop("Column '", value, "' must be numeric.")
    }
    if (any(data[[value]] < 0, na.rm = TRUE)) {
      stop("Column '", value, "' must contain non-negative values only.")
    }
  }

  labelRotate <- match.arg(labelRotate)

  if (!is.numeric(innerRadius) || length(innerRadius) != 1 ||
      innerRadius < 0 || innerRadius > 0.9) {
    stop("'innerRadius' must be a single number between 0 and 0.9.")
  }

  if (!is.numeric(cornerRadius) || length(cornerRadius) != 1 || cornerRadius < 0) {
    stop("'cornerRadius' must be a single non-negative number.")
  }

  if (!is.numeric(padAngle) || length(padAngle) != 1 || padAngle < 0) {
    stop("'padAngle' must be a single non-negative number (in radians).")
  }

  if (!is.numeric(duration) || length(duration) != 1 || duration < 0) {
    stop("'duration' must be a single non-negative number of milliseconds.")
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

  # Keep only the columns the chart needs; factors are sent as their labels.
  cols <- unique(c(levels, value))
  plot_data <- as.data.frame(data)[, cols, drop = FALSE]
  for (lv in levels) plot_data[[lv]] <- as.character(plot_data[[lv]])

  r2d3::r2d3(
    data   = plot_data,
    script = system.file("d3/scatterplot/sunburstchart.js", package = "ddplot"),
    options = list(
      levels         = as.list(levels),
      value          = value,
      colors         = if (is.null(colors)) NULL else as.list(colors),
      valueFormat    = valueFormat,
      innerRadius    = innerRadius,
      cornerRadius   = cornerRadius,
      padAngle       = padAngle,
      strokeCol      = strokeCol,
      strokeWidth    = strokeWidth,
      showLabels     = showLabels,
      labelRotate    = labelRotate,
      labelFontSize  = labelFontSize,
      labelCol       = labelCol,
      rootLabel      = rootLabel,
      centerFontSize = centerFontSize,
      zoom           = zoom,
      hover          = hover,
      animate        = animate,
      duration       = duration,
      title          = title,
      titleFontSize  = titleFontSize,
      font           = font,
      bgcol          = bgcol,
      textCol        = textCol
    ),
    width  = width,
    height = height
  )
}
