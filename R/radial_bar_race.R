#' Create an animated radial bar chart race
#'
#' A circular bar chart race: at every period, the top \code{topN} items are
#' drawn around a central circle, sorted by value clockwise from the top, and
#' they glide to their new place when their rank changes. Two layouts are
#' available: \code{"spokes"}, where each item is a bar radiating from the
#' inner circle (its length is the value), and \code{"rings"}, where each
#' item is a concentric arc (the outermost ring is the leader, the length of
#' the arc is the value). The centre shows the period and the total of the
#' items on show. The values are interpolated between periods, so playing and
#' scrubbing are smooth; items entering or leaving the top slide in from, or
#' out to, the gap at the top of the circle.
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the race (also with the
#'     space bar), the timeline can be dragged or clicked, the arrow keys step
#'     one period, Home and End jump to the first and last periods. The
#'     speed (0.5x to 4x) and loop buttons sit on the right.
#'   \item The Spokes / Rings buttons at the top right morph the chart from
#'     one layout to the other, even while it plays.
#'   \item Hover a bar to highlight it and see a live tooltip with its value,
#'     its rank, its change since the previous period and its share of the
#'     total; the centre then shows the hovered item.
#'   \item Click a bar to pin it (click again to unpin): pinned items stay
#'     highlighted and the centre follows the last pinned item, even when it
#'     drops out of the top. \code{highlight} pins items from the start.
#'   \item Small arrows next to the labels show the items that just moved up
#'     or down.
#'   \item With \code{group}, click a legend entry to hide or show a group,
#'     double-click it to keep only that group; hovering an entry highlights
#'     its items. The ranks are computed without the hidden groups.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a bar sets \code{input$id_clicked} to a list with the
#' \code{label}, \code{group}, \code{rank}, \code{value}, \code{period} and
#' \code{pinned} state of the item, and \code{input$id_frame} gives the
#' current period (a list with its \code{index} and \code{label}). The time,
#' the layout, the pinned items and the hidden groups are kept when the chart
#' is re-rendered.
#'
#' @param data A data frame in long format: one row per item and period.
#' @param label The name of the column identifying the items (one bar per
#'   value).
#' @param value The name of the numeric column to race. Negative values are
#'   drawn as zero.
#' @param time The name of the column giving the period: numbers (e.g.
#'   years), dates (\code{Date} or \code{POSIXct}), or a character or factor
#'   column (in the order of the factor levels, or sorted).
#' @param group Optional. The name of a column grouping the items (e.g. a
#'   continent): the bars are then coloured by group, with a clickable
#'   legend.
#' @param topN The number of items on show at every period. Defaults to 12.
#' @param layout The initial layout: \code{"spokes"} (default, bars radiating
#'   from the centre) or \code{"rings"} (concentric arcs, best with
#'   \code{topN} up to about 12). It can be changed from the chart.
#' @param innerRadius The radius of the central circle: a number below 1 is
#'   a fraction of the radius of the chart, a larger number is a radius in
#'   pixels. Defaults to 0.25.
#' @param scale How the values are mapped to the length of the spokes:
#'   \code{"linear"} (default, the length from the inner circle is
#'   proportional to the value) or \code{"area"} (the area of each spoke is
#'   proportional to the value).
#' @param max Optional. A fixed maximum value for the scale (e.g. 100 for
#'   percentages). By default the scale follows the leader of each period,
#'   smoothly.
#' @param agg How rows with the same item and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param fillGaps Logical. Interpolate the values of an item between the
#'   periods where it is known. Defaults to \code{TRUE}.
#' @param fill Optional. The colours: a single colour, a vector of colours
#'   (recycled), or a named vector mapping colours to items (or to groups,
#'   with \code{group}). Defaults to the ddplot palette.
#' @param colorCategory Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10", "Set2" or "Paired", used when \code{fill} is not
#'   given.
#' @param highlight Optional. A character vector of items to pin from the
#'   start.
#' @param centerValue What the centre shows under the period:
#'   \code{"total"} (default, the total of the items on show),
#'   \code{"average"} (their average, better for rates such as a life
#'   expectancy) or \code{"none"}.
#' @param legend Logical. Show the legend of the groups. When \code{NULL}
#'   (default), it is shown when \code{group} is used.
#' @param layoutButtons Logical. Show the Spokes / Rings buttons. Defaults to
#'   \code{TRUE}.
#' @param frameDur The duration of one period, in milliseconds. Defaults to
#'   900.
#' @param ease The easing used within a period, the name of a D3 easing
#'   function without the "ease" prefix, e.g. \code{"CubicInOut"} (default),
#'   \code{"Linear"} or \code{"QuadInOut"}.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. Defaults to \code{FALSE}; it
#'   can be toggled from the player.
#' @param controls Logical. Show the player (play / pause, timeline, speed,
#'   loop). Defaults to \code{TRUE}.
#' @param startFrame The period shown first: \code{"first"} (default),
#'   \code{"last"} or a period number (1 for the first).
#' @param timeFormat Optional. A d3-time-format string for date periods, e.g.
#'   \code{"\%b \%Y"}.
#' @param title Optional. The title of the chart.
#' @param titleFontSize The font size of the title. Defaults to 20.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param font The font family. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background colour. Defaults to "white".
#' @param axisCol The colour of the texts, grid and controls. Defaults to
#'   "#333333".
#' @param valueFormat Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{"~s"}.
#' @param valuePrefix,valueSuffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" km"}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An animated radial bar chart race (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(gapminder)
#'
#' radial_bar_race(
#'   gapminder,
#'   label = "country",
#'   time = "year",
#'   value = "pop",
#'   title = "The most populous countries",
#'   subtitle = "Population, 1952 to 2007"
#' )
#'
#' # Coloured by continent, as concentric rings
#' radial_bar_race(
#'   gapminder,
#'   label = "country",
#'   time = "year",
#'   value = "gdpPercap",
#'   group = "continent",
#'   topN = 10,
#'   layout = "rings",
#'   valuePrefix = "$",
#'   valueFormat = ",.0f",
#'   title = "GDP per capita"
#' )
#'
#' # Character periods and a fixed maximum
#' scores <- data.frame(
#'   team = rep(c("Red", "Blue", "Green", "Gold", "Teal"), times = 4),
#'   round = rep(c("Round 1", "Round 2", "Round 3", "Round 4"), each = 5),
#'   points = c(10, 25, 18, 7, 30, 35, 40, 22, 30, 41, 60, 52, 47, 49, 55,
#'              80, 70, 76, 61, 66)
#' )
#' radial_bar_race(scores, label = "team", time = "round", value = "points",
#'                 max = 100, frameDur = 1400)
#'
radial_bar_race <- function(data,
                            label,
                            value,
                            time,
                            group = NULL,
                            topN = 12,
                            layout = c("spokes", "rings"),
                            innerRadius = 0.25,
                            scale = c("linear", "area"),
                            max = NULL,
                            agg = c("sum", "mean", "max", "min", "last"),
                            fillGaps = TRUE,
                            fill = NULL,
                            colorCategory = NULL,
                            highlight = NULL,
                            centerValue = c("total", "average", "none"),
                            legend = NULL,
                            layoutButtons = TRUE,
                            frameDur = 900,
                            ease = "CubicInOut",
                            autoplay = TRUE,
                            loop = FALSE,
                            controls = TRUE,
                            startFrame = "first",
                            timeFormat = NULL,
                            title = NULL,
                            titleFontSize = 20,
                            subtitle = NULL,
                            subtitleFontSize = 13,
                            font = "Verdana, Geneva, Tahoma, sans-serif",
                            bgcol = "white",
                            axisCol = "#333333",
                            valueFormat = NULL,
                            valuePrefix = "",
                            valueSuffix = "",
                            tooltip = TRUE,
                            width = NULL,
                            height = NULL) {

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  for (k in c("label", "time", "value")) {
    nm <- get(k)
    if (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]])) {
      stop("'", k, "' must be the name of a column of 'data'")
    }
  }
  if (!is.numeric(data[[value]])) stop("'", value, "' must be a numeric column")
  layout <- match.arg(layout)
  scale <- match.arg(scale)
  agg <- match.arg(agg)
  centerValue <- match.arg(centerValue)
  if (!is.numeric(topN) || length(topN) != 1 || !is.finite(topN) || topN < 1) {
    stop("'topN' must be a positive whole number")
  }
  topN <- as.integer(round(topN))
  if (!is.numeric(innerRadius) || length(innerRadius) != 1 || !is.finite(innerRadius) ||
      innerRadius < 0 || (innerRadius >= 0.9 && innerRadius < 1)) {
    stop("'innerRadius' must be a fraction below 0.9 or a radius in pixels")
  }
  if (!is.null(max) && (!is.numeric(max) || length(max) != 1 || !is.finite(max) || max <= 0)) {
    stop("'max' must be a positive number")
  }
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.null(colorCategory) && (!is.character(colorCategory) || length(colorCategory) != 1)) {
    stop("'colorCategory' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }
  if (!is.null(highlight) && !is.character(highlight) && !is.factor(highlight)) {
    stop("'highlight' must be a character vector of items")
  }
  for (k in c("titleFontSize", "subtitleFontSize")) {
    v <- get(k)
    if (!is.numeric(v) || length(v) != 1 || !(v > 0)) stop("'", k, "' must be a positive number")
  }

  race <- race_prepare(data, id = label, time = time, values = value, group = group,
                       agg = agg, fill_gaps = isTRUE(fillGaps))
  names(race$series) <- "value"
  if (any(vapply(race$series$value, function(s) any(s < 0, na.rm = TRUE), TRUE))) {
    warning("negative values are drawn as zero")
  }

  player <- race_player_options(frameDur, ease, autoplay, loop, controls, startFrame, timeFormat)
  player$stateKey <- paste("radialbarrace", label, time, value, if (is.null(group)) "" else group,
                           agg, sep = "|")

  keys <- if (is.null(group)) as.character(race$items) else unique(as.character(race$groups))
  colors <- if (!is.null(fill) || is.null(colorCategory)) race_colors(keys, fill) else NULL

  if (is.null(legend)) legend <- !is.null(group)

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "radialbarrace.js")),
    options = list(
      race = race,
      player = player,
      groupKeys = if (is.null(group)) NULL else I(keys),
      colors = if (is.null(colors)) NULL else I(colors),
      colorCategory = colorCategory,
      labelName = label,
      valueName = value,
      groupName = group,
      topN = topN,
      layout = layout,
      innerRadius = innerRadius,
      scale = scale,
      max = max,
      highlight = I(as.character(highlight)),
      centerValue = centerValue,
      legend = isTRUE(legend) && !is.null(group),
      layoutButtons = isTRUE(layoutButtons),
      title = title,
      titleFontSize = titleFontSize,
      subtitle = subtitle,
      subtitleFontSize = subtitleFontSize,
      font = font,
      bgcol = bgcol,
      axisCol = axisCol,
      valueFormat = valueFormat,
      valuePrefix = valuePrefix,
      valueSuffix = valueSuffix,
      tooltip = isTRUE(tooltip)
    ),
    width = width,
    height = height
  )
}
