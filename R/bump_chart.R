#' Create a bump chart.
#'
#' @description
#' A bump chart shows how the \emph{rank} of several entities changes across
#' successive time periods. Each entity is drawn as a smooth line that moves
#' up or down as it overtakes, or is overtaken by, the others, with a circle
#' at every period showing its rank. Popularised by the Financial Times,
#' The Economist and FiveThirtyEight (league tables, election polls, country
#' rankings), it is the clearest way to tell a "who is ahead?" story when the
#' order matters more than the exact values.
#'
#' The data must be in long format: one row per entity and period. By
#' default the ranks are computed per period from the numeric \code{y}
#' column (rank 1 = highest value). Set \code{ranked = TRUE} if \code{y}
#' already contains the ranks.
#'
#' @param data The data frame containing the variables to consider, in long
#' format (one row per group and period).
#' @param x The name of the column holding the time period. Numeric and Date
#' columns are ordered chronologically, factors follow their level order and
#' character columns follow their order of appearance.
#' @param y The name of the numeric column holding the value to rank (or the
#' rank itself when \code{ranked = TRUE}).
#' @param group The name of the column identifying each entity (one line per
#' entity). Each group can appear at most once per period.
#' @param ranked Whether \code{y} already contains ranks. Defaults to
#' \code{FALSE}, in which case ranks are computed per period from \code{y}.
#' @param rankOrder How ranks are computed when \code{ranked = FALSE}. One of
#' \code{"desc"} (default, the highest value gets rank 1) or \code{"asc"}
#' (the lowest value gets rank 1). Ties are broken by order of appearance in
#' the data.
#' @param colors Optional. A character vector of colors, recycled across the
#' groups in order of appearance, or a named vector mapping group names to
#' colors. Colors must be valid CSS colors (e.g. \code{"steelblue"} or
#' \code{"#1f77b4"}); R-only names such as \code{"grey40"} are not understood
#' by the browser. Defaults to the D3 Tableau 10 palette.
#' @param highlight Optional. A character vector of group names to highlight.
#' All other groups are drawn in \code{greyCol}.
#' @param greyCol Color used for groups that are not highlighted. Defaults to
#' \code{"#d3d3d3"}.
#' @param lineWidth Width of the lines in pixels. Defaults to \code{3}.
#' @param circleRadius Maximum radius of the circles in pixels. It is
#' reduced automatically when there are many groups or periods. Defaults to
#' \code{11}.
#' @param showRank Whether to print the rank number inside each circle.
#' Defaults to \code{TRUE}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param xFontSize Font size of the period labels on the x-axis. Defaults
#' to \code{11}.
#' @param labelFontSize Font size of the group labels drawn at both ends of
#' each line. Defaults to \code{11}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param axisCol Color of the period labels, grid lines and title. Defaults
#' to \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG bump chart.
#' @export
#'
#' @examples
#' # Points scored by five teams over four seasons
#' league <- data.frame(
#'   season = rep(c("2021", "2022", "2023", "2024"), each = 5),
#'   team   = rep(c("Lions", "Tigers", "Bears", "Wolves", "Eagles"), 4),
#'   points = c(80, 75, 60, 55, 50,
#'              70, 82, 58, 66, 49,
#'              65, 78, 72, 69, 52,
#'              60, 74, 81, 70, 77)
#' )
#'
#' bump_chart(
#'   data  = league,
#'   x     = "season",
#'   y     = "points",
#'   group = "team",
#'   title = "League ranking by season"
#' )
#'
#' # GDP per capita rank of the Asian "tiger" economies, highlighting two
#' library(gapminder)
#'
#' countries <- c("Japan", "Singapore", "Hong Kong, China", "Taiwan",
#'                "Korea, Rep.", "Malaysia", "Thailand", "China")
#' gdp <- gapminder[gapminder$country %in% countries &
#'                  gapminder$year >= 1967, ]
#' gdp$country <- as.character(gdp$country)
#'
#' bump_chart(
#'   data      = gdp,
#'   x         = "year",
#'   y         = "gdpPercap",
#'   group     = "country",
#'   highlight = c("Singapore", "Korea, Rep."),
#'   title     = "GDP per capita rank, 1967-2007"
#' )
bump_chart <- function(
    data,
    x,
    y,
    group,
    ranked        = FALSE,
    rankOrder     = "desc",
    colors        = NULL,
    highlight     = NULL,
    greyCol       = "#d3d3d3",
    lineWidth     = 3,
    circleRadius  = 11,
    showRank      = TRUE,
    title         = NULL,
    titleFontSize = 16,
    xFontSize     = 11,
    labelFontSize = 11,
    font          = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol         = "white",
    axisCol       = "black",
    width         = NULL,
    height        = NULL
) {

  if (!is.data.frame(data)) stop("'data' must be a data frame.")

  if (is.null(data[[x]]))     stop("Column '", x,     "' not found in data.")
  if (is.null(data[[y]]))     stop("Column '", y,     "' not found in data.")
  if (is.null(data[[group]])) stop("Column '", group, "' not found in data.")

  if (!is.numeric(data[[y]])) stop("Column '", y, "' must be numeric.")

  if (!is.logical(ranked) || length(ranked) != 1 || is.na(ranked)) {
    stop("'ranked' must be TRUE or FALSE.")
  }

  if (!rankOrder %in% c("desc", "asc")) {
    stop("'rankOrder' must be one of 'desc' or 'asc'.")
  }

  if (!is.numeric(lineWidth) || lineWidth <= 0) {
    stop("'lineWidth' must be a positive number.")
  }

  if (!is.numeric(circleRadius) || circleRadius <= 0) {
    stop("'circleRadius' must be a positive number.")
  }

  if (!is.null(colors) && !is.character(colors)) {
    stop("'colors' must be a character vector of colors.")
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  # Period order: chronological for numeric/Date, level order for factors,
  # order of appearance otherwise
  xv <- data[[x]]
  if (is.factor(xv)) {
    periods <- levels(droplevels(xv))
  } else if (is.numeric(xv) || inherits(xv, c("Date", "POSIXt"))) {
    periods <- as.character(sort(unique(xv)))
  } else {
    periods <- unique(as.character(xv))
  }
  periods <- periods[!is.na(periods)]

  df <- data.frame(
    x     = as.character(xv),
    y     = data[[y]],
    group = as.character(data[[group]]),
    stringsAsFactors = FALSE
  )
  df <- df[!is.na(df$x) & !is.na(df$y) & !is.na(df$group), , drop = FALSE]

  if (anyDuplicated(df[, c("x", "group")])) {
    stop("Each value of '", group, "' must appear at most once per value of '",
         x, "'. Aggregate your data first.")
  }

  if (!is.null(highlight)) {
    highlight <- as.character(highlight)
    missing_hl <- setdiff(highlight, df$group)
    if (length(missing_hl)) {
      stop("'highlight' contains values not found in column '", group, "': ",
           paste(missing_hl, collapse = ", "))
    }
  }

  # A named colors vector becomes a group -> color map in JS
  if (!is.null(colors) && !is.null(names(colors))) colors <- as.list(colors)

  r2d3::r2d3(
    data   = df,
    script = system.file("d3/scatterplot/bumpchart.js", package = "ddplot"),
    options = list(
      periods       = as.list(periods),
      ranked        = ranked,
      rankOrder     = rankOrder,
      colors        = if (is.list(colors)) colors else as.list(colors),
      highlight     = as.list(highlight),
      greyCol       = greyCol,
      lineWidth     = lineWidth,
      circleRadius  = circleRadius,
      showRank      = showRank,
      title         = title,
      titleFontSize = titleFontSize,
      xFontSize     = xFontSize,
      labelFontSize = labelFontSize,
      font          = font,
      bgcol         = bgcol,
      axisCol       = axisCol
    ),
    width  = width,
    height = height
  )
}
