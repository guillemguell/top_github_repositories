const marginLoll = {top: 10, right: 30, bottom: 45, left: 100},
    widthLoll = 460 - marginLoll.left - marginLoll.right,
    heightLoll = 400 - marginLoll.top - marginLoll.bottom;

const svgLoll = d3.select("#viz_q3_rank")
  .append("svg")
    .attr("width", widthLoll + marginLoll.left + marginLoll.right)
    .attr("height", heightLoll + marginLoll.top + marginLoll.bottom)
  .append("g")
    .attr("transform", `translate(${marginLoll.left}, ${marginLoll.top})`);

d3.csv("data/infogram_viz3_lang_rank.csv").then(function(data) {

  data.sort(function(a, b) { return +a.median_watch - +b.median_watch; });

  const y = d3.scaleBand()
    .domain(data.map(d => d.primary_language))
    .range([heightLoll, 0])
    .padding(1);
  svgLoll.append("g")
    .call(d3.axisLeft(y).tickSize(0));

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => +d.q75_watch)])
    .range([0, widthLoll]);
  svgLoll.append("g")
    .attr("transform", `translate(0, ${heightLoll})`)
    .call(d3.axisBottom(x));

  svgLoll.append("text")
    .attr("text-anchor", "end")
    .attr("x", widthLoll)
    .attr("y", heightLoll + 38)
    .attr("font-size", 12)
    .text("Watchers");

  const tooltip = d3.select("#tooltip");
  let selectedLanguage = null;

  const langClass = function(language) {
    return "lang_" + language.replace(/[^a-zA-Z0-9]/g, "_");
  };

  const applySelection = function() {
    svgLoll.selectAll(".lollipop-mark")
      .style("opacity", function(d) {
        return !selectedLanguage || d.primary_language === selectedLanguage ? 1 : 0.2;
      });
    svgLoll.selectAll(".lollipop-dot")
      .attr("r", function(d) {
        return d.primary_language === selectedLanguage ? 7 : 5;
      });
  };

  const showTooltip = function(event, d) {
    selectedLanguage = selectedLanguage || null;
    svgLoll.selectAll(".lollipop-mark").style("opacity", 0.2);
    svgLoll.selectAll("." + langClass(d.primary_language)).style("opacity", 1);
    svgLoll.selectAll(".dot_" + langClass(d.primary_language)).attr("r", 7);
    tooltip
      .style("opacity", 1)
      .html("<strong>" + d.primary_language + "</strong><br>Mediana: " +
        d3.format(",.0f")(+d.median_watch) +
        "<br>Q25-Q75: " + d3.format(",.0f")(+d.q25_watch) +
        " - " + d3.format(",.0f")(+d.q75_watch));
  };

  const moveTooltip = function(event) {
    tooltip
      .style("left", event.clientX + 14 + "px")
      .style("top", event.clientY - 24 + "px");
  };

  const hideTooltip = function() {
    tooltip.style("opacity", 0);
    svgLoll.selectAll(".lollipop-dot").attr("r", 5);
    applySelection();
  };

  const toggleLanguage = function(event, d) {
    selectedLanguage =
      selectedLanguage === d.primary_language ? null : d.primary_language;
    window.dispatchEvent(new CustomEvent("q3LanguageSelected", {
      detail: { language: selectedLanguage }
    }));
    applySelection();
  };

  svgLoll.selectAll("iqrLine")
    .data(data)
    .enter()
    .append("line")
      .attr("class", d => "lollipop-mark lollipop-line " + langClass(d.primary_language))
      .attr("x1", d => x(+d.q25_watch))
      .attr("x2", d => x(+d.q75_watch))
      .attr("y1", d => y(d.primary_language))
      .attr("y2", d => y(d.primary_language))
      .attr("stroke", "#6b7a99")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip)
      .on("click", toggleLanguage);

  svgLoll.selectAll("stemLine")
    .data(data)
    .enter()
    .append("line")
      .attr("class", d => "lollipop-mark lollipop-line " + langClass(d.primary_language))
      .attr("x1", 0)
      .attr("x2", d => x(+d.median_watch))
      .attr("y1", d => y(d.primary_language))
      .attr("y2", d => y(d.primary_language))
      .attr("stroke", "#1f2d45")
      .attr("stroke-width", 1)
      .attr("cursor", "pointer")
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip)
      .on("click", toggleLanguage);

  svgLoll.selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("class", d => "lollipop-mark lollipop-dot dot_" + langClass(d.primary_language) + " " + langClass(d.primary_language))
      .attr("cx", d => x(+d.median_watch))
      .attr("cy", d => y(d.primary_language))
      .attr("r", 5)
      .attr("cursor", "pointer")
      .style("fill", "#7dd3fc")
      .on("mouseover", showTooltip)
      .on("mousemove", moveTooltip)
      .on("mouseleave", hideTooltip)
      .on("click", toggleLanguage);
});
