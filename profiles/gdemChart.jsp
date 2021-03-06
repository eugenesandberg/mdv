<!DOCTYPE html>
<meta charset="utf-8">
<html>
<head>

<!-- Load d3.js -->
<script src="https://d3js.org/d3.v5.js"></script>
<style>
.profileCharts {
  overflow: hidden;
  border: 1px solid #ccc;
  background-color: #f1f1f1;
}

/* Style the buttons that are used to open the profileCharts content */
.profileCharts button {
  background-color: inherit;
  float: left;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 14px 16px;
  transition: 0.3s;
}

/* Change background color of buttons on hover */
.profileCharts button:hover {
  background-color: #ddd;
}

/* Create an active/current tablink class */
.profileCharts button.active {
  background-color: #ccc;
}

/* Style the tab content */
.tabcontent {
  display: none;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-top: none;
}
#sound_speedChart {
  display: block;
}
</style>
</head>

<body>

<div id="demo">
<h1>Profiles!.... Get ya Profiles!!</h1>
lat <input type='text' id='lat' value = '<%=request.getParameter("lat")%>'></input>
long <input type='text' id='lon' value = '<%=request.getParameter("lon")%>'></input>
file# <input type='text' id='file' value = '<%=request.getParameter("file")%>'></input>
<button type="button" onclick="loadDoc()">Change Content</button>
</div>

<!-- Create a div where the graph will take place -->
<h1>Profiles (values at depth)</h1>
<div class="profileCharts">
  <button class="tablinks active" onclick="openChart(event, 'sound_speedChart')" style="display: block;">Sound Speed (m/s)</button>
  <button class="tablinks" onclick="openChart(event, 'salinityChart')">Salinity (ppt)</button>
  <button class="tablinks" onclick="openChart(event, 'water_tempChart')">Temperature (C&deg;)</button>
</div>
<div id="salinityChart" class="tabcontent"></div><div id="water_tempChart" class="tabcontent"></div><div id="sound_speedChart" class="tabcontent"></div>


<script>
function openChart(evt, chartName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(chartName).style.display = "block";
  evt.currentTarget.className += " active";
}
//var theData = "{'salinity': [{'variable': 'salinity', 'depth': 0.0, 'value': 35.441}, {'variable': 'salinity', 'depth': 2.0, 'value': 35.437}, {'variable': 'salinity', 'depth': 4.0, 'value': 35.433}, {'variable': 'salinity', 'depth': 6.0, 'value': 35.43}, {'variable': 'salinity', 'depth': 8.0, 'value': 35.428}, {'variable': 'salinity', 'depth': 10.0, 'value': 35.425003}, {'variable': 'salinity', 'depth': 15.0, 'value': 35.42}, {'variable': 'salinity', 'depth': 20.0, 'value': 35.415}, {'variable': 'salinity', 'depth': 25.0, 'value': 35.406}, {'variable': 'salinity', 'depth': 30.0, 'value': 35.401}, {'variable': 'salinity', 'depth': 35.0, 'value': 35.4}, {'variable': 'salinity', 'depth': 40.0, 'value': 35.404}, {'variable': 'salinity', 'depth': 45.0, 'value': 35.406}, {'variable': 'salinity', 'depth': 50.0, 'value': 35.401}, {'variable': 'salinity', 'depth': 55.0, 'value': 35.379}, {'variable': 'salinity', 'depth': 60.0, 'value': 35.333}, {'variable': 'salinity', 'depth': 65.0, 'value': 35.293}, {'variable': 'salinity', 'depth': 70.0, 'value': 35.265}, {'variable': 'salinity', 'depth': 75.0, 'value': 35.25}, {'variable': 'salinity', 'depth': 80.0, 'value': 35.261}, {'variable': 'salinity', 'depth': 85.0, 'value': 35.264}, {'variable': 'salinity', 'depth': 90.0, 'value': 35.257004}, {'variable': 'salinity', 'depth': 95.0, 'value': 35.248}, {'variable': 'salinity', 'depth': 100.0, 'value': 35.246002}, {'variable': 'salinity', 'depth': 110.0, 'value': 35.236}, {'variable': 'salinity', 'depth': 120.0, 'value': 35.225}, {'variable': 'salinity', 'depth': 130.0, 'value': 35.211}, {'variable': 'salinity', 'depth': 140.0, 'value': 35.198}, {'variable': 'salinity', 'depth': 150.0, 'value': 35.184}, {'variable': 'salinity', 'depth': 160.0, 'value': 35.165}, {'variable': 'salinity', 'depth': 170.0, 'value': 35.142}, {'variable': 'salinity', 'depth': 180.0, 'value': 35.118}, {'variable': 'salinity', 'depth': 190.0, 'value': 35.095}, {'variable': 'salinity', 'depth': 200.0, 'value': 35.079002}, {'variable': 'salinity', 'depth': 220.0, 'value': 35.054}, {'variable': 'salinity', 'depth': 240.0, 'value': 35.032}, {'variable': 'salinity', 'depth': 260.0, 'value': 35.009003}, {'variable': 'salinity', 'depth': 280.0, 'value': 34.983}, {'variable': 'salinity', 'depth': 300.0, 'value': 34.954002}, {'variable': 'salinity', 'depth': 350.0, 'value': 34.865}, {'variable': 'salinity', 'depth': 400.0, 'value': 34.784}, {'variable': 'salinity', 'depth': 500.0, 'value': 34.694}, {'variable': 'salinity', 'depth': 600.0, 'value': 34.643}, {'variable': 'salinity', 'depth': 700.0, 'value': 34.579002}, {'variable': 'salinity', 'depth': 800.0, 'value': 34.509003}, {'variable': 'salinity', 'depth': 900.0, 'value': 34.443}, {'variable': 'salinity', 'depth': 1000.0, 'value': 34.402}, {'variable': 'salinity', 'depth': 1100.0, 'value': 34.409}, {'variable': 'salinity', 'depth': 1200.0, 'value': 34.438004}, {'variable': 'salinity', 'depth': 1300.0, 'value': 34.481003}, {'variable': 'salinity', 'depth': 1400.0, 'value': 34.522003}, {'variable': 'salinity', 'depth': 1500.0, 'value': 34.564003}, {'variable': 'salinity', 'depth': 1600.0, 'value': 34.602}, {'variable': 'salinity', 'depth': 1800.0, 'value': 34.663002}, {'variable': 'salinity', 'depth': 2000.0, 'value': 34.706}, {'variable': 'salinity', 'depth': 2200.0, 'value': 34.728}, {'variable': 'salinity', 'depth': 2400.0, 'value': 34.741}, {'variable': 'salinity', 'depth': 2600.0, 'value': 34.744003}, {'variable': 'salinity', 'depth': 2800.0, 'value': 34.745003}, {'variable': 'salinity', 'depth': 3000.0, 'value': 34.744003}, {'variable': 'salinity', 'depth': 3200.0, 'value': 34.742}, {'variable': 'salinity', 'depth': 3400.0, 'value': 34.738}, {'variable': 'salinity', 'depth': 3600.0, 'value': 34.734}, {'variable': 'salinity', 'depth': 3800.0, 'value': 34.731003}, {'variable': 'salinity', 'depth': 4000.0, 'value': 34.726}, {'variable': 'salinity', 'depth': 4200.0, 'value': 34.722}, {'variable': 'salinity', 'depth': 4400.0, 'value': 34.719}, {'variable': 'salinity', 'depth': 4600.0, 'value': 34.716003}, {'variable': 'salinity', 'depth': 4800.0, 'value': 34.714}, {'variable': 'salinity', 'depth': 5000.0, 'value': 34.713}, {'variable': 'salinity', 'depth': 5200.0, 'value': 34.713}, {'variable': 'salinity', 'depth': 5400.0, 'value': 34.713}], 'water_temp': [{'variable': 'water_temp', 'depth': 0.0, 'value': 17.724}, {'variable': 'water_temp', 'depth': 2.0, 'value': 17.683}, {'variable': 'water_temp', 'depth': 4.0, 'value': 17.641}, {'variable': 'water_temp', 'depth': 6.0, 'value': 17.615}, {'variable': 'water_temp', 'depth': 8.0, 'value': 17.603}, {'variable': 'water_temp', 'depth': 10.0, 'value': 17.592}, {'variable': 'water_temp', 'depth': 15.0, 'value': 17.561}, {'variable': 'water_temp', 'depth': 20.0, 'value': 17.529}, {'variable': 'water_temp', 'depth': 25.0, 'value': 17.431}, {'variable': 'water_temp', 'depth': 30.0, 'value': 17.288}, {'variable': 'water_temp', 'depth': 35.0, 'value': 17.105}, {'variable': 'water_temp', 'depth': 40.0, 'value': 16.95}, {'variable': 'water_temp', 'depth': 45.0, 'value': 16.774}, {'variable': 'water_temp', 'depth': 50.0, 'value': 16.605}, {'variable': 'water_temp', 'depth': 55.0, 'value': 16.284}, {'variable': 'water_temp', 'depth': 60.0, 'value': 15.772}, {'variable': 'water_temp', 'depth': 65.0, 'value': 15.331}, {'variable': 'water_temp', 'depth': 70.0, 'value': 14.929}, {'variable': 'water_temp', 'depth': 75.0, 'value': 14.617}, {'variable': 'water_temp', 'depth': 80.0, 'value': 14.415}, {'variable': 'water_temp', 'depth': 85.0, 'value': 14.218}, {'variable': 'water_temp', 'depth': 90.0, 'value': 14.047}, {'variable': 'water_temp', 'depth': 95.0, 'value': 13.9}, {'variable': 'water_temp', 'depth': 100.0, 'value': 13.784}, {'variable': 'water_temp', 'depth': 110.0, 'value': 13.61}, {'variable': 'water_temp', 'depth': 120.0, 'value': 13.436}, {'variable': 'water_temp', 'depth': 130.0, 'value': 13.264}, {'variable': 'water_temp', 'depth': 140.0, 'value': 13.101}, {'variable': 'water_temp', 'depth': 150.0, 'value': 12.955999}, {'variable': 'water_temp', 'depth': 160.0, 'value': 12.815}, {'variable': 'water_temp', 'depth': 170.0, 'value': 12.667}, {'variable': 'water_temp', 'depth': 180.0, 'value': 12.517}, {'variable': 'water_temp', 'depth': 190.0, 'value': 12.378}, {'variable': 'water_temp', 'depth': 200.0, 'value': 12.24}, {'variable': 'water_temp', 'depth': 220.0, 'value': 11.964}, {'variable': 'water_temp', 'depth': 240.0, 'value': 11.694}, {'variable': 'water_temp', 'depth': 260.0, 'value': 11.432}, {'variable': 'water_temp', 'depth': 280.0, 'value': 11.173}, {'variable': 'water_temp', 'depth': 300.0, 'value': 10.896999}, {'variable': 'water_temp', 'depth': 350.0, 'value': 10.231}, {'variable': 'water_temp', 'depth': 400.0, 'value': 9.667999}, {'variable': 'water_temp', 'depth': 500.0, 'value': 9.059}, {'variable': 'water_temp', 'depth': 600.0, 'value': 8.691}, {'variable': 'water_temp', 'depth': 700.0, 'value': 8.179}, {'variable': 'water_temp', 'depth': 800.0, 'value': 7.305}, {'variable': 'water_temp', 'depth': 900.0, 'value': 6.0699997}, {'variable': 'water_temp', 'depth': 1000.0, 'value': 4.8639994}, {'variable': 'water_temp', 'depth': 1100.0, 'value': 4.0149994}, {'variable': 'water_temp', 'depth': 1200.0, 'value': 3.4659996}, {'variable': 'water_temp', 'depth': 1300.0, 'value': 3.1659994}, {'variable': 'water_temp', 'depth': 1400.0, 'value': 2.9799995}, {'variable': 'water_temp', 'depth': 1500.0, 'value': 2.8329992}, {'variable': 'water_temp', 'depth': 1600.0, 'value': 2.7269993}, {'variable': 'water_temp', 'depth': 1800.0, 'value': 2.5389996}, {'variable': 'water_temp', 'depth': 2000.0, 'value': 2.3799992}, {'variable': 'water_temp', 'depth': 2200.0, 'value': 2.2399998}, {'variable': 'water_temp', 'depth': 2400.0, 'value': 2.0979996}, {'variable': 'water_temp', 'depth': 2600.0, 'value': 1.9519997}, {'variable': 'water_temp', 'depth': 2800.0, 'value': 1.8139992}, {'variable': 'water_temp', 'depth': 3000.0, 'value': 1.6799994}, {'variable': 'water_temp', 'depth': 3200.0, 'value': 1.5509996}, {'variable': 'water_temp', 'depth': 3400.0, 'value': 1.4379997}, {'variable': 'water_temp', 'depth': 3600.0, 'value': 1.3479996}, {'variable': 'water_temp', 'depth': 3800.0, 'value': 1.2579994}, {'variable': 'water_temp', 'depth': 4000.0, 'value': 1.1629992}, {'variable': 'water_temp', 'depth': 4200.0, 'value': 1.0679989}, {'variable': 'water_temp', 'depth': 4400.0, 'value': 0.99599934}, {'variable': 'water_temp', 'depth': 4600.0, 'value': 0.94199944}, {'variable': 'water_temp', 'depth': 4800.0, 'value': 0.9069996}, {'variable': 'water_temp', 'depth': 5000.0, 'value': 0.9119997}, {'variable': 'water_temp', 'depth': 5200.0, 'value': 0.92499924}, {'variable': 'water_temp', 'depth': 5400.0, 'value': 0.9399996}], 'sound_speed': [{'variable': 'sound_speed', 'depth': 0.0, 'value': 1515.5015127357753}, {'variable': 'sound_speed', 'depth': 2.0, 'value': 1515.4092784643935}, {'variable': 'sound_speed', 'depth': 4.0, 'value': 1515.3139693862825}, {'variable': 'sound_speed', 'depth': 6.0, 'value': 1515.266709070377}, {'variable': 'sound_speed', 'depth': 8.0, 'value': 1515.2617210196406}, {'variable': 'sound_speed', 'depth': 10.0, 'value': 1515.2585068718515}, {'variable': 'sound_speed', 'depth': 15.0, 'value': 1515.243017620167}, {'variable': 'sound_speed', 'depth': 20.0, 'value': 1515.2245130483418}, {'variable': 'sound_speed', 'depth': 25.0, 'value': 1515.0064906726082}, {'variable': 'sound_speed', 'depth': 30.0, 'value': 1514.6589473225754}, {'variable': 'sound_speed', 'depth': 35.0, 'value': 1514.1952232658475}, {'variable': 'sound_speed', 'depth': 40.0, 'value': 1513.8184478243863}, {'variable': 'sound_speed', 'depth': 45.0, 'value': 1513.3742426106544}, {'variable': 'sound_speed', 'depth': 50.0, 'value': 1512.940472636114}, {'variable': 'sound_speed', 'depth': 55.0, 'value': 1512.0219986881339}, {'variable': 'sound_speed', 'depth': 60.0, 'value': 1510.4776316622883}, {'variable': 'sound_speed', 'depth': 65.0, 'value': 1509.1403496849946}, {'variable': 'sound_speed', 'depth': 70.0, 'value': 1507.9240143965155}, {'variable': 'sound_speed', 'depth': 75.0, 'value': 1506.9966828441493}, {'variable': 'sound_speed', 'depth': 80.0, 'value': 1506.4452985251346}, {'variable': 'sound_speed', 'depth': 85.0, 'value': 1505.8970440064484}, {'variable': 'sound_speed', 'depth': 90.0, 'value': 1505.4177585449843}, {'variable': 'sound_speed', 'depth': 95.0, 'value': 1505.011596930188}, {'variable': 'sound_speed', 'depth': 100.0, 'value': 1504.7131031927904}, {'variable': 'sound_speed', 'depth': 110.0, 'value': 1504.295618152115}, {'variable': 'sound_speed', 'depth': 120.0, 'value': 1503.8743057620309}, {'variable': 'sound_speed', 'depth': 130.0, 'value': 1503.4533569650791}, {'variable': 'sound_speed', 'depth': 140.0, 'value': 1503.0609147887378}, {'variable': 'sound_speed', 'depth': 150.0, 'value': 1502.724960043151}, {'variable': 'sound_speed', 'depth': 160.0, 'value': 1502.394505503925}, {'variable': 'sound_speed', 'depth': 170.0, 'value': 1502.0339205020764}, {'variable': 'sound_speed', 'depth': 180.0, 'value': 1501.66341147609}, {'variable': 'sound_speed', 'depth': 190.0, 'value': 1501.3293412507567}, {'variable': 'sound_speed', 'depth': 200.0, 'value': 1501.0054320664494}, {'variable': 'sound_speed', 'depth': 220.0, 'value': 1500.3610220207897}, {'variable': 'sound_speed', 'depth': 240.0, 'value': 1499.734168534796}, {'variable': 'sound_speed', 'depth': 260.0, 'value': 1499.127358634114}, {'variable': 'sound_speed', 'depth': 280.0, 'value': 1498.5211927046162}, {'variable': 'sound_speed', 'depth': 300.0, 'value': 1497.8454608727534}, {'variable': 'sound_speed', 'depth': 350.0, 'value': 1496.1913434569574}, {'variable': 'sound_speed', 'depth': 400.0, 'value': 1494.880978197656}, {'variable': 'sound_speed', 'depth': 500.0, 'value': 1494.1830466038182}, {'variable': 'sound_speed', 'depth': 600.0, 'value': 1494.4023114926038}, {'variable': 'sound_speed', 'depth': 700.0, 'value': 1494.0527438360932}, {'variable': 'sound_speed', 'depth': 800.0, 'value': 1492.2827806193932}, {'variable': 'sound_speed', 'depth': 900.0, 'value': 1489.0170005931338}, {'variable': 'sound_speed', 'depth': 1000.0, 'value': 1485.7556151792712}, {'variable': 'sound_speed', 'depth': 1100.0, 'value': 1483.9144527364115}, {'variable': 'sound_speed', 'depth': 1200.0, 'value': 1483.3089266638733}, {'variable': 'sound_speed', 'depth': 1300.0, 'value': 1483.760483394511}, {'variable': 'sound_speed', 'depth': 1400.0, 'value': 1484.6929906910643}, {'variable': 'sound_speed', 'depth': 1500.0, 'value': 1485.794477998468}, {'variable': 'sound_speed', 'depth': 1600.0, 'value': 1487.068665501133}, {'variable': 'sound_speed', 'depth': 1800.0, 'value': 1489.707831423488}, {'variable': 'sound_speed', 'depth': 2000.0, 'value': 1492.4589566800798}, {'variable': 'sound_speed', 'depth': 2200.0, 'value': 1495.2758113847012}, {'variable': 'sound_speed', 'depth': 2400.0, 'value': 1498.0832520647175}, {'variable': 'sound_speed', 'depth': 2600.0, 'value': 1500.8711911514695}, {'variable': 'sound_speed', 'depth': 2800.0, 'value': 1503.702771498203}, {'variable': 'sound_speed', 'depth': 3000.0, 'value': 1506.5607927128904}, {'variable': 'sound_speed', 'depth': 3200.0, 'value': 1509.4512308799408}, {'variable': 'sound_speed', 'depth': 3400.0, 'value': 1512.4216168793268}, {'variable': 'sound_speed', 'depth': 3600.0, 'value': 1515.50600505485}, {'variable': 'sound_speed', 'depth': 3800.0, 'value': 1518.6044415994052}, {'variable': 'sound_speed', 'depth': 4000.0, 'value': 1521.6909319195322}, {'variable': 'sound_speed', 'depth': 4200.0, 'value': 1524.7917088551965}, {'variable': 'sound_speed', 'depth': 4400.0, 'value': 1528.0088102342124}, {'variable': 'sound_speed', 'depth': 4600.0, 'value': 1531.3188804738068}, {'variable': 'sound_speed', 'depth': 4800.0, 'value': 1534.7275888067413}, {'variable': 'sound_speed', 'depth': 5000.0, 'value': 1538.32727333157}, {'variable': 'sound_speed', 'depth': 5200.0, 'value': 1541.9759667713663}, {'variable': 'sound_speed', 'depth': 5400.0, 'value': 1545.6456857920407}]}";
//var data = JSON.parse(theData.replace(/'/g, '"'))
/**
https://stackoverflow.com/questions/2332811/capitalize-words-in-string
 * Capitalizes first letters of words in string.
 * @param {string} str String to be modified
 * @param {boolean=false} lower Whether all other letters should be lowercased
 * @return {string}
 * @usage
 *   capitalize('fix this string');     // -> 'Fix This String'
 *   capitalize('javaSCrIPT');          // -> 'JavaSCrIPT'
 *   capitalize('javaSCrIPT', true);    // -> 'Javascript'
 */
const capitalize = (str, lower = false) =>
  (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
;
function fix_title(title){
	return capitalize(title.replace("_"," "));
}

/************
respond to resize
https://bl.ocks.org/curran/3a68b0c81991e2e94b19

update via button - maybe update chart instead of 3 diff charts in tabs
https://bl.ocks.org/d3noob/7030f35b72de721622b8
**********/

function writeGraph(data,divID){
	// set the dimensions and margins of the graph
	var margin = {top: 30, right: 0, bottom: 30, left: 50},
		width = 410 - margin.left - margin.right,
		height = 410 - margin.top - margin.bottom;

	//Read the data

	  var svg = d3.select("#"+divID)
	  .append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	  .append("g")
		.attr("transform",
			  "translate(" + margin.left + "," + margin.top + ")");	
			  
		var path = svg.selectAll("path")
		path.exit().remove()

	  // Add X axis --> it is a date format
	  var x = d3.scaleLinear()
		.domain([d3.min(data, function(d) { return +d.value; }),
	d3.max(data, function(d) { return +d.value; })]
	)
		.range([ 0,width ]);
	  svg
		.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x).ticks(7));

	  //Add Y axis
	  var y = d3.scaleLinear()
		.domain([d3.max(data, function(d) { return +d.depth; }),0])
		.range([ height, 0 ]);
	  svg.append("g")
		.call(d3.axisLeft(y).ticks(20));

	    // Add the line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
        .x(function(d) { return x(d.value) })
        .y(function(d) { return y(d.depth) })
        );


	  // Add titles
	  svg
		.append("text")
		.attr("text-anchor", "start")
		.attr("y", -5)
		.attr("x", 0)
		.text(d3.min(data, function(d) { return fix_title(d.variable); }))
		.style("fill", "steelblue")
}

</script>




<script>
function loadDoc() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      //document.getElementById("demo").innerHTML = this.responseText;
	  fullJsonObj = JSON.parse(this.responseText.replace(/'/g, '"'));
	  for (v in fullJsonObj){
		console.log(v+"Chart : "+fullJsonObj[v])
		writeGraph(fullJsonObj[v],v+"Chart");
	  }
	  
    }
  };
  var lat=document.getElementById('lat').value;
  var lon=document.getElementById('lon').value;
  var file=document.getElementById('file').value;
  var url = "http://localhost:8080/WMSMultiDimensionalEsriViewer/profiles/gdem.jsp?lat="+lat+"&long="+lon+"&file="+file;
  console.log(url);
  xhttp.open("GET", url, true);
  xhttp.send();
}
loadDoc();
</script>

</body>