/***
requires:
- https://d3js.org/d3.v4.js
- profile.css
- WMSLayerTools.js
- layout.js
***/

/************ FUTURE WORK **************
code to respond to resizing to be added if time allows
https://bl.ocks.org/curran/3a68b0c81991e2e94b19

update via button - maybe update chart instead of 3 diff charts in tabs
https://bl.ocks.org/d3noob/7030f35b72de721622b8
**********/

//model of the object for storing graph info - allows for multiple lines per graph and clearing all but most recent point
/*
{
  graphName:{ //must match the variable returned from the data pull
    xAxisLabel:x axis title, //comes from profileGraphInfo
    yAxisLabel:y axis title, //comes from profileGraphInfo
    tabTitle:title for the selection tab, //comes from profileGraphInfo
    "xAxisVariable":variable from the dataset corresponding to this axis, //comes from profileGraphInfo
    "yAxisVariable":variable from the dataset corresponding to this axis, //comes from profileGraphInfo
    display: true/false, 
    default: true/false,
    divID:ID of the div that holds the graph, //comes from profileGraphInfo
    currentLineID:"latitude,longitude" of most recent click
    data:[{data from dataset, lineID:"latitude,longitude"} ]
  }
}
*/

/**
 * Object that defines graph types 
 * - the name of the graph type must match a variable from the pulled data in order to create a graph of this type
 */
var profileGraphInfo = {
  "sound_speed":{
    "xAxisLabel":"m/s",
    "yAxisLabel":"Meters Below AMSL",
    "tabTitle":"Sound Speed<br>(GDEM)",
    "chartTitle":"Sound Speed",
    "xAxisVariable":"value",
    "yAxisVariable":"depth",
    "divID":"soundSpeedChart",
    "default":true
  },
  "water_temp":{
    "xAxisLabel":"°C",
    "yAxisLabel":"Meters Below AMSL",
    "tabTitle":"Temperature<br>(GDEM)",
    "chartTitle":"Temperature",
    "xAxisVariable":"value",
    "yAxisVariable":"depth",
    "divID":"waterTempChart",
    "default":false
  },
  "salinity":{
    "xAxisLabel":"ppt",
    "yAxisLabel":"Meters Below AMSL",
    "tabTitle":"Salinity<br>(GDEM)",
    "chartTitle":"Salinity",
    "xAxisVariable":"value",
    "yAxisVariable":"depth",
    "divID":"salinityChart",
    "default":false
  }
  /* 
  //removed due to need to identify the x and y axis variable - left in because it may be of use some day if we allow users to select variables from datasets to create graphs
  //maybe  test for blank axis vars then a popup with the ability to select vars from the dataset that would set these blank vars to the users selections
  "custom":{
    "xAxisLabel":"",
    "yAxisLabel":"",
    "tabTitle":"Active Layer",    
    "chartTitle":"Active Layer",
    "xAxisVariable":"",
    "yAxisVariable":"",
    "divID":"activeLayerChart",
    "default":false
  }
  */
}; 


var graphs={};
var pointGraphics = [];
//URL required to retrieve data
var profileUrl = "./profiles/gdem.jsp?";
var NAValue = "Not Available" //value given to values that return bad/not available from the server

//controls the console.log messages
var debug = false;
  

/**
 * Sets up and loads the profile popup window.  Is called from the context menu and the onclick event in the map when profiles are already active
 * 
 * @param {mapPoint object} doMP - point to be profiled
 * @returns {undefined}
 */
function doProfile(doMP) { 
  profileActive = true;
  
  require([
    "esri/map",   
    "esri/geometry/webMercatorUtils",
    "dojo/dom", 
    "dojo/domReady!"
    ], function(
                    Map, 
                    webMercatorUtils, 
                    dom
    ){ 
      //get the global month variable from layout.js if data is loaded. use today's month if no data is loaded.
      month = updateMapTime(true);
      if (typeof month === 'undefined'){
        var today = new Date();
        var month = (today.getMonth()+1).toString();
        if (month.length < 2){
          month = "0"+month;
        }
        console.log("::WARNING:: Loaded data is not time enabled.  Defaulting to current month for profiles: "+month);
      }
      
      if(debug){console.log("mapPoint (doMP): "+doMP+"("+doMP.x+", "+doMP.y+")",doMP);}
      
      //get the <div> string for the profiles
      var proDiv = loadProfile(doMP, month, map);
      
      //profilePopup is declared and initilized in layout.js
      profilePopup.setTitle("Profiles<div onClick='closeProfilePopup()' class='closeProfile'>X</div>");
      profilePopup.setContent(proDiv);
      profilePopup.resize(475,550);
      profilePopup.show(doMP);
    }
)}

function setLoadedLayerInfo(){
  var retVal = false;
  //check for a loaded WMS layer
  if (wmsLayer !== null){
    if(debug){console.log("wmsLayer",wmsLayer);}
    //make sure the layer has time and elevation dimensions values
    if (wmsLayer.paramsOb.time !== null && wmsLayer.paramsOb.time !== "" && typeof wmsLayer.paramsOb.time !== undefined && wmsLayer.paramsOb.elevation !== null && wmsLayer.paramsOb.elevation !== "" && typeof wmsLayer.paramsOb.elevation !== undefined){
      profileGraphInfo["active_layer"]={
        "xAxisLabel":"Layer Value",
        "yAxisLabel":"Elevation/Depth",
        "tabTitle":"Active Layer<br>&nbsp;",    
        "chartTitle":"Active Layer",
        "xAxisVariable":"value",
        "yAxisVariable":"elevation",
        "divID":"activeLayerChart",
        "default":false
      }
      retVal = true;
    }
  }
  return retVal;
}

/**
 * actions to be performed when the profile infoWindow is closed by the user
 * 
 * @returns {undefined}
 */
function closeProfilePopup(){
  //close the popup and deactivate profiles
  profilePopup.hide();
  profileActive = false;
  //wipe out the graphs data. 
  graphs={}; 
  //remove the point graphics for profile points
  pointGraphics.forEach(function(d,i){
    pointGraphics[i].hide();
  });
}

/**
 * Swaps the displayed chart
 * 
 * @param {Event} evt - click event
 * @param {String} chartName - name of the chart to be displayed
 * @returns {undefined}
 */
function openChart(evt, chartName) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  // if the event is not a click event, the function was initated from loadProfile() where the active button is already set to the default chart - so don't do this or you will muck up the works of the UI and UX
  if(debug){console.log("evt",evt);}
  if (typeof evt !== 'undefined' && evt.type === 'click'){
    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    //add an "active" class to the button that opened the tab
    evt.currentTarget.className += " active";
  }
  // Show the current tab
  document.getElementById(chartName).style.display = "block";
}

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
const capitalize = function(str, lower) {
  return (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, function (match) {
    return match.toUpperCase();
  });
}

/**
 * Replaces underscores with spaces and capitalizes each word
 * @param {String} Text to be titlized
 * @returns {String}
 */
function fix_title(title){
  return capitalize(title.replace("_"," "));
}

/**
 * Writes a SVG to the graph.divID based on a JSON object representing a graph (a representation of the object can be found near the top of this script)
 * 
 * @param {json object} graph - graph to be created
 * @returns {String} - Hex color value that is used to color the point added to the map that depicts the profile's location
 */
function writeGraph(graph){
  //console.log("graph",graph);
  //clear any existing graph from previous searches
  document.getElementById(graph.divID).innerHTML =""; 
  
  // set the dimensions and margins of the graph
  var margin = {top: 30, right: 90, bottom: 50, left: 50},
    width = 430 - margin.left - margin.right,
    height = 430 - margin.top - margin.bottom;  

  // Add the SVG to the graphs div  
  // d3 is declared and initialized in the index when the d3 js file is included
  var svg = d3.select("#"+graph.divID)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");  
  
  var datasetXMin = d3.min(graph.data, function(d) { return +d[graph.xAxisVariable]; });
  var datasetXMax = d3.max(graph.data, function(d) { return +d[graph.xAxisVariable]; });
  var datasetYMin = d3.min(graph.data, function(d) { return +d[graph.yAxisVariable]; });
  var datasetYMax = d3.max(graph.data, function(d) { return +d[graph.yAxisVariable]; });
    
  // Add X axis --> 
  var x = d3.scaleLinear() //use this for d3 v4+
    .domain([datasetXMin,datasetXMax])
    .range([ 0,width ]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(7)); //use this for d3 v4+

  //Add Y axis
  var y = d3.scaleLinear() //use this for d3 v4+
    .domain([datasetYMax,datasetYMin])
    .range([ height, 0 ]);
  svg
    .append("g")
    .call(d3.axisLeft(y).ticks(20)); //use this for d3 v4+
    
  // Add the lines
  // nest() groups the data by lineID into a d3.nest object for d3 to manipulate
   var allLines = d3.nest() 
    .key(function(d) { return d.lineID;})
    .entries(graph.data);
  //console.log("allLines nest");
  //console.log(allLines);
  
  // Tooltip for points
  if (document.getElementById("profileTooltip") === null ){
    const profileTooltip = d3.select("body").append("div")
      .attr("class", "profileTooltip")
      .attr("id", "profileTooltip")
      .style("opacity", 0)
      .style("position", "absolute");
  }
  else{
    const profileTooltip = d3.select("#profileTooltip");
  }
  
  // color palette
  // reverse the array to keep the color consistent for each new click
  var res = allLines.reverse().map(function(d){ return d.key; }); // list of group names
  var color = d3.scaleOrdinal()
    .domain(res)
    .range(['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999']);
    
  // Draw the lines
  svg.selectAll(".line")
    .data(allLines) //.nest() group
    .enter()
    .append("path")
    .attr("fill", "none")
    .attr("stroke", function(d){ return color(d.key); })
    .attr("stroke-width", 1.5)
    .attr("id",  function(d){ return 'tag'+(d.key).replace(",", ''); }) // assign ID **
    .attr("d", function(d){
      return d3.line()
      .x(function(d) { return x(d[graph.xAxisVariable]); })
      .y(function(d) { return y(+d[graph.yAxisVariable]); })
      (d.values);
    });
    
  //https://jsfiddle.net/pvtuhymf/  
  allLines.forEach(function(d,i){  
    svg.selectAll(".profilePoint")
      .data(d.values)
      .enter()
      .append("circle") 
      .attr('fill', function(d){ return color(d.lineID); })
      .attr("class", "profilePoint") // Assign a class for styling 
      .attr("cx", function(d) { return x(d[graph.xAxisVariable]); })
      .attr("cy", function(d) { return y(d[graph.yAxisVariable]); })
      .attr("r", 2)
      .style("opacity", .5); //set to 0 to hide
        
    // Events
    var toolTipCircles = svg.selectAll(".toolTipCircles"+i)
      .data(d.values)
      .enter()
      .append("circle")
      .attr("class", "toolTipCircles"+i) // Assign a class for styling 
      .attr("id",  function(d){ return 'tool-cir-'+(d.lineID).replace(",", '')+"-"+d[graph.yAxisVariable]; }) // assign ID **
      .attr('fill', function(d){ return color(d.lineID); })
      .attr("cx", function(d) {return x(d[graph.xAxisVariable]); })      
      .attr("cy", function(d) {return y(d[graph.yAxisVariable]); })   
      .attr('r', 3)
      .style("opacity", .5) //set to 0 to hide;
      //assigns the listeners in an array in a property called __on
      // actions will not fire
//      .on("mouseover", function() {
//        if(debug){console.log("profileTooltip.html = "+graph.xAxisLabel+": "+d[graph.xAxisVariable]+"<br>"+graph.yAxisLabel+": "+d[graph.yAxisVariable]);}
//        
//        profileTooltip.transition()
//          .delay(30)
//          .duration(200)
//          .style("opacity", .75);
//          
//        profileTooltip.html(graph.xAxisLabel+": "+d[graph.xAxisVariable]+"<br>"+graph.yAxisLabel+": "+d[graph.yAxisVariable])
//          .style("left", (d3.event.pageX + 25) + "px")
//          .style("top", (d3.event.pageY) + "px");
//      })
//      .on("mouseout", function() {      
//        profileTooltip.transition()        
//          .duration(100)      
//          .style("opacity", 0);   
//      })
      .append("svg:title").text(function(d) {
//        console.log("d[graph.xAxisVariable]",d[graph.xAxisVariable]);
//        console.log("d",d);
//        console.log("graph.xAxisVariable",graph.xAxisVariable);
        return d[graph.xAxisVariable].toFixed(2)+graph.xAxisLabel+" at -"+d[graph.yAxisVariable]+"m";
      })
    ;
      
    // Add the Legend items
    var legendSpace = 15; // vertical spacing for legend entries
    svg.append("text")
      .attr("x", width+1+margin.right/2) // center the legend in the right margin 
      .attr("y", (1+i)*legendSpace) // each new entry moved down by legend space
      .attr("class", "profileLegend")    // style the legend
      .style("fill", function() { return d.color = color(d.key); })
      //onClick eventListener not getting into DOM - theory is/was that the elements are not really in the DOM yet, so eventlisteners cannot be added
      .on("click", function(){
        if(debug){console.log("#tag"+d.key.replace(",", '')+" clicked!");}
        // Determine if current line is visible 
        var active   = d.active ? false : true,
        newOpacity = active ? 0 : 1;
        // Hide or show the elements based on the ID
        d3.select("#tag"+d.key.replace(",", ''))
          .transition().duration(100)
          .style("opacity", newOpacity);
        // Update whether or not the elements are active
        d.active = active;
        })         
      .text(function(){
        var splits = d.key.split(",");        
        return Number.parseFloat(splits[0]).toFixed(2)+", "+Number.parseFloat(splits[1]).toFixed(2);
      });
    
    // another attempt to get the mouseover (tried mouse: over, enter, out, leave) actions to fire up the tooltip by assigning them directly to the object's property
    // still no joy 
    //console.log("i: "+i);
    //console.log("toolTipCircles['_groups'][0] before");
    //console.log(toolTipCircles["_groups"][0]);
/*    
    toolTipCircles["_groups"][0].forEach(function (item,index){
      console.log("toolTipCircles['_groups'][0]["+index+"]");  
      console.log(toolTipCircles["_groups"][0][index]);
      console.log("item = "+item);
      toolTipCircles["_groups"][0][index]
      .onmouseenter = function(d) {
        console.log("profileTooltip.html = "+graph.xAxisLabel+": "+d[graph.xAxisVariable]+"<br>"+graph.yAxisLabel+": "+d[graph.yAxisVariable]);
        
        profileTooltip.transition()
          .delay(30)
          .duration(200)
          .style("opacity", .75);
          
        profileTooltip.html(graph.xAxisLabel+": "+d[graph.xAxisVariable]+"<br>"+graph.yAxisLabel+": "+d[graph.yAxisVariable])
          .style("left", (d3.event.pageX + 25) + "px")
          .style("top", (d3.event.pageY) + "px");
      };
      toolTipCircles["_groups"][0][index]
      .onmouseleave = function(d) {      
        profileTooltip.transition()        
          .duration(100)      
          .style("opacity", 0);   
      };
    });
*/    
    //console.log("toolTipCircles['_groups'][0] after");
    //console.log(toolTipCircles["_groups"][0]);

  });

  // Add graph title
  svg
    .append("text")
    .attr("text-anchor", "start")
    .attr("y", -5)
    .attr("x", 0)
    .text(graph.chartTitle)
    .style("fill", "steelblue");
  
  // Add X axis label:
  svg.append("text")
    .attr("text-anchor", "end")
    .attr("x", width-14)
    .attr("y", (height + margin.top+6))
    .text(graph.xAxisLabel);

  // Y axis label:
  svg.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left+12)
    .attr("x", -margin.top)
    .text(graph.yAxisLabel);
    
  //Legend label:
  svg.append("text")
    //right side legend
    .attr("x", width +margin.right/2) // spacing 
    .attr("y", 0)
    .attr("class", "profileLegend")    // style the legend
    .style("fill", "steelblue")
    .text("Legend");
    
  //return the svg object for .toolTipCircles to try to add eventListeners after the fact (currently a dead avenue)
  //return svg.selectAll(".toolTipCircles");
 
  //return the color to get the color for the point dropped
  return color(graph.currentLineID);
}

/**
 * hides a div with the ID passed
 * 
 * @param {String} divID - string ID of a div
 * @returns {undefined}
 */
function hideDiv(divID){
  document.getElementById(divID).style.display = "none";
}

/**
 * Adds a tab button to the targetDivID 
 * 
 * @param {String} targetDivID - ID of the targeted div
 * @param {String} chartName - name of the chart targeted by the button
 * @param {String} buttonTitle - button text displayed
 * @param {Bool} activeButton - used to add the active class to the default chart
 * @returns {undefined}
 */
function addTabButton(targetDivID,chartName,buttonTitle,activeButton){
  var active="";
  if (activeButton){active=" active";}
  btn = '<button class="tablinks'+active+'" onclick="openChart(event, \''+chartName+'\')" style="display: block;">'+buttonTitle+'</button>';
  //if the button is already present, don't add it again (required for instances when clicking outpaces the data pull)  
  if (document.getElementById(targetDivID).innerHTML.indexOf(btn) === -1) {
    document.getElementById(targetDivID).innerHTML += btn;
  } 
}

/**
 * Creates the profile div and async updates the div upon data retrieval
 * 
 * @param {mapPoint object} lpMP - point clicked on the map
 * @param {string} file - the month of the file from which to pull data
 * @param {esri/map object} map - for the main map where point graphics will be added
 * @returns {String} - loading div that will be overwritten upon data retrieval
 */
function loadProfile(lpMP, file, map) { 
  var lat = lpMP.y.toString();
  var lon = lpMP.x.toString();
  var profileChartDivs = "";
  //div to display while waiting on an answer from the data retrieval function
  var profileChartLoadingDiv = '<div class="chartLoading" id="chartLoading" style="display:block">loading...</div>';
  //first part of the div to contain the profiles (the middle is generated according to the profileGraphInfo object)
  var profileStartDiv = '<div id="profileCharts" class="">'
    +'  <div id="profileTabContainter" class="profileTabContainter">'
    +'  </div>'
    +'  <div class="tabcontentContainer" id="tabcontentContainer">';
  //last part of the div to contain the profiles (the middle is generated according to the profileGraphInfo object)
  var profileDivClose = '  </div>'
    +'</div>';
  //use these vars to build the divs for the charts
  var profileChartDivStart = '<div class="tabcontent" id="';
  var profileChartDivClose = '"></div>';
  //div to display when there is not data at the clicked point
  var noDataProfileDiv = '<div id="profileChartsNoData">'
    +'<span class="profileTitle">No Data at this Location</span>'
    +'</div>';
  
  //initialize the noData variable that will control the display of the noDataProfileDiv div
  var noData = false;
  var defaultDivID = null;

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = async function() {
    if (this.readyState === 4 && this.status === 200) {   
  
      //set the dataID for the graphs json object
      var lineID = lat+","+lon;
      // part of the temp abandoned work to get the tool tips working
      //var theSVGs = {};
      
      //json response from the data pull request
      /**
       * The data is formatted as a json object containing datasets for each desired graph type.
       * For a graph to be made, the items in profileGraphInfo must align with variable names retrieved.
       */
      if(debug){console.log(profileFullUrl,"this.responseText",this.responseText);}
      var fullJsonObj = {};
      try {
        fullJsonObj = JSON.parse(this.responseText.replace(/'/g, '"'));
      } catch (err) {
        console.log("Cannot parse this response as JSON. Raw text: " + this.responseText);
      }
          
      //if the WMSLayer is loaded, the active_layer object is populated and the function returns true
      // if the object is populated, get the data and push it to fullJsonObject
      if (setLoadedLayerInfo()){
        
        /**
         * the 'elevation' dimension value is likey not universal and should be replaces by a dictionary of dimensions from known data sources
         * once the data source is identified, the proper dimension value can be selected and used.  this method is still limited to a series 
         * of known data sources, but is at least not limited to sources using 'elevation', such as fnmoc data
         */        
        var elevationDim = wmsLayer.getDimensionValues("elevation");
        fullJsonObj["active_layer"]=[];
        var elevations = [];
        for (e in elevationDim){
          elevations.push(Number.parseFloat(elevationDim[e]));
        }
        //sort the elevations as proper numbers instead of the js built in .sort() method
        elevations.sort(function(a, b){return a-b});
        
        //parseGetCapabilities() is in WMSLayerTools.js, XMLTags is defined there too
        var parsedGetCap = parseGetCapabilities(wmsLayer.url,XMLTags,wmsLayer.paramsOb.layers);
        
        var value = 0;
        //get a value for the first elevation to use as a default value (the first value from the elevations array is removed here)
        var url = buildValueInfoURL(wmsLayer, lpMP.x, lpMP.y, parsedGetCap.crs, parsedGetCap.bBox, Number.parseFloat(elevations[0]));
        try {
          await fetch(url, { credentials: "same-origin", mode: "cors" }).then(function (response) {
            return response.text();
          }).then(function (text) {

            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(text, "text/xml");   
            value = value_check(xmlDoc);
          });
        } 
        catch (err) {
          // When this comes up in the console, you can check the url to see what went wrong
          if(debug){
            console.log('ERROR fetching initial getFeatureInfo value:');
            console.log(err);
            console.log('url:',url);
          }      
        }
        
        for (e in elevations){          
          fullJsonObj["active_layer"].push({"variable":"active_layer", "elevation":Number.parseFloat(elevations[e]),"value":value, "lineID": lineID});
        }     
      }
      
      for (var v in fullJsonObj){
        //no data was returned (probably clicked on land)
        if (fullJsonObj[v].length === 0){ 
          noData = true;
          break;
        }
        
        //sort the data by depth
        for (var key in profileGraphInfo) {
          fullJsonObj[key].sort(function(a, b) {
            return a.depth - b.depth;
          });
        } 
        
        //default to custom graph type if the profile graph is not in the list 
        //- not developed yet, so just dump out if the data does not match expected output
        var graphInfo = {};
        if (typeof profileGraphInfo[v] === 'undefined'){
          //the ability to build profile graphs from content added via the custom content option is not yet supported
          console.log("WARNING:: Graph type '"+v+"' is undefined and cannot be produced - if this is graph for a standard profile, consider adding the graph type to the profileGraphInfo JSON object in this script.");
          //alert("Graph type '"+v+"' is undefined and cannot be produced - if this is graph for a standard profile, consider adding the graph type to the profileGraphInfo JSON object in this script.");
          break;
          //graphInfo = profileGraphInfo.custom;
        }
        else{
          graphInfo = profileGraphInfo[v];
        }
        //add a button to allow the user to display the graph
        addTabButton("profileTabContainter",graphInfo.divID,graphInfo.tabTitle,graphInfo.default);
        
        //set the default div so that it will be displayed upon loading
        if (graphInfo.default){
          defaultDivID = graphInfo.divID;
        }
        
        //assign the lineID to the new dataset
        for (var dataPoint in fullJsonObj[v]){
          fullJsonObj[v][dataPoint]["lineID"]=lineID;
        }
        
        //preserve existing data points by adding them to the json object so that they will be added to the graphs[v] object
        if (typeof graphs[v] !== 'undefined'){
          for (var dp in graphs[v].data){
            fullJsonObj[v].push(graphs[v].data[dp]);
          }
        }
        
        graphs[v]={
          "xAxisLabel":graphInfo.xAxisLabel,
          "yAxisLabel":graphInfo.yAxisLabel,
          "tabTitle":graphInfo.tabTitle,
          "chartTitle":graphInfo.chartTitle,
          "xAxisVariable":graphInfo.xAxisVariable,
          "yAxisVariable":graphInfo.yAxisVariable,
          "display":true, 
          "default":graphInfo.default,
          "divID":graphInfo.divID,
          "currentLineID":lineID,
          "data":fullJsonObj[v]
        };
        
        //add the graph's div to the parent - writeGraph() will write to this div
        document.getElementById("tabcontentContainer").innerHTML += profileChartDivStart+graphInfo.divID+profileChartDivClose;
        profileChartDivs += profileChartDivStart+v+"Chart"+profileChartDivClose;
        
        var currentColor=writeGraph(graphs[v]);
      }  
      
      //document.getElementById("chartLoading").style.display = "none";
      if (noData) {
        //display the no data message
        document.getElementById("profileCharts").innerHTML = noDataProfileDiv;
      }else if (defaultDivID){
        //remove the loading div and turn on the default chart
        document.getElementById("tabcontentContainer").innerHTML = document.getElementById("tabcontentContainer").innerHTML.replace(profileChartLoadingDiv,'');
        openChart(event, defaultDivID);
        
        //create a properly colored point graphic on the map for the newest line
        require([
          "esri/map",
          "esri/symbols/SimpleMarkerSymbol",
          "esri/symbols/SimpleLineSymbol",
          "esri/Color",
          "esri/graphic"
        ], function(Map,
          SimpleMarkerSymbol, 
          SimpleLineSymbol,
          Color,
          Graphic) {
            var symbol = new SimpleMarkerSymbol(
              SimpleMarkerSymbol.STYLE_CIRCLE, 
              8, 
              new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID, 
                currentColor, 
                1
              ),
              currentColor
            );
            var graphic = new Graphic(lpMP, symbol);          
            map.graphics.add(graphic);
            //add the object to the array for hiding when the window is closed
            pointGraphics.push(graphic);
          });
        
        //update the active layer graph if it exists
        if (typeof profileGraphInfo.active_layer !== 'undefined'){
          var goodData = true; //this var prevents looking for valid data below the lowest elevation or in expired datasets (speeds up data load)
          for (var e in elevations){
            if (goodData){
              var url = buildValueInfoURL(wmsLayer, lpMP.x, lpMP.y, parsedGetCap.crs, parsedGetCap.bBox, Number.parseFloat(elevations[e]));
              try {
                await fetch(url, { credentials: "same-origin", mode: "cors" }).then(function (response) {
                  return response.text();
                }).then(function (text) {

                  var parser = new DOMParser();
                  var xmlDoc = parser.parseFromString(text, "text/xml");              

                  value = value_check(xmlDoc);
                  if (value === NAValue){
                    goodData = false; //stop looking for valid data
                  }
                });

              }
              catch (err) {
                // When this comes up in the console, you can check the url to see what went wrong
                if(debug){
                  console.log('ERROR fetching getFeatureInfo value:');
                  console.log(err);
                  console.log('url:',url);
                }      
              }
              for (var pnt in fullJsonObj["active_layer"]){
                if (fullJsonObj["active_layer"][pnt].elevation === elevations[e] && fullJsonObj["active_layer"][pnt].lineID === lineID){
                  if(value!==NAValue){
                    fullJsonObj["active_layer"][pnt].value = value;
                  }else{
                    fullJsonObj["active_layer"].splice(pnt,1);
                    break;
                  }
                }
              }
            }else{
              for (var pnt in fullJsonObj["active_layer"]){
                if (fullJsonObj["active_layer"][pnt].elevation === elevations[e] && fullJsonObj["active_layer"][pnt].lineID === lineID){
                  fullJsonObj["active_layer"].splice(pnt,1);
                  break;
                }
              }
            }
            writeGraph(graphs["active_layer"]);
          }
        }  
        //another attempt to get the mouseover tooltips working - temp abandoned
        //console.log("theSVGs",theSVGs);
        /*
        for (v in theSVGs){
          //console.log(v+"  "+graphs[v].xAxisVariable);
          var theSVG = theSVGs[v];
          //console.log(theSVGs[v]);
          theSVG
            .on('mouseover', function(d) {
              //profileTooltip.transition()
              //  .delay(30)
              //  .duration(200)
              //  .style("opacity", .75);
              console.log("onmouseover in load profile");
              //profileTooltip.html(graphs[v].xAxisLabel+": "+d[graphs[v].xAxisVariable]+"<br>"+graphs[v].yAxisLabel+": "+d[graphs[v].yAxisVariable])
              //  .style("left", (d3.event.pageX + 25) + "px")
              //  .style("top", (d3.event.pageY) + "px")  
            })
            .on("mouseout", function(d) {      
              console.log("onmouseout in load profile");
              //profileTooltip.transition()        
              //  .duration(100)      
              //  .style("opacity", 0);   
            });        
        }
        */
        //document.getElementById("profileChartsNoData").style.display = "none";
      } 
      else {
        document.getElementById("profileCharts").innerHTML = noDataProfileDiv;
        console.log("defaultDivID not defined for the profile chart");
      }
    }
  };
  
  var profileFullUrl = profileUrl+"lat="+lat+"&long="+lon+"&file="+file;
  xhttp.open("GET", profileFullUrl, true);
  xhttp.send();
  
  //return the loading div - it will be overwritten when the data is retrived and charts built
  return profileStartDiv+profileChartLoadingDiv+profileDivClose;
}
function value_check(xmlDoc){
  var val;
  //FNMOC expires taus in the NAVGEM layer and we must account for and represent these expired values
  // this method assumes that any service exception tag means that the data has expired
  var serviceException = xmlDoc.getElementsByTagName("ServiceException");
  if (serviceException.length>0){
    if (debug){console.log("A service exception was returned.");}
    if (debug){console.log(url);}
    //if (debug){console.log(text);}
    val = NAValue;  
  }else{
    val = Number.parseFloat(xmlDoc.getElementsByTagName(wmsLayer.paramsOb.layers)[0].childNodes[0].childNodes[0].nodeValue);
   if (val === -9999) {
      // Missing temps are returned by HYCOM GLOBAL as -9999
      val = NAValue;
    }
//    else{          
//      value = value.toPrecision(valueSignificantDigits);
//    }
  }
  if(debug){console.log("value",value);}
  return val;
}