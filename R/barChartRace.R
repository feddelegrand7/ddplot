#' Create an animated, interactive bar chart race.
#'
#' Ranks items (countries, products, teams...) by a value and animates the
#' ranking through time: the bars glide past each other when they overtake,
#' new items slide up from below the cut and leaving ones sink and fade, the
#' value labels count smoothly, the axis follows the leader and a big period
#' label sits in the corner. A player at the bottom plays, pauses and scrubs
#' the animation.
#'
#' The data is long: one row per item and period, with the item names in
#' \code{y}, the values in \code{x} and the periods in \code{time} (numbers
#' such as years, dates, or a factor or character column whose levels give
#' the order). Gaps inside an item are interpolated; items missing before
#' their first or after their last period enter and leave the race.
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the race (also with the
#'     space bar), the timeline can be dragged or clicked, the arrow keys step
#'     one period, Home and End jump to the start and the end. The speed button
#'     cycles from 0.5x to 4x, the loop button repeats the race.
#'   \item Hover a bar to see its value, its rank, its change over the last
#'     period and (with \code{total}) its share of the total. The tooltip keeps
#'     updating while the race plays.
#'   \item Click a bar to follow it: it stays highlighted, the others are
#'     dimmed, and when it falls out of the top \code{topN} it is still shown
#'     under the cut with its rank. Click it again, or press Escape, to stop
#'     following. \code{highlight} follows items from the start.
#'   \item With \code{group}, click a legend entry to hide or show a group (the
#'     ranks are recomputed without it), double-click it to isolate it, hover
#'     it to highlight its bars.
#'   \item When there are more items than \code{topN}, the buttons at the top
#'     right switch between the top \code{topN} and a longer ranking.
#'   \item A small green arrow flashes next to a bar that overtakes another
#'     (\code{rankFlash}).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a bar sets \code{input$id_clicked} to a list with the
#' \code{item}, its \code{group}, \code{value}, \code{rank}, \code{period} and
#' whether it is now \code{followed}; \code{input$id_frame} gives the period
#' shown (\code{index} and \code{label}). The current time, the speed, the
#' followed items, the hidden groups and the ranking length are kept when the
#' chart is re-rendered.
#'
#' @param data The data frame containing the variables to consider (one row
#'   per item and period).
#' @param x The name of the numeric column giving the length of the bars.
#' @param y The name of the column giving the items (one bar per value).
#' @param time The name of the column giving the periods: numeric (e.g.
#'   years), \code{Date}, \code{POSIXct}, or a factor or character column
#'   (factor levels, or the sorted values, give the order).
#' @param ease The easing used within each period, a d3-ease name such as
#'   \code{"Linear"} (default, a steady race), \code{"CubicInOut"} (slows down
#'   on every period) or \code{"BackInOut"} (a little bounce). See
#'   <https://github.com/d3/d3-ease>.
#' @param frameDur The time, in milliseconds, the race pauses on each period
#'   before moving to the next one. Defaults to 0 (no pause). Each period
#'   lasts \code{frameDur + transitionDur} milliseconds at 1x speed: the bars
#'   rest for \code{frameDur}, then move for \code{transitionDur}.
#' @param transitionDur The time, in milliseconds, spent moving from one period
#'   to the next. Defaults to 1000.
#' @param colorCategory Optional. The name of a D3 categorical colour scheme
#'   (e.g. \code{"Accent"}, \code{"Tableau10"}, \code{"Set2"}), see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>. When \code{NULL}
#'   (default), the ddplot palette is used. \code{fill} takes precedence.
#' @param sort How the bars are ranked: \code{"descending"} (default, the
#'   largest value on top), \code{"ascending"} (the smallest value on top) or
#'   \code{"none"} (the bars keep the order of the data, or of the factor
#'   levels of \code{y}, and only the first \code{topN} items are shown).
#' @param paddingWidth The space between bars, as a share of the row height,
#'   from 0 to 0.99. Defaults to 0.2.
#' @param xFontSize The font size of the value axis labels. Defaults to 10.
#' @param yFontSize The font size of the item names (shrunk when the bars are
#'   thin). Defaults to 12.
#' @param xticks Optional. The approximate number of value axis ticks.
#' @param xtitle Optional. The title of the value axis, drawn above it. It is
#'   also used as the name of the value in the tooltip.
#' @param xtitleFontSize The font size of the value axis title. Defaults to 12.
#' @param ytitle Optional. The title of the item names, drawn above them.
#' @param ytitleFontSize The font size of the item axis title. Defaults to 12.
#' @param title Optional. The title of the plot.
#' @param titleFontSize The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the bars.
#' @param strokeWidth Optional. The stroke width of the bars (1 when only
#'   \code{stroke} is given).
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background colour of the SVG. Defaults to "white".
#' @param panelcol Optional. The background colour of the panel behind the
#'   bars (none by default).
#' @param xgridlinecol The colour of the vertical grid lines. When \code{NULL}
#'   (default), a light grey, or white when \code{panelcol} is given. Use
#'   \code{NA} to hide them.
#' @param opacity The opacity of the bars (from 0 to 1). Defaults to 1.
#' @param timeLabel Logical. Show the big period label in the bottom right
#'   corner. Defaults to \code{TRUE}.
#' @param timeLabelOpts A list of options for the period label: \code{size}
#'   (font size in pixels, chosen from the chart size when \code{NULL}),
#'   \code{prefix} and \code{suffix} (text around the period), \code{xOffset}
#'   and \code{yOffset} (shifts to the left and upwards, as a share of the
#'   width and height of the label, from the bottom right corner of the panel;
#'   both default to 0). Missing entries keep their defaults.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param topN The number of bars shown. Defaults to 10 (or the number of
#'   items, when there are fewer).
#' @param group Optional. The name of a column grouping the items (e.g. the
#'   continent of each country). The bars are coloured by group, with a
#'   clickable legend.
#' @param fill Optional. The colours of the bars: a single colour, an unnamed
#'   vector (recycled over the items, or the groups with \code{group}), or a
#'   named vector mapping items (or groups) to colours, the others taking the
#'   palette.
#' @param highlight Optional. A character vector of items followed from the
#'   start (the other bars are dimmed, see Interactions).
#' @param labels Logical. Show the value at the end of each bar, counting
#'   smoothly between periods. Defaults to \code{TRUE}.
#' @param namePosition Where the item names go: \code{"left"} (default, in a
#'   column left of the bars) or \code{"inside"} (inside the end of the bar,
#'   or just after it when the bar is too short).
#' @param total Show the total of all the items under the period label, and
#'   the share of the total in the tooltip: \code{FALSE} (default), \code{TRUE}
#'   or a label such as \code{"World"}. Only meaningful for values that add up.
#' @param rankFlash Logical. Flash a small arrow next to a bar that overtakes
#'   another one. Defaults to \code{TRUE}.
#' @param agg How rows with the same item and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param cornerRadius The radius of the rounded bar ends, in pixels.
#'   Defaults to 3; use 0 for square bars.
#' @param controls Logical. Show the player (play / pause, timeline, speed,
#'   loop) and the ranking length buttons. Defaults to \code{TRUE}.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. Defaults to \code{FALSE}; it
#'   can be toggled from the player.
#' @param startFrame The period shown first: \code{"first"} (default),
#'   \code{"last"} or a period number.
#' @param timeFormat Optional. A d3-time-format string for date periods, e.g.
#'   \code{"\%b \%Y"}. Chosen from the spacing of the dates when \code{NULL}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param valueFormat Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{".3~s"}.
#' @param valuePrefix,valueSuffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" years"}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param axisCol The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#'
#' @return An animated, interactive SVG bar chart race (an r2d3 htmlwidget).
#' @export
#' @examples
#' library(gapminder)
#' library(dplyr)
#' # let's select a set of countries only
#' gapminder <- gapminder %>%
#' filter(
#' country %in% c("Algeria", "Mexico", "Iceland", "Greece", "Finland")
#' )
#'
#' bar_chart_race(
#' data = gapminder,
#' x = "lifeExp",
#' y = "country",
#' time = "year",
#' ytitle = "Country",
#' xtitle = "Life expectancy",
#' title = "Bar chart race of countries life expectancy"
#' )
#'
#' # Every country, the top 10 coloured by continent, following France
#' bar_chart_race(
#'   data = gapminder::gapminder,
#'   x = "pop",
#'   y = "country",
#'   time = "year",
#'   group = "continent",
#'   highlight = "France",
#'   total = "World",
#'   title = "The most populous countries",
#'   subtitle = "Population, 1952 to 2007"
#' )
#'
#' # Monthly dates, names inside the bars
#' set.seed(1)
#' months <- seq(as.Date("2023-01-01"), by = "month", length.out = 12)
#' sales <- data.frame(
#'   brand = rep(c("Alpha", "Bravo", "Comet", "Delta", "Echo", "Fusion"), 12),
#'   month = rep(months, each = 6),
#'   units = round(runif(72, 20, 80))
#' )
#' sales$units <- ave(sales$units, sales$brand, FUN = cumsum)
#' bar_chart_race(
#'   sales, x = "units", y = "brand", time = "month",
#'   namePosition = "inside", ease = "CubicInOut",
#'   valueSuffix = " units", title = "Units sold, year to date"
#' )
bar_chart_race <- function(
  data,
  x,
  y,
  time,
  ease = "Linear",
  frameDur = 0,
  transitionDur = 1000,
  colorCategory = NULL,
  sort = "descending",
  paddingWidth = 0.2,
  xFontSize = 10,
  yFontSize = 12,
  xticks = NULL,
  xtitle = NULL,
  xtitleFontSize = 12,
  ytitle = NULL,
  ytitleFontSize = 12,
  title = NULL,
  titleFontSize = 20,
  stroke = NULL,
  strokeWidth = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  panelcol = NULL,
  xgridlinecol = NULL,
  opacity = 1,
  timeLabel = TRUE,
  timeLabelOpts = list(
    size = NULL,
    prefix = "",
    suffix = "",
    xOffset = 0,
    yOffset = 0
  ),
  width = NULL,
  height = NULL,
  topN = 10,
  group = NULL,
  fill = NULL,
  highlight = NULL,
  labels = TRUE,
  namePosition = c("left", "inside"),
  total = FALSE,
  rankFlash = TRUE,
  agg = c("sum", "mean", "max", "min", "last"),
  cornerRadius = 3,
  controls = TRUE,
  autoplay = TRUE,
  loop = FALSE,
  startFrame = "first",
  timeFormat = NULL,
  subtitle = NULL,
  subtitleFontSize = 13,
  valueFormat = NULL,
  valuePrefix = "",
  valueSuffix = "",
  tooltip = TRUE,
  axisCol = "#333333"
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  if (!is.character(x) || length(x) != 1 || is.null(data[[x]]) ||
      !is.character(y) || length(y) != 1 || is.null(data[[y]])) {
    stop("Please check that x and y belong to the specified data frame")
  }
  if (!is.character(time) || length(time) != 1 || is.null(data[[time]])) {
    stop("'time' must be the name of a column of 'data'")
  }
  if (!is.numeric(data[[x]])) stop("'", x, "' (x) must be a numeric column")
  if (length(sort) != 1 || !sort %in% c("none", "ascending", "descending")) {
    stop("
    the sort parameter can only take the following values:
    'none', 'ascending' or 'descending'
       ")
  }
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.character(ease) || length(ease) != 1) {
    stop("'ease' must be the name of a d3 easing, e.g. \"Linear\" or \"CubicInOut\"")
  }
  num1 <- function(v, nm, lo = -Inf) {
    if (!is.numeric(v) || length(v) != 1 || !is.finite(v) || v < lo) {
      stop("'", nm, "' must be a number", if (lo > -Inf) paste0(" >= ", lo) else "")
    }
  }
  num1(frameDur, "frameDur", 0)
  num1(transitionDur, "transitionDur", 0)
  if (frameDur + transitionDur <= 0) stop("'frameDur' + 'transitionDur' must be positive")
  if (!is.numeric(topN) || length(topN) != 1 || !is.finite(topN) || topN < 1) {
    stop("'topN' must be a whole number >= 1")
  }
  if (!is.numeric(paddingWidth) || length(paddingWidth) != 1 ||
      paddingWidth < 0 || paddingWidth > 0.99) {
    stop("'paddingWidth' must be a number between 0 and 0.99")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  num1(cornerRadius, "cornerRadius", 0)
  for (nm in c("xFontSize", "yFontSize", "xtitleFontSize", "ytitleFontSize",
               "titleFontSize", "subtitleFontSize")) {
    num1(get(nm), nm, 1)
  }
  if (!is.null(xticks)) num1(xticks, "xticks", 1)
  if (!is.null(strokeWidth)) num1(strokeWidth, "strokeWidth", 0)
  if (!is.null(colorCategory) && (!is.character(colorCategory) || length(colorCategory) != 1)) {
    stop("'colorCategory' must be the name of a D3 colour scheme, e.g. \"Accent\"")
  }
  if (!(isTRUE(total) || identical(total, FALSE) || (is.character(total) && length(total) == 1))) {
    stop("'total' must be TRUE, FALSE or a label")
  }
  namePosition <- match.arg(namePosition)
  agg <- match.arg(agg)
  if (!is.list(timeLabelOpts)) stop("'timeLabelOpts' must be a list")

  timeLabelOpts <- utils::modifyList(
    list(size = NULL, prefix = "", suffix = "", xOffset = 0, yOffset = 0),
    timeLabelOpts
  )

  race <- race_prepare(data, id = y, time = time, values = x, group = group, agg = agg)
  if (!any(vapply(race$series[[1]], function(s) any(is.finite(s)), TRUE))) {
    stop("'", x, "' has no finite value")
  }
  names(race$series) <- "v"
  xv <- data[[x]][is.finite(data[[x]])]

  items <- as.character(race$items)
  groups <- if (is.null(group)) NULL else unique(as.character(race$groups))
  if (!is.null(group) && is.factor(data[[group]])) {
    lv <- levels(data[[group]])
    groups <- c(lv[lv %in% groups], setdiff(groups, lv))
  }
  # colours: fill (named or not) > colorCategory (in JS) > palette
  keys <- if (is.null(group)) items else groups
  use_fill <- !is.null(fill) && !(length(fill) == 1 && is.null(names(fill)) && !is.null(group))
  colors <- if (!is.null(fill) || is.null(colorCategory)) race_colors(keys, if (use_fill) fill else NULL) else NULL

  player <- race_player_options(
    frameDur + transitionDur, ease, autoplay, loop, controls, startFrame, timeFormat
  )
  player$stateKey <- paste("barrace", y, time, x, if (is.null(group)) "" else group, sep = "|")

  if (is.null(xgridlinecol)) xgridlinecol <- if (is.null(panelcol)) "#e9e9e9" else "white"

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "barchartrace.js")),
    width = width,
    height = height,
    options = list(
      race = race,
      player = player,
      stateKey = player$stateKey,
      groupKeys = if (is.null(groups)) NULL else I(groups),
      colors = if (is.null(colors)) NULL else I(colors),
      colorCategory = colorCategory,
      groupName = group,
      valName = if (is.null(xtitle)) x else xtitle,
      intValues = all(abs(xv - round(xv)) < 1e-9),
      hold = frameDur / (frameDur + transitionDur),
      transitionDur = transitionDur,
      ease = ease,
      sort = sort,
      topN = as.integer(round(topN)),
      paddingWidth = paddingWidth,
      xFontSize = xFontSize,
      yFontSize = yFontSize,
      xticks = xticks,
      xtitle = xtitle,
      xtitleFontSize = xtitleFontSize,
      ytitle = ytitle,
      ytitleFontSize = ytitleFontSize,
      title = title,
      titleFontSize = titleFontSize,
      subtitle = subtitle,
      subtitleFontSize = subtitleFontSize,
      stroke = stroke,
      strokeWidth = strokeWidth,
      font = font,
      bgcol = bgcol,
      panelcol = panelcol,
      gridCol = if (is.null(xgridlinecol) || is.na(xgridlinecol)) NULL else xgridlinecol,
      opacity = opacity,
      timeLabel = isTRUE(timeLabel),
      timeLabelOpts = timeLabelOpts,
      highlight = I(as.character(highlight)),
      labels = isTRUE(labels),
      namePosition = namePosition,
      total = if (isTRUE(total)) "Total" else if (is.character(total)) total else NULL,
      rankFlash = isTRUE(rankFlash),
      cornerRadius = cornerRadius,
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      valueFormat = valueFormat,
      valuePrefix = valuePrefix,
      valueSuffix = valueSuffix,
      axisCol = axisCol
    )
  )
}
