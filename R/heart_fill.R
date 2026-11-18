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
#' @param heartSize Optional. The width of the heart in pixels. By default
#'   the heart fills the space available (up to 360 pixels).
#' @param strokeColor The colour of the outline. Defaults to "#b5172b".
#' @param strokeWidth The width of the outline. Defaults to 3.
#' @param fillColor The colour of the liquid. Defaults to "#e63950". The
#'   empty part of the heart is a pale shade of it.
#' @param renderFillLabel Logical. Show the percentage inside the heart.
#'   Defaults to TRUE.
#' @param labelColor The colour of the percentage (where the liquid does not
#'   cover it) and of the target label. Defaults to "#333".
#' @param labelFontSize Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it grows with the heart.
#' @param titleText Optional. A caption below the heart. Defaults to
#'   "Fill level"; use \code{NULL} to hide it.
#' @param titleColor The colour of the caption. Defaults to "#333".
#' @param titleFontSize The font size of the caption, a number or a CSS size
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
#'   fillColor = "#ff8ab7",
#'   strokeColor = "#c2185b",
#'   titleText = "Daily activity goal"
#' )
#' heart_fill(0.55, draggable = TRUE, titleText = "Drag me")
#'
#' @export
heart_fill <- function(
    fill_level = 0.65,
    heartSize = NULL,
    strokeColor = "#b5172b",
    strokeWidth = 3,
    fillColor = "#e63950",
    renderFillLabel = TRUE,
    labelColor = "#333",
    labelFontSize = NULL,
    titleText = "Fill level",
    titleColor = "#333",
    titleFontSize = 14,
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
      heartSize = play_size(heartSize, "heartSize"),
      strokeColor = strokeColor,
      strokeWidth = strokeWidth,
      fillColor = fillColor,
      renderFillLabel = play_flag(renderFillLabel, "renderFillLabel"),
      labelColor = labelColor,
      labelFontSize = play_size(labelFontSize, "labelFontSize"),
      titleText = titleText,
      titleColor = titleColor,
      titleFontSize = play_size(titleFontSize, "titleFontSize"),
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
