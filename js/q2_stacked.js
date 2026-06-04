const marginStacked = { top: 10, right: 30, bottom: 45, left: 110 },
  widthStacked = 460 - marginStacked.left - marginStacked.right,
  heightStacked = 400 - marginStacked.top - marginStacked.bottom;

const svgStacked = d3
  .select("#viz_q2_bars")
  .append("svg")
  .attr("width", widthStacked + marginStacked.left + marginStacked.right)
  .attr("height", heightStacked + marginStacked.top + marginStacked.bottom)
  .append("g")
  .attr(
    "transform",
    "translate(" + marginStacked.left + "," + marginStacked.top + ")",
  );

d3.csv("data/infogram_viz2_diversity.csv").then(function (data) {
  data = data.filter((d) => +d.n >= 10);

  var subgroups = [
    "Single_%",
    "Low_2_%",
    "Medium_3_4_%",
    "High_5_10_%",
    "Polyglot_10plus_%",
  ];
  data.sort(function (a, b) {
    return +b.median_entropy - +a.median_entropy;
  });

  var groups = data.map(function (d) {
    return d.language;
  });

  var y = d3
    .scaleBand()
    .domain(groups)
    .range([0, heightStacked])
    .padding([0.2]);
  svgStacked.append("g").call(d3.axisLeft(y).tickSizeOuter(0));

  var x = d3.scaleLinear().domain([0, 100]).range([0, widthStacked]);
  svgStacked
    .append("g")
    .attr("transform", "translate(0," + heightStacked + ")")
    .call(d3.axisBottom(x));

  svgStacked
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", widthStacked)
    .attr("y", heightStacked + 38)
    .attr("font-size", 12)
    .text("% de repositoris");

  var color = d3
    .scaleOrdinal()
    .domain(subgroups)
    .range(["#38bdf8", "#34d399", "#c084fc", "#fb7185", "#fbbf24"]);

  var stackedData = d3.stack().keys(subgroups)(data);

  const tooltip = d3.select("#tooltip");

  var mouseover = function (event, d) {
    var subgroupName = d3.select(this.parentNode).datum().key;
    d3.selectAll(".myRect").style("opacity", 0.2);
    d3.selectAll(
      "." + subgroupName.replace(/%/g, "pct").replace(/\s/g, "_"),
    ).style("opacity", 1);
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.data.language +
          "</strong><br>" +
          subgroupName.replace(/_/g, " ") +
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

  var mouseleave = function (event, d) {
    d3.selectAll(".myRect").style("opacity", 0.8);
    tooltip.style("opacity", 0);
  };

  svgStacked
    .append("g")
    .selectAll("g")
    .data(stackedData)
    .enter()
    .append("g")
    .attr("fill", function (d) {
      return color(d.key);
    })
    .attr("class", function (d) {
      return "myRect " + d.key.replace(/%/g, "pct").replace(/\s/g, "_");
    })
    .selectAll("rect")
    .data(function (d) {
      return d;
    })
    .enter()
    .append("rect")
    .attr("y", function (d) {
      return y(d.data.language);
    })
    .attr("x", function (d) {
      return x(d[0]);
    })
    .attr("width", function (d) {
      return x(d[1]) - x(d[0]);
    })
    .attr("height", y.bandwidth())
    .attr("stroke", "grey")
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
});
