#' Create an interactive parliament chart
#'
#' Draws the seats of an assembly as a hemicycle: one dot per seat, the
#' parties forming wedges from left to right in the order of the data (or by
#' size, see \code{sort}). A dashed line marks the majority, and the centre
#' shows the total number of seats. Rows with the same party are added up.
#'
#' The chart is also a coalition builder: click parties to put them together.
#' Their seats gather on the left of the hemicycle, so the coalition has a
#' majority when its seats cross the majority line, and a gauge under the
#' hemicycle counts its seats.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover a seat or a legend entry to highlight the party and see its
#'     seats, its share, its rank and how far it is from a majority (and its
#'     gains or losses with \code{previous}).
#'   \item Click a seat or a legend entry (or press Enter on a focused legend
#'     entry) to add the party to the coalition, or to take it out. The
#'     coalition seats move to the left (see \code{regroup}), the gauge shows
#'     whether they reach the majority, and "Clear" empties the coalition.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a party sets \code{input$id_clicked} to its name, and every change
#' of the coalition sets \code{input$id_coalition} to a list with
#' \code{parties} (a list of names: use \code{unlist()} to get a vector),
#' \code{seats}, \code{majority} (the seats needed) and \code{hasMajority}.
#' The coalition is kept when the chart is re-rendered (and
#' \code{input$id_coalition} is updated if its seats changed), and the seats
#' move smoothly to their new places when the results change.
#'
#' @param data A data frame with one row per party (rows with the same party
#'   are added up).
#' @param categorical_column The name of the column giving the parties.
#' @param numerical_column The name of the column giving the number of seats
#'   (whole numbers; other numbers are rounded with a warning).
#' @param seatSize Optional. The diameter of the seats in pixels. By default
#'   the seats are as large as the chart allows. When the seats do not fit,
#'   they are made smaller.
#' @param padding Optional. The space between two seats, in pixels. By
#'   default a fifth of the space given to each seat.
#' @param maxRows Optional. The number of rows of seats. By default the
#'   number of rows that gives the largest seats.
#' @param title Optional. The title of the chart.
#' @param titleFontSize The font size of the title. Defaults to 20.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bgcol The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#' @param subtitle Optional. A subtitle under the title.
#' @param subtitleFontSize The font size of the subtitle. Defaults to 13.
#' @param fill Optional. The colours of the parties: one colour per party
#'   (recycled, in the order of the data), or a named vector mapping colours
#'   to parties (for instance \code{c(Greens = "#3ca951")}); the other
#'   parties get the ddplot palette.
#' @param colorCategory Optional. The name of a D3 categorical colour scheme,
#'   such as "Tableau10" or "Set2", used when \code{fill} is not given.
#' @param previous Optional. The name of a column giving the seats of each
#'   party at the previous election: the gains and losses are then shown in
#'   the legend and the tooltips.
#' @param majority The seats needed for a majority: \code{TRUE} (default) for
#'   more than half of the seats, a number of seats, a share of the seats
#'   (a number below 1, such as \code{2/3}, rounded up), or \code{FALSE} to
#'   draw no majority line.
#' @param coalition Optional. A character vector of parties that form the
#'   coalition when the chart is first drawn.
#' @param coalitionBuilder Logical. Let the viewer build a coalition by
#'   clicking parties, with a gauge under the hemicycle. Defaults to
#'   \code{TRUE}.
#' @param regroup Logical. Move the seats of the coalition to the left of the
#'   hemicycle. Defaults to \code{TRUE}.
#' @param sort The order of the parties from left to right: \code{"none"}
#'   (default, the order of the data or of the factor levels, as parties are
#'   usually ordered by political orientation), \code{"descending"} (largest
#'   first) or \code{"ascending"}.
#' @param arc The angle covered by the seats, in degrees, from 180 (default,
#'   a hemicycle) to 360 (a full ring).
#' @param innerRadius The radius of the empty centre, as a fraction of the
#'   outer radius. Defaults to 0.4.
#' @param seatShape The shape of the seats: \code{"circle"} (default) or
#'   \code{"square"}.
#' @param centerLabel The text under the number of seats in the centre.
#'   Defaults to "seats"; \code{FALSE} leaves the centre empty.
#' @param legend Logical. Show the legend, with the seats and shares (on the
#'   right when there is room, otherwise below). Defaults to \code{TRUE}.
#' @param tooltip Logical. Show a tooltip when hovering the seats. Defaults
#'   to \code{TRUE}.
#' @param animate Logical. Fill the seats from left to right when the chart
#'   comes into view. Defaults to \code{TRUE}.
#' @param axisCol The colour of the texts. Defaults to "#333333".
#'
#' @return An interactive parliament chart (an r2d3 htmlwidget).
#' @export
#'
#' @examples
#' political_results_example <- data.frame(
#'   political_party = c("SDP", "CDU", "Linke"),
#'   number_of_seats = c(200, 40, 30)
#' )
#' parliament_chart(
#'   data = political_results_example,
#'   categorical_column = "political_party",
#'   numerical_column = "number_of_seats",
#'   title = "An assembly of 270 seats"
#' )
#'
#' # A toy assembly with party colours, the previous results and a coalition
#' assembly <- data.frame(
#'   party = c("Left", "Greens", "Social Democrats", "Liberals",
#'             "Conservatives", "Nationalists"),
#'   seats = c(28, 41, 152, 63, 187, 79),
#'   seats_before = c(39, 30, 171, 48, 170, 92)
#' )
#' parliament_chart(
#'   assembly, "party", "seats",
#'   previous = "seats_before",
#'   fill = c("#c0392b", "#3ca951", "#ff725c", "#efb118", "#4269d0", "#6b4e9c"),
#'   coalition = c("Social Democrats", "Greens", "Liberals"),
#'   title = "Who can govern?",
#'   subtitle = "Click the parties to build a coalition"
#' )
parliament_chart <- function(
    data,
    categorical_column,
    numerical_column,
    seatSize = NULL,
    padding = NULL,
    maxRows = NULL,
    title = NULL,
    titleFontSize = 20,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol = "white",
    width = NULL,
    height = NULL,
    subtitle = NULL,
    subtitleFontSize = 13,
    fill = NULL,
    colorCategory = NULL,
    previous = NULL,
    majority = TRUE,
    coalition = NULL,
    coalitionBuilder = TRUE,
    regroup = TRUE,
    sort = c("none", "descending", "ascending"),
    arc = 180,
    innerRadius = 0.4,
    seatShape = c("circle", "square"),
    centerLabel = "seats",
    legend = TRUE,
    tooltip = TRUE,
    animate = TRUE,
    axisCol = "#333333"
) {
  if (!is.character(font) || length(font) != 1 || grepl(";", font)) {
    stop("Please remove the ';' character from your font argument.")
  }
  if (!is.data.frame(data)) {
    stop("data must be a data.frame")
  }
  one_col <- function(x) is.character(x) && length(x) == 1 && !is.na(x)
  if (missing(categorical_column) || !one_col(categorical_column) ||
      !categorical_column %in% names(data)) {
    stop("the categorical column is not in your data.frame")
  }
  if (missing(numerical_column) || !one_col(numerical_column) ||
      !numerical_column %in% names(data)) {
    stop("the numerical column is not in your data.frame")
  }
  if (!is.null(previous) && (!one_col(previous) || !previous %in% names(data))) {
    stop("the 'previous' column is not in your data.frame")
  }
  sort <- match.arg(sort)
  seatShape <- match.arg(seatShape)
  num1 <- function(x, name, lo = -Inf, hi = Inf) {
    if (is.null(x)) return(NULL)
    if (!is.numeric(x) || length(x) != 1 || is.na(x) || x < lo || x > hi) {
      stop("'", name, "' must be a single number",
           if (is.finite(lo) && is.finite(hi)) paste0(" between ", lo, " and ", hi)
           else if (is.finite(lo)) paste0(", ", lo, " or more") else "")
    }
    as.numeric(x)
  }
  seatSize <- num1(seatSize, "seatSize", 0.5)
  padding <- num1(padding, "padding", 0)
  maxRows <- num1(maxRows, "maxRows", 1)
  arc <- num1(arc, "arc", 180, 360)
  innerRadius <- num1(innerRadius, "innerRadius", 0, 0.9)
  if (!is.null(colorCategory) && !one_col(colorCategory)) {
    stop("'colorCategory' must be the name of a D3 colour scheme, such as \"Tableau10\"")
  }

  # ---- parties -------------------------------------------------------------------
  lv <- data[[categorical_column]]
  if (is.factor(lv)) {
    levels_ <- levels(droplevels(lv))
    lv <- as.character(lv)
  } else {
    lv <- as.character(lv)
    levels_ <- unique(lv[!is.na(lv)])
  }
  if (anyNA(lv)) {
    lv[is.na(lv)] <- "(missing)"
    levels_ <- c(levels_, "(missing)")
  }
  seats_of <- function(col) {
    v <- data[[col]]
    if (!is.numeric(v)) stop("'", col, "' must be a numeric column")
    v <- as.numeric(v)
    if (any(is.finite(v) & v < 0)) {
      warning("negative numbers of seats in '", col, "' were left out")
      v[is.finite(v) & v < 0] <- NA
    }
    if (any(is.finite(v) & abs(v - round(v)) > 1e-8)) {
      warning("'", col, "' contains numbers that are not whole: they were rounded")
    }
    v[!is.finite(v)] <- NA
    v
  }
  vv <- seats_of(numerical_column)
  fac <- factor(lv, levels = levels_)
  sums <- tapply(vv, fac, function(x) if (all(is.na(x))) NA_real_ else sum(x, na.rm = TRUE))
  keep <- !is.na(sums)
  if (!any(keep) || sum(round(sums[keep])) < 1) stop("there are no seats to draw")
  parties <- data.frame(
    label = levels_[keep],
    value = round(as.numeric(sums[keep])),
    order = seq_len(sum(keep)),
    stringsAsFactors = FALSE
  )
  if (!is.null(previous)) {
    pv <- seats_of(previous)
    psum <- tapply(pv, fac, function(x) if (all(is.na(x))) NA_real_ else sum(x, na.rm = TRUE))
    parties$previous <- round(as.numeric(psum[keep]))
  }
  total <- sum(parties$value)
  if (total > 5000) {
    warning("drawing ", total, " seats: the chart may be slow")
  }

  # ---- colours -----------------------------------------------------------------------
  parties$color <- if (is.null(fill) && !is.null(colorCategory)) NA_character_
                   else race_colors(parties$label, fill)

  # ---- majority ----------------------------------------------------------------------
  if (isTRUE(majority)) {
    majority_seats <- floor(total / 2) + 1
  } else if (isFALSE(majority) || is.null(majority)) {
    majority_seats <- NULL
  } else {
    if (!is.numeric(majority) || length(majority) != 1 || is.na(majority) || majority <= 0) {
      stop("'majority' must be TRUE, FALSE, a number of seats or a share of the seats")
    }
    majority_seats <- if (majority < 1) ceiling(total * majority - 1e-9) else round(majority)
    if (majority_seats > total) {
      warning("'majority' is more than the total number of seats (", total, ")")
    }
  }

  # ---- coalition -------------------------------------------------------------------------
  if (!is.null(coalition)) {
    coalition <- as.character(coalition)
    unknown <- setdiff(coalition, parties$label)
    if (length(unknown)) {
      warning("these 'coalition' parties are not in the data: ", paste(unknown, collapse = ", "))
    }
    coalition <- intersect(coalition, parties$label)
  }

  if (isFALSE(centerLabel) || is.null(centerLabel)) centerLabel <- ""

  r2d3::r2d3(
    data = parties,
    script = play_script("parliamant_chart.js"),
    width = width,
    height = height,
    options = list(
      stateKey = paste("parliament", categorical_column, numerical_column, sep = "|"),
      valueName = numerical_column,
      hasPrevious = !is.null(previous),
      seatSize = seatSize,
      padding = padding,
      maxRows = maxRows,
      title = title,
      titleFontSize = play_size(titleFontSize, "titleFontSize"),
      subtitle = subtitle,
      subtitleFontSize = play_size(subtitleFontSize, "subtitleFontSize"),
      font = font,
      bgcol = bgcol,
      colorCategory = colorCategory,
      majority = majority_seats,
      coalition = if (is.null(coalition)) NULL else I(coalition),
      coalitionBuilder = play_flag(coalitionBuilder, "coalitionBuilder"),
      regroup = play_flag(regroup, "regroup"),
      sort = sort,
      arc = arc,
      innerRadius = innerRadius,
      seatShape = seatShape,
      centerLabel = as.character(centerLabel),
      legend = play_flag(legend, "legend"),
      tooltip = play_flag(tooltip, "tooltip"),
      animate = play_flag(animate, "animate"),
      axisCol = axisCol
    )
  )
}
