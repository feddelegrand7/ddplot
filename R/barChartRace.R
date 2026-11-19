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
#'     dimmed, and when it falls out of the top \code{top_n} it is still shown
#'     under the cut with its rank. Click it again, or press Escape, to stop
#'     following. \code{highlight} follows items from the start.
#'   \item With \code{group}, click a legend entry to hide or show a group (the
#'     ranks are recomputed without it), double-click it to isolate it, hover
#'     it to highlight its bars.
#'   \item When there are more items than \code{top_n}, the buttons at the top
#'     right switch between the top \code{top_n} and a longer ranking.
#'   \item A small green arrow flashes next to a bar that overtakes another
#'     (\code{rank_flash}).
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
#' @param frame_dur The time, in milliseconds, the race pauses on each period
#'   before moving to the next one. Defaults to 0 (no pause). Each period
#'   lasts \code{frame_dur + transition_dur} milliseconds at 1x speed: the bars
#'   rest for \code{frame_dur}, then move for \code{transition_dur}.
#' @param transition_dur The time, in milliseconds, spent moving from one period
#'   to the next. Defaults to 1000.
#' @param color_category Optional. The name of a D3 categorical colour scheme
#'   (e.g. \code{"Accent"}, \code{"Tableau10"}, \code{"Set2"}), see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>. When \code{NULL}
#'   (default), the ddplot palette is used. \code{fill} takes precedence.
#' @param sort How the bars are ranked: \code{"descending"} (default, the
#'   largest value on top), \code{"ascending"} (the smallest value on top) or
#'   \code{"none"} (the bars keep the order of the data, or of the factor
#'   levels of \code{y}, and only the first \code{top_n} items are shown).
#' @param padding_width The space between bars, as a share of the row height,
#'   from 0 to 0.99. Defaults to 0.2.
#' @param x_font_size The font size of the value axis labels. Defaults to 10.
#' @param y_font_size The font size of the item names (shrunk when the bars are
#'   thin). Defaults to 12.
#' @param xticks Optional. The approximate number of value axis ticks.
#' @param xtitle Optional. The title of the value axis, drawn above it. It is
#'   also used as the name of the value in the tooltip.
#' @param xtitle_font_size The font size of the value axis title. Defaults to 12.
#' @param ytitle Optional. The title of the item names, drawn above them.
#' @param ytitle_font_size The font size of the item axis title. Defaults to 12.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param stroke Optional. The stroke colour of the bars.
#' @param stroke_width Optional. The stroke width of the bars (1 when only
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
#' @param time_label Logical. Show the big period label in the bottom right
#'   corner. Defaults to \code{TRUE}.
#' @param time_label_opts A list of options for the period label: \code{size}
#'   (font size in pixels, chosen from the chart size when \code{NULL}),
#'   \code{prefix} and \code{suffix} (text around the period), \code{xOffset}
#'   and \code{yOffset} (shifts to the left and upwards, as a share of the
#'   width and height of the label, from the bottom right corner of the panel;
#'   both default to 0). Missing entries keep their defaults.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#' @param top_n The number of bars shown. Defaults to 10 (or the number of
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
#' @param name_position Where the item names go: \code{"left"} (default, in a
#'   column left of the bars) or \code{"inside"} (inside the end of the bar,
#'   or just after it when the bar is too short).
#' @param total Show the total of all the items under the period label, and
#'   the share of the total in the tooltip: \code{FALSE} (default), \code{TRUE}
#'   or a label such as \code{"World"}. Only meaningful for values that add up.
#' @param rank_flash Logical. Flash a small arrow next to a bar that overtakes
#'   another one. Defaults to \code{TRUE}.
#' @param agg How rows with the same item and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param corner_radius The radius of the rounded bar ends, in pixels.
#'   Defaults to 3; use 0 for square bars.
#' @param controls Logical. Show the player (play / pause, timeline, speed,
#'   loop) and the ranking length buttons. Defaults to \code{TRUE}.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. Defaults to \code{FALSE}; it
#'   can be toggled from the player.
#' @param start_frame The period shown first: \code{"first"} (default),
#'   \code{"last"} or a period number.
#' @param time_format Optional. A d3-time-format string for date periods, e.g.
#'   \code{"\%b \%Y"}. Chosen from the spacing of the dates when \code{NULL}.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param value_format Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{".3~s"}.
#' @param value_prefix,value_suffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" years"}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param axis_col The colour of the axes, labels and titles. Defaults to
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
#'   name_position = "inside", ease = "CubicInOut",
#'   value_suffix = " units", title = "Units sold, year to date"
#' )
bar_chart_race <- function(
  data,
  x,
  y,
  time,
  ease = "Linear",
  frame_dur = 0,
  transition_dur = 1000,
  color_category = NULL,
  sort = "descending",
  padding_width = 0.2,
  x_font_size = 10,
  y_font_size = 12,
  xticks = NULL,
  xtitle = NULL,
  xtitle_font_size = 12,
  ytitle = NULL,
  ytitle_font_size = 12,
  title = NULL,
  title_font_size = 20,
  stroke = NULL,
  stroke_width = NULL,
  font = "Verdana, Geneva, Tahoma, sans-serif",
  bgcol = "white",
  panelcol = NULL,
  xgridlinecol = NULL,
  opacity = 1,
  time_label = TRUE,
  time_label_opts = list(
    size = NULL,
    prefix = "",
    suffix = "",
    xOffset = 0,
    yOffset = 0
  ),
  width = NULL,
  height = NULL,
  top_n = 10,
  group = NULL,
  fill = NULL,
  highlight = NULL,
  labels = TRUE,
  name_position = c("left", "inside"),
  total = FALSE,
  rank_flash = TRUE,
  agg = c("sum", "mean", "max", "min", "last"),
  corner_radius = 3,
  controls = TRUE,
  autoplay = TRUE,
  loop = FALSE,
  start_frame = "first",
  time_format = NULL,
  subtitle = NULL,
  subtitle_font_size = 13,
  value_format = NULL,
  value_prefix = "",
  value_suffix = "",
  tooltip = TRUE,
  axis_col = "#333333"
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
  num1(frame_dur, "frame_dur", 0)
  num1(transition_dur, "transition_dur", 0)
  if (frame_dur + transition_dur <= 0) stop("'frame_dur' + 'transition_dur' must be positive")
  if (!is.numeric(top_n) || length(top_n) != 1 || !is.finite(top_n) || top_n < 1) {
    stop("'top_n' must be a whole number >= 1")
  }
  if (!is.numeric(padding_width) || length(padding_width) != 1 ||
      padding_width < 0 || padding_width > 0.99) {
    stop("'padding_width' must be a number between 0 and 0.99")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  num1(corner_radius, "corner_radius", 0)
  for (nm in c("x_font_size", "y_font_size", "xtitle_font_size", "ytitle_font_size",
               "title_font_size", "subtitle_font_size")) {
    num1(get(nm), nm, 1)
  }
  if (!is.null(xticks)) num1(xticks, "xticks", 1)
  if (!is.null(stroke_width)) num1(stroke_width, "stroke_width", 0)
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 colour scheme, e.g. \"Accent\"")
  }
  if (!(isTRUE(total) || identical(total, FALSE) || (is.character(total) && length(total) == 1))) {
    stop("'total' must be TRUE, FALSE or a label")
  }
  name_position <- match.arg(name_position)
  agg <- match.arg(agg)
  if (!is.list(time_label_opts)) stop("'time_label_opts' must be a list")

  time_label_opts <- utils::modifyList(
    list(size = NULL, prefix = "", suffix = "", xOffset = 0, yOffset = 0),
    time_label_opts
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
  colors <- if (!is.null(fill) || is.null(color_category)) race_colors(keys, if (use_fill) fill else NULL) else NULL

  player <- race_player_options(
    frame_dur + transition_dur, ease, autoplay, loop, controls, start_frame, time_format
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
      colorCategory = color_category,
      groupName = group,
      valName = if (is.null(xtitle)) x else xtitle,
      intValues = all(abs(xv - round(xv)) < 1e-9),
      hold = frame_dur / (frame_dur + transition_dur),
      transitionDur = transition_dur,
      ease = ease,
      sort = sort,
      topN = as.integer(round(top_n)),
      paddingWidth = padding_width,
      xFontSize = x_font_size,
      yFontSize = y_font_size,
      xticks = xticks,
      xtitle = xtitle,
      xtitleFontSize = xtitle_font_size,
      ytitle = ytitle,
      ytitleFontSize = ytitle_font_size,
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      stroke = stroke,
      strokeWidth = stroke_width,
      font = font,
      bgcol = bgcol,
      panelcol = panelcol,
      gridCol = if (is.null(xgridlinecol) || is.na(xgridlinecol)) NULL else xgridlinecol,
      opacity = opacity,
      timeLabel = isTRUE(time_label),
      timeLabelOpts = time_label_opts,
      highlight = I(as.character(highlight)),
      labels = isTRUE(labels),
      namePosition = name_position,
      total = if (isTRUE(total)) "Total" else if (is.character(total)) total else NULL,
      rankFlash = isTRUE(rank_flash),
      cornerRadius = corner_radius,
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      axisCol = axis_col
    )
  )
}
