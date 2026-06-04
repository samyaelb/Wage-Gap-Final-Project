// tooltip functions

const tooltip = d3.select("#tooltip");

function money(n) {
  return `$${d3.format(",")(n)}`;
}

function showTip(event, html) {
  tooltip
    .html(html)
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`)
    .style("opacity", 1)
    .attr("aria-hidden", "false");
}

function hideTip() {
  tooltip.style("opacity", 0).attr("aria-hidden", "true");
}

// education earnings chart

function drawEducationChart(data) {
  const width = 1080;
  const height = 640;
  const margin = { top: 112, right: 310, bottom: 74, left: 210 };

  const svg = d3.select("#educationChart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", "Slope chart comparing 2014 and 2024 median weekly earnings by educational attainment and sex.");

// chart title and subtitle

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", 28)
    .attr("y", 34)
    .text("Median weekly earnings by education, 2014 to 2024");

  svg.append("text")
    .attr("class", "chart-subtitle")
    .attr("x", 28)
    .attr("y", 58)
    .text("Full-time wage and salary workers age 25+, current dollars");

  const years = [2014, 2024];

  const x = d3.scalePoint()
    .domain(years)
    .range([margin.left, width - margin.right])
    .padding(0.45);

  const y = d3.scaleLinear()
    .domain([350, 2000])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y)
      .tickSize(-(width - margin.left - margin.right))
      .tickFormat(""));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(7).tickFormat(d => `$${d3.format(",")(d)}`));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.selectAll(".domain").remove();

  years.forEach(year => {
    svg.append("text")
      .attr("class", "year-label")
      .attr("x", x(year))
      .attr("y", height - margin.bottom + 42)
      .attr("text-anchor", "middle")
      .text(year);
  });

// lines

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.earnings));

  const groups = data.map(d => ({
    ...d,
    values: [
      { year: 2014, earnings: d.earnings_2014 },
      { year: 2024, earnings: d.earnings_2024 }
    ]
  }));

  svg.selectAll(".earnings-line")
    .data(groups)
    .join("path")
    .attr("class", d => `earnings-line line-${d.sex.toLowerCase()}`)
    .attr("d", d => line(d.values))
    .attr("fill", "none")
    .attr("stroke-width", 3)
    .attr("opacity", 0.82);

  svg.selectAll(".point")
    .data(groups.flatMap(d => d.values.map(v => ({...v, parent: d}))))
    .join("circle")
    .attr("class", d => `point point-${d.parent.sex.toLowerCase()}`)
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.earnings))
    .attr("r", 6)
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      showTip(event, `<strong>${d.parent.education}</strong><br>${d.parent.sex}, ${d.year}: ${money(d.earnings)} weekly<br>2014 to 2024 change: +${money(d.parent.change_dollars)} (${d.parent.change_percent.toFixed(1)}%)`);
    })
    .on("mouseleave", hideTip);

  // Right-side labels are automatically spaced so close values like Women $805 and Men $788 do not overlap.
  const rightLabels = groups.map(d => ({
    ...d,
    actualY: y(d.earnings_2024),
    adjustedY: y(d.earnings_2024)
  })).sort((a, b) => a.actualY - b.actualY);

  const minGap = 25;
  const topBound = margin.top + 26;
  const bottomBound = height - margin.bottom - 8;

  rightLabels[0].adjustedY = Math.max(topBound, rightLabels[0].actualY);
  for (let i = 1; i < rightLabels.length; i++) {
    rightLabels[i].adjustedY = Math.max(rightLabels[i].actualY, rightLabels[i - 1].adjustedY + minGap);
  }
  for (let i = rightLabels.length - 1; i >= 0; i--) {
    if (rightLabels[i].adjustedY > bottomBound) {
      rightLabels[i].adjustedY = bottomBound;
    }
    if (i > 0 && rightLabels[i - 1].adjustedY > rightLabels[i].adjustedY - minGap) {
      rightLabels[i - 1].adjustedY = rightLabels[i].adjustedY - minGap;
    }
  }

  svg.selectAll(".label-connector")
    .data(rightLabels)
    .join("line")
    .attr("class", "label-connector")
    .attr("x1", x(2024) + 8)
    .attr("x2", x(2024) + 22)
    .attr("y1", d => d.actualY)
    .attr("y2", d => d.adjustedY)
    .attr("stroke-width", 1.2);

  svg.selectAll(".end-label")
    .data(rightLabels)
    .join("text")
    .attr("class", "value-label")
    .attr("x", x(2024) + 30)
    .attr("y", d => d.adjustedY + 4)
    .text(d => `${d.sex}: ${money(d.earnings_2024)} — ${d.education}`);

  svg.selectAll(".start-label")
    .data(groups)
    .join("text")
    .attr("class", "value-label")
    .attr("x", x(2014) - 12)
    .attr("y", d => y(d.earnings_2014) + 4)
    .attr("text-anchor", "end")
    .text(d => money(d.earnings_2014));

// legend

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right - 25},82)`);

  const legendData = [{sex: "Women", cls: "women"}, {sex: "Men", cls: "men"}];

  legendData.forEach((item, i) => {
    const g = legend.append("g").attr("transform", `translate(${i * 105},0)`);
    g.append("line")
      .attr("x1", 0).attr("x2", 26).attr("y1", 0).attr("y2", 0)
      .attr("class", `line-${item.cls}`)
      .attr("stroke-width", 4);
    g.append("circle")
      .attr("cx", 13).attr("cy", 0).attr("r", 5)
      .attr("class", `point-${item.cls}`)
      .attr("stroke", "white").attr("stroke-width", 1.5);
    g.append("text")
      .attr("x", 34).attr("y", 4)
      .text(item.sex);
  });

  svg.append("text")
    .attr("class", "note")
    .attr("x", margin.left)
    .attr("y", height - 18)
    .text("Source: U.S. Bureau of Labor Statistics, Current Population Survey. Earnings are median usual weekly earnings in current dollars.");
}

// load education data

d3.csv("education_earnings_2014_2024.csv", d3.autoType).then(drawEducationChart);

// employment chart

function drawEmploymentChart(data) {

  const width = 1080;
  const height = 620;

  const margin = {
  top: 140,
  right: 120,
  bottom: 80,
  left: 80
  };

  const svg = d3.select("#employmentChart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

// chart title and subtitle

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", 28)
    .attr("y", 40)
    .text("Employment rate by gender, 2014 to 2024");

  svg.append("text")
    .attr("class", "chart-subtitle")
    .attr("x", 28)
    .attr("y", 72)
    .text(
      "Employment status of the civilian noninstitutional population 16 years and over");

  svg.append("text")
    .attr("class", "note")
    .attr("x", margin.left)
    .attr("y", height - 20)
    .text(
      "Source: U.S. Bureau of Labor Statistics, Current Population Survey. Percent of civilian labor force employed.");

  const x = d3.scaleLinear()
    .domain([2014, 2024])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(data, d => Math.min(d.men, d.women)) - 2,
      d3.max(data, d => Math.max(d.men, d.women)) + 2
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "emp-grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat("")
    );

  svg.append("g")
    .attr("class", "emp-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickValues([2014, 2016, 2018, 2020, 2022, 2024])
        .tickFormat(d3.format("d"))
    );

  svg.append("g")
    .attr("class", "emp-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

// lines

  const menLine = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.men));

  const womenLine = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.women));

  const menPath = svg.append("path")
    .attr("class", "emp-men-line");

  const womenPath = svg.append("path")
    .attr("class", "emp-women-line");

  const menLabel = svg.append("text")
    .attr("class", "emp-label emp-men-label");

  const womenLabel = svg.append("text")
    .attr("class", "emp-label emp-women-label");

  function updateChart(year) {

    const filtered =
      data.filter(d => d.year <= year);

    menPath
      .datum(filtered)
      .attr("d", menLine);

    womenPath
      .datum(filtered)
      .attr("d", womenLine);

    const menDots = svg.selectAll(".emp-men-dot")
      .data(filtered);

    menDots.join("circle")
      .attr("class", "emp-men-dot")
      .attr("r", 5)
      .attr("fill", "var(--men)")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.men))
      .on("mousemove", (event, d) => {
        showTip(
          event,
          `<strong>Men</strong><br>${d.year}: ${d.men}%`
        );
      })
      .on("mouseleave", hideTip);

    const womenDots = svg.selectAll(".emp-women-dot")
      .data(filtered);

    womenDots.join("circle")
      .attr("class", "emp-women-dot")
      .attr("r", 5)
      .attr("fill", "var(--women)")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.women))
      .on("mousemove", (event, d) => {
        showTip(
          event,
          `<strong>Women</strong><br>${d.year}: ${d.women}%`
        );
      })
      .on("mouseleave", hideTip);

    const last = filtered[filtered.length - 1];

    menLabel
      .attr("x", x(last.year) + 10)
      .attr("y", y(last.men) + 4)
      .text("Men");

    womenLabel
      .attr("x", x(last.year) + 10)
      .attr("y", y(last.women) + 4)
      .text("Women");
  }

// slider update function

  updateChart(2014);

  d3.select("#yearSlider")
    .on("input", function () {

      const year = +this.value;

      d3.select("#yearLabel")
        .text(year);

      updateChart(year);
    });
}

// load employment data

d3.csv("employmentrate.csv", d3.autoType)
  .then(drawEmploymentChart);

// wage chart

d3.csv("Wagedata.csv").then(data => {

  data.forEach(d => {
    d.Year = +d.Year;
    d.Hrwage = +d.Hrwage;
    d.Race = d.Race.trim();
  });

  let currentSex = "Women";

  const wageWidth = 1080;
  const wageHeight = 620;
  const wageMargin = 80;

// color

  const colorScale = d3.scaleOrdinal()
    .domain([
      "Asian",
      "White",
      "Total",
      "Black or African American",
      "Hispanic or Latino ethnicity"
    ])
    .range([
      "#ff2222",
      "#e17948",
      "#ffc000",
      "#00b017",
      "#0004ff"
    ]);

// svg and titles

  const svg = d3.select("#wageChart")
    .append("svg")
    .attr("viewBox", `0 0 ${wageWidth} ${wageHeight}`);

  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", 28)
    .attr("y", 40)
    .text("Average hourly wage by race and gender, 2014 to 2024");

  svg.append("text")
    .attr("class", "chart-subtitle")
    .attr("x", 28)
    .attr("y", 72)
    .text("Average hourly earnings of employed wage and salary workers");

  const xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Year))
    .range([wageMargin, wageWidth - 140]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Hrwage)])
    .nice()
    .range([wageHeight - wageMargin, 120]);

  svg.append("g")
    .attr("class", "emp-grid")
    .attr("transform", `translate(${wageMargin},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickSize(-(wageWidth - wageMargin - 140))
        .tickFormat("")
    );

  svg.append("g")
    .attr("class", "emp-axis")
    .attr("transform", `translate(0,${wageHeight - wageMargin})`)
    .call(
      d3.axisBottom(xScale)
        .tickValues(d3.range(2014, 2025))
        .tickFormat(d3.format("d"))
    );

  svg.append("g")
    .attr("class", "emp-axis")
    .attr("transform", `translate(${wageMargin},0)`)
    .call(d3.axisLeft(yScale));

  // lines

  const line = d3.line()
    .x(d => xScale(d.Year))
    .y(d => yScale(d.Hrwage));

  function addLegend() {

    const races = [
      "Asian",
      "White",
      "Total",
      "Black or African American",
      "Hispanic or Latino ethnicity"
    ];

    const legend = d3.select("#legend");
    legend.html("");

    races.forEach(race => {

      const row = legend.append("div")
        .attr("class", "legend-item");

      row.append("div")
        .attr("class", "legend-boxcolor")
        .style("background-color", colorScale(race));

      row.append("span")
        .text(race);
    });
  }

  // draw charts

  function drawWageChart(selectedSex) {

    svg.selectAll(".raceLine").remove();
    svg.selectAll(".raceCircle").remove();

    const filtered = data.filter(d => d.Sex === selectedSex);

    const raceGroup = d3.group(filtered, d => d.Race);

    raceGroup.forEach((values, race) => {

      values.sort((a, b) => a.Year - b.Year);

      svg.append("path")
        .datum(values)
        .attr("class", "raceLine")
        .attr("fill", "none")
        .attr("stroke", colorScale(race))
        .attr("stroke-width", 3)
        .attr("d", line);

      svg.selectAll(`.circle-${race}`)
        .data(values)
        .enter()
        .append("circle")
        .attr("class", "raceCircle")
        .attr("cx", d => xScale(d.Year))
        .attr("cy", d => yScale(d.Hrwage))
        .attr("r", 5)
        .attr("fill", colorScale(race))
        .on("mousemove", (event, d) => {
          showTip(
            event,
            `<strong>${d.Race}</strong><br>
             ${d.Sex}<br>
             ${d.Year}: $${d.Hrwage.toFixed(2)}`
          );
        })
        .on("mouseleave", hideTip);
    });
  }

  drawWageChart(currentSex);
  addLegend();

 // gender buttons

  d3.select("#womenBtn")
    .on("click", () => drawWageChart("Women"));

  d3.select("#menBtn")
    .on("click", () => drawWageChart("Men"));
});

