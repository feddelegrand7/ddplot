#' Draw a blooming flower, or a flower chart
#'
#' Draws a flower that blooms when it scrolls into view (the petals unfold
#' one after the other) and then turns slowly. The petals have soft gradients,
#' a second ring of petals sits behind them and the centre is covered with
#' stamens laid out on a golden-angle spiral. Petals can be plucked: "loves
#' me, loves me not".
#'
#' With \code{petal_values}, the flower becomes a small chart: there is one
#' petal per value, its length is proportional to the value, the petals are
#' labelled with \code{petal_labels} and hovering a petal shows its value and
#' share of the total.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover the flower: it stops turning and the petal under the mouse
#'     grows slightly (with \code{petal_values}, a tooltip shows its value and
#'     share).
#'   \item Click a petal to pluck it: it falls to the ground and the flower
#'     says "loves me" or "loves me not". When the last petal is plucked, the
#'     verdict is shown and the flower grows back. Click the centre to make
#'     every petal grow back. With \code{petal_values}, clicking a petal
#'     highlights it instead (click it again to clear).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking a petal sets \code{input$id_clicked} to a list with \code{petal}
#' (its number, 0 for the centre) and, when plucking, \code{plucked},
#' \code{remaining} and \code{lovesMe}; with \code{petal_values}, it has
#' \code{petal}, \code{label} and \code{value} (\code{NULL} when the
#' highlight is cleared). The angle of the flower is kept when the chart is
#' re-rendered, and the bloom is played only once.
#'
#' @param petal_count The number of petals. Defaults to 6. Ignored when
#'   \code{petal_values} is given.
#' @param petal_length Optional. The length of the petals (the longest one
#'   with \code{petal_values}) in pixels. By default the flower fills the space
#'   available.
#' @param petal_width Optional. The width of the petals in pixels. By default
#'   it depends on their length and number.
#' @param petal_color The colour of the petals: one colour, or one per petal
#'   (recycled). Defaults to "#ff8ab7", or to the ddplot palette with
#'   \code{petal_values}.
#' @param petal_stroke Optional. The outline colour of the petals. By default
#'   a darker shade of each petal colour is used.
#' @param center_radius Optional. The radius of the centre in pixels. By
#'   default it is a fifth of the petal length.
#' @param center_color The colour of the centre. Defaults to "#f6c445".
#' @param center_stroke The outline colour of the centre (and the colour of
#'   the stamens). Defaults to "#e09a1a".
#' @param center_text Optional. A text written in the centre (e.g. a number).
#' @param center_text_size The font size of the centre text. Defaults to 16.
#' @param center_text_color The colour of the centre text. Defaults to "#222".
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param rotation_speed The speed of rotation, in degrees per 20
#'   milliseconds (0 to stop it). Defaults to 0.5, or to 0 with
#'   \code{petal_values}.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#' @param petal_values Optional. A numeric vector: one petal per value, with a
#'   length proportional to the value.
#' @param petal_labels Optional. A character vector of labels for the petals
#'   (with \code{petal_values}), written at their tips and in the tooltips.
#' @param value_suffix A text added after the values in the tooltips, such as
#'   " pts". Defaults to "".
#' @param layers The number of rings of petals: 1, or 2 (the default) for a
#'   second, darker ring behind the first. Ignored with \code{petal_values}.
#' @param stamens Logical. Draw the stamens on the centre. Defaults to TRUE.
#' @param pluck Logical. Let the viewer pluck the petals by clicking them.
#'   Defaults to TRUE.
#' @param bloom Logical. Unfold the petals when the flower first comes into
#'   view. Defaults to TRUE.
#' @param title_text Optional. A caption below the flower.
#' @param title_color Optional. The colour of the caption.
#' @param title_font_size The font size of the caption. Defaults to 14.
#'
#' @return An r2d3 htmlwidget.
#' @export
#'
#' @examples
#' flower(
#'   petal_count = 5,
#'   petal_color = "plum",
#'   rotation_speed = 1.5
#' )
#' flower(petal_count = 12, petal_color = "#efb118", center_color = "#5b3a29",
#'   center_stroke = "#3b2416", center_text = "12", center_text_color = "white")
#' flower(
#'   petal_values = c(8, 6, 9, 4, 7),
#'   petal_labels = c("Speed", "Power", "Skill", "Luck", "Focus"),
#'   title_text = "Player profile"
#' )
flower <- function(
    petal_count = 6,
    petal_length = NULL,
    petal_width = NULL,
    petal_color = "#ff8ab7",
    petal_stroke = NULL,
    center_radius = NULL,
    center_color = "#f6c445",
    center_stroke = "#e09a1a",
    center_text = NULL,
    center_text_size = 16,
    center_text_color = "#222",
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    rotation_speed = 0.5,
    width = NULL,
    height = NULL,
    petal_values = NULL,
    petal_labels = NULL,
    value_suffix = "",
    layers = 2,
    stamens = TRUE,
    pluck = TRUE,
    bloom = TRUE,
    title_text = NULL,
    title_color = NULL,
    title_font_size = 14
) {
  font <- play_font(font)
  if (!is.null(petal_values)) {
    if (!is.numeric(petal_values) || length(petal_values) < 1 || anyNA(petal_values) || any(petal_values < 0)) {
      stop("'petal_values' must be a vector of non-negative numbers")
    }
    if (!is.null(petal_labels) && length(petal_labels) != length(petal_values)) {
      stop("'petal_labels' must have one label per value of 'petal_values'")
    }
    if (missing(petal_color)) petal_color <- dd_palette_long(length(petal_values))
    if (missing(rotation_speed)) rotation_speed <- 0
  } else if (!is.numeric(petal_count) || length(petal_count) != 1 || is.na(petal_count) || petal_count < 1) {
    stop("'petal_count' must be a positive number")
  }
  if (!is.numeric(rotation_speed) || length(rotation_speed) != 1 || is.na(rotation_speed)) {
    stop("'rotation_speed' must be a number")
  }

  r2d3::r2d3(
    data = NULL,
    script = play_script("flower.js"),
    width = width,
    height = height,
    options = list(
      petalCount = petal_count,
      petalLength = play_size(petal_length, "petal_length"),
      petalWidth = play_size(petal_width, "petal_width"),
      petalColor = I(as.character(petal_color)),
      petalStroke = petal_stroke,
      centerRadius = play_size(center_radius, "center_radius"),
      centerColor = center_color,
      centerStroke = center_stroke,
      centerText = if (is.null(center_text)) NULL else as.character(center_text),
      centerTextSize = play_size(center_text_size, "center_text_size"),
      centerTextColor = center_text_color,
      font = font,
      bgcol = bg_col,
      rotationSpeed = rotation_speed,
      petalValues = if (is.null(petal_values)) NULL else I(as.numeric(petal_values)),
      petalLabels = if (is.null(petal_labels)) NULL else I(as.character(petal_labels)),
      valueSuffix = value_suffix,
      layers = layers,
      stamens = play_flag(stamens, "stamens"),
      pluck = play_flag(pluck, "pluck"),
      bloom = play_flag(bloom, "bloom"),
      titleText = title_text,
      titleColor = title_color,
      titleFontSize = play_size(title_font_size, "title_font_size")
    )
  )
}
