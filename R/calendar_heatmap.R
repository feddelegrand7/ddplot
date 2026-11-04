#' Create a calendar heatmap.
#'
#' @description
#' A calendar heatmap lays out one rounded square per day on a grid where
#' each column is a week and each row is a day of the week, so a whole year
#' fits in a single compact band. Each square is colored by the value
#' recorded on that day using a sequential palette, which makes weekly
#' rhythms, seasonal patterns, streaks and gaps easy to spot. The layout was
#' popularised by GitHub's contribution graph and is the signature chart of
#' the Frappe Charts library.
#'
#' Month labels are drawn above the grid, weekday labels on its left, and a
#' "Less ... More" legend underneath. When the data span several years, one
#' panel is stacked per year. Days without data (and, when all values are
#' non-negative, days with a value of zero) are drawn in \code{emptyCol}.
#' Hovering over a day shows a tooltip with its value and date, and hovering
#' over a legend square highlights the days that fall in that color bucket.
#'
#' @param data The data frame containing the variables to consider.
#' @param date The name of the column holding the dates. It can be of class
#' \code{Date}, \code{POSIXct} or a character vector in \code{"YYYY-MM-DD"}
#' format.
#' @param value Optional. The name of the numeric column holding the value of
#' each day. When \code{NULL} (default), the number of rows per day is used,
#' which is handy for event logs (one row per event).
#' @param aggregate How to combine several rows that share the same date. One
#' of \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#' \code{"count"}. Ignored (always \code{"count"}) when \code{value} is
#' \code{NULL}.
#' @param weekStart The first day of the week, i.e. the top row of the grid.
#' Either \code{"sunday"} (default) or \code{"monday"}.
#' @param colors A vector of colors, from low to high, used to fill days that
#' have a value. Values are split into \code{length(colors)} equal-width
#' buckets. Defaults to a Frappe-like blue ramp
#' \code{c("#c0ddf9", "#73b3f3", "#3886e1", "#17459e")}.
#' @param emptyCol Fill color of days without data (or with a value of zero
#' when all values are non-negative). Defaults to \code{"#ebedf0"}.
#' @param cellRadius Corner radius of the day squares in pixels. Defaults to
#' \code{2}.
#' @param cellGap Gap between day squares in pixels. Defaults to \code{3}.
#' @param valueLabel Optional. The unit shown after the value in the tooltip
#' and year totals (e.g. \code{"commits"}). Defaults to the name of the
#' \code{value} column, or \code{"events"} when \code{value} is \code{NULL}.
#' @param valueFormat A d3-format specifier used to display values (e.g.
#' \code{",.0f"}, \code{"$,.2s"}). Defaults to \code{",.2~f"}.
#' @param dateFormat A d3-time-format specifier used to display dates in the
#' tooltip. Defaults to \code{"\%a \%b \%-d, \%Y"} (e.g. "Wed Jan 7, 2026").
#' @param showYearLabel Whether to print the year and its total above each
#' panel. Defaults to \code{TRUE}.
#' @param showMonthLabels Whether to print month labels above the grid.
#' Defaults to \code{TRUE}.
#' @param showWeekdayLabels Whether to print weekday labels (Mon, Wed, Fri) on
#' the left of the grid. Defaults to \code{TRUE}.
#' @param labelFontSize Font size of the month, weekday, year and legend
#' labels. Defaults to \code{10}.
#' @param legend Whether to display the "Less ... More" legend. Defaults to
#' \code{TRUE}.
#' @param legendLabels A character vector of length 2 giving the text drawn
#' on each side of the legend. Defaults to \code{c("Less", "More")}.
#' @param hover Whether to highlight the hovered day and show a tooltip.
#' Defaults to \code{TRUE}.
#' @param animate Whether the day squares fade in with a staggered animation
#' on first render. Defaults to \code{TRUE}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of the title and of the month, weekday, year and
#' legend labels. Defaults to \code{"#555555"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output. Defaults to a height
#' that fits the number of years displayed.
#'
#' @return An SVG calendar heatmap.
#' @export
#'
#' @examples
#' # One year of simulated daily activity, busier on weekdays
#' set.seed(2026)
#' days <- seq(as.Date("2026-01-01"), as.Date("2026-12-31"), by = "day")
#' weekday <- !(format(days, "%u") %in% c("6", "7"))
#' activity <- data.frame(
#'   day     = days,
#'   commits = rpois(length(days), lambda = ifelse(weekday, 6, 1.5)) *
#'             rbinom(length(days), 1, 0.8)
#' )
#'
#' calendar_heatmap(
#'   data       = activity,
#'   date       = "day",
#'   value      = "commits",
#'   title      = "Commits in 2026"
#' )
#'
#' # Several years stacked, weeks starting on Monday, GitHub-like greens
#' set.seed(1)
#' days <- seq(as.Date("2021-01-01"), as.Date("2023-12-31"), by = "day")
#' season <- 10 + 8 * sin(2 * pi * as.numeric(format(days, "%j")) / 365)
#' rainfall <- data.frame(day = days, rain = pmax(0, rnorm(length(days), season, 6)))
#'
#' calendar_heatmap(
#'   data        = rainfall,
#'   date        = "day",
#'   value       = "rain",
#'   weekStart   = "monday",
#'   colors      = c("#9be9a8", "#40c463", "#30a14e", "#216e39"),
#'   valueLabel  = "mm of rain",
#'   valueFormat = ",.1f",
#'   title       = "Daily rainfall, 2021-2023"
#' )
#'
#' # Event log: one row per event, counted per day
#' set.seed(7)
#' events <- data.frame(
#'   when = as.Date("2025-01-01") + sample(0:364, 900, replace = TRUE)
#' )
#'
#' calendar_heatmap(
#'   data       = events,
#'   date       = "when",
#'   valueLabel = "orders",
#'   colors     = c("#fde0c5", "#facba6", "#f59e72", "#e8603c", "#c0392b"),
#'   emptyCol   = "#f2f2f2",
#'   cellRadius = 3,
#'   title      = "Orders per day"
#' )
calendar_heatmap <- function(
    data,
    date,
    value             = NULL,
    aggregate         = c("sum", "mean", "max", "min", "count"),
    weekStart         = c("sunday", "monday"),
    colors            = c("#c0ddf9", "#73b3f3", "#3886e1", "#17459e"),
    emptyCol          = "#ebedf0",
    cellRadius        = 2,
    cellGap           = 3,
    valueLabel        = NULL,
    valueFormat       = ",.2~f",
    dateFormat        = "%a %b %-d, %Y",
    showYearLabel     = TRUE,
    showMonthLabels   = TRUE,
    showWeekdayLabels = TRUE,
    labelFontSize     = 10,
    legend            = TRUE,
    legendLabels      = c("Less", "More"),
    hover             = TRUE,
    animate           = TRUE,
    title             = NULL,
    titleFontSize     = 16,
    font              = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol             = "white",
    axisCol           = "#555555",
    width             = NULL,
    height            = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (!is.character(date) || length(date) != 1) {
    stop("'date' must be a single column name.")
  }
  if (is.null(data[[date]])) stop("Column '", date, "' not found in data.")

  if (!is.null(value)) {
    if (!is.character(value) || length(value) != 1) {
      stop("'value' must be NULL or a single column name.")
    }
    if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
    if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
  }

  aggregate <- match.arg(aggregate)
  weekStart <- match.arg(weekStart)

  # Convert the date column to Date
  raw_dates <- data[[date]]
  dates <- if (inherits(raw_dates, "Date")) {
    raw_dates
  } else if (inherits(raw_dates, "POSIXt")) {
    as.Date(format(raw_dates, "%Y-%m-%d"))
  } else if (is.character(raw_dates) || is.factor(raw_dates)) {
    as.Date(as.character(raw_dates), format = "%Y-%m-%d")
  } else {
    stop("Column '", date, "' must be of class Date, POSIXct, or a ",
         "character vector in 'YYYY-MM-DD' format.")
  }

  if (all(is.na(dates))) {
    stop("Column '", date, "' could not be converted to dates. Use class ",
         "Date, POSIXct, or 'YYYY-MM-DD' strings.")
  }

  values <- if (is.null(value)) rep(1, length(dates)) else data[[value]]
  if (is.null(value)) aggregate <- "count"

  keep <- !is.na(dates) & (aggregate == "count" | is.finite(values))
  if (sum(!is.na(dates)) < length(dates)) {
    warning(sum(is.na(dates)), " row(s) with a missing or invalid date ",
            "were dropped.")
  }
  if (!any(keep)) stop("No rows with a valid date and a finite value.")

  dates  <- dates[keep]
  values <- values[keep]

  agg_fun <- switch(
    aggregate,
    sum   = sum,
    mean  = mean,
    max   = max,
    min   = min,
    count = length
  )
  agg <- tapply(values, as.character(dates), agg_fun)
  daily <- data.frame(
    date  = names(agg),
    value = as.numeric(agg),
    stringsAsFactors = FALSE
  )

  if (!is.character(colors) || length(colors) < 1) {
    stop("'colors' must be a character vector of at least one color.")
  }
  if (!is.character(emptyCol) || length(emptyCol) != 1) {
    stop("'emptyCol' must be a single color.")
  }
  if (!is.numeric(cellRadius) || length(cellRadius) != 1 || cellRadius < 0) {
    stop("'cellRadius' must be a single non-negative number.")
  }
  if (!is.numeric(cellGap) || length(cellGap) != 1 || cellGap < 0) {
    stop("'cellGap' must be a single non-negative number.")
  }
  if (!is.character(legendLabels) || length(legendLabels) != 2) {
    stop("'legendLabels' must be a character vector of length 2.")
  }
  if (!is.character(valueFormat) || length(valueFormat) != 1) {
    stop("'valueFormat' must be a single d3-format string, e.g. ',.0f'.")
  }
  if (!is.character(dateFormat) || length(dateFormat) != 1) {
    stop("'dateFormat' must be a single d3-time-format string.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  if (is.null(valueLabel)) {
    valueLabel <- if (is.null(value)) "events" else value
  }

  # Default height: fits the stacked year panels
  if (is.null(height)) {
    years <- as.integer(format(range(dates), "%Y"))
    n_years <- years[2] - years[1] + 1
    height <- (if (!is.null(title)) titleFontSize + 18 else 0) +
      n_years * 160 + (if (legend) 34 else 6)
  }

  r2d3::r2d3(
    data   = daily,
    script = ddplot_script("calendarheatmap.js"),
    options = list(
      weekStart         = weekStart,
      colors            = as.list(colors),
      emptyCol          = emptyCol,
      cellRadius        = cellRadius,
      cellGap           = cellGap,
      valueLabel        = valueLabel,
      valueFormat       = valueFormat,
      dateFormat        = dateFormat,
      showYearLabel     = showYearLabel,
      showMonthLabels   = showMonthLabels,
      showWeekdayLabels = showWeekdayLabels,
      labelFontSize     = labelFontSize,
      legend            = legend,
      legendLabels      = as.list(legendLabels),
      hover             = hover,
      animate           = animate,
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
