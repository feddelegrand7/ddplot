#' Create a radial bar chart.
#'
#' @description
#' A radial bar chart (sometimes called a multi-ring progress chart or
#' "activity rings") draws each category as a concentric circular track. A
#' faint background track shows the full scale, and a colored arc with
#' rounded ends sweeps along it in proportion to the category's value
#' relative to \code{max}. It is a compact way to compare a handful of
#' progress or completion rates. The look is inspired by the radialBar chart
#' of the ApexCharts JavaScript library, reimplemented here in plain D3.
#'
#' The first row of \code{data} is drawn as the outermost ring. The arcs
#' sweep in on load, each ring is labelled at the start of its track, and
#' the center shows the average (or total) of the values. Hovering a ring
#' highlights it, replaces the center text with that ring's name and value,
#' and shows a tooltip.
#'
#' By default the rings cover 270 degrees (\code{startAngle = 0},
#' \code{endAngle = 270}), leaving the top-left quadrant free for the ring
#' labels. Angles are in degrees, measured clockwise from 12 o'clock. Use
#' \code{endAngle = 360} for full circles (labels then follow the curve of
#' each track), or for example \code{startAngle = -90, endAngle = 90} for a
#' semicircle gauge.
#'
#' @param data The data frame containing the variables to consider (one row
#' per ring).
#' @param label The name of the column holding the ring labels.
#' @param value The name of the numeric (non-negative) column holding the
#' ring values.
#' @param max The value that corresponds to a full sweep of the track.
#' Values above \code{max} are capped at a full sweep (with a warning).
#' Defaults to \code{100}.
#' @param startAngle Angle in degrees at which every track starts, measured
#' clockwise from 12 o'clock. Defaults to \code{0}.
#' @param endAngle Angle in degrees at which every track ends. Must be greater
#' than \code{startAngle} and at most \code{startAngle + 360}. Defaults to
#' \code{270}.
#' @param colors Optional. A vector of colors, one per ring (recycled if
#' shorter). Defaults to \code{NULL}, which uses a built-in palette.
#' @param trackCol Color of the background tracks. Defaults to
#' \code{"#ececec"}.
#' @param hollow Size of the empty center as a fraction (0 to 0.9) of the
#' outer radius. Defaults to \code{0.35}.
#' @param ringGap Fraction (0 to 0.9) of each ring's band left empty between
#' neighbouring tracks. Defaults to \code{0.3}.
#' @param roundedCaps Whether the arcs (and partial tracks) have rounded ends.
#' Defaults to \code{TRUE}.
#' @param showLabels Whether to label each ring at the start of its track.
#' Defaults to \code{TRUE}.
#' @param showValues Whether to append the formatted value to each ring
#' label (e.g. \code{"Vimeo: 76\%"}). Defaults to \code{TRUE}.
#' @param labelFontSize Font size of the ring labels. Defaults to \code{12}.
#' @param centerValue What to show in the center when nothing is hovered:
#' \code{"average"} (default), \code{"total"} or \code{"none"}.
#' @param centerLabel Optional. Text shown above the center value. Defaults
#' to \code{"Average"} or \code{"Total"} depending on \code{centerValue}.
#' @param centerFontSize Optional. Font size of the big center value.
#' Defaults to \code{NULL}, which sizes it to fit the hollow.
#' @param valueFormat A d3-format specifier used to display values. Defaults
#' to \code{",.0f"}.
#' @param suffix Optional. Text appended to every displayed value. Defaults to
#' \code{NULL}, which uses \code{"\%"} when \code{max = 100} and nothing
#' otherwise.
#' @param hover Whether hovering a ring highlights it, updates the center
#' text and shows a tooltip. Defaults to \code{TRUE}.
#' @param animate Whether the arcs sweep in on first render. Defaults to
#' \code{TRUE}.
#' @param duration Duration of the sweep animation in milliseconds. Defaults
#' to \code{1200}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param textCol Color of the title, labels and center text. Defaults to
#' \code{"#333333"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG radial bar chart.
#' @export
#'
#' @examples
#' # Share of users active on each platform (percentages)
#' platforms <- data.frame(
#'   platform = c("Vimeo", "Messenger", "Facebook", "LinkedIn"),
#'   share    = c(76, 67, 61, 90)
#' )
#'
#' radial_bar_chart(
#'   data  = platforms,
#'   label = "platform",
#'   value = "share",
#'   title = "Weekly active users (share of total)"
#' )
#'
#' # Full circles, total in the center, custom colors and a custom maximum
#' sales <- data.frame(
#'   region = c("North", "South", "East", "West", "Central"),
#'   units  = c(420, 310, 275, 190, 120)
#' )
#'
#' radial_bar_chart(
#'   data        = sales,
#'   label       = "region",
#'   value       = "units",
#'   max         = 500,
#'   endAngle    = 360,
#'   centerValue = "total",
#'   centerLabel = "Units sold",
#'   colors      = c("#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e"),
#'   title       = "Units sold by region (target: 500)"
#' )
#'
#' # Gauge layout open at the bottom, without values in the ring labels
#' radial_bar_chart(
#'   data       = platforms,
#'   label      = "platform",
#'   value      = "share",
#'   startAngle = -135,
#'   endAngle   = 135,
#'   hollow     = 0.45,
#'   showValues = FALSE,
#'   trackCol   = "#f2f2f2"
#' )
radial_bar_chart <- function(
    data,
    label,
    value,
    max            = 100,
    startAngle     = 0,
    endAngle       = 270,
    colors         = NULL,
    trackCol       = "#ececec",
    hollow         = 0.35,
    ringGap        = 0.3,
    roundedCaps    = TRUE,
    showLabels     = TRUE,
    showValues     = TRUE,
    labelFontSize  = 12,
    centerValue    = c("average", "total", "none"),
    centerLabel    = NULL,
    centerFontSize = NULL,
    valueFormat    = ",.0f",
    suffix         = NULL,
    hover          = TRUE,
    animate        = TRUE,
    duration       = 1200,
    title          = NULL,
    titleFontSize  = 16,
    font           = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol          = "white",
    textCol        = "#333333",
    width          = NULL,
    height         = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")
  if (nrow(data) == 0) stop("'data' must contain at least one row.")

  if (is.null(data[[label]])) stop("Column '", label, "' not found in data.")
  if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")

  if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  if (any(data[[value]] < 0, na.rm = TRUE)) {
    stop("Column '", value, "' must contain non-negative values only.")
  }

  if (!is.numeric(max) || length(max) != 1 || !is.finite(max) || max <= 0) {
    stop("'max' must be a single positive number.")
  }

  if (any(data[[value]] > max, na.rm = TRUE)) {
    warning("Some values of '", value, "' exceed 'max' (", max,
            "); their arcs are capped at a full sweep.")
  }

  if (!is.numeric(startAngle) || length(startAngle) != 1 ||
      !is.finite(startAngle)) {
    stop("'startAngle' must be a single number (degrees).")
  }
  if (!is.numeric(endAngle) || length(endAngle) != 1 || !is.finite(endAngle)) {
    stop("'endAngle' must be a single number (degrees).")
  }
  if (endAngle <= startAngle) {
    stop("'endAngle' must be greater than 'startAngle'.")
  }
  if (endAngle - startAngle > 360) {
    stop("'endAngle' - 'startAngle' must not exceed 360 degrees.")
  }

  if (!is.numeric(hollow) || length(hollow) != 1 || hollow < 0 || hollow > 0.9) {
    stop("'hollow' must be a single number between 0 and 0.9.")
  }
  if (!is.numeric(ringGap) || length(ringGap) != 1 ||
      ringGap < 0 || ringGap > 0.9) {
    stop("'ringGap' must be a single number between 0 and 0.9.")
  }

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be NULL or a character vector of colors.")
  }

  centerValue <- match.arg(centerValue)

  if (!is.character(valueFormat) || length(valueFormat) != 1) {
    stop("'valueFormat' must be a single d3-format string, e.g. ',.0f'.")
  }

  if (!is.null(suffix) && (!is.character(suffix) || length(suffix) != 1)) {
    stop("'suffix' must be NULL or a single character string.")
  }

  if (!is.null(centerFontSize) &&
      (!is.numeric(centerFontSize) || length(centerFontSize) != 1 ||
       centerFontSize <= 0)) {
    stop("'centerFontSize' must be NULL or a single positive number.")
  }

  if (!is.numeric(duration) || length(duration) != 1 || duration < 0) {
    stop("'duration' must be a single non-negative number (milliseconds).")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(suffix)) suffix <- if (max == 100) "%" else ""

  if (is.null(centerLabel)) {
    centerLabel <- switch(centerValue,
                          average = "Average",
                          total   = "Total",
                          none    = "")
  }

  r2d3::r2d3(
    data   = data.frame(
      label = as.character(data[[label]]),
      value = data[[value]],
      stringsAsFactors = FALSE
    ),
    script = ddplot_script("radialbarchart.js"),
    options = list(
      max            = max,
      startAngle     = startAngle,
      endAngle       = endAngle,
      colors         = if (is.null(colors)) NULL else as.list(colors),
      trackCol       = trackCol,
      hollow         = hollow,
      ringGap        = ringGap,
      roundedCaps    = roundedCaps,
      showLabels     = showLabels,
      showValues     = showValues,
      labelFontSize  = labelFontSize,
      centerValue    = centerValue,
      centerLabel    = centerLabel,
      centerFontSize = centerFontSize,
      valueFormat    = valueFormat,
      suffix         = suffix,
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
