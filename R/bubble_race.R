#' Create an animated bubble chart race (Gapminder style).
#'
#' Draws one bubble per item (\code{id}) at its \code{x} and \code{y} values,
#' sized by \code{size} and coloured by \code{group}, and animates the bubbles
#' smoothly from one period (\code{time}) to the next, in the style of the
#' famous Gapminder chart by Hans Rosling. The axes are fixed over the whole
#' race so that every move means something, the current period is drawn as a
#' large faded watermark behind the bubbles, and items that appear or
#' disappear fade in and out. Periods can be numbers (years), dates or
#' characters / factors.
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the race (also with the
#'     space bar), the timeline can be dragged or clicked, the arrow keys step
#'     one period, Home and End jump to the first and last period; speed and
#'     loop buttons sit on the right.
#'   \item Hover a bubble to highlight it: guides are drawn to both axes with
#'     the values on the axes, and a tooltip lists its group, its values and
#'     their change over the last period. The tooltip stays on the bubble and
#'     keeps updating while the race plays.
#'   \item Click a bubble to follow it: its trail (its path through every
#'     period so far, with a dot per period) is drawn, its label stays on, and
#'     the other bubbles are dimmed. Click it again to stop following it.
#'     Several bubbles can be followed. Hover a trail dot to see the values of
#'     that period, click it to jump to that period. Escape stops following
#'     every bubble.
#'   \item The buttons at the top right switch the x and y axes between linear
#'     and log scales (when the values are all positive), show the trails of
#'     every bubble, and clear the followed bubbles.
#'   \item Click a legend entry to hide or show a group, double-click it to
#'     isolate it. Hovering a legend entry highlights the group.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a bubble sets \code{input$id_clicked} to a list with the
#' \code{id}, \code{group}, \code{x}, \code{y}, \code{size} and
#' \code{period} of the bubble, \code{input$id_followed} gives the followed
#' items, and \code{input$id_frame} gives the current period (a list with
#' its \code{index} and \code{label}). The current period, the followed items,
#' the hidden groups, the scales and the trails mode are kept when the chart
#' is re-rendered.
#'
#' @param data The data frame containing the variables to consider, in long
#'   format (one row per item and period).
#' @param x The name of the numeric column drawn on the horizontal axis.
#' @param y The name of the numeric column drawn on the vertical axis.
#' @param id The name of the column identifying the items (one bubble per
#'   value).
#' @param time The name of the column giving the period: numeric (e.g.
#'   years), Date, POSIXct, factor or character (sorted, or in the order of
#'   the factor levels).
#' @param size Optional. The name of a numeric, non-negative column giving the
#'   size of the bubbles (their area is proportional to it). Without it, every
#'   bubble has the same radius (7 pixels, or \code{size_range[1]} if larger).
#' @param group Optional. The name of a column grouping the items (e.g. a
#'   continent). It sets the colours and adds a clickable legend.
#' @param x_scale,y_scale The scales of the axes: \code{"linear"} (default) or
#'   \code{"log"}. On a log scale, values that are not positive are dropped
#'   (with a warning). Both can be switched from the chart.
#' @param size_range A numeric vector of length 2: the smallest and the largest
#'   bubble radius in pixels (the largest is reduced on small charts).
#'   Defaults to \code{c(3, 40)}.
#' @param fill Optional. The colours of the bubbles. With \code{group}, one
#'   colour per group (a named vector maps colours to groups). Without
#'   \code{group}, a single colour for every bubble, or one colour per item
#'   (recycled; a named vector maps colours to items). Defaults to a built-in
#'   palette.
#' @param color_category Optional. The name of a D3 categorical colour scheme
#'   used instead of the built-in palette, e.g. \code{"Tableau10"},
#'   \code{"Set2"} or \code{"Dark2"}. Ignored when \code{fill} is given.
#' @param opacity The opacity of the bubbles, from 0 to 1. Defaults to 0.85.
#' @param highlight Optional. A character vector of items to follow from the
#'   start (their trails and labels are drawn, the others are dimmed).
#' @param trails Logical. Draw the trail of every bubble (best with a few
#'   items). It can be switched from the chart. Defaults to \code{FALSE}.
#' @param labels The number of bubbles labelled with their name: the largest
#'   ones (by \code{size}, or by \code{y} without \code{size}). Use \code{0}
#'   or \code{FALSE} for none and \code{TRUE} for all (labels that would
#'   overlap are skipped). Followed bubbles are always labelled; while some
#'   bubbles are followed, only they are labelled. Defaults to 5.
#' @param legend Logical. Show the group legend. When \code{NULL} (default),
#'   it is shown when \code{group} is used.
#' @param size_legend Logical. Show a legend of reference circles for
#'   \code{size}, drawn in the emptiest corner of the plot. Defaults to
#'   \code{TRUE}.
#' @param buttons Logical. Show the buttons at the top right (log scales,
#'   trails, clear). Defaults to \code{TRUE}.
#' @param xtitle,ytitle Optional. The titles of the axes. They default to the
#'   names of \code{x} and \code{y}; use \code{""} to hide them.
#' @param size_title Optional. The title of the size legend and the name of
#'   the size in the tooltip. Defaults to the name of \code{size}.
#' @param agg How rows with the same item and period are combined:
#'   \code{"mean"} (default), \code{"sum"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param fill_gaps Logical. Interpolate the values of an item between the
#'   periods where it is known, so that it does not blink out in a gap.
#'   Defaults to \code{TRUE}.
#' @param frame_dur The duration of one period, in milliseconds. Defaults to
#'   1000.
#' @param ease The easing used between two periods, the name of a D3 easing
#'   function without the "ease" prefix: \code{"Linear"} (default, a smooth
#'   continuous motion), \code{"CubicInOut"} (a short pause at each period),
#'   \code{"QuadInOut"}, ...
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. It can be switched from the
#'   player. Defaults to \code{FALSE}.
#' @param controls Logical. Show the player (play / pause, timeline, speed,
#'   loop) at the bottom. Defaults to \code{TRUE}.
#' @param start_frame The first period shown: \code{"first"} (default),
#'   \code{"last"} or a period number (1 for the first one).
#' @param time_format Optional. A d3-time-format string used for Date and
#'   POSIXct periods, e.g. \code{"\%b \%Y"}. Chosen from the spacing of the
#'   periods by default.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param font The font family of the texts. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bgcol The background colour of the SVG. Defaults to "white".
#' @param axis_col The colour of the axes, labels and titles. Defaults to
#'   "#333333".
#' @param grid_col The colour of the grid lines. Defaults to "#ebebeb"; use
#'   \code{NA} to hide them.
#' @param value_format Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"} or \code{".3s"}. A single string applies to \code{x},
#'   \code{y} and \code{size}; a named vector sets them one by one, e.g.
#'   \code{c(x = "$,.0f", y = ".1f")}.
#' @param value_prefix,value_suffix Optional. Text added before or after the
#'   values, e.g. \code{"$"} or \code{" years"}. As for \code{value_format}, a
#'   single string applies to every value and a named vector sets them one by
#'   one, e.g. \code{value_prefix = c(x = "$")}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated, interactive SVG bubble chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(gapminder) # needed for the gapminder data frame
#'
#' bubble_race(
#'   gapminder,
#'   x = "gdpPercap", y = "lifeExp", id = "country", time = "year",
#'   size = "pop", group = "continent",
#'   x_scale = "log",
#'   highlight = c("China", "India"),
#'   xtitle = "GDP per capita", ytitle = "Life expectancy",
#'   size_title = "Population",
#'   value_prefix = c(x = "$"), value_suffix = c(y = " years"),
#'   value_format = c(x = ",.0f", y = ".1f"),
#'   title = "Health and wealth of nations"
#' )
#'
#' # A few items with their trails
#' library(dplyr) # needed for data wrangling
#' gapminder %>%
#'   filter(country %in% c("China", "India", "Japan", "Brazil", "Nigeria")) %>%
#'   bubble_race(
#'     x = "gdpPercap", y = "lifeExp", id = "country", time = "year",
#'     size = "pop", x_scale = "log", trails = TRUE, labels = TRUE,
#'     title = "Five countries, 1952 to 2007"
#'   )
#'
bubble_race <- function(data,
                        x,
                        y,
                        id,
                        time,
                        size = NULL,
                        group = NULL,
                        x_scale = c("linear", "log"),
                        y_scale = c("linear", "log"),
                        size_range = c(3, 40),
                        fill = NULL,
                        color_category = NULL,
                        opacity = 0.85,
                        highlight = NULL,
                        trails = FALSE,
                        labels = 5,
                        legend = NULL,
                        size_legend = TRUE,
                        buttons = TRUE,
                        xtitle = NULL,
                        ytitle = NULL,
                        size_title = NULL,
                        agg = c("mean", "sum", "max", "min", "last"),
                        fill_gaps = TRUE,
                        frame_dur = 1000,
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
                        grid_col = "#ebebeb",
                        value_format = NULL,
                        value_prefix = "",
                        value_suffix = "",
                        tooltip = TRUE,
                        width = NULL,
                        height = NULL) {

  x_scale <- match.arg(x_scale)
  y_scale <- match.arg(y_scale)
  agg <- match.arg(agg)

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  is_col <- function(v) is.character(v) && length(v) == 1 && !is.null(data[[v]])
  for (k in c("x", "y", "id", "time")) {
    if (!is_col(get(k))) stop("'", k, "' must be the name of a column of 'data'")
  }
  if (!is.numeric(data[[x]])) stop("'x' must be a numeric column")
  if (!is.numeric(data[[y]])) stop("'y' must be a numeric column")
  if (!is.null(size)) {
    if (!is_col(size)) stop("'size' must be the name of a column of 'data'")
    if (!is.numeric(data[[size]])) stop("'size' must be a numeric column")
  }
  if (!is.null(group) && !is_col(group)) {
    stop("'group' must be the name of a column of 'data'")
  }
  if (!is.numeric(size_range) || length(size_range) != 2 || anyNA(size_range) ||
      size_range[1] < 0 || size_range[2] < size_range[1]) {
    stop("'size_range' must be two numbers, the smallest and the largest radius (0 <= min <= max)")
  }
  if (!is.numeric(opacity) || length(opacity) != 1 || is.na(opacity) || opacity < 0 || opacity > 1) {
    stop("'opacity' must be a number between 0 and 1")
  }
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 colour scheme, e.g. \"Tableau10\"")
  }
  if (isTRUE(labels)) {
    labels <- -1
  } else if (isFALSE(labels) || is.null(labels)) {
    labels <- 0
  } else if (!is.numeric(labels) || length(labels) != 1 || is.na(labels) || labels < 0) {
    stop("'labels' must be a number of bubbles to label, TRUE (all) or FALSE (none)")
  }
  if (!is.null(highlight) && !is.character(highlight) && !is.factor(highlight)) {
    stop("'highlight' must be a character vector of items")
  }

  # values that a log scale or a size cannot show
  drop_bad <- function(col, bad, what) {
    if (any(bad, na.rm = TRUE)) {
      warning(sum(bad, na.rm = TRUE), " ", what, " of '", col, "' dropped", call. = FALSE)
      data[[col]][which(bad)] <<- NA
    }
  }
  if (x_scale == "log") drop_bad(x, data[[x]] <= 0, "non-positive values (log scale)")
  if (y_scale == "log") drop_bad(y, data[[y]] <= 0, "non-positive values (log scale)")
  if (!is.null(size)) drop_bad(size, data[[size]] < 0, "negative values")

  # one format / prefix / suffix per value: x, y and size
  per_value <- function(v, arg, default) {
    out <- list(x = default, y = default, size = default)
    if (is.null(v)) return(out)
    if (!is.character(v)) stop("'", arg, "' must be a character string or a named character vector")
    if (is.null(names(v))) {
      if (length(v) != 1) stop("'", arg, "' must be a single string or a named vector (names x, y, size)")
      return(list(x = v, y = v, size = v))
    }
    bad <- setdiff(names(v), c("x", "y", "size"))
    if (length(bad)) stop("the names of '", arg, "' must be among x, y and size")
    for (k in names(v)) out[[k]] <- unname(v[[k]])
    out
  }
  fmts <- per_value(value_format, "value_format", NULL)
  pres <- per_value(value_prefix, "value_prefix", "")
  sufs <- per_value(value_suffix, "value_suffix", "")

  values <- unique(c(x, y, size))
  r <- race_prepare(data, id = id, time = time, values = values, group = group,
                    agg = agg, fill_gaps = isTRUE(fill_gaps))

  # groups, in the order of the factor levels or sorted
  group_levels <- NULL
  if (!is.null(group)) {
    gv <- data[[group]]
    group_levels <- if (is.factor(gv)) levels(droplevels(gv)) else sort(unique(as.character(gv[!is.na(gv)])))
    if (anyNA(gv)) group_levels <- c(group_levels, "(missing)")
    group_levels <- group_levels[group_levels %in% as.character(r$groups)]
  }

  # colours: one per group, or one per item without group
  keys <- if (is.null(group)) as.character(r$items) else group_levels
  colors <- NULL
  if (!is.null(fill)) {
    if (!is.null(group) && length(fill) == 1 && is.null(names(fill))) {
      colors <- race_colors(keys) # a single colour cannot tell groups apart
    } else {
      colors <- race_colors(keys, fill)
    }
  } else if (is.null(color_category)) {
    colors <- race_colors(keys)
  }

  if (!is.null(highlight)) {
    highlight <- unique(as.character(highlight))
    miss <- setdiff(highlight, as.character(r$items))
    if (length(miss)) {
      warning("'highlight' items not found in '", id, "': ", paste(miss, collapse = ", "), call. = FALSE)
    }
    highlight <- intersect(highlight, as.character(r$items))
  }

  player <- race_player_options(frame_dur, ease, autoplay, loop, controls, start_frame, time_format)
  player$stateKey <- paste("bubble", id, time, x, y, size, group, sep = "|")

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "bubblerace.js")),
    options = list(
      race = r,
      player = player,
      stateKey = player$stateKey,
      xName = x,
      yName = y,
      sizeName = size,
      groupName = group,
      timeName = time,
      groupLevels = if (is.null(group_levels)) NULL else I(group_levels),
      colors = if (is.null(colors)) NULL else I(colors),
      colorCategory = color_category,
      xScale = x_scale,
      yScale = y_scale,
      sizeRange = I(as.numeric(size_range)),
      opacity = opacity,
      highlight = if (is.null(highlight)) NULL else I(highlight),
      trails = isTRUE(trails),
      labels = as.numeric(labels),
      legend = if (is.null(legend)) !is.null(group) else isTRUE(legend),
      sizeLegend = isTRUE(size_legend) && !is.null(size),
      buttons = isTRUE(buttons),
      xtitle = if (is.null(xtitle)) x else xtitle,
      ytitle = if (is.null(ytitle)) y else ytitle,
      sizeTitle = if (is.null(size_title)) size else size_title,
      formats = fmts,
      prefixes = pres,
      suffixes = sufs,
      tooltip = isTRUE(tooltip),
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      font = font,
      bgcol = bgcol,
      axisCol = axis_col,
      gridCol = if (is.null(grid_col) || is.na(grid_col)) NULL else grid_col
    ),
    width = width,
    height = height
  )
}
