// set the dimensions and margins of the graph
const margin = { top: 10, right: 20, bottom: 48, left: 58 },
  width = 500 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3
  .select("#viz_q1")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

//Read the data
d3.csv("data/infogram_viz1_bubble.csv").then(function (data) {
  const pad = 0.25;
  const xExtent = d3.extent(data, (d) => +d.log_files);
  const yExtent = d3.extent(data, (d) => +d.log_watch);

  const x = d3
    .scaleLinear()
    .domain([Math.max(0, xExtent[0] - pad), xExtent[1] + pad])
    .range([0, width])
    .nice();
  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  svg
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + 40)
    .attr("font-size", 12)
    .text("log(fitxers)");

  const y = d3
    .scaleLinear()
    .domain([Math.max(0, yExtent[0] - pad), yExtent[1] + pad])
    .range([height, 0])
    .nice();
  svg.append("g").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("font-size", 12)
    .text("log(watchers)");

  // Add a scale for bubble size
  const z = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => +d.size_bubble))
    .range([4, 40]);

  // Add a scale for bubble color
  const myColor = d3
    .scaleOrdinal()
    .domain([...new Set(data.map((d) => d.primary_language))])
    .range(d3.schemeSet2);

  const tooltip = d3.select("#tooltip");
  const statsBox = d3.select("#q1-stats");
  const languageSelect = d3.select("#q1-lang-filter");
  let selectedLanguage = null;

  const langClass = function (language) {
    return "lang_" + language.replace(/[^a-zA-Z0-9]/g, "_");
  };

  const regressionLine = svg
    .append("line")
    .attr("class", "regression-line")
    .attr("stroke", "#080b12")
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.85)
    .attr("pointer-events", "none")
    .attr("visibility", "hidden");

  const updateStats = function (visible) {
    if (visible.length < 2) {
      statsBox.text(
        "Selecciona un llenguatge amb prou punts per calcular la regressió.",
      );
      regressionLine.attr("visibility", "hidden");
      return;
    }
    const xs = visible.map((d) => +d.log_files);
    const ys = visible.map((d) => +d.log_watch);
    const meanX = d3.mean(xs);
    const meanY = d3.mean(ys);
    const cov = d3.sum(xs.map((x, i) => (x - meanX) * (ys[i] - meanY)));
    const varX = d3.sum(xs.map((x) => (x - meanX) ** 2));
    const varY = d3.sum(ys.map((y) => (y - meanY) ** 2));
    const r = cov / Math.sqrt(varX * varY);
    const slope = varX === 0 ? 0 : cov / varX;
    const intercept = meanY - slope * meanX;
    const [x0, x1] = x.domain();
    const y0 = intercept + slope * x0;
    const y1 = intercept + slope * x1;

    statsBox.text(
      `Pearson r = ${r.toFixed(2)} · regressió: y = ${intercept.toFixed(2)} + ${slope.toFixed(2)}·x`,
    );
    regressionLine
      .attr("visibility", "visible")
      .attr("x1", x(x0))
      .attr("y1", y(y0))
      .attr("x2", x(x1))
      .attr("y2", y(y1));
  };

  const updateChart = function () {
    const visible = data.filter(
      (d) => !selectedLanguage || d.primary_language === selectedLanguage,
    );
    svg
      .selectAll(".bubbles")
      .style("display", (d) =>
        !selectedLanguage || d.primary_language === selectedLanguage
          ? null
          : "none",
      )
      .style("opacity", (d) =>
        !selectedLanguage || d.primary_language === selectedLanguage
          ? 0.75
          : 0.15,
      )
      .attr("stroke-width", (d) =>
        d.primary_language === selectedLanguage ? 1.4 : 0.4,
      );
    updateStats(visible);
  };

  const languages = [...new Set(data.map((d) => d.primary_language))].sort();
  languageSelect
    .selectAll("option.language")
    .data(languages)
    .join("option")
    .attr("class", "language")
    .attr("value", (d) => d)
    .text((d) => d);
  languageSelect.on("change", function () {
    selectedLanguage = this.value || null;
    updateChart();
  });

  const applySelection = function () {
    svg
      .selectAll(".bubbles")
      .style("opacity", function (d) {
        return !selectedLanguage || d.primary_language === selectedLanguage
          ? 0.75
          : 0.15;
      })
      .attr("stroke-width", function (d) {
        return d.primary_language === selectedLanguage ? 1.4 : 0.4;
      });
  };

  const showTooltip = function (event, d) {
    svg.selectAll(".bubbles").style("opacity", 0.15);
    d3.select(this).style("opacity", 0.95).attr("stroke-width", 1.6);

    const watchers = Math.round(Math.expm1(+d.log_watch));
    const files = Math.round(Math.expm1(+d.log_files));

    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.repo_owner +
          "/" +
          d.repo_project +
          "</strong><br>" +
          "<br>Llenguatge principal: " +
          d.primary_language +
          "<br>Watchers: " +
          d3.format(",.0f")(watchers) +
          "<br>Fitxers: " +
          d3.format(",.0f")(files),
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

  const toggleLanguage = function (event, d) {
    selectedLanguage =
      selectedLanguage === d.primary_language ? null : d.primary_language;
    languageSelect.property("value", selectedLanguage || "");
    updateChart();
  };

  // Add dots
  svg
    .append("g")
    .selectAll("dot")
    .data(data)
    .join("circle")
    .attr("class", function (d) {
      return "bubbles " + langClass(d.primary_language);
    })
    .attr("cx", (d) => x(+d.log_files))
    .attr("cy", (d) => y(+d.log_watch))
    .attr("r", (d) => z(+d.size_bubble))
    .attr("stroke", "#080b12")
    .attr("stroke-width", 0.4)
    .attr("cursor", "pointer")
    .style("fill", (d) => myColor(d.primary_language))
    .style("opacity", 0.75)
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", toggleLanguage);

  updateChart();
});
