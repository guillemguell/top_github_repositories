const marginQ3s = { top: 10, right: 30, bottom: 48, left: 66 },
  widthQ3s = 460 - marginQ3s.left - marginQ3s.right,
  heightQ3s = 400 - marginQ3s.top - marginQ3s.bottom;

const svgQ3s = d3
  .select("#viz_q3_scatter")
  .append("svg")
  .attr("width", widthQ3s + marginQ3s.left + marginQ3s.right)
  .attr("height", heightQ3s + marginQ3s.top + marginQ3s.bottom)
  .append("g")
  .attr("transform", `translate(${marginQ3s.left}, ${marginQ3s.top})`);

d3.csv("data/infogram_viz1_bubble.csv").then(function (data) {
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => +d.language_entropy))
    .range([0, widthQ3s]);
  svgQ3s
    .append("g")
    .attr("transform", `translate(0, ${heightQ3s})`)
    .call(d3.axisBottom(x));

  svgQ3s
    .append("text")
    .attr("text-anchor", "end")
    .attr("x", widthQ3s)
    .attr("y", heightQ3s + 40)
    .attr("font-size", 12)
    .text("Entropia ling\u00fc\u00edstica");

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => +d.log_watch))
    .range([heightQ3s, 0]);
  svgQ3s.append("g").call(d3.axisLeft(y));

  svgQ3s
    .append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("x", -heightQ3s / 2)
    .attr("y", -48)
    .attr("font-size", 12)
    .text("log(watchers)");

  const color = d3
    .scaleOrdinal()
    .domain([...new Set(data.map((d) => d.primary_language))])
    .range(d3.schemeSet2);

  const tooltip = d3.select("#tooltip");
  let selectedLanguage = null;

  const languageSelectQ3s = d3.select("#q3s-lang-filter");
  const languages = [...new Set(data.map((d) => d.primary_language))].sort();
  languageSelectQ3s
    .selectAll("option.language")
    .data(languages)
    .join("option")
    .attr("class", "language")
    .attr("value", (d) => d)
    .text((d) => d);
  languageSelectQ3s.on("change", function () {
    selectedLanguage = this.value || null;
    if (selectedLanguage) {
      highlightLanguage(selectedLanguage);
    } else {
      resetHighlight();
    }
  });

  const langClass = function (language) {
    return "lang_" + language.replace(/[^a-zA-Z0-9]/g, "_");
  };

  const highlightLanguage = function (language) {
    d3.selectAll(".dotQ3s")
      .transition()
      .duration(160)
      .style("fill", "lightgrey")
      .style("opacity", 0.22)
      .attr("r", 3);
    if (language) {
      d3.selectAll(".dotQ3s." + langClass(language))
        .transition()
        .duration(160)
        .style("fill", color(language))
        .style("opacity", 0.9)
        .attr("r", 7);
    }
  };

  const resetHighlight = function () {
    d3.selectAll(".dotQ3s")
      .transition()
      .duration(160)
      .style("fill", (d) => color(d.primary_language))
      .style("opacity", 0.75)
      .attr("r", 5);
  };

  const showTooltip = function (event, d) {
    highlightLanguage(d.primary_language);
    d3.select(this).attr("r", 8).style("opacity", 1);
    tooltip
      .style("opacity", 1)
      .html(
        "<strong>" +
          d.repo_project +
          "</strong><br>" +
          d.primary_language +
          "<br>Entropia: " +
          d3.format(".2f")(+d.language_entropy) +
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
    if (selectedLanguage) {
      highlightLanguage(selectedLanguage);
    } else {
      resetHighlight();
    }
  };

  const toggleLanguage = function (event, d) {
    selectedLanguage =
      selectedLanguage === d.primary_language ? null : d.primary_language;
    languageSelectQ3s.property("value", selectedLanguage || ""); // ← afegeix això
    if (selectedLanguage) {
      highlightLanguage(selectedLanguage);
    } else {
      resetHighlight();
    }
  };

  window.addEventListener("q3LanguageSelected", function (event) {
    selectedLanguage = event.detail.language;
    languageSelectQ3s.property("value", selectedLanguage || "");
    if (selectedLanguage) {
      highlightLanguage(selectedLanguage);
    } else {
      resetHighlight();
    }
  });

  svgQ3s
    .append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", function (d) {
      return "dotQ3s " + langClass(d.primary_language);
    })
    .attr("cx", function (d) {
      return x(+d.language_entropy);
    })
    .attr("cy", function (d) {
      return y(+d.log_watch);
    })
    .attr("r", 5)
    .attr("cursor", "pointer")
    .style("fill", function (d) {
      return color(d.primary_language);
    })
    .style("opacity", 0.75)
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseleave", doNotHighlight)
    .on("click", toggleLanguage);
});
