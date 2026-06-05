d3.csv("data/infogram_viz4b_cluster_profiles.csv").then(function (rawData) {
  const fields = [
    "median_files",
    "median_path_depth",
    "median_languages",
    "median_entropy",
  ];

  const mins = Object.fromEntries(
    fields.map((f) => [f, d3.min(rawData, (d) => +d[f])]),
  );
  const maxs = Object.fromEntries(
    fields.map((f) => [f, d3.max(rawData, (d) => +d[f])]),
  );

  const normalize = (val, f) =>
    maxs[f] === mins[f]
      ? 0
      : Math.round(((val - mins[f]) / (maxs[f] - mins[f])) * 100);

  const normalizedData = rawData.map((d) => ({
    cluster: d.cluster,
    files_norm: normalize(+d.median_files, "median_files"),
    depth_norm: normalize(+d.median_path_depth, "median_path_depth"),
    langs_norm: normalize(+d.median_languages, "median_languages"),
    entropy_norm: normalize(+d.median_entropy, "median_entropy"),
  }));

  const axes = ["files_norm", "depth_norm", "langs_norm", "entropy_norm"];
  const axisLabels = ["Fitxers", "Profunditat", "Llenguatges", "Entropia"];

  const data = normalizedData.map((d) =>
    axes.map((ax, i) => ({ axis: axisLabels[i], value: d[ax] / 100 })),
  );

  const cfg = {
    w: 180,
    h: 180,
    margin: { top: 45, right: 50, bottom: 45, left: 200 },
    levels: 4,
    maxValue: 1,
    labelFactor: 1.3,
    wrapWidth: 60,
    opacityArea: 0.35,
    dotRadius: 3,
    opacityCircles: 0.1,
    strokeWidth: 2,
    roundStrokes: false,
  };

  const allAxis = data[0].map((d) => d.axis);
  const total = allAxis.length;
  const radius = Math.min(cfg.w / 2, cfg.h / 2);
  const angleSlice = (Math.PI * 2) / total;

  const rScale = d3.scaleLinear().range([0, radius]).domain([0, cfg.maxValue]);

  d3.select("#viz_q4_profile").select("svg").remove();
  d3.select("#viz_q4_profile").select("svg").remove();
  d3.select("#viz_q4_profile").select(".radar-svg-wrap").remove(); // per si es redibuja

  const radarWrap = d3
    .select("#viz_q4_profile")
    .append("div")
    .attr("class", "radar-svg-wrap");

  const svgRadar = radarWrap
    .append("svg")
    .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
    .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
    .append("g")
    .attr(
      "transform",
      "translate(" +
        (cfg.w / 2 + cfg.margin.left) +
        "," +
        (cfg.h / 2 + cfg.margin.top) +
        ")",
    );

  const filter = svgRadar
    .append("defs")
    .append("filter")
    .attr("id", "glowRadar");
  filter
    .append("feGaussianBlur")
    .attr("stdDeviation", "2.5")
    .attr("result", "coloredBlur");
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  const axisGrid = svgRadar.append("g").attr("class", "axisWrapper");

  axisGrid
    .selectAll(".levels")
    .data(d3.range(1, cfg.levels + 1).reverse())
    .enter()
    .append("circle")
    .attr("r", function (d) {
      return (radius / cfg.levels) * d;
    })
    .style("fill", "#CDCDCD")
    .style("stroke", "#CDCDCD")
    .style("fill-opacity", cfg.opacityCircles)
    .style("filter", "url(#glowRadar)");

  const axis = axisGrid
    .selectAll(".axis")
    .data(allAxis)
    .enter()
    .append("g")
    .attr("class", "axis");

  axis
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", function (d, i) {
      return (
        rScale(cfg.maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("y2", function (d, i) {
      return (
        rScale(cfg.maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .style("stroke", "white")
    .style("stroke-width", "2px");

  axis
    .append("text")
    .style("font-size", "11px")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("x", function (d, i) {
      return (
        rScale(cfg.maxValue * cfg.labelFactor) *
        Math.cos(angleSlice * i - Math.PI / 2)
      );
    })
    .attr("y", function (d, i) {
      return (
        rScale(cfg.maxValue * cfg.labelFactor) *
        Math.sin(angleSlice * i - Math.PI / 2)
      );
    })
    .text(function (d) {
      return d;
    })
    .style("fill", "#e2e8f5");

  const radarLineGen = d3
    .lineRadial()
    .curve(d3.curveLinearClosed)
    .radius(function (d) {
      return rScale(d.value);
    })
    .angle(function (d, i) {
      return i * angleSlice;
    });

  const clusterColors = {
    "Repositoris petits": "#c084fc",
    "Repositoris mitjans": "#38bdf8",
    "Repositoris profunds": "#fb7185",
    "Repositoris grans": "#34d399",
  };
  const clusterNames = normalizedData.map((d) => d.cluster);
  const tooltip = d3.select("#tooltip");
  let selectedCluster = null;

  const applySelection = function () {
    svgRadar.selectAll(".radarWrapper").style("opacity", function (d, i) {
      return !selectedCluster || clusterNames[i] === selectedCluster ? 1 : 0.2;
    });
  };

  const showProfileTooltip = function (event, clusterIndex, point) {
    const profile = normalizedData[clusterIndex];
    const valueLine = point
      ? "<br>" + point.axis + ": " + d3.format(".0f")(point.value * 100) + "%"
      : "";
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          profile.cluster +
          "</strong>" +
          valueLine +
          "<br>Fitxers: " +
          profile.files_norm +
          "%<br>Profunditat: " +
          profile.depth_norm +
          "%<br>Llenguatges: " +
          profile.langs_norm +
          "%<br>Entropia: " +
          profile.entropy_norm +
          "%",
      );
  };

  const moveTooltip = function (event) {
    tooltip
      .style("left", event.clientX + 14 + "px")
      .style("top", event.clientY - 24 + "px");
  };

  const hideTooltip = function () {
    tooltip.style("opacity", 0);
    applySelection();
  };

  const toggleCluster = function (event, clusterIndex) {
    const clickedCluster = clusterNames[clusterIndex];
    selectedCluster =
      selectedCluster === clickedCluster ? null : clickedCluster;
    window.dispatchEvent(
      new CustomEvent("q4ClusterSelected", {
        detail: { cluster: selectedCluster },
      }),
    );
    applySelection();
  };

  window.addEventListener("q4ClusterSelected", function (event) {
    selectedCluster = event.detail.cluster;
    applySelection();
  });

  const blobWrapper = svgRadar
    .selectAll(".radarWrapper")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "radarWrapper");

  blobWrapper
    .append("path")
    .attr("class", "radarArea")
    .attr("d", function (d) {
      return radarLineGen(d);
    })
    .style("fill", function (d, i) {
      return clusterColors[clusterNames[i]];
    })
    .style("fill-opacity", cfg.opacityArea)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      const idx = data.indexOf(d);
      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", 0.1);
      d3.select(this).transition().duration(200).style("fill-opacity", 0.7);
      showProfileTooltip(event, idx);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function () {
      hideTooltip();
      d3.selectAll(".radarArea")
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.opacityArea);
    })
    .on("click", function (event, d) {
      toggleCluster(event, data.indexOf(d));
    });

  blobWrapper
    .append("path")
    .attr("class", "radarStroke")
    .attr("d", function (d) {
      return radarLineGen(d);
    })
    .style("stroke-width", cfg.strokeWidth + "px")
    .style("stroke", function (d, i) {
      return clusterColors[clusterNames[i]];
    })
    .style("fill", "none")
    .style("filter", "url(#glowRadar)");

  blobWrapper
    .selectAll(".radarCircle")
    .data(function (d) {
      return d;
    })
    .enter()
    .append("circle")
    .attr("r", cfg.dotRadius)
    .attr("cx", function (d, i) {
      return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2);
    })
    .attr("cy", function (d, i) {
      return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2);
    })
    .style("fill", function (d, i, nodes) {
      const parentIndex = d3.select(nodes[i].parentNode).datum();
      const idx = data.indexOf(parentIndex);
      return clusterColors[clusterNames[idx]];
    })
    .style("fill-opacity", 0.8)
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      const parentData = d3.select(this.parentNode).datum();
      const idx = data.indexOf(parentData);
      d3.select(this).attr("r", cfg.dotRadius + 2);
      showProfileTooltip(event, idx, d);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      d3.select(this).attr("r", cfg.dotRadius);
      hideTooltip();
    })
    .on("click", function (event) {
      const parentData = d3.select(this.parentNode).datum();
      toggleCluster(event, data.indexOf(parentData));
    });

  const tableContainer = d3
    .select("#viz_q4_profile")
    .append("div")
    .attr("id", "radar-table")
    .style("margin-top", "16px")
    .style("font-family", "var(--font-mono)")
    .style("font-size", "0.72rem")
    .style("color", "#e2e8f5")
    .style("overflow-x", "auto");

  const table = tableContainer
    .append("table")
    .style("border-collapse", "collapse")
    .style("width", "100%");

  // Capçalera
  const thead = table.append("thead");
  const headerRow = thead.append("tr");
  ["Perfil", "Fitxers", "Profunditat", "Llenguatges", "Entropia"].forEach(
    (h) => {
      headerRow
        .append("th")
        .text(h)
        .style("padding", "4px 10px")
        .style("border-bottom", "1px solid var(--border)")
        .style("text-align", h === "Perfil" ? "left" : "right")
        .style("color", "var(--muted)")
        .style("letter-spacing", "0.05em");
    },
  );

  // Files de dades
  const tbody = table.append("tbody");

  const realFields = [
    "median_files",
    "median_path_depth",
    "median_languages",
    "median_entropy",
  ];
  const fmt = [
    d3.format(".0f"),
    d3.format(".2f"),
    d3.format(".1f"),
    d3.format(".2f"),
  ];

  rawData
    .slice()
    .reverse()
    .forEach((d) => {
      const color = clusterColors[d.cluster] || "#e2e8f5";
      const tr = tbody
        .append("tr")
        .attr("class", "radar-table-row")
        .attr("data-cluster", d.cluster)
        .style("cursor", "pointer")
        .style("transition", "opacity 0.2s");

      tr.append("td")
        .text(d.cluster)
        .style("padding", "4px 10px")
        .style("border-left", "3px solid " + color)
        .style("padding-left", "8px");

      realFields.forEach((f, i) => {
        tr.append("td")
          .text(fmt[i](+d[f]))
          .style("padding", "4px 10px")
          .style("text-align", "right");
      });

      tr.on("click", function () {
        const clicked = d.cluster;
        selectedCluster = selectedCluster === clicked ? null : clicked;
        window.dispatchEvent(
          new CustomEvent("q4ClusterSelected", {
            detail: { cluster: selectedCluster },
          }),
        );
        applySelection();
        syncTableSelection();
      });
    });

  // Sincronitza la taula quan canvia la selecció
  function syncTableSelection() {
    tbody.selectAll(".radar-table-row").style("opacity", function () {
      const rowCluster = d3.select(this).attr("data-cluster");
      return !selectedCluster || rowCluster === selectedCluster ? 1 : 0.3;
    });
  }

  // Escolta canvis externs (des del scatter o temporal)
  window.addEventListener("q4ClusterSelected", function () {
    syncTableSelection();
  });
});
