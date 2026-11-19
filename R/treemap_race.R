#' Create an animated, interactive treemap race.
#'
#' Draws one tile per item (countries, products, companies...) with an area
#' proportional to its value, and animates the treemap through time: the
#' tiles grow, shrink and reflow smoothly as the values change, items that
#' enter fade and grow in from nothing, and leaving ones shrink away. Think
#' "share of the world population" or "market capitalisation" through the
#' years. A player at the bottom plays, pauses and scrubs the animation and a
#' big period label sits in the top right corner.
#'
#' The data is long: one row per item and period, with the item names in
#' \code{label}, the values in \code{value} and the periods in \code{time}
#' (numbers such as years, dates, or a factor or character column whose
#' levels give the order). Gaps inside an item are interpolated; items
#' missing before their first or after their last period enter and leave the
#' treemap. With \code{group}, the treemap has two levels (e.g. continent and
#' country): each group gets a frame and a header with its total, and its
#' tiles are drawn in shades of the group colour.
#'
#' With the default \code{tile = "resquarify"}, the layout keeps the same
#' rows of tiles while the values change, so the tiles glide instead of
#' jumping. When a row gets too stretched, the treemap is re-squarified, with
#' a short morph from the old layout to the new one.
#'
#' @section Interactions:
#' \itemize{
#'   \item The player at the bottom plays and pauses the animation (also with
#'     the space bar), the timeline can be dragged or clicked, the arrow keys
#'     step one period, Home and End jump to the start and the end. The speed
#'     button cycles from 0.5x to 4x, the loop button repeats the animation.
#'   \item Hover a tile to see its value, its share of the total and of its
#'     group, its rank and its change since the previous period. The tooltip
#'     keeps updating while the animation plays. Hover a group header to see
#'     the group total and its largest items.
#'   \item Click a group header to zoom into the group: its treemap fills the
#'     chart and keeps playing. Click "All" in the header (or press Escape) to
#'     zoom out.
#'   \item Click a tile to pin it: it gets an outline and the other tiles are
#'     dimmed. Click it again to unpin it. \code{highlight} pins items from
#'     the start.
#'   \item The buttons at the top switch the tile labels between the value,
#'     the share of the total and the growth since the previous period, and
#'     the colours between the palette and a growth heat map (red for items
#'     that shrink, green for items that grow).
#'   \item With \code{group}, click a legend entry to hide or show a group
#'     (the treemap is recomputed without it), double-click it to isolate it,
#'     hover it to highlight its tiles.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a tile sets \code{input$id_clicked} to a list with the
#' \code{item}, its \code{group}, \code{value}, \code{share}, \code{period}
#' and whether it is now \code{pinned}; \code{input$id_zoom} gives the group
#' zoomed into (\code{NULL} when zoomed out) and \code{input$id_frame} the
#' period shown (\code{index} and \code{label}). The current time, the speed,
#' the pinned items, the hidden groups, the zoom and the label and colour
#' modes are kept when the chart is re-rendered.
#'
#' @param data The data frame containing the variables to consider (one row
#'   per item and period).
#' @param label The name of the column giving the items (one tile per value).
#' @param value The name of the numeric column giving the area of the tiles.
#'   Negative values cannot be drawn and are treated as missing.
#' @param time The name of the column giving the periods: numeric (e.g.
#'   years), \code{Date}, \code{POSIXct}, or a factor or character column
#'   (factor levels, or the sorted values, give the order).
#' @param group Optional. The name of a column grouping the items (e.g. the
#'   continent of each country). The treemap then has two levels: each group
#'   gets a frame, a header and a colour, and the legend can hide groups.
#' @param tile The tiling algorithm: \code{"resquarify"} (default, squarified
#'   tiles that keep their place while the values change), \code{"squarify"}
#'   (the best squarified layout of every period, morphed from one period to
#'   the next), \code{"binary"} (the same with a balanced binary split),
#'   \code{"slice"} (vertical strips), \code{"dice"} (horizontal strips) or
#'   \code{"sliceDice"} (strips alternating with the depth). The strips keep
#'   the order of the items by average value.
#' @param fill Optional. The colours of the tiles. With \code{group}, one
#'   colour per group (recycled, or a named vector mapping colours to groups);
#'   the items are drawn in shades of their group colour. Without
#'   \code{group}, one colour per item (recycled, or a named vector mapping
#'   colours to items). Defaults to the ddplot palette, the largest groups or
#'   items getting the first colours.
#' @param color_category Optional. The name of a D3 categorical colour scheme
#'   (e.g. \code{"Tableau10"}, \code{"Set2"}), see
#'   <https://github.com/d3/d3-scale-chromatic#categorical>, used when
#'   \code{fill} is not given.
#' @param color_by How the tiles are coloured at first: \code{"group"}
#'   (default, the palette: by group, or by item without \code{group}) or
#'   \code{"growth"} (a heat map of the growth since the previous period, red
#'   for shrinking items, green for growing ones). It can be changed from the
#'   chart when \code{controls = TRUE}.
#' @param highlight Optional. A character vector of items pinned from the
#'   start (outlined, the other tiles dimmed).
#' @param labels Logical. Write the names and values in the tiles (labels that
#'   do not fit are hidden, their font size follows the tile size). Defaults
#'   to \code{TRUE}.
#' @param label_mode What the labels show under the names at first:
#'   \code{"value"} (default), \code{"share"} (share of the total, or of the
#'   group when zoomed in) or \code{"growth"} (change since the previous
#'   period). It can be changed from the chart when \code{controls = TRUE}.
#' @param padding The space between tiles, in pixels. Defaults to 2.
#' @param max_label_size The largest font size of the tile labels, in pixels.
#'   Defaults to 26.
#' @param legend Logical. Show the legend of the groups. When \code{NULL}
#'   (default), it is shown when \code{group} is used.
#' @param agg How rows with the same item and period are combined:
#'   \code{"sum"} (default), \code{"mean"}, \code{"max"}, \code{"min"} or
#'   \code{"last"}.
#' @param fill_gaps Logical. Interpolate the value of an item between the
#'   periods where it is known. Defaults to \code{TRUE}; when \code{FALSE},
#'   the tile shrinks away during the missing periods.
#' @param frame_dur The duration of one period, in milliseconds, at 1x speed.
#'   Defaults to 900.
#' @param ease The easing used within each period, a d3-ease name such as
#'   \code{"Linear"} (a steady animation) or \code{"CubicInOut"} (default,
#'   slows down on every period). See <https://github.com/d3/d3-ease>.
#' @param autoplay Logical. Start playing when the chart scrolls into view.
#'   Defaults to \code{TRUE}.
#' @param loop Logical. Start again from the first period at the end.
#'   Defaults to \code{FALSE} (it can be changed from the player).
#' @param controls Logical. Show the player at the bottom and the label and
#'   colour buttons at the top. Defaults to \code{TRUE}.
#' @param start_frame The period shown first: \code{"first"} (default),
#'   \code{"last"} or a period number (1 for the first one).
#' @param time_format Optional. A d3-time-format string used for dates, e.g.
#'   \code{"\%b \%Y"}. Chosen from the spacing of the periods when \code{NULL}.
#' @param title Optional. The title of the plot.
#' @param title_font_size The font size of the plot title. Defaults to 20.
#' @param subtitle Optional. A subtitle drawn under the title.
#' @param subtitle_font_size The font size of the subtitle. Defaults to 13.
#' @param font The font family to consider for all the text. Defaults to
#'   "Verdana, Geneva, Tahoma, sans-serif".
#' @param bg_col The background colour of the SVG. Defaults to "white".
#' @param axis_col The colour of the titles, headers and controls. Defaults to
#'   "#333333".
#' @param value_format Optional. A d3-format string for the values, e.g.
#'   \code{",.0f"}, \code{".1f"} or \code{".3~s"}. Compact values
#'   ("1.23M") are used when \code{NULL}.
#' @param value_prefix,value_suffix Optional. Text added before or after every
#'   value, e.g. \code{"$"} or \code{" t"}.
#' @param tooltip Logical. Show a tooltip on hover. Defaults to \code{TRUE}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An animated SVG treemap (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' library(gapminder)
#'
#' # World population by country, grouped by continent
#' treemap_race(
#'   gapminder,
#'   label = "country",
#'   value = "pop",
#'   time = "year",
#'   group = "continent",
#'   title = "World population",
#'   subtitle = "Click a continent header to zoom in",
#'   highlight = c("China", "India")
#' )
#'
#' # A few items, without groups, coloured by growth
#' library(dplyr) # needed for data wrangling
#'
#' gapminder %>%
#'   filter(country %in% c("France", "Germany", "Italy", "Spain", "Poland")) %>%
#'   mutate(gdp = gdpPercap * pop / 1e9) %>%
#'   treemap_race(
#'     label = "country", value = "gdp", time = "year",
#'     color_by = "growth", label_mode = "share",
#'     value_prefix = "$", value_suffix = "B", value_format = ",.0f",
#'     title = "GDP of five European countries"
#'   )
#'
treemap_race <- function(
                         data,
                         label,
                         value,
                         time,
                         group = NULL,
                         tile = c("resquarify", "squarify", "binary", "slice", "dice", "sliceDice"),
                         fill = NULL,
                         color_category = NULL,
                         color_by = c("group", "growth"),
                         highlight = NULL,
                         labels = TRUE,
                         label_mode = c("value", "share", "growth"),
                         padding = 2,
                         max_label_size = 26,
                         legend = NULL,
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

  if (!is.data.frame(data)) stop("'data' must be a data frame")
  for (k in c("label", "value", "time")) {
    nm <- get(k)
    if (!is.character(nm) || length(nm) != 1 || is.null(data[[nm]])) {
      stop("'", k, "' must be the name of a column of 'data'")
    }
  }
  if (!is.numeric(data[[value]])) stop("'", value, "' must be a numeric column")
  if (!is.null(group) && (!is.character(group) || length(group) != 1 || is.null(data[[group]]))) {
    stop("'group' must be the name of a column of 'data'")
  }
  tile <- match.arg(tile)
  color_by <- match.arg(color_by)
  label_mode <- match.arg(label_mode)
  agg <- match.arg(agg)
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }
  if (!is.numeric(padding) || length(padding) != 1 || !is.finite(padding) || padding < 0) {
    stop("'padding' must be a non-negative number of pixels")
  }
  if (!is.numeric(max_label_size) || length(max_label_size) != 1 || !(max_label_size >= 8)) {
    stop("'max_label_size' must be a number of pixels (8 or more)")
  }
  if (!is.null(color_category) && (!is.character(color_category) || length(color_category) != 1)) {
    stop("'color_category' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }
  if (!is.null(highlight) && !is.atomic(highlight)) {
    stop("'highlight' must be a character vector of items")
  }
  if (!is.null(ease) && (!is.character(ease) || length(ease) != 1)) {
    stop("'ease' must be the name of a d3-ease function, such as \"CubicInOut\"")
  }

  vv <- as.numeric(data[[value]])
  if (any(is.finite(vv) & vv < 0)) {
    warning("negative values cannot be drawn in a treemap and were treated as missing")
    vv[is.finite(vv) & vv < 0] <- NA
  }
  data[[value]] <- vv

  race <- race_prepare(data, label, time, value, group = group, agg = agg,
                       fill_gaps = isTRUE(fill_gaps))
  names(race$series) <- "v"
  if (!any(vapply(race$series$v, function(s) any(is.finite(s) & s > 0), TRUE))) {
    stop("there is no positive value to plot")
  }

  # ---- colours: the largest groups (or items) get the first colours ----------------
  mean_val <- vapply(race$series$v, function(s) {
    s <- s[is.finite(s)]
    if (length(s)) mean(s) else 0
  }, 0)
  group_levels <- NULL
  group_colors <- NULL
  item_colors <- NULL
  if (!is.null(group)) {
    gv <- data[[group]]
    totals <- tapply(mean_val, factor(race$groups, levels = unique(race$groups)), sum)
    if (is.factor(gv)) {
      group_levels <- intersect(levels(droplevels(gv)), race$groups)
      if ("(missing)" %in% race$groups) group_levels <- c(group_levels, "(missing)")
    } else {
      group_levels <- names(sort(totals, decreasing = TRUE))
    }
    if (!is.null(fill) || is.null(color_category)) {
      by_size <- names(sort(totals, decreasing = TRUE))
      cols <- race_colors(by_size, if (length(fill) == 1 && is.null(names(fill))) NULL else fill)
      group_colors <- cols[match(group_levels, by_size)]
    }
  } else if (!is.null(fill) || is.null(color_category)) {
    by_size <- order(-mean_val)
    cols <- race_colors(race$items[by_size], fill)
    item_colors <- character(length(race$items))
    item_colors[by_size] <- cols
  }

  if (is.null(legend)) legend <- !is.null(group)

  player <- race_player_options(frame_dur, ease, autoplay, loop, controls, start_frame, time_format)
  player$stateKey <- paste("treemaprace", label, value, time, group, sep = "|")

  r2d3::r2d3(
    data = NULL,
    script = ddplot_script(c("racekit.js", "treemaprace.js")),
    options = list(
      race = race,
      player = player,
      stateKey = paste("treemaprace", label, value, time, group, tile, sep = "|"),
      valueName = value,
      groupName = group,
      groupLevels = if (is.null(group_levels)) NULL else I(group_levels),
      groupColors = if (is.null(group_colors)) NULL else I(group_colors),
      itemColors = if (is.null(item_colors)) NULL else I(item_colors),
      meanValues = I(mean_val),
      colorCategory = color_category,
      tile = tile,
      colorBy = color_by,
      highlight = I(as.character(highlight)),
      labels = isTRUE(labels),
      labelMode = label_mode,
      padding = padding,
      maxLabelSize = max_label_size,
      legend = isTRUE(legend) && !is.null(group),
      controls = isTRUE(controls),
      tooltip = isTRUE(tooltip),
      title = title,
      titleFontSize = title_font_size,
      subtitle = subtitle,
      subtitleFontSize = subtitle_font_size,
      font = font,
      bgcol = bg_col,
      axisCol = axis_col,
      valueFormat = value_format,
      valuePrefix = value_prefix,
      valueSuffix = value_suffix
    ),
    width = width,
    height = height
  )
}
