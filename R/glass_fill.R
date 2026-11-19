#' Show a level as a glass filling with water
#'
#' Draws a glass of water filled up to a level between 0 and 1. The surface
#' of the water moves gently, bubbles rise from the base and the water sloshes
#' when the mouse moves across the chart. When the chart scrolls into view, the
#' water rises from empty to the level while the percentage above the glass
#' counts up.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse across the chart: the water rocks from side to
#'     side.
#'   \item Click the glass: a drop falls into it and splashes.
#'   \item With \code{draggable = TRUE}, drag up or down on the glass to set
#'     the level, or focus the chart (click it or press Tab) and use the arrow
#'     keys (1 percent per press, 10 with Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the glass sets \code{input$id_clicked} to a list with
#' \code{value}, and, with \code{draggable = TRUE}, setting a level sets
#' \code{input$id_value} to the new level (a number between 0 and 1). When the
#' chart is re-rendered with a new level, the water moves from the old level
#' to the new one.
#'
#' @param fill_level A number between 0 and 1: how full the glass is (values
#'   outside are clamped). Defaults to 0.65.
#' @param glass_width Optional. The width of the glass (at the rim) in pixels.
#'   By default it is 64 percent of the height of the glass.
#' @param glass_height Optional. The height of the glass in pixels. By default
#'   the glass fills the space available (up to 340 pixels).
#' @param stroke_color The colour of the glass. Defaults to "#555".
#' @param stroke_width The width of the outline of the glass. Defaults to 2.5.
#' @param fill_color The colour of the water. Defaults to "#5aa9e6".
#' @param render_fill_label Logical. Show the percentage above the glass.
#'   Defaults to TRUE.
#' @param label_font_size Optional. The font size of the percentage, a number or
#'   a CSS size such as "16px". By default it grows with the glass.
#' @param title_text Optional. A caption below the glass. Defaults to "Fill
#'   level"; use \code{NULL} to hide it.
#' @param label_color The colour of the percentage, the scale and the target
#'   label. Defaults to "#333".
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param target Optional. A level between 0 and 1 marked with a dashed line
#'   and a label.
#' @param ticks Logical. Draw a measuring scale (25, 50, 75 and 100 percent)
#'   on the glass. Defaults to FALSE.
#' @param waves Logical. Animate the surface of the water. Defaults to TRUE.
#' @param bubbles Logical. Show bubbles rising in the water. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Fill the glass from empty when it first comes into
#'   view. Defaults to TRUE.
#' @param bg_col The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' glass_fill(fill_level = 0.75)
#' glass_fill(
#'   fill_level = 0.3,
#'   target = 0.8,
#'   ticks = TRUE,
#'   title_text = "Water intake today"
#' )
#' glass_fill(0.5, fill_color = "#efb118", draggable = TRUE, title_text = "Drag me")
#'
#' @export
glass_fill <- function(
    fill_level = 0.65,
    glass_width = NULL,
    glass_height = NULL,
    stroke_color = "#555",
    stroke_width = 2.5,
    fill_color = "#5aa9e6",
    render_fill_label = TRUE,
    label_font_size = NULL,
    title_text = "Fill level",
    label_color = "#333",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    target = NULL,
    ticks = FALSE,
    waves = TRUE,
    bubbles = TRUE,
    draggable = FALSE,
    animate = TRUE,
    bg_col = "white",
    width = NULL,
    height = NULL
) {
  fill_level <- play_level(fill_level)
  target <- play_target(target)
  font <- play_font(font)

  r2d3::r2d3(
    data = NULL,
    script = play_script("glass_fill.js"),
    width = width,
    height = height,
    options = list(
      level = fill_level,
      glassWidth = play_size(glass_width, "glass_width"),
      glassHeight = play_size(glass_height, "glass_height"),
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
      ticks = play_flag(ticks, "ticks"),
      waves = play_flag(waves, "waves"),
      bubbles = play_flag(bubbles, "bubbles"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bg_col
    )
  )
}
