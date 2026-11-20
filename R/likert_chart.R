#' Create a Likert chart
#'
#' Draws the answers to survey questions on an ordered scale (from "Strongly
#' disagree" to "Strongly agree", from "Very bad" to "Very good", ...) as
#' diverging stacked bars: the negative answers go to the left of a centre
#' line and the positive ones to the right, with a neutral answer (the middle
#' level of an odd scale) split across the line. The share of negative and
#' positive answers is written at both ends of each bar.
#'
#' @section Interactions:
#' Hover a segment to see its share and count, while the same answer is
#' highlighted for every question; hover the legend to highlight an answer.
#' The bars grow from the centre line when the chart is drawn. Inside Shiny,
#' clicking a segment sets \code{input$<id>_clicked} to a list with
#' \code{question}, \code{response}, \code{count} and \code{percent}.
#'
#' @param data A data frame, with one row per answer (or one row per question
#'   and answer with a \code{value} column of counts).
#' @param question The name of the column with the questions (or items).
#' @param response The name of the column with the answers.
#' @param value Optional. The name of a numeric column of counts. When
#'   \code{NULL}, each row counts as one answer.
#' @param levels Optional. The answers in order, from the most negative to the
#'   most positive. Defaults to the factor levels of \code{response}, or to the
#'   order of appearance.
#' @param colors Optional. One colour per level. By default a red - grey - blue
#'   scale.
#' @param sort How to order the questions: \code{"none"} (the default),
#'   \code{"positive"} (the most positive at the top) or \code{"negative"}.
#' @param show_values Logical. Write the share of each answer in its segment
#'   when it fits. Defaults to TRUE.
#' @param show_totals Logical. Write the share of negative and positive answers
#'   at the ends of each bar. Defaults to TRUE.
#' @param bar_height The height of the bars as a share of the space of each
#'   question. Defaults to 0.7.
#' @param label_font_size The font size of the questions. Defaults to 11.
#' @param legend Logical. Show the legend. Defaults to TRUE.
#' @param legend_font_size The font size of the legend. Defaults to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Grow the bars when the chart is drawn. Defaults to
#'   TRUE.
#' @param title Optional. The title of the chart.
#' @param title_font_size The font size of the title. Defaults to 16.
#' @param font The font family. Defaults to "Verdana, Geneva, Tahoma,
#'   sans-serif".
#' @param bg_col The background colour. Defaults to "white".
#' @param text_col The colour of the text. Defaults to "#333333".
#' @param width,height Optional. The size of the chart.
#'
#' @return An r2d3 htmlwidget.
#'
#' @examples
#' survey <- data.frame(
#'   question = rep(c("The product is easy to use", "Support answers quickly",
#'                    "The price is fair", "I would recommend it"), each = 5),
#'   answer = rep(c("Strongly disagree", "Disagree", "Neutral", "Agree",
#'                  "Strongly agree"), times = 4),
#'   n = c(4, 10, 18, 45, 23,  12, 20, 25, 28, 15,  20, 30, 22, 20, 8,
#'         5, 8, 15, 40, 32)
#' )
#' likert_chart(survey, question = "question", response = "answer", value = "n",
#'              sort = "positive", title = "Customer survey")
#'
#' # One row per answer, a four-point scale without a neutral answer
#' set.seed(1)
#' scale4 <- c("Never", "Rarely", "Often", "Always")
#' habits <- data.frame(
#'   habit = rep(c("Cook at home", "Walk to work", "Read before bed"), each = 60),
#'   answer = c(sample(scale4, 60, TRUE, c(1, 2, 4, 3)),
#'              sample(scale4, 60, TRUE, c(4, 3, 2, 1)),
#'              sample(scale4, 60, TRUE, c(2, 3, 3, 2)))
#' )
#' likert_chart(habits, question = "habit", response = "answer", levels = scale4,
#'              colors = c("#d6402b", "#ffb15c", "#6cc5b0", "#1f7a63"))
#'
#' @export
likert_chart <- function(
    data,
    question,
    response,
    value = NULL,
    levels = NULL,
    colors = NULL,
    sort = c("none", "positive", "negative"),
    show_values = TRUE,
    show_totals = TRUE,
    bar_height = 0.7,
    label_font_size = 11,
    legend = TRUE,
    legend_font_size = 11,
    hover = TRUE,
    animate = TRUE,
    title = NULL,
    title_font_size = 16,
    font = "Verdana, Geneva, Tahoma, sans-serif",
    bg_col = "white",
    text_col = "#333333",
    width = NULL,
    height = NULL
) {
  ck_df(data)
  ck_col(data, question, "question")
  ck_col(data, response, "response")
  ck_col(data, value, "value", numeric = TRUE, null_ok = TRUE)
  sort <- match.arg(sort)
  for (a in c("show_values", "show_totals", "legend", "hover", "animate")) ck_flag(get(a), a)
  ck_num(bar_height, "bar_height", 0.1, 1)
  font <- ck_font(font)

  q <- data[[question]]
  r <- data[[response]]
  v <- if (is.null(value)) rep(1, nrow(data)) else as.numeric(data[[value]])
  if (is.null(levels)) levels <- ck_levels(r)
  levels <- as.character(levels)
  if (anyDuplicated(levels)) stop("'levels' must not contain duplicates")
  unknown <- setdiff(unique(as.character(r[!is.na(r)])), levels)
  if (length(unknown)) stop("Answers not found in 'levels': ", paste(unknown, collapse = ", "))
  if (length(levels) < 2) stop("A Likert chart needs at least two levels")
  questions <- ck_levels(q)
  keep <- !is.na(q) & !is.na(r) & is.finite(v) & v >= 0
  counts <- stats::aggregate(list(n = v[keep]),
                             list(q = match(as.character(q[keep]), questions),
                                  r = match(as.character(r[keep]), levels)), sum)
  totals <- tapply(counts$n, counts$q, sum)
  counts$p <- counts$n / totals[as.character(counts$q)]
  k <- length(levels)
  neg <- seq_len(floor(k / 2))
  pos <- seq.int(ceiling(k / 2) + 1, k)
  share <- function(set) vapply(seq_along(questions), function(i) sum(counts$p[counts$q == i & counts$r %in% set]), numeric(1))
  if (sort != "none") {
    o <- order(if (sort == "positive") -share(pos) else -share(neg))
    counts$q <- match(counts$q, o)
    questions <- questions[o]
  }
  counts$q <- counts$q - 1L
  counts$r <- counts$r - 1L
  if (!is.null(colors) && length(colors) != k) stop("'colors' must have one colour per level (", k, ")")

  r2d3::r2d3(
    data = counts,
    script = chart_script("likertchart.js"),
    width = width,
    height = height,
    options = list(
      questions = as.list(questions),
      levels = as.list(levels),
      colors = if (is.null(colors)) NULL else as.list(colors),
      showValues = show_values,
      showTotals = show_totals,
      barHeight = bar_height,
      labelFontSize = label_font_size,
      legend = legend,
      legendFontSize = legend_font_size,
      hover = hover,
      animate = animate,
      title = title,
      titleFontSize = title_font_size,
      font = font,
      bgcol = bg_col,
      textCol = text_col
    )
  )
}
