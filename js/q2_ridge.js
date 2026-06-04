const marginRidge = { top: 80, right: 30, bottom: 58, left: 110 },
  widthRidge = 460 - marginRidge.left - marginRidge.right,
  heightRidge = 400 - marginRidge.top - marginRidge.bottom;

const svgRidge = d3
  .select("#viz_q2_ridge")
  .append("svg")
  .attr("width", widthRidge + marginRidge.left + marginRidge.right)
  .attr("height", heightRidge + marginRidge.top + marginRidge.bottom)
  .append("g")
  .attr(
    "transform",
    "translate(" + marginRidge.left + "," + marginRidge.top + ")",
  );

Promise.all([
  d3.csv("data/infogram_viz4c_scatter_clusters.csv"),
  d3.csv("data/infogram_viz2_diversity.csv"),
]).then(function ([data, diversity]) {
  const allowedLanguages = new Set(
    diversity.filter((d) => +d.n >= 10).map((d) => d.language),
  );

  data = data.filter(
    (d) =>
      d.primary_language &&
      Number.isFinite(+d.language_entropy) &&
      allowedLanguages.has(d.primary_language),
  );

  const stats = Array.from(
    d3.rollup(
      data,
      (v) => ({
        n: v.length,
        median: d3.median(v, (d) => +d.language_entropy),
      }),
      (d) => d.primary_language,
    ),
    ([key, value]) => ({ key, ...value }),
  )
    .filter((d) => d.n >= 10)
    .sort((a, b) => d3.descending(a.median, b.median));

  var categories = stats.map((d) => d.key);
  var medianByLanguage = new Map(stats.map((d) => [d.key, d.median]));
  var nByLanguage = new Map(stats.map((d) => [d.key, d.n]));

  var myColor = d3
    .scaleSequential()
    .domain(d3.extent(stats, (d) => d.median))
    .interpolator(d3.interpolateViridis);

  var x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => +d.language_entropy)])
    .nice()
    .range([0, widthRidge]);

  svgRidge
    .append("g")
    .attr("class", "xAxis")
    .attr("transform", "translate(0," + heightRidge + ")")
    .call(d3.axisBottom(x).ticks(5).tickSize(-heightRidge))
    .select(".domain")
    .remove();

  svgRidge
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", widthRidge)
    .attr("y", heightRidge + 44)
    .attr("font-size", 12)
    .text("Entropia ling\u00fc\u00edstica");

  svgRidge
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -heightRidge / 2)
    .attr("y", -88)
    .attr("font-size", 12)
    .text("Llenguatge principal");

  var yName = d3
    .scaleBand()
    .domain(categories)
    .range([-50, heightRidge])
    .paddingInner(0.18);

  svgRidge
    .append("g")
    .call(d3.axisLeft(yName).tickSize(0))
    .select(".domain")
    .remove();

  var kde = kernelDensityEstimatorRidge(
    kernelEpanechnikovRidge(0.12),
    x.ticks(40),
  );
  var allDensity = [];
  for (var i = 0; i < categories.length; i++) {
    var key = categories[i];
    var density = kde(
      data
        .filter((d) => d.primary_language === key)
        .map(function (d) {
          return +d.language_entropy;
        }),
    );
    allDensity.push({ key: key, density: density });
  }

  var y = d3
    .scaleLinear()
    .domain([0, d3.max(allDensity, (d) => d3.max(d.density, (p) => p[1]))])
    .range([yName.bandwidth(), 0]);

  var ridgeArea = d3
    .area()
    .curve(d3.curveBasis)
    .x(function (d) {
      return x(d[0]);
    })
    .y0(yName.bandwidth())
    .y1(function (d) {
      return y(d[1]);
    });

  const tooltip = d3.select("#tooltip");

  var mouseover = function (event, d) {
    svgRidge.selectAll(".ridge-area").attr("opacity", 0.2);
    svgRidge.selectAll(".ridge-median").attr("opacity", 0.3);
    d3.select(this).attr("opacity", 0.95).attr("stroke-width", 1.2);
    svgRidge
      .selectAll(".ridge-median")
      .filter((m) => m.key === d.key)
      .attr("opacity", 1);
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.key +
          "</strong><br>Mediana: " +
          d3.format(".2f")(medianByLanguage.get(d.key)) +
          "<br>Repositoris: " +
          nByLanguage.get(d.key),
      );
  };

  var mousemove = function (event) {
    tooltip
      .style("left", event.clientX + 14 + "px")
      .style("top", event.clientY - 24 + "px");
  };

  var mouseleave = function () {
    svgRidge
      .selectAll(".ridge-area")
      .attr("opacity", 0.72)
      .attr("stroke-width", 0.4);
    svgRidge.selectAll(".ridge-median").attr("opacity", 1);
    tooltip.style("opacity", 0);
  };

  svgRidge
    .selectAll(".ridge-area")
    .data(allDensity)
    .enter()
    .append("path")
    .attr("class", "ridge-area")
    .attr("transform", function (d) {
      return "translate(0," + yName(d.key) + ")";
    })
    .attr("fill", function (d) {
      return myColor(medianByLanguage.get(d.key));
    })
    .attr("opacity", 0.72)
    .attr("stroke", "#e2e8f5")
    .attr("stroke-width", 0.4)
    .attr("cursor", "pointer")
    .attr("d", function (d) {
      return ridgeArea(d.density);
    })
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  svgRidge
    .selectAll(".ridge-median")
    .data(stats)
    .enter()
    .append("circle")
    .attr("class", "ridge-median")
    .attr("cx", (d) => x(d.median))
    .attr("cy", (d) => yName(d.key) + yName.bandwidth() * 0.72)
    .attr("r", 3.5)
    .attr("fill", "#fff")
    .attr("stroke", "#080b12")
    .attr("stroke-width", 1)
    .attr("cursor", "pointer")
    .on("mouseover", function (event, d) {
      var area = svgRidge
        .selectAll(".ridge-area")
        .filter((a) => a.key === d.key)
        .node();
      mouseover.call(area, event, d);
    })
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
});

function kernelDensityEstimatorRidge(kernel, X) {
  return function (V) {
    return X.map(function (x) {
      return [
        x,
        d3.mean(V, function (v) {
          return kernel(x - v);
        }),
      ];
    });
  };
}
function kernelEpanechnikovRidge(k) {
  return function (v) {
    return Math.abs((v /= k)) <= 1 ? (0.75 * (1 - v * v)) / k : 0;
  };
}
