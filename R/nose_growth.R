#' Show a level as a nose that grows longer and longer
#'
#' Draws a person in profile whose nose grows with a level between 0 and 1,
#' like the nose of a teller of tall tales: a small nose at 0 and a nose that
#' reaches across the chart at 1. A twig with leaves sprouts from a long nose
#' and a bird lands on the longest one, while the person looks more and more
#' nervous (a wavy mouth, raised brows, a blush and a drop of sweat). When the
#' chart scrolls into view, the nose grows from its smallest size to the level
#' while the percentage above the portrait counts up and the current stage
#' ("Honest", "Little fib", "White lie", "Tall tale", "Whopper", "Pants on
#' fire") is written under it.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse across the chart: the eye follows it.
#'   \item Hover the portrait: the nose twitches.
#'   \item Click the portrait: the nose wobbles, the ponytail swings, the bird
#'     hops and the person protests in a speech bubble.
#'   \item With \code{draggable = TRUE}, drag right to grow the nose and left
#'     to shrink it (the tip follows the mouse), or focus the chart (click it
#'     or press Tab) and use the arrow keys (1 percent per press, 10 with
#'     Shift).
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the portrait sets \code{input$id_clicked} to a list with
#' \code{value} and \code{stage}, and, with \code{draggable = TRUE}, setting a
#' level sets \code{input$id_value} to the new level (a number between 0 and
#' 1). When the chart is re-rendered with a new level, the nose grows or
#' shrinks from the old length to the new one.
#'
#' @param fill_level A number between 0 and 1: how long the nose is (values
#'   outside are clamped). Defaults to 0.5.
#' @param skin_color The colour of the skin. Defaults to "#f3c9a8".
#' @param hair_color The colour of the hair and the eyebrow. Defaults to
#'   "#c0622f".
#' @param shirt_color The colour of the stripes of the top. Defaults to
#'   "#27365c".
#' @param panel_color The colour of the card behind the portrait. Defaults to
#'   "#e3f1ea"; use \code{NULL} for no card.
#' @param render_fill_label Logical. Show the percentage and the stage above
#'   the portrait. Defaults to TRUE.
#' @param label_color The colour of the percentage, the stage, the target and
#'   the speech bubble. Defaults to "#333".
#' @param label_font_size Optional. The font size of the percentage, a number
#'   or a CSS size such as "16px". By default it grows with the chart.
#' @param title_text Optional. A caption below the portrait. Defaults to "Nose
#'   growth"; use \code{NULL} to hide it.
#' @param title_color The colour of the caption. Defaults to "#333".
#' @param title_font_size The font size of the caption, a number or a CSS size
#'   such as "14px". Defaults to 14.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param target Optional. A level between 0 and 1, drawn as a dashed outline
#'   of the nose at that length, with a label above its tip.
#' @param leaves Logical. Let a twig with leaves sprout from the nose above 62
#'   percent. Defaults to TRUE.
#' @param bird Logical. Let a bird land on the nose above 92 percent. Defaults
#'   to TRUE.
#' @param sway Logical. Let the ponytail, the twig and the bird move gently and
#'   the person breathe and blink. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the level by dragging or
#'   with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Grow the nose when the chart first comes into view.
#'   Defaults to TRUE.
#' @param bg_col The background colour. Defaults to "white".
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' nose_growth(fill_level = 1)
#' nose_growth(0.3, target = 0.7, title_text = "Claims not yet fact-checked")
#' nose_growth(
#'   fill_level = 0.55,
#'   skin_color = "#8d5a3b",
#'   hair_color = "#1f1a17",
#'   shirt_color = "#c0392b",
#'   panel_color = "#fdf1e3",
#'   draggable = TRUE,
#'   title_text = "Drag the nose"
#' )
#'
#' @export
nose_growth <- function(
    fill_level = 0.5,
    skin_color = "#f3c9a8",
    hair_color = "#c0622f",
    shirt_color = "#27365c",
    panel_color = "#e3f1ea",
    render_fill_label = TRUE,
    label_color = "#333",
    label_font_size = NULL,
    title_text = "Nose growth",
    title_color = "#333",
    title_font_size = 14,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    target = NULL,
    leaves = TRUE,
    bird = TRUE,
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
    script = play_script("nosegrowth.js"),
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
      leaves = play_flag(leaves, "leaves"),
      bird = play_flag(bird, "bird"),
      sway = play_flag(sway, "sway"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate"),
      bgcol = bg_col
    )
  )
}
