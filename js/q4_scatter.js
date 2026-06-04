const marginQ4s = { top: 10, right: 30, bottom: 48, left: 66 },
  widthQ4s = 460 - marginQ4s.left - marginQ4s.right,
  heightQ4s = 380 - marginQ4s.top - marginQ4s.bottom;

const svgQ4s = d3
  .select("#viz_q4_scatter")
  .append("svg")
  .attr("width", widthQ4s + marginQ4s.left + marginQ4s.right)
  .attr("height", heightQ4s + marginQ4s.top + marginQ4s.bottom)
  .append("g")
  .attr("transform", `translate(${marginQ4s.left}, ${marginQ4s.top})`);

d3.csv("data/infogram_viz4c_scatter_clusters.csv").then(function (data) {
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => +d.log_files))
    .range([0, widthQ4s]);
  svgQ4s
    .append("g")
    .attr("transform", `translate(0, ${heightQ4s})`)
    .call(d3.axisBottom(x));

  svgQ4s
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", widthQ4s)
    .attr("y", heightQ4s + 40)
    .attr("font-size", 12)
    .text("log(fitxers)");

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => +d.avg_path_depth))
    .range([heightQ4s, 0]);
  svgQ4s.append("g").call(d3.axisLeft(y));

  svgQ4s
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -heightQ4s / 2)
    .attr("y", -48)
    .attr("font-size", 12)
    .text("Profunditat mitjana");

  const color = d3
    .scaleOrdinal()
    .domain([
      "Repositoris petits",
      "Repositoris mitjans",
      "Repositoris profunds",
      "Repositoris grans",
    ])
    .range(["#c084fc", "#38bdf8", "#fb7185", "#34d399"]);

  const tooltip = d3.select("#tooltip");
  let selectedCluster = null;

  const clusterClass = function (cluster) {
    return "cl_" + cluster.replace(/[^a-zA-Z0-9]/g, "_");
  };

  const highlightCluster = function (cluster) {
    d3.selectAll(".dotQ4s")
      .transition()
      .duration(160)
      .style("fill", "lightgrey")
      .style("opacity", 0.22)
      .attr("r", 3);
    if (cluster) {
      d3.selectAll(".dotQ4s." + clusterClass(cluster))
        .transition()
        .duration(160)
        .style("fill", color(cluster))
        .style("opacity", 0.9)
        .attr("r", 7);
    }
  };

  const resetHighlight = function () {
    d3.selectAll(".dotQ4s")
      .transition()
      .duration(160)
      .style("fill", (d) => color(d.cluster))
      .style("opacity", 0.75)
      .attr("r", 5);
  };

  const showTooltip = function (event, d) {
    highlightCluster(d.cluster);
    d3.select(this).attr("r", 8).style("opacity", 1);
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.repo_project +
          "</strong><br>" +
          d.cluster +
          "<br>Fitxers: " +
          d3.format(",.0f")(+d.file_rows) +
          "<br>Profunditat: " +
          d3.format(".2f")(+d.avg_path_depth) +
          "<br>Watchers: " +
          d3.format(",.0f")(+d.watch_count),
      );
  };

  const moveTooltip = function (event) {
    tooltip
      .style("left", event.clientX + 14 + "px")
      .style("top", event.clientY - 24 + "px");
  };

  const doNotHighlight = function () {
    tooltip.style("opacity", 0);
    if (selectedCluster) {
      highlightCluster(selectedCluster);
    } else {
      resetHighlight();
    }
  };

  const toggleCluster = function (event, d) {
    selectedCluster = selectedCluster === d.cluster ? null : d.cluster;
    window.dispatchEvent(
      new CustomEvent("q4ClusterSelected", {
        detail: { cluster: selectedCluster },
      }),
    );
    if (selectedCluster) {
      highlightCluster(selectedCluster);
    } else {
      resetHighlight();
    }
  };

  window.addEventListener("q4ClusterSelected", function (event) {
    selectedCluster = event.detail.cluster;
    if (selectedCluster) {
      highlightCluster(selectedCluster);
    } else {
      resetHighlight();
    }
  });

  svgQ4s
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", function (d) {
      return "dotQ4s " + clusterClass(d.cluster);
    })
    .attr("cx", function (d) {
      return x(+d.log_files);
    })
    .attr("cy", function (d) {
      return y(+d.avg_path_depth);
    })
    .attr("r", 5)
    .attr("cursor", "pointer")
    .style("fill", function (d) {
      return color(d.cluster);
    })
    .style("opacity", 0.75)
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseleave", doNotHighlight)
    .on("click", toggleCluster);
});
