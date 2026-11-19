#' Create an animated donut race (a share race through time)
#'
#' Shows how a total is shared between items (browsers, energy sources,
#' continents...) and how the shares change through time. A donut (or a pie)
#' whose slices grow, shrink and smoothly slide past each other when the
#' ranking changes is paired with a live league table: its rows slide to their
#' new position and show the rank, a share bar, the share, the value and a
#' green or red arrow when the item gained or lost places since the previous
#' period. The centre of the donut shows the period and a total that counts
#' smoothly. A player at the bottom plays, pauses and scrubs the animation.
#'
#' The data is long: one row per item and period, with the item names in
#' \code{label}, the values in \code{value} and the periods in \code{time}
#' (numbers such as years, dates, or a factor or character column whose
#' levels give the order). Rows with the same item and period are combined
#' with \code{agg}. Gaps inside an item are interpolated; items missing before
#' their first or after their last period grow in from zero and fade out.
#' With \code{max_slices}, the smallest items of each period are grouped into
#' an "Other" slice: items flow into it and out of it smoothly when they cross
#' the cut, and the table still ranks every item.
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the race (also with the
#'     space bar), the timeline can be dragged or clicked, the arrow keys step
#'     one period, Home and End jump to the start and the end. The speed button
#'     cycles from 0.5x to 4x, the loop button repeats the race.
#'   \item Hover a slice or a table row: both are highlighted (the slice pulls
#'     out, the row is emphasised, the centre shows the share of the item) and
#'     a tooltip gives the value, the share, the rank and the change since the
#'     previous period. The tooltip keeps updating while the race plays.
#'     Hovering the "Other" slice lists the items it contains.
#'   \item Click a slice or a row to pin it (it stays pulled out and
#'     highlighted in the table, the other slices are dimmed), click it again
#'     to unpin it, or click the background to unpin every item.
#'     \code{highlight} pins items from the start.
#'   \item Alt-click (or shift-click) a row or a slice, or click the small
#'     cross at the end of a hovered row, to hide an item: the shares and the
#'     ranks are recomputed without it, and the slices close the gap
#'     smoothly. The "Show all" button at the top right brings the hidden
#'     items back.
#'   \item The buttons at the top right switch the order of the slices between
#'     the ranking (largest first) and the fixed order of the data.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a slice or a row sets \code{input$id_clicked} to a list with the
#' \code{label} of the item, its \code{value}, \code{share}, \code{rank}, the
#' \code{period} and whether it is now \code{pinned}. \code{input$id_hidden}
#' gives the hidden items and \code{input$id_frame} the period shown
#' (\code{index} and \code{label}). The current time, the speed, the pinned
#' and hidden items and the slice order are kept when the chart is
#' re-rendered.
#'
#' @param data The data frame containing the variables to consider (one row
#'   per item and period).
#' @param label The name of the column giving the items (one slice per
#'   value).
#' @param value The name of the numeric column giving the size of the slices.
#'   Negative, zero and missing values are left out (the item fades out).
#' @param time The name of the column giving the periods: numeric (e.g.
#'   years), \code{Date}, \code{POSIXct}, or a factor or character column
#'   (in the order of its levels, or alphabetical).
#' @param inner_radius The inner radius of the donut, as a fraction of the
#'   outer radius (from 0 to 0.9). Defaults to 0.6; 0 draws a pie.
#' @param sort The order of the slices, clockwise from the top:
#'   \code{"value"} (default, the ranking of each period, largest first; the
#'   slices slide past each other when the ranking changes) or \code{"fixed"}
#'   (the order of the data, or of the factor levels, so that each slice stays
#'   in place and only grows or shrinks). The table is always ranked.
#' @param max_slices Optional. The maximum number of slices: in each period,
#'   the smallest items are grouped into an "Other" slice so that at most
#'   \code{max_slices} slices are drawn.
#' @param other_label The label of the grouped slice. Defaults to "Other".
#' @param table Logical. Show the league table next to the donut (or under
#'   it when the chart is narrow). Defaults to \code{TRUE}.
#' @param table_rows Optional. The maximum number of rows of the table.
#'   Defaults to as many as fit.
#' @param labels Logical. Write the share on the slices that are large enough.
#'   Defaults to \code{TRUE}.
#' @param center_label The caption under the total in the centre of the donut.
#'   Defaults to "Total"; \code{FALSE} hides the total.
#' @param fill Optional. The colours of the items: a single colour, one colour
#'   per item (in order of appearance, recycled), or a named vector mapping
#'   colours to items (the palette is used for the others). By default, the
#'   first colours of the palette go to the largest items.
#' @param color_category Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10" or "Set2", used when \code{fill} is not given.
#'   Defaults to the ddplot palette.
#' @param highlight Optional. A character vector of items pinned from the
#'   start.
#' @param agg How rows with the same item and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param fill_gaps Logical. Interpolate the missing values of an item between
#'   two periods where it is known. Defaults to \code{TRUE}.
#' @param frame_dur The duration of one period of the animation, in
#'   milliseconds. Defaults to 900.
#' @param ease The easing used inside each period, the name of a D3 easing
#'   function without the "ease" prefix, such as "Linear" or "CubicInOut"
#'   (default), see <https://github.com/d3/d3-ease>.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again at the end. Defaults to \code{FALSE} (it
#'   can be switched in the player).
#' @param controls Logical. Show the player (play button, timeline, speed and
#'   loop buttons). Defaults to \code{TRUE}.
#' @param start_frame Where the animation starts: \code{"first"} (default),
#'   \code{"last"} or a period number (1 for the first).
#' @param time_format Optional. A D3 time format for date periods, such as
#'   \code{"\%b \%Y"}. Defaults to a format chosen from the spacing of the
#'   periods.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 20.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param font The font family of the chart. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param axis_col The colour of the texts. Defaults to "#333333".
#' @param value_format Optional. A D3 format string for the values, such as
#'   \code{",.0f"} or \code{".2s"}.
#' @param value_prefix,value_suffix Optional. Text added before and after the
#'   values, such as \code{"$"} or \code{" TWh"}.
#' @param tooltip Logical. Show a tooltip when hovering the slices and the
#'   rows. Defaults to \code{TRUE}.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An interactive, animated SVG donut race (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(gapminder)
#'
#' # The world population by continent
#' donut_race(
#'   gapminder, label = "continent", value = "pop", time = "year",
#'   title = "World population by continent"
#' )
#'
#' # The 7 most populous countries of each period, the others grouped
#' donut_race(
#'   gapminder, label = "country", value = "pop", time = "year",
#'   max_slices = 8, inner_radius = 0.55, highlight = "India",
#'   title = "Who holds the world population?"
#' )
#'
#' # Character periods, a pie and a fixed order
#' energy <- data.frame(
#'   source = rep(c("Coal", "Gas", "Nuclear", "Hydro", "Wind", "Solar"), 3),
#'   period = rep(c("2000s", "2010s", "2020s"), each = 6),
#'   twh = c(40, 20, 17, 16, 1, 0, 33, 23, 15, 16, 6, 2, 25, 24, 13, 15, 13, 10)
#' )
#' donut_race(
#'   energy, label = "source", value = "twh", time = "period",
#'   inner_radius = 0, sort = "fixed", value_suffix = " %"
#' )
#'
donut_race <- function(data,
                       label,
                       value,
                       time,
                       inner_radius = 0.6,
                       sort = c("value", "fixed"),
                       max_slices = NULL,
                       other_label = "Other",
                       table = TRUE,
                       table_rows = NULL,
                       labels = TRUE,
                       center_label = "Total",
                       fill = NULL,
                       color_category = NULL,
                       highlight = NULL,
                       agg = c("sum", "mean", "max", "min", "last"),
                       fill_gaps = TRUE,
                       frame_dur = 900,
                       ease = "CubicInOut",
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
                       bg_col = "white",
                       axis_col = "#333333",
                       value_format = NULL,
                       value_prefix = "",
                       value_suffix = "",
                       tooltip = TRUE,
                       width = NULL,
                       height = NULL) {

  sort <- match.arg(sort)
  agg <- match.arg(agg)
  if (!is.data.frame(data)) stop("'data' must be a data frame")
  for (k in c("label", "value", "time")) {
    if (eval(call("missing", as.name(k)))) stop("'", k, "' is required")
    nm <- get(k)
    if (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]])) {
      stop("'", k, "' must be the name of a column of 'data'")
    }
  }
  if (!is.numeric(data[[value]])) stop("'", value, "' must be a numeric column")
  if (!is.numeric(inner_radius) || length(inner_radius) != 1 || !is.finite(inner_radius) ||
      inner_radius < 0 || inner_radius > 0.9) {
    stop("'inner_radius' must be a number between 0 and 0.9")
  }
  if (!is.null(max_slices) && (!is.numeric(max_slices) || length(max_slices) != 1 ||
                              !is.finite(max_slices) || max_slices < 2)) {
    stop("'max_slices' must be a single number, 2 or more")
  }
  if (!is.null(table_rows) && (!is.numeric(table_rows) || length(table_rows) != 1 ||
                              !is.finite(table_rows) || table_rows < 1)) {
    stop("'table_rows' must be a single number, 1 or more")
  }
  if (!is.character(other_label) || length(other_label) != 1) {
    stop("'other_label' must be a single string")
  }
  if (isFALSE(center_label)) center_label <- ""
  if (is.null(center_label)) center_label <- "Total"
  if (!is.character(center_label) || length(center_label) != 1) {
    stop("'center_label' must be a single string or FALSE")
  }
  for (k in c("table", "labels", "fill_gaps", "autoplay", "loop", "controls", "tooltip")) {
    v <- get(k)
    if (!is.logical(v) || length(v) != 1 || is.na(v)) stop("'", k, "' must be TRUE or FALSE")
  }
  if (!is.character(font) || length(font) != 1) stop("'font' must be a single string")
  if (grepl(";", font)) stop("please remove the ';' character from your font argument")
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }
  if (!is.null(highlight) && !is.character(highlight) && !is.factor(highlight)) {
    stop("'highlight' must be a character vector of items")
  }
  if (!is.null(ease) && (!is.character(ease) || length(ease) != 1)) {
    stop("'ease' must be the name of a D3 easing function, such as \"CubicInOut\"")
  }

  vv <- data[[value]]
  if (!any(is.finite(vv) & vv > 0)) stop("there is no positive value to plot")
  if (any(is.finite(vv) & vv < 0)) {
    warning("negative values cannot be drawn in a donut chart and were left out")
    data[[value]][is.finite(vv) & vv < 0] <- NA
  }
  race <- race_prepare(data, id = label, time = time, values = value,
                       agg = agg, fill_gaps = fill_gaps)
  if (!length(race$items)) stop("there is no item to plot")
  names(race$series) <- "v"

  # the first colours go to the largest items (by their total over the periods)
  size <- vapply(race$series$v, function(r) sum(r, na.rm = TRUE), 0)
  size_order <- order(-size, seq_along(size))
  size_rank <- integer(length(size))
  size_rank[size_order] <- seq_along(size) - 1L
  cols <- NULL
  if (is.null(fill) && is.null(color_category)) {
    cols <- race_colors(race$items[size_order])[size_rank + 1L]
  } else if (!is.null(fill)) {
    if (!is.null(names(fill))) {
      cols <- race_colors(race$items[size_order])[size_rank + 1L]
      m <- fill[race$items]
      cols[!is.na(m)] <- m[!is.na(m)]
      cols <- unname(as.character(cols))
    } else {
      cols <- race_colors(race$items, fill)
    }
  }

  player <- race_player_options(frame_dur, ease, autoplay, loop, controls, start_frame, time_format)
  player$stateKey <- paste("donutrace", label, value, time, agg,
                           if (is.null(max_slices)) "" else max_slices, sep = "|")

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "donutrace.js")),
    options = list(
      race = race,
      player = player,
      colors = if (is.null(cols)) NULL else I(cols),
      colorCategory = color_category,
      sizeOrder = I(size_rank),
      valueName = value,
      innerRadius = inner_radius,
      sort = sort,
      maxSlices = if (is.null(max_slices)) NULL else floor(max_slices),
      otherLabel = other_label,
      table = isTRUE(table),
      tableRows = if (is.null(table_rows)) NULL else floor(table_rows),
      labels = isTRUE(labels),
      centerLabel = center_label,
      highlight = I(as.character(highlight)),
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      font = font,
      bgcol = bg_col,
      axisCol = axis_col,
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix,
      tooltip = isTRUE(tooltip)
    ),
    width = width,
    height = height
  )
}
