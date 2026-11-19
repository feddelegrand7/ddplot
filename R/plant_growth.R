#' Show progress as a growing plant
#'
#' Draws a potted plant whose growth follows a level between 0 and 1. The
#' plant goes through stages: a seed, a sprout, a stem with leaves, a bud
#' (from 55 percent) and a flower that opens fully at 100 percent. It sways
#' gently in the breeze. When the chart scrolls into view, the plant grows
#' from the seed to the level while the percentage counts up and the stage is
#' written below it.
#'
#' @section Interactions:
#' \itemize{
#'   \item Hover the plant: the breeze picks up and the leaves flutter.
#'   \item Click the plant: a watering can waters it and the plant perks up.
#'   \item With \code{draggable = TRUE}, drag up or down on the plant to set
#'     the level, or focus the chart (click it or press Tab) and use the arrow
#'     keys (1 percent per press, 10 with Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the plant sets \code{input$id_clicked} to a list with
#' \code{value} and \code{stage}, and, with \code{draggable = TRUE}, setting a
#' level sets \code{input$id_value} to the new level (a number between 0 and
#' 1). When the chart is re-rendered with a new level, the plant grows (or
#' shrinks) from the old level to the new one.
#'
#' @param fill_level A number between 0 and 1: how grown the plant is (values
#'   outside are clamped). Defaults to 0.5.
#' @param pot_width Optional. The width of the pot in pixels. By default it
#'   depends on the size of the chart.
#' @param pot_height Optional. The height of the pot in pixels.
#' @param plant_max_height Optional. The height of the fully grown plant (above
#'   the soil) in pixels. By default the plant uses the height available.
#' @param stem_color The colour of the stem and the leaves. Defaults to
#'   "#3ca951".
#' @param pot_color The colour of the pot. Defaults to "#c96f45".
#' @param flower_color The colour of the petals of the bud and the flower.
#'   Defaults to "#ff8ab7".
#' @param stroke_color Optional. The outline colour of the pot. Defaults to a
#'   darker shade of \code{pot_color}.
#' @param stroke_width The outline width of the pot. Defaults to 1.5.
#' @param render_fill_label Logical. Show the percentage and the stage above
#'   the plant. Defaults to TRUE.
#' @param title_text Optional. A caption below the pot. Defaults to "Plant
#'   growth"; use \code{NULL} to hide it.
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param label_color The colour of the percentage and the target label.
#'   Defaults to "#333".
#' @param label_font_size Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it depends on the size of the
#'   chart.
#' @param soil_color The colour of the soil. Defaults to "#5b3a29".
#' @param target Optional. A level between 0 and 1 marked with a dashed line
#'   at the corresponding height.
#' @param sway Logical. Let the plant sway in the breeze. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Grow the plant from the seed when it first comes
#'   into view. Defaults to TRUE.
#' @param bgcol The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' plant_growth(0.4)
#' plant_growth(1, title_text = "Project completed")
#' plant_growth(
#'   0.7,
#'   target = 0.9,
#'   pot_color = "#4269d0",
#'   flower_color = "#efb118",
#'   draggable = TRUE
#' )
#'
#' @export
plant_growth <- function(
    fill_level = 0.5,
    pot_width = NULL,
    pot_height = NULL,
    plant_max_height = NULL,
    stem_color = "#3ca951",
    pot_color = "#c96f45",
    flower_color = "#ff8ab7",
    stroke_color = NULL,
    stroke_width = 1.5,
    render_fill_label = TRUE,
    title_text = "Plant growth",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    label_color = "#333",
    label_font_size = NULL,
    soil_color = "#5b3a29",
    target = NULL,
    sway = TRUE,
    draggable = FALSE,
    animate = TRUE,
    bgcol = "white",
    width = NULL,
    height = NULL
) {
  fill_level <- play_level(fill_level)
  target <- play_target(target)
  font <- play_font(font)

  r2d3::r2d3(
    data = NULL,
    script = play_script("plant_growth.js"),
    width = width,
    height = height,
    options = list(
      level = fill_level,
      potWidth = play_size(pot_width, "pot_width"),
      potHeight = play_size(pot_height, "pot_height"),
      plantMaxHeight = play_size(plant_max_height, "plant_max_height"),
      stemColor = stem_color,
      potColor = pot_color,
      flowerColor = flower_color,
      strokeColor = stroke_color,
      strokeWidth = stroke_width,
      renderFillLabel = play_flag(render_fill_label, "render_fill_label"),
      titleText = title_text,
      titleColor = title_color,
      titleFontSize = play_size(title_font_size, "title_font_size"),
      font = font,
      labelColor = label_color,
      labelFontSize = play_size(label_font_size, "label_font_size"),
      soilColor = soil_color,
      target = target,
      sway = play_flag(sway, "sway"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bgcol
    )
  )
}
