#' Show a level as a beating heart filling with liquid
#'
#' Draws a heart filled from the bottom up to a level between 0 and 1. The
#' liquid has a gently moving wavy surface and the heart beats. When the chart
#' scrolls into view, the liquid rises from empty to the level and the
#' percentage counts up with it. The percentage is written inside the heart,
#' in white where the liquid covers it.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover the heart: it beats faster.
#'   \item Click the heart: small hearts float up from where you clicked.
#'   \item With \code{draggable = TRUE}, drag up or down on the heart to set
#'     the level, or focus the chart (click it or press Tab) and use the arrow
#'     keys (1 percent per press, 10 with Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the heart sets \code{input$id_clicked} to a list with
#' \code{value}, and, with \code{draggable = TRUE}, setting a level sets
#' \code{input$id_value} to the new level (a number between 0 and 1). When the
#' chart is re-rendered with a new level, the liquid moves from the old level
#' to the new one.
#'
#' @param fill_level A number between 0 and 1: how full the heart is (values
#'   outside are clamped). Defaults to 0.65.
#' @param heart_size Optional. The width of the heart in pixels. By default
#'   the heart fills the space available (up to 360 pixels).
#' @param stroke_color The colour of the outline. Defaults to "#b5172b".
#' @param stroke_width The width of the outline. Defaults to 3.
#' @param fill_color The colour of the liquid. Defaults to "#e63950". The
#'   empty part of the heart is a pale shade of it.
#' @param render_fill_label Logical. Show the percentage inside the heart.
#'   Defaults to TRUE.
#' @param label_color The colour of the percentage (where the liquid does not
#'   cover it) and of the target label. Defaults to "#333".
#' @param label_font_size Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it grows with the heart.
#' @param title_text Optional. A caption below the heart. Defaults to
#'   "Fill level"; use \code{NULL} to hide it.
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param target Optional. A level between 0 and 1 marked with a dashed line
#'   and a label.
#' @param waves Logical. Animate the surface of the liquid. Defaults to TRUE.
#' @param beat Logical. Make the heart beat. Defaults to TRUE.
#' @param bpm The heart rate, in beats per minute. Defaults to 60.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Fill the heart from empty when it first comes into
#'   view. Defaults to TRUE.
#' @param bgcol The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' heart_fill(fill_level = 0.9)
#' heart_fill(
#'   fill_level = 0.4,
#'   target = 0.75,
#'   fill_color = "#ff8ab7",
#'   stroke_color = "#c2185b",
#'   title_text = "Daily activity goal"
#' )
#' heart_fill(0.55, draggable = TRUE, title_text = "Drag me")
#'
#' @export
heart_fill <- function(
    fill_level = 0.65,
    heart_size = NULL,
    stroke_color = "#b5172b",
    stroke_width = 3,
    fill_color = "#e63950",
    render_fill_label = TRUE,
    label_color = "#333",
    label_font_size = NULL,
    title_text = "Fill level",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    target = NULL,
    waves = TRUE,
    beat = TRUE,
    bpm = 60,
    draggable = FALSE,
    animate = TRUE,
    bgcol = "white",
    width = NULL,
    height = NULL
) {
  fill_level <- play_level(fill_level)
  target <- play_target(target)
  font <- play_font(font)
  if (!is.numeric(bpm) || length(bpm) != 1 || is.na(bpm) || bpm <= 0) {
    stop("'bpm' must be a positive number")
  }

  r2d3::r2d3(
    data = NULL,
    script = play_script("heart_fill.js"),
    width = width,
    height = height,
    options = list(
      level = fill_level,
      heartSize = play_size(heart_size, "heart_size"),
      strokeColor = stroke_color,
      strokeWidth = stroke_width,
      fillColor = fill_color,
      renderFillLabel = play_flag(render_fill_label, "render_fill_label"),
      labelColor = label_color,
      labelFontSize = play_size(label_font_size, "label_font_size"),
      titleText = title_text,
      titleColor = title_color,
      titleFontSize = play_size(title_font_size, "title_font_size"),
      font = font,
      target = target,
      waves = play_flag(waves, "waves"),
      beat = play_flag(beat, "beat"),
      bpm = bpm,
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bgcol
    )
  )
}
