#' Show a level as hair growing into a big afro
#'
#' Draws a portrait whose hair grows with a level between 0 and 1: the person
#' is bald at 0 (with a shiny head), gets stubble, a buzz cut, short curls and
#' curly hair, and has a big afro, with an afro pick, at 1. The face smiles more
#' as the hair grows. When the chart scrolls into view, the hair grows from
#' nothing to the level while the percentage above the portrait counts up and
#' the current stage is written under it.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse across the chart: the eyes follow it.
#'   \item Hover the portrait: the hair bounces a little.
#'   \item Click the portrait: the hair bounces and the person winks (a bald
#'     head shines).
#'   \item With \code{draggable = TRUE}, drag up or down on the portrait to
#'     grow or cut the hair, or focus the chart (click it or press Tab) and use
#'     the arrow keys (1 percent per press, 10 with Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the portrait sets \code{input$id_clicked} to a list with
#' \code{value} and \code{stage}, and, with \code{draggable = TRUE}, setting a
#' level sets \code{input$id_value} to the new level (a number between 0 and
#' 1). When the chart is re-rendered with a new level, the hair grows or
#' shrinks from the old level to the new one.
#'
#' @param fill_level A number between 0 and 1: how much hair the person has
#'   (values outside are clamped). 0 is bald and 1 is a big afro. Defaults to
#'   0.5.
#' @param hair_color The colour of the hair and the eyebrows. Defaults to
#'   "#2e2530".
#' @param skin_color The colour of the skin. Defaults to "#a86b4f".
#' @param shirt_color The colour of the turtleneck. Defaults to "#3f51b5".
#' @param panel_color The colour of the card behind the portrait. Defaults to
#'   "#dde7ec"; use \code{NULL} for no card.
#' @param render_fill_label Logical. Show the percentage and the stage above
#'   the portrait. Defaults to TRUE.
#' @param label_color The colour of the percentage, the stage and the target.
#'   Defaults to "#333".
#' @param label_font_size Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it grows with the chart.
#' @param title_text Optional. A caption below the portrait. Defaults to "Hair
#'   growth"; use \code{NULL} to hide it.
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param target Optional. A level between 0 and 1, drawn as a dashed outline
#'   of the hair at that level and written in the top right corner.
#' @param sway Logical. Let the hair move gently, the person breathe and blink.
#'   Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Grow the hair from nothing when the chart first
#'   comes into view. Defaults to TRUE.
#' @param bg_col The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' hair_growth(fill_level = 1)
#' hair_growth(0.35, target = 0.8, title_text = "Fundraising goal")
#' hair_growth(
#'   fill_level = 0.6,
#'   hair_color = "#6b3e26",
#'   skin_color = "#f1c7a5",
#'   shirt_color = "#3ca951",
#'   panel_color = "#fdf1e3",
#'   draggable = TRUE,
#'   title_text = "Drag up to grow the hair"
#' )
#'
#' @export
hair_growth <- function(
    fill_level = 0.5,
    hair_color = "#2e2530",
    skin_color = "#a86b4f",
    shirt_color = "#3f51b5",
    panel_color = "#dde7ec",
    render_fill_label = TRUE,
    label_color = "#333",
    label_font_size = NULL,
    title_text = "Hair growth",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    target = NULL,
    sway = TRUE,
    draggable = FALSE,
    animate = TRUE,
    bg_col = "white",
    width = NULL,
    height = NULL
) {
  fill_level <- play_level(fill_level)
  target <- play_target(target)
  font <- play_font(font)
  for (nm in c("hair_color", "skin_color", "shirt_color")) {
    v <- get(nm)
    if (!is.character(v) || length(v) != 1 || is.na(v)) stop("'", nm, "' must be a single colour")
  }
  if (!is.null(panel_color) && (!is.character(panel_color) || length(panel_color) != 1)) {
    stop("'panel_color' must be a single colour or NULL")
  }

  r2d3::r2d3(
    data = NULL,
    script = play_script("hairgrowth.js"),
    width = width,
    height = height,
    options = list(
      level = fill_level,
      hairColor = hair_color,
      skinColor = skin_color,
      shirtColor = shirt_color,
      panelColor = panel_color,
      renderFillLabel = play_flag(render_fill_label, "render_fill_label"),
      labelColor = label_color,
      labelFontSize = play_size(label_font_size, "label_font_size"),
      titleText = title_text,
      titleColor = title_color,
      titleFontSize = play_size(title_font_size, "title_font_size"),
      font = font,
      target = target,
      sway = play_flag(sway, "sway"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bg_col
    )
  )
}
