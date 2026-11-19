#' Create a racing line chart.
#'
#' Draws one line per item (a country, a product, a team...) that grows as
#' time advances, with a moving head at its tip: a dot, the name of the item
#' and its live value. The axes rescale smoothly as the race goes, the labels
#' spread so they never overlap, and a ranking emerges. Switch to the rank
#' mode to watch the same race as a bump chart (rank 1 at the top), keep only
#' the leaders in colour with \code{top_n}, follow a sliding window of the last
#' periods with \code{window}, and annotate key moments with \code{events}.
#'
#' The data must be in long format: one row per line and period. The time
#' column can be numeric (years), a \code{Date}, a date-time, or a character
#' or factor column of ordered periods (shown as an ordinal axis, in the
#' order of the factor levels or in alphabetical order).
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the race, and its
#'     timeline can be dragged or clicked to move in time. The speed (0.5x to
#'     4x) and the loop can be changed. With the keyboard: space plays or
#'     pauses, the arrows step one period, Home and End jump to the start and
#'     the end.
#'   \item Hover the chart to see a crosshair at the period under the mouse,
#'     listing the leading values and ranks at that time; the line closest to
#'     the mouse is highlighted and the others are dimmed. The tooltip keeps
#'     updating while the race plays.
#'   \item Hover a label to see a summary of the line (value, rank, change
#'     since its first period, peak).
#'   \item Click a line or a label to pin it: it stays highlighted (and
#'     coloured and labelled, even outside the \code{top_n}) until clicked
#'     again. Click an empty area of the chart to clear the pins.
#'   \item The buttons at the top right switch between values and ranks.
#'   \item With \code{category}, click a legend entry to hide or show a
#'     category, double-click it to isolate it; hovering it highlights its
#'     lines.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a line or a label sets \code{input$id_clicked} to a list with
#' \code{name}, \code{category}, \code{period}, \code{value}, \code{rank} and
#' \code{pinned}; \code{input$id_frame} gives the current period (a list with
#' its \code{index} and \code{label}). The time, the speed, the loop, the mode,
#' the pinned lines and the hidden categories are kept when the chart is
#' re-rendered.
#'
#' @param data The data frame containing the variables to consider, in long
#'   format (one row per line and period).
#' @param x The name of the time column: numeric (e.g. years), \code{Date},
#'   \code{POSIXct}, or a character or factor column of ordered periods.
#' @param y The name of the numeric column holding the values.
#' @param group The name of the column identifying the lines (one line per
#'   distinct value).
#' @param mode What the vertical axis shows: \code{"value"} (default) or
#'   \code{"rank"} (a bump chart race, rank 1 at the top). It can be changed
#'   from the chart when \code{controls = TRUE}.
#' @param top_n Optional. A number of lines: only the current top \code{top_n}
#'   lines are coloured and labelled, the others are drawn as thin grey lines
#'   in the background. The set changes as the race goes. In rank mode, the
#'   vertical axis shows the first \code{top_n} ranks.
#' @param fill Optional. The colour of the lines: a single colour, a vector
#'   of colours (recycled), or a named vector mapping colours to lines (or to
#'   categories, with \code{category}). Defaults to a built-in palette.
#' @param category Optional. The name of a column grouping the lines (e.g. a
#'   continent): the lines are coloured by category, with a clickable legend.
#' @param color_category Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10", "Set2" or "Dark2", used when \code{fill} is not
#'   given. Defaults to the ddplot palette.
#' @param highlight Optional. A character vector of lines to pin from the
#'   start (they are highlighted, coloured and labelled).
#' @param y_scale The scale of the values: \code{"linear"} (default) or
#'   \code{"log"} (values that are not positive are dropped).
#' @param y_zero Logical. Start the value axis at zero (linear scale only).
#'   Defaults to \code{TRUE}; use \code{FALSE} to zoom on the range of the
#'   values seen so far.
#' @param window Optional. A number of periods: the time axis then slides to
#'   show only the last \code{window} periods.
#' @param grow Logical. Instead of showing the whole time range from the
#'   start, let the time axis grow with the race, so the heads stay near the
#'   right edge. Ignored with \code{window}. Defaults to \code{FALSE}.
#' @param events Optional. Annotations that pop up when the race reaches
#'   them: a named vector whose values are the times and whose names are the
#'   labels (e.g. \code{c("Oil crisis" = 1973)}), or a data frame whose first
#'   column holds the times and second column the labels. Times use the type
#'   of the \code{x} column (numbers, dates or period labels).
#' @param labels Logical. Show the name and the live value next to the head
#'   of each line. Defaults to \code{TRUE}.
#' @param stroke_width The width of the lines, in pixels. Defaults to 2.5.
#' @param dot_radius The radius of the dot at the head of each line, in
#'   pixels. Defaults to 4.5.
#' @param fill_gaps Logical. Interpolate the values of a line between the
#'   periods where it is known (otherwise the line is broken). Defaults to
#'   \code{TRUE}.
#' @param agg How rows with the same line and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param xtitle Optional. The title of the time axis.
#' @param ytitle Optional. The title of the value axis, drawn above it.
#'   Defaults to the name of \code{y}; use \code{""} to hide it.
#' @param frame_dur The duration of one period, in milliseconds. Defaults to
#'   700.
#' @param ease The easing of the movement within a period, the name of a D3
#'   easing function without its \code{ease} prefix, e.g. \code{"Linear"}
#'   (default, a constant speed) or \code{"CubicInOut"}.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. Defaults to \code{FALSE}; it
#'   can be changed from the player.
#' @param controls Logical. Show the player and the mode buttons. Defaults to
#'   \code{TRUE}.
#' @param start_frame The period shown first: \code{"first"} (default),
#'   \code{"last"} (the full lines) or a period number.
#' @param time_format Optional. A d3 time format for date periods, e.g.
#'   \code{"\%b \%Y"}.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param font The font family to consider for the titles. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background color of the SVG. Defaults to "white".
#' @param axis_col The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#' @param grid_col The colour of the grid lines. Defaults to "#ececec"; use
#'   \code{NA} to hide them.
#' @param value_format Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{"~s"}.
#' @param value_prefix,value_suffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" years"}.
#' @param tooltip Logical. Show tooltips on hover. Defaults to \code{TRUE}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An interactive SVG racing line chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(gapminder) # needed for the gapminder data frame
#' library(dplyr) # needed for data wrangling
#'
#' gapminder %>%
#'   filter(country %in% c("China", "India", "Japan", "Korea, Rep.",
#'                         "Indonesia", "Thailand", "Vietnam", "Philippines")) %>%
#'   line_race(
#'     x = "year", y = "gdpPercap", group = "country",
#'     y_scale = "log", value_prefix = "$", value_format = ",.0f",
#'     ytitle = "GDP per capita (log scale)",
#'     title = "The Asian growth race",
#'     events = c("Reforms in China" = 1978, "Asian crisis" = 1997)
#'   )
#'
#' # Every country, the ten longest lives in colour; switch to ranks live
#' line_race(
#'   gapminder, x = "year", y = "lifeExp", group = "country",
#'   category = "continent", top_n = 10, y_zero = FALSE,
#'   value_format = ".1f", ytitle = "Life expectancy (years)",
#'   highlight = "Japan", title = "Life expectancy, 1952 to 2007"
#' )
#'
#' # Character periods, as a bump chart race
#' sales <- data.frame(
#'   quarter = rep(paste0(rep(2022:2023, each = 4), "-Q", 1:4), 4),
#'   brand = rep(c("Alpha", "Beta", "Gamma", "Delta"), each = 8),
#'   units = c(10, 14, 18, 25, 30, 33, 35, 40,
#'             22, 21, 24, 23, 26, 31, 37, 46,
#'             15, 19, 26, 28, 27, 25, 24, 22,
#'             30, 27, 22, 20, 21, 24, 30, 35)
#' )
#' line_race(sales, x = "quarter", y = "units", group = "brand",
#'           mode = "rank", frame_dur = 900, title = "Units sold per quarter")
#'
line_race <- function(data,
                      x,
                      y,
                      group,
                      mode = c("value", "rank"),
                      top_n = NULL,
                      fill = NULL,
                      category = NULL,
                      color_category = NULL,
                      highlight = NULL,
                      y_scale = c("linear", "log"),
                      y_zero = TRUE,
                      window = NULL,
                      grow = FALSE,
                      events = NULL,
                      labels = TRUE,
                      stroke_width = 2.5,
                      dot_radius = 4.5,
                      fill_gaps = TRUE,
                      agg = c("sum", "mean", "max", "min", "last"),
                      xtitle = NULL,
                      ytitle = NULL,
                      frame_dur = 700,
                      ease = "Linear",
                      autoplay = TRUE,
                      loop = FALSE,
                      controls = TRUE,
                      start_frame = "first",
                      time_format = NULL,
                      title = NULL,
                      title_font_size = 20,
                      subtitle = NULL,
                      subtitle_font_size = 13,
                      font = "Verdana, Geneva, Tahoma, sans-serif",
                      bgcol = "white",
                      axis_col = "#333333",
                      grid_col = "#ececec",
                      value_format = NULL,
                      value_prefix = "",
                      value_suffix = "",
                      tooltip = TRUE,
                      width = NULL,
                      height = NULL) {

  mode <- match.arg(mode)
  y_scale <- match.arg(y_scale)
  agg <- match.arg(agg)

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  for (k in c("x", "y", "group")) {
    nm <- get(k)
    if (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]])) {
      stop("'", k, "' must be the name of a column of 'data'")
    }
  }
  if (!is.numeric(data[[y]])) stop("'", y, "' must be a numeric column")
  tv <- data[[x]]
  if (!(is.numeric(tv) || inherits(tv, "Date") || inherits(tv, "POSIXt") ||
        is.character(tv) || is.factor(tv))) {
    stop("'", x, "' must be a numeric, Date, POSIXct, character or factor column")
  }
  if (!is.null(category) && (!is.character(category) || length(category) != 1 ||
                             is.null(data[[category]]))) {
    stop("'category' must be the name of a column of 'data'")
  }
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 categorical colour scheme, e.g. \"Tableau10\"")
  }
  if (!is.null(top_n) && (!is.numeric(top_n) || length(top_n) != 1 || !is.finite(top_n) || top_n < 1)) {
    stop("'top_n' must be a positive number")
  }
  if (!is.null(window) && (!is.numeric(window) || length(window) != 1 || !is.finite(window) || window < 1)) {
    stop("'window' must be a number of periods (at least 1)")
  }
  if (!is.logical(y_zero) || length(y_zero) != 1 || is.na(y_zero)) stop("'y_zero' must be TRUE or FALSE")
  if (!is.logical(grow) || length(grow) != 1 || is.na(grow)) stop("'grow' must be TRUE or FALSE")
  if (!is.numeric(stroke_width) || length(stroke_width) != 1 || !(stroke_width > 0)) {
    stop("'stroke_width' must be a positive number")
  }
  if (!is.numeric(dot_radius) || length(dot_radius) != 1 || !(dot_radius >= 0)) {
    stop("'dot_radius' must be a non-negative number")
  }
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.null(highlight) && !is.character(highlight) && !is.factor(highlight)) {
    stop("'highlight' must be a character vector of line names")
  }
  if (!is.null(ease) && (!is.character(ease) || length(ease) != 1)) {
    stop("'ease' must be the name of a D3 easing function, e.g. \"Linear\"")
  }

  if (y_scale == "log") {
    bad <- is.finite(data[[y]]) & data[[y]] <= 0
    if (any(bad)) {
      warning(sum(bad), " values that are not positive were dropped (log scale)")
      data[[y]][bad] <- NA
    }
  }

  race <- race_prepare(data, id = group, time = x, values = y, group = category,
                       agg = agg, fill_gaps = isTRUE(fill_gaps))
  names(race$series) <- "v"
  items <- as.character(race$items)
  if (!any(vapply(race$series$v, function(s) any(is.finite(s)), TRUE))) {
    stop("no finite values to plot in '", y, "'")
  }

  # ---- colours -------------------------------------------------------------------
  categories <- NULL
  cat_colors <- NULL
  if (!is.null(category)) {
    cv <- data[[category]]
    lv <- if (is.factor(cv)) levels(droplevels(cv)) else sort(unique(as.character(cv[!is.na(cv)])))
    if (anyNA(cv)) lv <- c(lv, "(missing)")
    categories <- lv[lv %in% as.character(race$groups)]
    if (is.null(fill) && !is.null(color_category)) {
      cat_colors <- NULL # a D3 scheme, picked in the browser
    } else if (length(fill) == 1 && is.null(names(fill))) {
      cat_colors <- race_colors(categories, NULL) # one colour cannot tell categories apart
    } else {
      cat_colors <- race_colors(categories, fill)
    }
    colors <- if (is.null(cat_colors)) NULL else cat_colors[match(as.character(race$groups), categories)]
  } else {
    colors <- if (is.null(fill) && !is.null(color_category)) NULL else race_colors(items, fill)
  }

  # ---- events --------------------------------------------------------------------
  ev <- NULL
  if (!is.null(events)) {
    if (is.data.frame(events)) {
      if (ncol(events) < 2) stop("'events' must have a time column and a label column")
      et <- events[[1]]
      el <- as.character(events[[2]])
    } else {
      if (is.null(names(events))) stop("'events' must be a named vector (names = labels, values = times) or a data frame")
      et <- unname(events)
      el <- names(events)
      if (inherits(events, "Date")) et <- as.Date(unclass(events), origin = "1970-01-01")
      if (inherits(events, "POSIXt")) et <- events
    }
    idx <- seq_along(race$frames) - 1
    pos <- switch(race$timeType,
      number = suppressWarnings(as.numeric(et)),
      date = as.numeric(as.Date(et)) * 86400000,
      datetime = as.numeric(as.POSIXct(et, tz = "UTC")) * 1000,
      category = match(as.character(et), as.character(race$frames)) - 1
    )
    fn <- if (is.null(race$frameNum)) idx else as.numeric(race$frameNum)
    ok <- is.finite(pos) & pos >= min(fn) & pos <= max(fn)
    if (any(!ok)) warning(sum(!ok), " events outside the time range were dropped")
    if (any(ok)) {
      tt <- if (length(fn) > 1) stats::approx(fn, idx, xout = pos[ok])$y else rep(0, sum(ok))
      ev <- lapply(seq_len(sum(ok)), function(k) {
        list(x = pos[ok][k], t = tt[k], label = el[ok][k])
      })
    }
  }

  hl <- if (is.null(highlight)) NULL else as.character(highlight)
  if (!is.null(hl) && !all(hl %in% items)) {
    warning("'highlight' values not found in '", group, "': ",
            paste(setdiff(hl, items), collapse = ", "))
    hl <- intersect(hl, items)
  }

  player <- race_player_options(frame_dur, ease, autoplay, loop, controls, start_frame, time_format)
  player$stateKey <- paste("linerace", x, y, group, if (is.null(category)) "" else category,
                           nrow(data), sep = "|")

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "linerace.js")),
    options = list(
      race = race,
      player = player,
      stateKey = player$stateKey,
      colors = if (is.null(colors)) NULL else I(colors),
      colorCategory = color_category,
      categories = if (is.null(categories)) NULL else I(categories),
      catColors = if (is.null(cat_colors)) NULL else I(cat_colors),
      catName = category,
      groupName = group,
      yName = y,
      mode = mode,
      topN = if (is.null(top_n)) NULL else as.integer(round(top_n)),
      highlight = if (is.null(hl)) NULL else I(hl),
      yScale = y_scale,
      yZero = isTRUE(y_zero),
      window = window,
      grow = isTRUE(grow),
      events = ev,
      labels = isTRUE(labels),
      strokeWidth = stroke_width,
      dotRadius = dot_radius,
      xtitle = xtitle,
      ytitle = if (is.null(ytitle)) y else ytitle,
      controls = isTRUE(controls),
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      font = font,
      bgcol = bgcol,
      axisCol = axis_col,
      gridCol = if (is.null(grid_col) || is.na(grid_col)) NULL else grid_col,
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      tooltip = isTRUE(tooltip)
    ),
    width = width,
    height = height
  )
}
