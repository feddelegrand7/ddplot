#' Create a chord diagram.
#'
#' @description
#' A chord diagram shows the flows (or connections) between a set of
#' entities arranged around a circle. Each entity is drawn as an outer arc
#' whose length is proportional to the total flow it is involved in, and
#' each pair of entities is linked by a ribbon whose width at either end is
#' proportional to the flow in that direction. Chord diagrams are a compact
#' way to display migration, trade, transitions between states, or any other
#' square matrix of flows.
#'
#' The look and feel are inspired by the chord chart of the Nivo
#' visualization library, reimplemented in plain D3. The chart is
#' interactive: hovering an arc (or its label) keeps the ribbons connected to
#' that entity and fades out all the others, while a tooltip lists the
#' entity's totals and its largest flows. Hovering a ribbon isolates it and
#' shows the flow in both directions. Clicking an arc pins its highlight;
#' clicking it again, or clicking the background, releases it.
#'
#' @param data Either a data frame in edge-list format (one row per flow,
#' with the columns named by \code{from}, \code{to} and \code{value}), or a
#' square numeric matrix of flows with row and/or column names, where
#' \code{data[i, j]} is the flow from entity \code{i} to entity \code{j}.
#' Duplicated edges are summed. Self-flows (\code{from == to}) are allowed.
#' @param from The name of the column holding the origin of each flow. Only
#' used when \code{data} is a data frame. Defaults to \code{"from"}.
#' @param to The name of the column holding the destination of each flow.
#' Only used when \code{data} is a data frame. Defaults to \code{"to"}.
#' @param value The name of the numeric (non-negative) column holding the
#' size of each flow. Use \code{NULL} to count rows (every row counts as 1).
#' Only used when \code{data} is a data frame. Defaults to \code{"value"}.
#' @param directed Whether flows are directed. When \code{TRUE} (default),
#' \code{A -> B} and \code{B -> A} are kept apart, so a ribbon can be wider at
#' one end than at the other. When \code{FALSE}, flows are treated as
#' undirected links: in an edge list, both directions are summed; a
#' symmetric matrix is used as is, and a non-symmetric one is symmetrized
#' by adding its transpose (the diagonal is left unchanged).
#' @param colors Optional. A vector of colors for the entities, recycled if
#' needed. A named vector maps colors to entity names (unnamed entities fall
#' back to \code{colorPalette}). Defaults to \code{NULL}.
#' @param colorPalette D3 categorical color scheme used when \code{colors}
#' is \code{NULL} (e.g. \code{"Tableau10"}, \code{"Category10"},
#' \code{"Set2"}, \code{"Dark2"}, \code{"Paired"}). Defaults to
#' \code{"Tableau10"}.
#' @param ribbonColor How ribbons are colored: \code{"source"} (default,
#' the color of the entity with the larger outgoing flow of the pair),
#' \code{"target"}, or \code{"gradient"} (a gradient from one entity's color
#' to the other's).
#' @param sortGroups Order of the arcs around the circle: \code{"none"}
#' (default, the order of first appearance in the edge list, the factor
#' levels, or the matrix order), \code{"descending"} or \code{"ascending"}
#' (by total flow).
#' @param padAngle Gap between adjacent arcs, in radians. Defaults to
#' \code{0.03}.
#' @param innerRadiusRatio Inner radius of the arcs as a fraction of their
#' outer radius (between 0.5 and 0.99). Larger values give thinner arcs.
#' Defaults to \code{0.92}.
#' @param arcOpacity Fill opacity of the arcs (0 to 1). Defaults to
#' \code{1}.
#' @param ribbonOpacity Fill opacity of the ribbons (0 to 1). Defaults to
#' \code{0.6}.
#' @param fadeOpacity Opacity of the ribbons and arcs that are faded out
#' while another element is hovered (0 to 1). Defaults to \code{0.1}.
#' @param strokeWidth Width of the arc and ribbon borders in pixels (the
#' border uses a darker shade of the fill). Defaults to \code{0.5}.
#' @param showLabels Whether to display the entity names outside the arcs.
#' Labels of arcs too small to hold them are hidden. Defaults to
#' \code{TRUE}.
#' @param rotateLabels Whether to orient the labels along the radius of the
#' circle (useful with many entities). When \code{FALSE} (default), labels
#' are horizontal.
#' @param labelFontSize Font size of the labels. Defaults to \code{11}.
#' @param labelOffset Distance in pixels between the arcs and their labels.
#' Defaults to \code{10}.
#' @param valueFormat A d3-format specifier used to display values in the
#' tooltip (e.g. \code{",.0f"}, \code{".2s"}, \code{"$,.1f"}). Defaults to
#' \code{",~f"}.
#' @param hover Whether hovering highlights arcs and ribbons and shows a
#' tooltip, and clicking an arc pins its highlight. Defaults to \code{TRUE}.
#' @param animate Whether the arcs sweep in and the ribbons fade in on first
#' render. Defaults to \code{TRUE}.
#' @param title Optional. Title of the chart.
#' @param titleFontSize Font size of the chart title. Defaults to \code{16}.
#' @param font The font family used for all text. Defaults to
#' \code{"Verdana, Geneva, Tahoma, sans-serif"}.
#' @param bgcol Background color of the SVG. Defaults to \code{"white"}.
#' @param textCol Color of the title and the labels. Defaults to
#' \code{"black"}.
#' @param width Optional. The width of the SVG output.
#' @param height Optional. The height of the SVG output.
#'
#' @return An SVG chord diagram.
#' @export
#'
#' @examples
#' # Edge list: hypothetical migration flows between regions (thousands)
#' migration <- data.frame(
#'   from  = c("Africa", "Africa", "Africa", "Asia", "Asia", "Asia",
#'             "Europe", "Europe", "Latin America", "Latin America",
#'             "North America", "Oceania", "Asia", "Europe"),
#'   to    = c("Europe", "North America", "Asia", "Europe", "North America",
#'             "Oceania", "North America", "Asia", "North America", "Europe",
#'             "Europe", "Asia", "Africa", "Oceania"),
#'   value = c(420, 150, 90, 610, 520, 230, 180, 120, 870, 260,
#'             95, 40, 60, 75)
#' )
#'
#' chord_diagram(
#'   data        = migration,
#'   from        = "from",
#'   to          = "to",
#'   value       = "value",
#'   valueFormat = ",.0f",
#'   title       = "Migration flows between regions (thousands)"
#' )
#'
#' # Square matrix with dimnames: the classic hair-color transition data
#' hair <- matrix(
#'   c(11975,  5871, 8916, 2868,
#'      1951, 10048, 2060, 6171,
#'      8010, 16145, 8090, 8045,
#'      1013,   990,  940, 6907),
#'   nrow = 4, byrow = TRUE,
#'   dimnames = list(c("Black", "Blond", "Brown", "Red"),
#'                   c("Black", "Blond", "Brown", "Red"))
#' )
#'
#' chord_diagram(
#'   data        = hair,
#'   colors      = c("#3b3b3b", "#f2c45a", "#8c5a3c", "#d0533a"),
#'   ribbonColor = "gradient",
#'   padAngle    = 0.05,
#'   valueFormat = ",.0f",
#'   title       = "Hair color flows"
#' )
#'
#' # Undirected co-authorship links between departments, on a dark background
#' coauthors <- data.frame(
#'   from  = c("Biology", "Biology", "Biology", "Chemistry", "Chemistry",
#'             "Physics", "Physics", "Mathematics", "Computer Science",
#'             "Computer Science", "Medicine", "Medicine"),
#'   to    = c("Chemistry", "Medicine", "Computer Science", "Physics",
#'             "Medicine", "Mathematics", "Computer Science",
#'             "Computer Science", "Medicine", "Biology", "Chemistry",
#'             "Physics"),
#'   value = c(34, 51, 18, 27, 22, 30, 25, 41, 16, 12, 9, 6)
#' )
#'
#' chord_diagram(
#'   data         = coauthors,
#'   directed     = FALSE,
#'   sortGroups   = "descending",
#'   colorPalette = "Set2",
#'   ribbonOpacity = 0.7,
#'   bgcol        = "#1e1e2e",
#'   textCol      = "#f0f0f0",
#'   title        = "Joint publications between departments"
#' )
chord_diagram <- function(
    data,
    from             = "from",
    to               = "to",
    value            = "value",
    directed         = TRUE,
    colors           = NULL,
    colorPalette     = "Tableau10",
    ribbonColor      = c("source", "target", "gradient"),
    sortGroups       = c("none", "descending", "ascending"),
    padAngle         = 0.03,
    innerRadiusRatio = 0.92,
    arcOpacity       = 1,
    ribbonOpacity    = 0.6,
    fadeOpacity      = 0.1,
    strokeWidth      = 0.5,
    showLabels       = TRUE,
    rotateLabels     = FALSE,
    labelFontSize    = 11,
    labelOffset      = 10,
    valueFormat      = ",~f",
    hover            = TRUE,
    animate          = TRUE,
    title            = NULL,
    titleFontSize    = 16,
    font             = "Verdana, Geneva, Tahoma, sans-serif",
    bgcol            = "white",
    textCol          = "black",
    width            = NULL,
    height           = NULL
) {

  is_flag <- function(x) is.logical(x) && length(x) == 1 && !is.na(x)
  is_num1 <- function(x) is.numeric(x) && length(x) == 1 && !is.na(x)

  if (!is_flag(directed)) stop("'directed' must be TRUE or FALSE.")

  # Build the square flow matrix -----------------------------------------
  if (is.matrix(data)) {

    if (!is.numeric(data)) stop("The matrix 'data' must be numeric.")
    if (nrow(data) != ncol(data)) {
      stop("The matrix 'data' must be square (got ", nrow(data), " x ",
           ncol(data), ").")
    }
    if (nrow(data) == 0) stop("The matrix 'data' is empty.")

    rn <- rownames(data)
    cn <- colnames(data)
    if (is.null(rn) && is.null(cn)) {
      stop("The matrix 'data' must have row and/or column names ",
           "(the entity labels).")
    }
    if (!is.null(rn) && !is.null(cn) && !identical(rn, cn)) {
      stop("The row and column names of the matrix 'data' must be ",
           "identical (the same entities in the same order).")
    }
    entities <- if (!is.null(rn)) rn else cn
    if (anyNA(entities) || any(duplicated(entities))) {
      stop("The row/column names of the matrix 'data' must be unique and ",
           "not missing.")
    }

    m <- unname(data)
    storage.mode(m) <- "double"
    if (anyNA(m)) {
      warning("Missing values in 'data' were treated as 0.")
      m[is.na(m)] <- 0
    }
    if (any(!is.finite(m))) stop("The matrix 'data' must contain finite values.")
    if (any(m < 0)) stop("The matrix 'data' must contain non-negative values only.")

    if (!directed && !isSymmetric(m)) {
      d <- diag(m)
      m <- m + t(m)
      diag(m) <- d
    }

  } else if (is.data.frame(data)) {

    if (!is.character(from) || length(from) != 1) {
      stop("'from' must be a single column name.")
    }
    if (!is.character(to) || length(to) != 1) {
      stop("'to' must be a single column name.")
    }
    if (is.null(data[[from]])) stop("Column '", from, "' not found in data.")
    if (is.null(data[[to]]))   stop("Column '", to,   "' not found in data.")

    if (is.null(value)) {
      vals <- rep(1, nrow(data))
    } else {
      if (!is.character(value) || length(value) != 1) {
        stop("'value' must be NULL or a single column name.")
      }
      if (is.null(data[[value]])) stop("Column '", value, "' not found in data.")
      if (!is.numeric(data[[value]])) stop("Column '", value, "' must be numeric.")
      vals <- as.numeric(data[[value]])
      if (any(vals < 0, na.rm = TRUE)) {
        stop("Column '", value, "' must contain non-negative values only.")
      }
    }

    src <- data[[from]]
    tgt <- data[[to]]

    # Entity order: factor levels if both columns are factors, otherwise the
    # order of first appearance
    if (is.factor(src) && is.factor(tgt)) {
      entities <- unique(c(levels(src), levels(tgt)))
    } else {
      entities <- unique(c(as.character(src), as.character(tgt)))
    }
    entities <- entities[!is.na(entities)]

    src <- as.character(src)
    tgt <- as.character(tgt)
    keep <- !is.na(src) & !is.na(tgt) & is.finite(vals)
    if (any(!keep)) {
      warning(sum(!keep), " row(s) with missing 'from', 'to' or 'value' ",
              "were dropped.")
    }
    src  <- src[keep]
    tgt  <- tgt[keep]
    vals <- vals[keep]

    if (length(entities) == 0 || length(vals) == 0) {
      stop("'data' contains no usable flows.")
    }

    k <- length(entities)
    m <- matrix(0, nrow = k, ncol = k)
    i <- match(src, entities)
    j <- match(tgt, entities)
    for (r in seq_along(vals)) {
      m[i[r], j[r]] <- m[i[r], j[r]] + vals[r]
    }

    if (!directed) {
      d <- diag(m)
      m <- m + t(m)
      diag(m) <- d
    }

  } else {
    stop("'data' must be a data frame (edge list) or a square numeric ",
         "matrix with dimnames.")
  }

  if (sum(m) <= 0) stop("'data' must contain at least one positive flow.")

  entities <- as.character(entities)

  # Entities without any flow would only leave an empty gap on the circle
  empty <- rowSums(m) + colSums(m) == 0
  if (any(empty)) {
    message("Dropping entities with no flows: ",
            paste(entities[empty], collapse = ", "))
    entities <- entities[!empty]
    m <- m[!empty, !empty, drop = FALSE]
  }

  # Other arguments --------------------------------------------------------
  ribbonColor <- match.arg(ribbonColor)
  sortGroups  <- match.arg(sortGroups)

  if (!is_num1(padAngle) || padAngle < 0 || padAngle >= 1) {
    stop("'padAngle' must be a single number in [0, 1) (radians).")
  }
  if (!is_num1(innerRadiusRatio) || innerRadiusRatio < 0.5 ||
      innerRadiusRatio > 0.99) {
    stop("'innerRadiusRatio' must be a single number between 0.5 and 0.99.")
  }
  for (arg in c("arcOpacity", "ribbonOpacity", "fadeOpacity")) {
    v <- get(arg)
    if (!is_num1(v) || v < 0 || v > 1) {
      stop("'", arg, "' must be a single number between 0 and 1.")
    }
  }
  if (!is_num1(strokeWidth) || strokeWidth < 0) {
    stop("'strokeWidth' must be a single non-negative number.")
  }
  if (!is_num1(labelFontSize) || labelFontSize <= 0) {
    stop("'labelFontSize' must be a single positive number.")
  }
  if (!is_num1(labelOffset) || labelOffset < 0) {
    stop("'labelOffset' must be a single non-negative number.")
  }
  for (arg in c("showLabels", "rotateLabels", "hover", "animate")) {
    if (!is_flag(get(arg))) stop("'", arg, "' must be TRUE or FALSE.")
  }
  if (!is.character(valueFormat) || length(valueFormat) != 1) {
    stop("'valueFormat' must be a single d3-format string, e.g. ',.0f'.")
  }
  if (!is.character(colorPalette) || length(colorPalette) != 1) {
    stop("'colorPalette' must be a single D3 scheme name, e.g. 'Tableau10'.")
  }

  # Resolve user colors to one color per entity (NA = use the palette)
  entityColors <- NULL
  if (!is.null(colors)) {
    if (!is.character(colors) || length(colors) == 0) {
      stop("'colors' must be a character vector of colors.")
    }
    if (!is.null(names(colors)) && any(names(colors) != "")) {
      entityColors <- unname(colors[entities])
      if (all(is.na(entityColors))) {
        warning("None of the names of 'colors' match the entities; ",
                "using 'colorPalette' instead.")
      }
    } else {
      entityColors <- rep_len(colors, length(entities))
    }
    entityColors[is.na(entityColors)] <- ""
  }

  if (grepl(";", font)) {
    stop("please remove the ';' character from your font argument")
  }

  # Non-zero cells as a long edge table (0-based indices for JS)
  nz <- which(m > 0, arr.ind = TRUE)
  edges <- data.frame(
    source = nz[, 1] - 1L,
    target = nz[, 2] - 1L,
    value  = m[nz]
  )

  r2d3::r2d3(
    data   = edges,
    script = system.file("d3/scatterplot/chorddiagram.js", package = "ddplot"),
    options = list(
      names            = as.list(entities),
      directed         = directed,
      colors           = if (is.null(entityColors)) NULL else as.list(entityColors),
      colorPalette     = colorPalette,
      ribbonColor      = ribbonColor,
      sortGroups       = sortGroups,
      padAngle         = padAngle,
      innerRadiusRatio = innerRadiusRatio,
      arcOpacity       = arcOpacity,
      ribbonOpacity    = ribbonOpacity,
      fadeOpacity      = fadeOpacity,
      strokeWidth      = strokeWidth,
      showLabels       = showLabels,
      rotateLabels     = rotateLabels,
      labelFontSize    = labelFontSize,
      labelOffset      = labelOffset,
      valueFormat      = valueFormat,
      hover            = hover,
      animate          = animate,
      title            = title,
      titleFontSize    = titleFontSize,
      font             = font,
      bgcol            = bgcol,
      textCol          = textCol
    ),
    width  = width,
    height = height
  )
}
