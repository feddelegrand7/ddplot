#' Create a treemap chart.
#'
#' @description
#' A treemap displays hierarchical (or flat) part-to-whole data as a set of
#' nested rectangles whose areas are proportional to a value. The technique
#' was invented by Ben Shneiderman in the early 1990s and was made famous by
#' SmartMoney's "Map of the Market" and by the New York Times' graphics of
#' the US federal budget and spending. When a \code{group} column is supplied
#' the chart becomes a two-level hierarchy: tiles are coloured by group and
#' each group gets its own header and border. Hovering over a tile highlights
#' it and shows a tooltip with its label, group, value and share of the total.
#'
#' @param data The data frame containing the variables to consider.
#' @param value The name of the numeric (non-negative) column that determines
#' the area of each rectangle.
#' @param label The name of the column used as the label of each rectangle
#' (leaf).
#' @param group Optional. The name of a categorical column used as the parent
#' category of each rectangle. When supplied, rectangles are nested inside
#' their group and coloured by group. Defaults to \code{NULL}.
#' @param tile The tiling algorithm. One of \code{"squarify"} (default),
#' \code{"binary"}, \code{"slice"}, \code{"dice"} or \code{"sliceDice"}.
#' @param padding Padding in pixels between rectangles (and around groups).
#' Defaults to \code{2}.
#' @param colors Optional. A vector of colors. When \code{group} is supplied,
#' one color is used per group; otherwise one color per rectangle. Colors are
#' recycled if there are fewer colors than groups/rectangles. Defaults to
#' \code{NULL}, which uses D3's Tableau 10 palette.
#' @param valueFormat A d3-format specifier used to display values in the
#' labels and tooltip (e.g. \code{",.0f"}, \code{"$,.2s"}, \code{".3~s"}).
#' Defaults to \code{",.0f"}.
#' @param showValues Whether to display the formatted value under each label.
#' Defaults to \code{TRUE}.
#' @param labelFontSize Font size of the rectangle labels. Labels are
#' automatically truncated or hidden when a rectangle is too small to fit
#' them. Defaults to \code{11}.
#' @param labelCol Optional. Color of the rectangle labels. Defaults to
#' \code{NULL}, which picks white or near-black automatically for contrast
#' with each rectangle's fill.
#' @param groupFontSize Font size of the group headers (only used when
#' \code{group} is supplied). Defaults to \code{12}.
#' @param strokeCol Color of the rectangle borders. Defaults to
#' \code{"white"}.
#' @param strokeWidth Width of the rectangle borders in pixels. Defaults to
#' \code{1}.
#' @param hover Whether to highlight the hovered rectangle and show a tooltip.
#' Defaults to \code{TRUE}.
#' @param legend Whether to display a legend of the groups (only used when
#' \code{group} is supplied). Defaults to \code{TRUE}.
#' @param legendFontSize Font size of the legend text. Defaults to \code{11}.
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
#' @return An SVG treemap chart.
#' @export
#'
#' @examples
#' # A toy government budget (in millions) by department and ministry
#' budget <- data.frame(
#'   department = c("Hospitals", "Primary care", "Public health",
#'                  "Schools", "Universities", "Vocational training",
#'                  "Army", "Navy", "Air force",
#'                  "Roads", "Railways", "Airports",
#'                  "Pensions", "Unemployment", "Family benefits"),
#'   ministry   = c("Health", "Health", "Health",
#'                  "Education", "Education", "Education",
#'                  "Defence", "Defence", "Defence",
#'                  "Transport", "Transport", "Transport",
#'                  "Social security", "Social security", "Social security"),
#'   spending   = c(5200, 2100, 800,
#'                  3900, 1800, 600,
#'                  2300, 1400, 1700,
#'                  1500, 1100, 400,
#'                  7400, 1900, 1300)
#' )
#'
#' treemap_chart(
#'   data        = budget,
#'   value       = "spending",
#'   label       = "department",
#'   group       = "ministry",
#'   valueFormat = "$,.0f",
#'   title       = "Where the money goes (millions)"
#' )
#'
#' # World population in 2007 by country, grouped by continent
#' library(gapminder)
#'
#' pop_2007 <- gapminder[gapminder$year == 2007, ]
#'
#' treemap_chart(
#'   data        = pop_2007,
#'   value       = "pop",
#'   label       = "country",
#'   group       = "continent",
#'   valueFormat = ".3~s",
#'   padding     = 1,
#'   title       = "World population in 2007"
#' )
treemap_chart <- function(
    data,
    value,
    label,
    group          = NULL,
    tile           = "squarify",
    padding        = 2,
    colors         = NULL,
    valueFormat    = ",.0f",
    showValues     = TRUE,
    labelFontSize  = 11,
    labelCol       = NULL,
    groupFontSize  = 12,
    strokeCol      = "white",
    strokeWidth    = 1,
    hover          = TRUE,
    legend         = TRUE,
    legendFontSize = 11,
    title          = NULL,
    titleFontSize  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    textCol        = "black",
    width          = NULL,
    height         = NULL
) {

  if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
  if (is.null(data[[label]])) stop("Column '", label, "' not found in data.")
  if (!is.null(group) && is.null(data[[group]])) {
    stop("Column '", group, "' not found in data.")
  }

  if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  if (any(data[[value]] < 0, na.rm = TRUE)) {
    stop("Column '", value, "' must contain non-negative values only.")
  }

  valid_tiles <- c("squarify", "binary", "slice", "dice", "sliceDice")
  if (length(tile) != 1 || !tile %in% valid_tiles) {
    stop("'tile' must be one of 'squarify', 'binary', 'slice', 'dice', ",
         "or 'sliceDice'.")
  }

  if (!is.numeric(padding) || length(padding) != 1 || padding < 0) {
    stop("'padding' must be a single non-negative number.")
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

  r2d3::r2d3(
    data   = data,
    script = system.file("d3/scatterplot/treemapchart.js", package = "ddplot"),
    options = list(
      value          = value,
      label          = label,
      group          = group,
      tile           = tile,
      padding        = padding,
      colors         = if (is.null(colors)) NULL else as.list(colors),
      valueFormat    = valueFormat,
      showValues     = showValues,
      labelFontSize  = labelFontSize,
      labelCol       = labelCol,
      groupFontSize  = groupFontSize,
      strokeCol      = strokeCol,
      strokeWidth    = strokeWidth,
      hover          = hover,
      legend         = legend,
      legendFontSize = legendFontSize,
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
