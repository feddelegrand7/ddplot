#' Show a level as a sailor's biceps growing bigger and bigger
#'
#' Draws a sailor flexing both arms whose biceps grow with a level between 0
#' and 1: flat, skinny arms at 0 and giant biceps at 1. The sailor strains at
#' low levels (squeezed eyes, gritted teeth, a red face and drops of sweat)
#' and grins at high ones; the shoulders widen, the tattoos stretch, veins
#' show and the biggest biceps sparkle. When the chart scrolls into view, the
#' biceps grow from flat to the level while the percentage above the portrait
#' counts up and the current stage ("Noodle arms", "Twigs", "Toned", "Strong",
#' "Buff", "Mighty") is written under it.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse across the chart: the eyes follow it.
#'   \item Hover the portrait: the biceps twitch.
#'   \item Click the portrait: the sailor flexes harder, the cap jumps and a
#'     speech bubble pops up.
#'   \item With \code{draggable = TRUE}, drag up to grow the biceps and down to
#'     shrink them, or focus the chart (click it or press Tab) and use the
#'     arrow keys (1 percent per press, 10 with Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the portrait sets \code{input$id_clicked} to a list with
#' \code{value} and \code{stage}, and, with \code{draggable = TRUE}, setting a
#' level sets \code{input$id_value} to the new level (a number between 0 and
#' 1). When the chart is re-rendered with a new level, the biceps grow or
#' shrink from the old size to the new one.
#'
#' @param fill_level A number between 0 and 1: how big the biceps are (values
#'   outside are clamped). 0 is flat and 1 is giant. Defaults to 0.5.
#' @param skin_color The colour of the skin. Defaults to "#e8b48f".
#' @param hair_color The colour of the moustache, the eyebrows and the
#'   sideburns. Defaults to "#3b2a20".
#' @param shirt_color The colour of the stripes of the tank top. Defaults to
#'   "#2a62b8".
#' @param panel_color The colour of the card behind the portrait. Defaults to
#'   "#d9ecf7"; use \code{NULL} for no card.
#' @param render_fill_label Logical. Show the percentage and the stage above
#'   the portrait. Defaults to TRUE.
#' @param label_color The colour of the percentage, the stage, the target and
#'   the speech bubble. Defaults to "#333".
#' @param label_font_size Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it grows with the chart.
#' @param title_text Optional. A caption below the portrait. Defaults to
#'   "Muscle growth"; use \code{NULL} to hide it.
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param target Optional. A level between 0 and 1, drawn as a dashed outline
#'   of the biceps at that size and written in the top right corner.
#' @param tattoos Logical. Draw an anchor and a heart tattoo on the arms; they
#'   stretch as the biceps grow. Defaults to TRUE.
#' @param sparkles Logical. Let the biggest biceps (above 85 percent) sparkle.
#'   Defaults to TRUE.
#' @param sway Logical. Let the sailor breathe and blink, the weak arms tremble
#'   and the sea move. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Grow the biceps from flat when the chart first comes
#'   into view. Defaults to TRUE.
#' @param bg_col The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' muscle_growth(fill_level = 1)
#' muscle_growth(0.3, target = 0.75, title_text = "Training plan completed")
#' muscle_growth(
#'   fill_level = 0.6,
#'   skin_color = "#8d5a3b",
#'   hair_color = "#1f1a17",
#'   shirt_color = "#c0392b",
#'   panel_color = "#fdf1e3",
#'   draggable = TRUE,
#'   title_text = "Drag up to pump the biceps"
#' )
#'
#' @export
muscle_growth <- function(
    fill_level = 0.5,
    skin_color = "#e8b48f",
    hair_color = "#3b2a20",
    shirt_color = "#2a62b8",
    panel_color = "#d9ecf7",
    render_fill_label = TRUE,
    label_color = "#333",
    label_font_size = NULL,
    title_text = "Muscle growth",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    target = NULL,
    tattoos = TRUE,
    sparkles = TRUE,
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
  for (nm in c("skin_color", "hair_color", "shirt_color")) {
    v <- get(nm)
    if (!is.character(v) || length(v) != 1 || is.na(v)) stop("'", nm, "' must be a single colour")
  }
  if (!is.null(panel_color) && (!is.character(panel_color) || length(panel_color) != 1)) {
    stop("'panel_color' must be a single colour or NULL")
  }

  r2d3::r2d3(
    data = NULL,
    script = play_script("musclegrowth.js"),
    width = width,
    height = height,
    options = list(
      level = fill_level,
      skinColor = skin_color,
      hairColor = hair_color,
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
      tattoos = play_flag(tattoos, "tattoos"),
      sparkles = play_flag(sparkles, "sparkles"),
      sway = play_flag(sway, "sway"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bg_col
    )
  )
}
