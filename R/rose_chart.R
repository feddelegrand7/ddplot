#' Create a Nightingale rose chart.
#'
#' @description
#' A Nightingale rose (also called a coxcomb or polar area chart) divides a
#' circle into equal-angle wedges, one per category, and encodes each value
#' by how far its wedge extends from the center. The form is credited to
#' Florence Nightingale, who used it in 1858 to show that far more British
#' soldiers in the Crimean War died of preventable disease than of wounds.
#'
#' Radii follow a square-root scale so that the \emph{area} of each wedge,
#' not its length, is proportional to the value, keeping the visual honest.
#' When a \code{group} column is supplied, each wedge is split into stacked
#' segments whose areas are again proportional to their values. Dashed
#' radial grid circles carry value labels, and category labels sit outside
#' the wedges. The look is inspired by the polar-interval "rose" chart of the
#' AntV G2 library, reimplemented in plain D3.
#'
#' The chart is interactive: wedges grow out from the center on first
#' render, hovering a wedge pops it outward and shows a tooltip (with a
#' per-group breakdown when stacked), and, when stacked, hovering a legend
#' entry focuses that group while clicking it toggles the group on or off.
#'
#' @param data The data frame containing the variables to consider. Rows that
#' share the same category (and group) are summed.
#' @param category The name of the column holding the categories (one wedge
#' per category). If it is a factor, its levels set the order of the wedges;
#' otherwise they appear in the order found in the data.
#' @param value The name of the numeric column holding the (non-negative)
#' values.
#' @param group Optional. The name of a categorical column used to split
#' each wedge into stacked segments. If it is a factor, its levels set the
#' stacking order (first level innermost). Defaults to \code{NULL}.
#' @param colors Optional. A vector of colors, one per group when
#' \code{group} is supplied, otherwise one per category (recycled if
#' needed). A single color paints every wedge alike. Defaults to
#' \code{NULL}, which uses an AntV-style ten-color palette.
#' @param sort How to order the wedges: \code{"none"} (data or factor
#' order, the default), \code{"desc"} or \code{"asc"} by category total.
#' @param inner_radius Size of an empty hole in the middle, as a fraction of
#' the outer radius (between 0 and 0.9). Defaults to \code{0}.
#' @param start_angle Angle, in degrees clockwise from 12 o'clock, at which
#' the first wedge starts. Defaults to \code{0}.
#' @param pad_angle Gap between adjacent wedges, in radians. Defaults to
#' \code{0}.
#' @param corner_radius Corner rounding of the wedges, in pixels. Defaults to
#' \code{0}.
#' @param opacity Fill opacity of the wedges (0 to 1). Defaults to
#' \code{0.9}.
#' @param stroke_col Color of the wedge outlines. Defaults to \code{"white"}.
#' @param stroke_width Width of the wedge outlines in pixels. Defaults to
#' \code{1}.
#' @param grid_lines Approximate number of radial grid circles (value rings).
#' Use \code{0} to hide them. Defaults to \code{4}.
#' @param grid_col Color of the grid circles and spokes. Defaults to
#' \code{"#e0e0e0"}.
#' @param grid_font_size Font size of the grid value labels. Defaults to
#' \code{10}.
#' @param show_labels Whether to display the category labels around the
#' chart. Defaults to \code{TRUE}.
#' @param label_font_size Font size of the category labels. Defaults to
#' \code{11}.
#' @param value_format A d3-format specifier used to display values in the
#' tooltip (e.g. \code{",.0f"}, \code{".1f"}, \code{"$,.2s"}). Defaults to
#' \code{",.0f"}.
#' @param hover Whether hovering a wedge pops it outward and shows a
#' tooltip. Defaults to \code{TRUE}.
#' @param animate Whether wedges grow out from the center on first render.
#' Defaults to \code{TRUE}.
#' @param legend Whether to display a legend of the groups (only used when
#' \code{group} is supplied). Defaults to \code{TRUE}.
#' @param legend_font_size Font size of the legend text. Defaults to \code{11}.
#' @param title Optional. Title of the chart.
#' @param title_font_size Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axis_col Color of the title, labels and grid value labels. Defaults
#' to \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG Nightingale rose chart.
#' @export
#'
#' @examples
#' # Florence Nightingale's data: deaths in the British army in the East,
#' # April 1854 to March 1855, by cause (as in the HistData package)
#' mon <- c("Apr 1854", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
#'             "Dec", "Jan 1855", "Feb", "Mar")
#' crimea <- data.frame(
#'   month = factor(rep(mon, times = 3), levels = mon),
#'   cause = factor(rep(c("Preventable disease", "Wounds", "Other causes"),
#'                      each = 12),
#'                  levels = c("Preventable disease", "Wounds", "Other causes")),
#'   deaths = c(1, 12, 11, 359, 828, 788, 503, 844, 1725, 2761, 2120, 1205,
#'              0, 0, 0, 0, 1, 81, 132, 287, 114, 83, 42, 32,
#'              5, 9, 6, 23, 30, 70, 128, 106, 131, 324, 361, 172)
#' )
#'
#' rose_chart(
#'   data     = crimea,
#'   category = "month",
#'   value    = "deaths",
#'   group    = "cause",
#'   colors   = c("#7fa7c9", "#e0645c", "#4d4d4d"),
#'   title    = "Causes of death in the army in the East, 1854-55",
#'   height   = 560
#' )
#'
#' # A simple rose: one wedge per category, sorted by value
#' rose_chart(
#'   data     = data.frame(state = rownames(USArrests)[1:12],
#'                         murder = USArrests$Murder[1:12]),
#'   category = "state",
#'   value    = "murder",
#'   sort     = "desc",
#'   value_format = ".1f",
#'   title    = "Murder arrests per 100,000 residents (1973)"
#' )
#'
#' # Donut-style rose with a hole, gaps and rounded corners
#' rose_chart(
#'   data         = as.data.frame(table(cyl = mtcars$cyl, gear = mtcars$gear)),
#'   category     = "gear",
#'   value        = "Freq",
#'   group        = "cyl",
#'   inner_radius  = 0.25,
#'   pad_angle     = 0.03,
#'   corner_radius = 4,
#'   title        = "Cars by number of gears and cylinders"
#' )
rose_chart <- function(
    data,
    category,
    value,
    group          = NULL,
    colors         = NULL,
    sort           = c("none", "desc", "asc"),
    inner_radius    = 0,
    start_angle     = 0,
    pad_angle       = 0,
    corner_radius   = 0,
    opacity        = 0.9,
    stroke_col      = "white",
    stroke_width    = 1,
    grid_lines      = 4,
    grid_col        = "#e0e0e0",
    grid_font_size   = 10,
    show_labels     = TRUE,
    label_font_size  = 11,
    value_format    = ",.0f",
    hover          = TRUE,
    animate        = TRUE,
    legend         = TRUE,
    legend_font_size = 11,
    title          = NULL,
    title_font_size  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    axis_col        = "black",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (is.null(data[[category]])) {
    stop("Column '", category, "' not found in data.")
  }
  if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
  if (!is.null(group) && is.null(data[[group]])) {
    stop("Column '", group, "' not found in data.")
  }

  if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  if (any(data[[value]] < 0, na.rm = TRUE)) {
    stop("Column '", value, "' must contain non-negative values only.")
  }

  sort <- match.arg(sort)

  num1 <- function(x) is.numeric(x) && length(x) == 1 && !is.na(x)

  if (!num1(inner_radius) || inner_radius < 0 || inner_radius > 0.9) {
    stop("'inner_radius' must be a single number between 0 and 0.9.")
  }
  if (!num1(start_angle)) stop("'start_angle' must be a single number (degrees).")
  if (!num1(pad_angle) || pad_angle < 0) {
    stop("'pad_angle' must be a single non-negative number (radians).")
  }
  if (!num1(corner_radius) || corner_radius < 0) {
    stop("'corner_radius' must be a single non-negative number.")
  }
  if (!num1(opacity) || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a single number between 0 and 1.")
  }
  if (!num1(grid_lines) || grid_lines < 0) {
    stop("'grid_lines' must be a single non-negative number.")
  }

  if (!is.character(value_format) || length(value_format) != 1) {
    stop("'value_format' must be a single d3-format string, e.g. ',.0f'.")
  }

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be a character vector of colors.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  levels_of <- function(x) if (is.factor(x)) as.list(levels(x)) else NULL

  r2d3::r2d3(
    data   = data,
    script = ddplot_script("rosechart.js"),
    options = list(
      category       = category,
      value          = value,
      group          = group,
      categoryLevels = levels_of(data[[category]]),
      groupLevels    = if (is.null(group)) NULL else levels_of(data[[group]]),
      colors         = if (is.null(colors)) NULL else as.list(colors),
      sort           = sort,
      innerRadius    = inner_radius,
      startAngle     = start_angle,
      padAngle       = pad_angle,
      cornerRadius   = corner_radius,
      opacity        = opacity,
      strokeCol      = stroke_col,
      strokeWidth    = stroke_width,
      gridLines      = grid_lines,
      gridCol        = grid_col,
      gridFontSize   = grid_font_size,
      showLabels     = show_labels,
      labelFontSize  = label_font_size,
      valueFormat    = value_format,
      hover          = hover,
      animate        = animate,
      legend         = legend,
      legendFontSize = legend_font_size,
      title          = title,
      titleFontSize  = title_font_size,
      font           = font,
      bgcol          = bgcol,
      axisCol        = axis_col
    ),
    width  = width,
    height = height
  )
}
