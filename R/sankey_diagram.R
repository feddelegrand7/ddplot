#' Create a Sankey diagram
#'
#' Draws flows between nodes as bands whose width is proportional to their
#' value: each node is a bar as tall as the largest of what flows into it and
#' out of it, and the nodes are laid out in columns from left to right. Use it
#' for budgets, energy balances, user journeys or any process where quantities
#' split and merge. The flows must not form a cycle.
#'
#' @section Interactions:
#' Hover a flow to see its value and its share of the source and the target;
#' hover a node to highlight everything that flows into it and out of it. Drag
#' a node up or down to untangle the diagram (\code{draggable}). The flows run
#' from left to right when the chart is drawn. Inside Shiny, clicking a node
#' sets \code{input$<id>_clicked} to a list with \code{node} and \code{value},
#' and clicking a flow sets it to a list with \code{source}, \code{target} and
#' \code{value}.
#'
#' @param data A data frame with one row per flow.
#' @param source,target The names of the columns giving the start and the end
#'   of each flow.
#' @param value Optional. The name of a numeric column giving the size of each
#'   flow. When \code{NULL}, each row counts as 1. Rows with the same source
#'   and target are added up.
#' @param colors Optional. Colours of the nodes: one per node (in order of
#'   appearance) or a named vector matched to the node names.
#' @param link_color How to colour the flows: \code{"source"} (the default),
#'   \code{"target"}, \code{"gradient"} (from the source colour to the target
#'   colour) or \code{"grey"}.
#' @param align How to place the nodes in columns: \code{"justify"} (the
#'   default; the end nodes go to the right edge), \code{"left"},
#'   \code{"right"} or \code{"center"}.
#' @param node_width The width of the nodes in pixels. Defaults to 14.
#' @param node_padding The vertical gap between nodes in pixels. Defaults to
#'   12.
#' @param link_opacity The opacity of the flows. Defaults to 0.4.
#' @param show_values Logical. Write the value of each node under its name.
#'   Defaults to TRUE.
#' @param value_format A d3 format for the values. Defaults to ",.0f".
#' @param label_font_size The font size of the node labels. Defaults to 11.
#' @param draggable Logical. Let the viewer drag the nodes up and down.
#'   Defaults to TRUE.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Let the flows run in when the chart is drawn.
#'   Defaults to TRUE.
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
#' # A household budget
#' budget <- data.frame(
#'   from = c("Salary", "Salary", "Freelance", "Freelance", "Savings",
#'            "Savings", "Living", "Living", "Living"),
#'   to = c("Living", "Savings", "Living", "Savings", "Stocks",
#'          "Emergency fund", "Rent", "Food", "Transport"),
#'   amount = c(2600, 900, 500, 300, 700, 500, 1700, 900, 500)
#' )
#' sankey_diagram(budget, source = "from", target = "to", value = "amount",
#'                value_format = "$,.0f", title = "Where the money goes")
#'
#' # Who survived the Titanic: class, then sex, then outcome
#' tt <- as.data.frame(Titanic)
#' tt$Survived <- ifelse(tt$Survived == "Yes", "Survived", "Died")
#' step1 <- aggregate(Freq ~ Class + Sex, data = tt, FUN = sum)
#' step2 <- aggregate(Freq ~ Sex + Survived, data = tt, FUN = sum)
#' names(step1) <- names(step2) <- c("from", "to", "people")
#' sankey_diagram(rbind(step1, step2), source = "from", target = "to",
#'                value = "people", link_color = "gradient",
#'                colors = c(Died = "#9498a0", Survived = "#3ca951"))
#'
#' @export
sankey_diagram <- function(
    data,
    source,
    target,
    value = NULL,
    colors = NULL,
    link_color = c("source", "target", "gradient", "grey"),
    align = c("justify", "left", "right", "center"),
    node_width = 14,
    node_padding = 12,
    link_opacity = 0.4,
    show_values = TRUE,
    value_format = ",.0f",
    label_font_size = 11,
    draggable = TRUE,
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
  ck_col(data, source, "source")
  ck_col(data, target, "target")
  ck_col(data, value, "value", numeric = TRUE, null_ok = TRUE)
  link_color <- match.arg(link_color)
  align <- match.arg(align)
  ck_num(node_width, "node_width", 1)
  ck_num(node_padding, "node_padding", 0)
  ck_num(link_opacity, "link_opacity", 0, 1)
  ck_num(label_font_size, "label_font_size", 1)
  for (a in c("show_values", "draggable", "hover", "animate")) ck_flag(get(a), a)
  ck_string(value_format, "value_format", null_ok = FALSE)
  font <- ck_font(font)

  s <- as.character(data[[source]])
  t <- as.character(data[[target]])
  v <- if (is.null(value)) rep(1, nrow(data)) else as.numeric(data[[value]])
  keep <- !is.na(s) & !is.na(t) & is.finite(v) & v > 0
  if (any(s[keep] == t[keep])) stop("A flow cannot go from a node to itself (", s[keep][s[keep] == t[keep]][1], ")")
  if (!any(keep)) stop("'data' has no positive flows")
  nodes <- unique(c(rbind(s[keep], t[keep])))
  if (is.factor(data[[source]]) && is.factor(data[[target]])) {
    lv <- unique(c(levels(data[[source]]), levels(data[[target]])))
    nodes <- lv[lv %in% nodes]
  }
  links <- stats::aggregate(list(v = v[keep]), list(s = match(s[keep], nodes) - 1L, t = match(t[keep], nodes) - 1L), sum)

  # the flows must not form a cycle (Kahn's algorithm)
  indeg <- tabulate(links$t + 1L, length(nodes))
  queue <- which(indeg == 0)
  seen <- 0
  while (length(queue)) {
    n <- queue[1]; queue <- queue[-1]; seen <- seen + 1
    for (k in links$t[links$s == n - 1L] + 1L) {
      indeg[k] <- indeg[k] - 1
      if (indeg[k] == 0) queue <- c(queue, k)
    }
  }
  if (seen < length(nodes)) stop("The flows form a cycle: a Sankey diagram needs flows that always move forward")

  r2d3::r2d3(
    data = links,
    script = chart_script("sankeydiagram.js"),
    width = width,
    height = height,
    options = list(
      nodes = as.list(nodes),
      colors = ck_colors(colors, nodes),
      linkColor = link_color,
      align = align,
      nodeWidth = node_width,
      nodePadding = node_padding,
      linkOpacity = link_opacity,
      showValues = show_values,
      valueFormat = value_format,
      labelFontSize = label_font_size,
      draggable = draggable,
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
