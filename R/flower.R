#' Draw a blooming flower, or a flower chart
#'
#' Draws a flower that blooms when it scrolls into view (the petals unfold
#' one after the other) and then turns slowly. The petals have soft gradients,
#' a second ring of petals sits behind them and the centre is covered with
#' stamens laid out on a golden-angle spiral. Petals can be plucked: "loves
#' me, loves me not".
#'
#' With \code{petalValues}, the flower becomes a small chart: there is one
#' petal per value, its length is proportional to the value, the petals are
#' labelled with \code{petalLabels} and hovering a petal shows its value and
#' share of the total.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover the flower: it stops turning and the petal under the mouse
#'     grows slightly (with \code{petalValues}, a tooltip shows its value and
#'     share).
#'   \item Click a petal to pluck it: it falls to the ground and the flower
#'     says "loves me" or "loves me not". When the last petal is plucked, the
#'     verdict is shown and the flower grows back. Click the centre to make
#'     every petal grow back. With \code{petalValues}, clicking a petal
#'     highlights it instead (click it again to clear).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a petal sets \code{input$id_clicked} to a list with \code{petal}
#' (its number, 0 for the centre) and, when plucking, \code{plucked},
#' \code{remaining} and \code{lovesMe}; with \code{petalValues}, it has
#' \code{petal}, \code{label} and \code{value} (\code{NULL} when the
#' highlight is cleared). The angle of the flower is kept when the chart is
#' re-rendered, and the bloom is played only once.
#'
#' @param petalCount The number of petals. Defaults to 6. Ignored when
#'   \code{petalValues} is given.
#' @param petalLength Optional. The length of the petals (the longest one
#'   with \code{petalValues}) in pixels. By default the flower fills the space
#'   available.
#' @param petalWidth Optional. The width of the petals in pixels. By default
#'   it depends on their length and number.
#' @param petalColor The colour of the petals: one colour, or one per petal
#'   (recycled). Defaults to "#ff8ab7", or to the ddplot palette with
#'   \code{petalValues}.
#' @param petalStroke Optional. The outline colour of the petals. By default
#'   a darker shade of each petal colour is used.
#' @param centerRadius Optional. The radius of the centre in pixels. By
#'   default it is a fifth of the petal length.
#' @param centerColor The colour of the centre. Defaults to "#f6c445".
#' @param centerStroke The outline colour of the centre (and the colour of
#'   the stamens). Defaults to "#e09a1a".
#' @param centerText Optional. A text written in the centre (e.g. a number).
#' @param centerTextSize The font size of the centre text. Defaults to 16.
#' @param centerTextColor The colour of the centre text. Defaults to "#222".
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bgcol The background colour. Defaults to "white".
#' @param rotationSpeed The speed of rotation, in degrees per 20
#'   milliseconds (0 to stop it). Defaults to 0.5, or to 0 with
#'   \code{petalValues}.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#' @param petalValues Optional. A numeric vector: one petal per value, with a
#'   length proportional to the value.
#' @param petalLabels Optional. A character vector of labels for the petals
#'   (with \code{petalValues}), written at their tips and in the tooltips.
#' @param valueSuffix A text added after the values in the tooltips, such as
#'   " pts". Defaults to "".
#' @param layers The number of rings of petals: 1, or 2 (the default) for a
#'   second, darker ring behind the first. Ignored with \code{petalValues}.
#' @param stamens Logical. Draw the stamens on the centre. Defaults to TRUE.
#' @param pluck Logical. Let the viewer pluck the petals by clicking them.
#'   Defaults to TRUE.
#' @param bloom Logical. Unfold the petals when the flower first comes into
#'   view. Defaults to TRUE.
#' @param titleText Optional. A caption below the flower.
#' @param titleColor Optional. The colour of the caption.
#' @param titleFontSize The font size of the caption. Defaults to 14.
#'
#' @return An r2d3 htmlwidget.
#' @export
#'
#' @examples
#' flower(
#'   petalCount = 5,
#'   petalColor = "plum",
#'   rotationSpeed = 1.5
#' )
#' flower(petalCount = 12, petalColor = "#efb118", centerColor = "#5b3a29",
#'   centerStroke = "#3b2416", centerText = "12", centerTextColor = "white")
#' flower(
#'   petalValues = c(8, 6, 9, 4, 7),
#'   petalLabels = c("Speed", "Power", "Skill", "Luck", "Focus"),
#'   titleText = "Player profile"
#' )
flower <- function(
    petalCount = 6,
    petalLength = NULL,
    petalWidth = NULL,
    petalColor = "#ff8ab7",
    petalStroke = NULL,
    centerRadius = NULL,
    centerColor = "#f6c445",
    centerStroke = "#e09a1a",
    centerText = NULL,
    centerTextSize = 16,
    centerTextColor = "#222",
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol = "white",
    rotationSpeed = 0.5,
    width = NULL,
    height = NULL,
    petalValues = NULL,
    petalLabels = NULL,
    valueSuffix = "",
    layers = 2,
    stamens = TRUE,
    pluck = TRUE,
    bloom = TRUE,
    titleText = NULL,
    titleColor = NULL,
    titleFontSize = 14
) {
  font <- play_font(font)
  if (!is.null(petalValues)) {
    if (!is.numeric(petalValues) || length(petalValues) < 1 || anyNA(petalValues) || any(petalValues < 0)) {
      stop("'petalValues' must be a vector of non-negative numbers")
    }
    if (!is.null(petalLabels) && length(petalLabels) != length(petalValues)) {
      stop("'petalLabels' must have one label per value of 'petalValues'")
    }
    if (missing(petalColor)) petalColor <- dd_palette_long(length(petalValues))
    if (missing(rotationSpeed)) rotationSpeed <- 0
  } else if (!is.numeric(petalCount) || length(petalCount) != 1 || is.na(petalCount) || petalCount < 1) {
    stop("'petalCount' must be a positive number")
  }
  if (!is.numeric(rotationSpeed) || length(rotationSpeed) != 1 || is.na(rotationSpeed)) {
    stop("'rotationSpeed' must be a number")
  }

  r2d3::r2d3(
    data = NULL,
    script = play_script("flower.js"),
    width = width,
    height = height,
    options = list(
      petalCount = petalCount,
      petalLength = play_size(petalLength, "petalLength"),
      petalWidth = play_size(petalWidth, "petalWidth"),
      petalColor = I(as.character(petalColor)),
      petalStroke = petalStroke,
      centerRadius = play_size(centerRadius, "centerRadius"),
      centerColor = centerColor,
      centerStroke = centerStroke,
      centerText = if (is.null(centerText)) NULL else as.character(centerText),
      centerTextSize = play_size(centerTextSize, "centerTextSize"),
      centerTextColor = centerTextColor,
      font = font,
      bgcol = bgcol,
      rotationSpeed = rotationSpeed,
      petalValues = if (is.null(petalValues)) NULL else I(as.numeric(petalValues)),
      petalLabels = if (is.null(petalLabels)) NULL else I(as.character(petalLabels)),
      valueSuffix = valueSuffix,
      layers = layers,
      stamens = play_flag(stamens, "stamens"),
      pluck = play_flag(pluck, "pluck"),
      bloom = play_flag(bloom, "bloom"),
      titleText = titleText,
      titleColor = titleColor,
      titleFontSize = play_size(titleFontSize, "titleFontSize")
    )
  )
}
