const marginQ4t = { top: 10, right: 30, bottom: 38, left: 56 },
  widthQ4t = 460 - marginQ4t.left - marginQ4t.right,
  heightQ4t = 300 - marginQ4t.top - marginQ4t.bottom;

const svgQ4t = d3
  .select("#viz_q4_temporal")
  .append("svg")
  .attr("width", widthQ4t + marginQ4t.left + marginQ4t.right)
  .attr("height", heightQ4t + marginQ4t.top + marginQ4t.bottom)
  .append("g")
  .attr("transform", "translate(" + marginQ4t.left + "," + marginQ4t.top + ")");

d3.csv("data/infogram_viz4a_temporal.csv").then(function (data) {
  var subgroups = [
    "Repositoris petits_%",
    "Repositoris mitjans_%",
    "Repositoris profunds_%",
    "Repositoris grans_%",
  ];

  var groups = data.map(function (d) {
    return d.year;
  });

  var x = d3.scaleBand().domain(groups).range([0, widthQ4t]).padding([0.2]);
  svgQ4t
    .append("g")
    .attr("transform", "translate(0," + heightQ4t + ")")
    .call(d3.axisBottom(x).tickSizeOuter(0));

  var y = d3.scaleLinear().domain([0, 100]).range([heightQ4t, 0]);
  svgQ4t.append("g").call(d3.axisLeft(y));

  svgQ4t
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -heightQ4t / 2)
    .attr("y", -42)
    .attr("font-size", 12)
    .text("% de repositoris");

  var color = d3
    .scaleOrdinal()
    .domain(subgroups)
    .range(["#c084fc", "#38bdf8", "#fb7185", "#34d399"]);

  var stackedData = d3.stack().keys(subgroups)(data);

  const tooltip = d3.select("#tooltip");
  let selectedCluster = null;

  const subgroupClass = function (subgroupName) {
    return subgroupName.replace(/[^a-zA-Z0-9]/g, "_");
  };

  const clusterName = function (subgroupName) {
    return subgroupName.replace("_%", "");
  };

  const applySelection = function () {
    svgQ4t.selectAll(".myRectT").style("opacity", function () {
      const subgroupName = d3.select(this.parentNode).datum().key;
      return !selectedCluster || clusterName(subgroupName) === selectedCluster
        ? 0.85
        : 0.18;
    });
  };

  var mouseover = function (event, d) {
    var subgroupName = d3.select(this.parentNode).datum().key;
    d3.selectAll(".myRectT").style("opacity", 0.18);
    d3.selectAll("." + subgroupClass(subgroupName)).style("opacity", 0.9);
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.data.year +
          "</strong><br>" +
          clusterName(subgroupName) +
          ": " +
          d3.format(".1f")(+d.data[subgroupName]) +
          "%",
      );
  };

  var mousemove = function (event) {
    tooltip
      .style("left", event.clientX + 14 + "px")
      .style("top", event.clientY - 24 + "px");
  };

  var mouseleave = function () {
    tooltip.style("opacity", 0);
    applySelection();
  };

  var toggleCluster = function (event) {
    var subgroupName = d3.select(this.parentNode).datum().key;
    var clickedCluster = clusterName(subgroupName);
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

  svgQ4t
    .append("g")
    .selectAll("g")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("fill", function (d) {
      return color(d.key);
    })
    .attr("class", function (d) {
      return subgroupClass(d.key);
    })
    .selectAll("rect")
    .data(function (d) {
      return d;
    })
    .enter()
    .append("rect")
    .attr("class", function () {
      return "myRectT " + subgroupClass(d3.select(this.parentNode).datum().key);
    })
    .attr("x", function (d) {
      return x(d.data.year);
    })
    .attr("y", function (d) {
      return y(d[1]);
    })
    .attr("height", function (d) {
      return y(d[0]) - y(d[1]);
    })
    .attr("width", x.bandwidth())
    .attr("stroke", "grey")
    .attr("cursor", "pointer")
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)
    .on("click", toggleCluster);
});
