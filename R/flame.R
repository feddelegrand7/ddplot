#' Show an intensity as a flickering flame
#'
#' Draws a flame whose height follows an intensity: the higher the
#' intensity, the taller the flame, the faster it flickers and the more sparks
#' it throws. The flame is made of three layers (outer, middle and core) with a
#' warm glow behind it, and can burn on its own, on a candle or on logs. Useful
#' to show the state of a critical number, such as the number of errors in a
#' process. When the chart scrolls into view, the flame ignites and grows to
#' its height while the value (with \code{show_value = TRUE}) counts up.
#'
#' @section Interactions:
#' \itemize{
#'   \item Move the mouse near the flame: it leans away, as if you were
#'     blowing on it.
#'   \item Click the flame: it flares up and throws a burst of sparks.
#'   \item With \code{draggable = TRUE}, drag up or down on the flame to set
#'     the intensity, or focus the chart (click it or press Tab) and use the
#'     arrow keys.
#' }
#'
#' @section Shiny:
#' Inside Shiny, with \code{r2d3::d3Output("id")} and \code{r2d3::renderD3()},
#' clicking the flame sets \code{input$id_clicked} to a list with
#' \code{intensity}, and, with \code{draggable = TRUE}, setting the intensity
#' sets \code{input$id_value} to the new intensity. When the chart is
#' re-rendered with a new intensity, the flame grows or shrinks from the old
#' height to the new one.
#'
#' @param intensity A non-negative number: the intensity of the flame. The
#'   height of the flame grows linearly with it up to \code{max_intensity},
#'   where the flame reaches the top of the chart. Defaults to 50.
#' @param flame_gradient_colors A length-3 character vector of colours, from
#'   the core of the flame outwards. Defaults to
#'   \code{c("#fffbe6", "#ffc233", "#e8452c")}.
#' @param flame_outline Optional. The colour of an outline drawn around the
#'   flame. By default the flame has no outline.
#' @param bgcol The background colour. Defaults to "white". The flame glows
#'   more on dark backgrounds.
#' @param width Optional. The width of the chart.
#' @param height Optional. The height of the chart.
#' @param max_intensity The intensity at which the flame reaches its full
#'   height. Defaults to 100. Higher intensities do not make the flame taller.
#' @param base What the flame burns on: "none" (the default), "candle" or
#'   "logs".
#' @param show_value Logical. Write the intensity below the flame. Defaults to
#'   FALSE.
#' @param value_suffix A text added after the value, such as " errors".
#'   Defaults to "".
#' @param title_text Optional. A caption below the flame.
#' @param title_color Optional. The colour of the caption. Defaults to
#'   \code{label_color}.
#' @param title_font_size The font size of the caption. Defaults to 14.
#' @param label_color Optional. The colour of the value. Defaults to dark grey
#'   on light backgrounds and light grey on dark ones.
#' @param label_font_size Optional. The font size of the value. By default it
#'   depends on the size of the chart.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param flicker Logical. Animate the flame. Defaults to TRUE.
#' @param sparks Logical. Show sparks rising from the flame. Defaults to TRUE.
#' @param draggable Logical. Let the viewer change the intensity by dragging
#'   or with the arrow keys. Defaults to FALSE.
#' @param animate Logical. Ignite the flame when it first comes into view.
#'   Defaults to TRUE.
#'
#' @return An r2d3 htmlwidget.
#' @export
#'
#' @examples
#' flame(intensity = 20)
#' flame(
#'   intensity = 80,
#'   flame_gradient_colors = c("#e0f7ff", "#5ac8fa", "#1d4ed8"),
#'   bgcol = "#111111",
#'   base = "logs"
#' )
#' flame(
#'   intensity = 35,
#'   base = "candle",
#'   show_value = TRUE,
#'   value_suffix = " errors",
#'   title_text = "Failed jobs today"
#' )
flame <- function(
    intensity = 50,
    flame_gradient_colors = c("#fffbe6", "#ffc233", "#e8452c"),
    flame_outline = NULL,
    bgcol = "white",
    width = NULL,
    height = NULL,
    max_intensity = 100,
    base = c("none", "candle", "logs"),
    show_value = FALSE,
    value_suffix = "",
    title_text = NULL,
    title_color = NULL,
    title_font_size = 14,
    label_color = NULL,
    label_font_size = NULL,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    flicker = TRUE,
    sparks = TRUE,
    draggable = FALSE,
    animate = TRUE
) {
  if (!length(flame_gradient_colors) == 3) {
    stop(
      "flame_gradient_colors must be a length-3 vector of colors"
    )
  }
  if (!is.numeric(intensity) || length(intensity) != 1 || is.na(intensity) || intensity < 0) {
    stop("'intensity' must be a single non-negative number")
  }
  if (!is.numeric(max_intensity) || length(max_intensity) != 1 || is.na(max_intensity) || max_intensity <= 0) {
    stop("'max_intensity' must be a positive number")
  }
  base <- match.arg(base)
  font <- play_font(font)

  r2d3::r2d3(
    data = NULL,
    script = play_script("flame.js"),
    width = width,
    height = height,
    options = list(
      intensity = intensity,
      flameColor0 = flame_gradient_colors[[1]],
      flameColor1 = flame_gradient_colors[[2]],
      flameColor2 = flame_gradient_colors[[3]],
      flameOutline = flame_outline,
      bgcol = bgcol,
      maxIntensity = max_intensity,
      base = base,
      showValue = play_flag(show_value, "show_value"),
      valueSuffix = value_suffix,
      titleText = title_text,
      titleColor = title_color,
      titleFontSize = play_size(title_font_size, "title_font_size"),
      labelColor = label_color,
      labelFontSize = play_size(label_font_size, "label_font_size"),
      font = font,
      flicker = play_flag(flicker, "flicker"),
      sparks = play_flag(sparks, "sparks"),
      draggable = play_flag(draggable, "draggable"),
      animate = play_flag(animate, "animate")
    )
  )
}
