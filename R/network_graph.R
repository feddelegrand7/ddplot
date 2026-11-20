#' Create a network graph
#'
#' Draws a network (a graph) with a force-directed layout: nodes repel each
#' other while the links pull connected nodes together, so that clusters
#' appear on their own. The nodes can be coloured by group and sized by a
#' value (by default by their number of links).
#'
#' @section Interactions:
#' Hover a node to highlight its neighbours and see its details; drag a node to
#' move it (the network follows); scroll to zoom and drag the background to
#' pan (\code{zoom}). Click a group in the legend to highlight it. The network
#' settles into place when the chart is drawn. Inside Shiny, clicking a node
#' sets \code{input$<id>_clicked} to a list with \code{id}, \code{label},
#' \code{group} and \code{degree}.
#'
#' @param data A data frame of links, one row per link.
#' @param from,to The names of the columns giving the two ends of each link.
#' @param weight Optional. The name of a numeric column giving the strength of
#'   each link (drawn as its width).
#' @param nodes Optional. A data frame of nodes, to give them a group, a size
#'   or a label (nodes that only appear here are drawn without links).
#' @param node_id The name of the column of \code{nodes} that holds the node
#'   ids (the values used in \code{from} and \code{to}). Defaults to its first
#'   column.
#' @param node_group,node_size,node_label Optional. Names of columns of
#'   \code{nodes} giving the group (colour), the size (a number) and the label
#'   of each node.
#' @param directed Logical. Draw arrows from \code{from} to \code{to}.
#'   Defaults to FALSE.
#' @param colors Optional. Colours of the groups: one per group or a named
#'   vector matched to the groups.
#' @param node_radius The smallest and the largest node radius in pixels.
#'   Defaults to \code{c(5, 18)}.
#' @param link_col The colour of the links. Defaults to "#a7b0ba".
#' @param show_labels Logical. Write the labels next to the nodes. By default
#'   every label is shown for networks of up to 40 nodes, otherwise only the
#'   labels of the biggest nodes; hovering a node always shows the labels of
#'   its neighbours.
#' @param label_font_size The font size of the labels. Defaults to 10.
#' @param charge How strongly the nodes repel each other (a negative number).
#'   Defaults to -160.
#' @param link_distance Optional. The preferred length of the links in pixels.
#'   By default it grows with the size of the chart and shrinks with the
#'   number of nodes.
#' @param zoom Logical. Let the viewer zoom and pan. Defaults to TRUE.
#' @param legend Logical. Show a legend of the groups. Defaults to TRUE.
#' @param legend_font_size The font size of the legend. Defaults to 11.
#' @param hover Logical. Show tooltips and highlight on hover. Defaults to TRUE.
#' @param animate Logical. Let the network settle into place when the chart is
#'   drawn (otherwise it is drawn already settled). Defaults to TRUE.
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
#' # Who works with whom in a small company
#' team <- data.frame(
#'   from = c("Ana", "Ana", "Ana", "Ben", "Ben", "Chloe", "Chloe", "Dev",
#'            "Eve", "Eve", "Farid", "Gus", "Gus", "Hana", "Hana", "Ivo",
#'            "Jo", "Jo", "Kim", "Ana", "Eve"),
#'   to = c("Ben", "Chloe", "Dev", "Chloe", "Dev", "Dev", "Eve", "Eve",
#'          "Farid", "Gus", "Gus", "Hana", "Ivo", "Ivo", "Jo", "Jo",
#'          "Kim", "Lea", "Lea", "Hana", "Kim")
#' )
#' people <- data.frame(
#'   name = c("Ana", "Ben", "Chloe", "Dev", "Eve", "Farid", "Gus", "Hana",
#'            "Ivo", "Jo", "Kim", "Lea"),
#'   team = rep(c("Product", "Engineering", "Sales"), each = 4)
#' )
#' network_graph(team, from = "from", to = "to", nodes = people,
#'               node_group = "team", title = "Who works with whom")
#'
#' # A directed network: which manufacturers make which classes of cars
#' mpg <- ggplot2::mpg
#' pairs <- unique(mpg[, c("manufacturer", "class")])
#' network_graph(as.data.frame(pairs), from = "manufacturer", to = "class",
#'               directed = TRUE, charge = -220)
#'
#' @export
network_graph <- function(
    data,
    from,
    to,
    weight = NULL,
    nodes = NULL,
    node_id = NULL,
    node_group = NULL,
    node_size = NULL,
    node_label = NULL,
    directed = FALSE,
    colors = NULL,
    node_radius = c(5, 18),
    link_col = "#a7b0ba",
    show_labels = NULL,
    label_font_size = 10,
    charge = -160,
    link_distance = NULL,
    zoom = TRUE,
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
  ck_col(data, from, "from")
  ck_col(data, to, "to")
  ck_col(data, weight, "weight", numeric = TRUE, null_ok = TRUE)
  for (a in c("directed", "zoom", "legend", "hover", "animate")) ck_flag(get(a), a)
  if (!is.null(show_labels)) ck_flag(show_labels, "show_labels")
  if (!is.numeric(node_radius) || length(node_radius) != 2 || any(node_radius <= 0)) {
    stop("'node_radius' must be two positive numbers")
  }
  ck_num(charge, "charge")
  if (!is.null(link_distance)) ck_num(link_distance, "link_distance", 1)
  ck_num(label_font_size, "label_font_size", 1)
  font <- ck_font(font)

  f <- as.character(data[[from]])
  t <- as.character(data[[to]])
  w <- if (is.null(weight)) rep(1, nrow(data)) else as.numeric(data[[weight]])
  keep <- !is.na(f) & !is.na(t) & is.finite(w)
  ids <- unique(c(f[keep], t[keep]))
  grp <- lab <- siz <- NULL
  if (!is.null(nodes)) {
    if (!is.data.frame(nodes)) stop("'nodes' must be a data frame")
    if (is.null(node_id)) node_id <- names(nodes)[1]
    ck_col(nodes, node_id, "node_id")
    ck_col(nodes, node_group, "node_group", null_ok = TRUE)
    ck_col(nodes, node_size, "node_size", numeric = TRUE, null_ok = TRUE)
    ck_col(nodes, node_label, "node_label", null_ok = TRUE)
    nid <- as.character(nodes[[node_id]])
    ids <- unique(c(ids, nid[!is.na(nid)]))
    k <- match(ids, nid)
    if (!is.null(node_group)) grp <- as.character(nodes[[node_group]])[k]
    if (!is.null(node_size)) siz <- as.numeric(nodes[[node_size]])[k]
    if (!is.null(node_label)) lab <- as.character(nodes[[node_label]])[k]
  } else if (!is.null(node_group) || !is.null(node_size) || !is.null(node_label)) {
    stop("'node_group', 'node_size' and 'node_label' need a 'nodes' data frame")
  }
  if (length(ids) == 0) stop("'data' has no links")
  links <- data.frame(s = match(f[keep], ids) - 1L, t = match(t[keep], ids) - 1L, w = w[keep])
  links <- links[links$s != links$t, , drop = FALSE]
  groups <- if (is.null(grp)) character(0) else {
    gl <- if (is.factor(nodes[[node_group]])) levels(droplevels(nodes[[node_group]])) else unique(grp[!is.na(grp)])
    if (anyNA(grp)) { grp[is.na(grp)] <- "(none)"; gl <- c(gl, "(none)") }
    gl
  }
  node_tab <- list(
    id = as.list(ids),
    label = as.list(if (is.null(lab)) ids else ifelse(is.na(lab), ids, lab)),
    group = if (is.null(grp)) NULL else as.list(match(grp, groups) - 1L),
    size = if (is.null(siz)) NULL else as.list(ifelse(is.finite(siz), siz, NA))
  )

  r2d3::r2d3(
    data = links,
    script = chart_script("networkgraph.js"),
    width = width,
    height = height,
    options = list(
      nodes = node_tab,
      groups = as.list(groups),
      sizeName = node_size,
      weighted = !is.null(weight),
      directed = directed,
      colors = ck_colors(colors, if (length(groups)) groups else "all"),
      nodeRadius = as.list(node_radius),
      linkCol = link_col,
      showLabels = show_labels,
      labelFontSize = label_font_size,
      charge = charge,
      linkDistance = link_distance,
      zoom = zoom,
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
