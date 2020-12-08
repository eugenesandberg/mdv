/**
 * 
 * requires - layout.js
 * 
 */

/* Adapted from https://codyhouse.co/gem/css-slide-in-panel */

/////////////////////// GLOBALS ///////////////////////

var pForecast = {
  
  "waterTemp":{
    "scale":{"F":"Fahrenheit","C":"Celsius","K":"Kelvin"},
    "scaleDefault":"K",
    "scaleCurrent":"K",
    "scaleValues":{"F":[],"C":[],"K":[]},
    "scaleDispPrec":"1",
    "label":"HYCOM Water Temperature",
    "layer":"global_2880x1441.sea_temp.dpth_sfc",
    "service":"HYCOM_GLOBAL",
    "localLayerName":"waterTemp",
    "dimensions":{
      "columns":{
        "values":[],
        "serverValues":[],
        "tableValues":[],
        "units":"",
        "conversion":"eliminateExtraTimes",
        "reverseConversion":"none",
        "invert":false,
        "label":"time",
        "xmlDimType":"time",
        "dispPrec":"",
        "replaceVals":[":","%3A"]
      },
      "rows":{
        "values":[],
        "serverValues":[],
        "tableValues":[],
        "units":"",
        "conversion":"none",
        "reverseConversion":"none",
        "invert":false,
        "label":"depth",
        "xmlDimType":"elevation",
        "dispPrec":"0",
        "replaceVals":["",""]
      }
    },
    "daysInData":[],
    "getCapabilitiesUrl":"https://portal.fnmoc.navy.mil/geoserver/HYCOM_GLOBAL/wms",
    "featureInfoUrl":"https://portal.fnmoc.navy.mil/geoserver/HYCOM_GLOBAL/ows",
    "featureInfoUrlLayers":"&LAYERS=HYCOM_GLOBAL:global_2880x1441.sea_temp.dpth_sfc&QUERY_LAYERS=HYCOM_GLOBAL:global_2880x1441.sea_temp.dpth_sfc",
    "featureInfoUrlParams":"&CRS=EPSG:4326&STYLES=&EXCEPTIONS=XML&FORMAT=image/png&INFO_FORMAT=text/xml&FEATURE_COUNT=50",
    "getCapMinY":"-90.0",
    "getCapMinX":"-180.0",
    "getCapMaxY":"90.0",
    "getCapMaxX":"180.0",
    "getCapWidth":"2880",
    "getCapHeight":"1441",
    "xmlTagName":"HYCOM_GLOBAL:value",
    "default":true,
    "getCapResults":"",
    "chopColStop":0,
    "chopRowStart":0
  }
  
  ,
  
  "airTemp":{
    "scale":{"F":"Fahrenheit","C":"Celsius","K":"Kelvin"},
    "scaleDefault":"K",
    "scaleCurrent":"K",
    "scaleValues":{"F":[],"C":[],"K":[]},
    "scaleDispPrec":"1",
    "label":"NAVGEM Air Temperature",
    "layer":"global_1440x721.air_temp.isbr_lvl",
    "service":"NAVGEM",
    "localLayerName":"airTemp",
    "dimensions":{
      "columns":{
        "values":[],
        "serverValues":[],
        "tableValues":[],
        "units":"",
        "conversion":"eliminateExtraTimes",
        "reverseConversion":"none",
        "invert":false,
        "label":"time",
        "xmlDimType":"time",
        "dispPrec":"",
        "replaceVals":[":","%3A"]
      },
      "rows":{
        "values":[],
        "serverValues":[],
        "tableValues":[],
        "units":"",
        "conversion":"metersFromMillibars",
        "reverseConversion":"millibarsFromMeters",
        "invert":true,
        "label":"altitude",
        "xmlDimType":"elevation",
        "dispPrec":"0",
        "replaceVals":["",""]
      }
    },
    "daysInData":[],
    "getCapabilitiesUrl":"https://portal.fnmoc.navy.mil/geoserver/NAVGEM/wms",
    "featureInfoUrl":"https://portal.fnmoc.navy.mil/geoserver/NAVGEM/ows",
    "featureInfoUrlLayers":"&LAYERS=NAVGEM:global_1440x721.air_temp.isbr_lvl&QUERY_LAYERS=NAVGEM:global_1440x721.air_temp.isbr_lvl",
    "featureInfoUrlParams":"&CRS=EPSG:4326&STYLES=&EXCEPTIONS=XML&FORMAT=image/png&INFO_FORMAT=text/xml&FEATURE_COUNT=50",
    "getCapMinY":"-90.0",
    "getCapMinX":"-180.0",
    "getCapMaxY":"90.0",
    "getCapMaxX":"180.0",
    "getCapWidth":"1440",
    "getCapHeight":"721",
    "xmlTagName":"NAVGEM:value",
    "default":false,
    "getCapResults":"",
    "chopColStop":0,
    "chopRowStart":0
  }
  
};

//controls the console.log messages
var debug = false;

// Longitude and latitude from the map
var mapX;
var mapY;

// Used for skipping rows and columns where data is not available, preventing unnecessary identify feature calls
var skipRows = {};
var skipCols = {};

//used to track the number of returns from getFeatureInfo()
var getFeatInfoCounter = 0;

/**
 * 
 * @param {mapPoint object} mp - point to use for forecasting
 * @returns {undefined}
 */
function openPointForecast(mp) {
  getFeatInfoCounter = 0;  
  if (debug){console.log("STARTING openPointForecast");}
  //turn on the global var
  forecastActive = true; 
  
  mapX = mp.x;
  mapY = mp.y;
  tabsDiv = document.getElementById("pf-tabs");
  panelContentDiv = document.getElementById("panel-content");
  latlongDiv = document.getElementById("pf-latlong");
  if(debug){console.log("looping through pForecast from openPointForecast at "+mp);}
  for (var pfLayer in pForecast){
    if(debug){console.log("pfLayer: "+pfLayer);}
    
    //initilize / clear the skip rows/cols
    skipRows[pfLayer]=[];
    skipCols[pfLayer]=[];
    //initilize table chop variables
    pForecast[pfLayer].chopRowStart = 0;
    pForecast[pfLayer].chopColStop = 0;
        
    //set up the variables activate the tab and show the buttons for the default layer
    var active="";
    var show="";
    if (pForecast[pfLayer].default){
      active = " active";
      show = " show";
    }    
    
    //add the tab button if it does not already exist
    if (!tabsDiv.innerHTML.includes(pForecast[pfLayer].label)){
      var tabButton = "<div class='pf-tab-btn"+active+"' onclick='switchForecast(event, \""+pfLayer+"\")' >"+pForecast[pfLayer].label+"</div>";
      tabsDiv.innerHTML = tabsDiv.innerHTML+tabButton;
    }
    
    // create a buttons div to hold the buttons for the layer
    var divId = "pf-buttons-"+pfLayer;
    if (document.getElementById(divId) === null){
      buttonsDiv = document.createElement("div");
      buttonsDiv.id = divId;
      addClass(buttonsDiv, "pf-buttons");
      if (show !== ""){
        addClass(buttonsDiv, show.trim());
      } 
      latlongDiv.parentElement.insertBefore(buttonsDiv, latlongDiv.nextSibling);
      
      //add the standard start and next day buttons
      if (!buttonsDiv.innerHTML.includes("Start New")){  
        var startNewButton = "<div id='"+pfLayer+"-startNew-btn' class='pf-btn' onclick='updateTable(\""+pfLayer+"\",false)'>Start New</div>";
        buttonsDiv.innerHTML=buttonsDiv.innerHTML+startNewButton;
      }
      if (!buttonsDiv.innerHTML.includes("Next Day")){  
        var nextDayButton = "<div id='"+pfLayer+"-nextDay-btn' class='pf-btn disabled'>Next Day</div>";
        buttonsDiv.innerHTML=buttonsDiv.innerHTML+nextDayButton;
      }
      //add buttons based on values in the 'scale' object
      for (var theScale in pForecast[pfLayer].scale){
        if (!buttonsDiv.innerHTML.includes(pfLayer+"-"+theScale+"-btn")){        
          var newButton = "<div id='"+pfLayer+"-"+theScale+"-btn' class='pf-btn' onClick='swapData(\""+pfLayer+"\",\""+theScale+"\")'>"+pForecast[pfLayer].scale[theScale]+"</div>";
          buttonsDiv.innerHTML=buttonsDiv.innerHTML+newButton;
        }
      }
    }else{
      //disable the next day button
      var nextDayBtn = document.getElementById(pfLayer+"-nextDay-btn");
      addClass(nextDayBtn,'disabled');
      nextDayBtn.onclick = function(){};
    }
    showTable(pfLayer);
  }
  
  var panelDiv = document.getElementById("pf-panel");
  addClass(panelDiv, 'pf-panel--is-visible');
  panelDiv.addEventListener('click', function (event) {
    if (hasClass(event.target, 'js-pf-close')) {
      event.preventDefault();
      removeClass(panelDiv, 'pf-panel--is-visible');
      forecastActive = false; //turn off the global var
    }
  });
  
  //moved from the original on click event
  if (debug){console.log("mapY: " + mapY+"mapX: "+mapX);}
  var latlonText = "  Lat, Long: " + mp.y.toFixed(2)  + ", " + mp.x.toFixed(2);
  latlongDiv.innerHTML = latlonText;
};

/************************* 
functions to handle class manipulations - needed if classList is not supported
-https://jaketrent.com/post/addremove-classes-raw-javascript/
*************************/
/**
 * 
 * @param {DOM element} el - targeted element
 * @param {String} className - classname to add or remove
 * @returns {undefined/Boolean} - hasClass() returns results of class name search
 */
function hasClass(el, className) {
  if (el.classList) return el.classList.contains(className);
  else return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
}
function addClass(el, className) {
  if (el.classList) el.classList.add(className);
  else if (!hasClass(el, className)) el.className += " " + className;
}
function removeClass(el, className) {
  if (el.classList) el.classList.remove(className);
  else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
    el.className = el.className.replace(reg, ' ');
  }
}

/**
 * Switches the visibility for forecast tables and button groups when a .pf-tab-btn is clicked 
 * 
 * @param {Event} evt - onClick event from button click
 * @param {String} newForecast - forecast divs/tables to show
 * @returns {undefined}
 */
function switchForecast(evt,newForecast){
  // Get all elements with class="pf-dvTable" and hide them
  var tabcontent = document.getElementsByClassName("pf-dvTable");
  for (i = 0; i < tabcontent.length; i++) {
    removeClass(tabcontent[i],"show");
  }
  
  //turn off all of the scale buttons
  var buttonDivs = document.getElementsByClassName("pf-buttons");
  for (i = 0; i < buttonDivs.length; i++) {
    removeClass(buttonDivs[i],"show");
  }

  // if the event is not a click event, the function was initated from loadProfile() where the active button is already set to the default chart - so don't do this or you will muck up the works of the UI and UX
  if (evt.type === 'click'){
    // Get all elements with class="tablinks" and remove the class "active"
    tabBtns = document.getElementsByClassName("pf-tab-btn");
    for (i = 0; i < tabBtns.length; i++) {
      tabcontent[i];
      removeClass(tabBtns[i],"active");
    }
  }

  // Show the appropriate table and buttons, and add an "active" class to the button that opened the tab
  addClass(document.getElementById("pf-dvTable-"+newForecast),"show");
  addClass(document.getElementById("pf-buttons-"+newForecast),"show");
  evt.currentTarget.className += " active";
}

function buildInfoURL(buildPfLayer, buildI, buildJ){
  var urlBBox = '&BBOX='+buildPfLayer.getCapMinY+','+buildPfLayer.getCapMinX+','+buildPfLayer.getCapMaxY+','+buildPfLayer.getCapMaxX+'&WIDTH='+buildPfLayer.getCapWidth+'&HEIGHT='+buildPfLayer.getCapHeight+'&I='+buildI+'&J='+buildJ;
  
  //getFeatureInfoUrlEnd is defined in layout.js
  return buildPfLayer.featureInfoUrl + getFeatureInfoUrlEnd + buildPfLayer.featureInfoUrlLayers + buildPfLayer.featureInfoUrlParams + urlBBox;
}

/**
 * gets the response text for a url
 * 
 * @param {string} theUrl - url to get
 * @returns {String} - response text
 */
function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

/**
 * Converts an array of values 
 * 
 * @param {Array} valuesArray - values to convert
 * @param {String} conversionType - conversion type
 * @returns {Array|eliminateExtraTimes.newTimeValues}
 */
function convertValues(valuesArray,conversionType){
  //sometimes no conversion is needed, but the function is executed on all value arrays
  if(conversionType === "none"){
    //pass
  }
  //converts pressure in  millibars into altitude values in meters
  // https://www.weather.gov/media/epz/wxcalc/pressureAltitude.pdf
  else if(conversionType === "metersFromMillibars"){
    for(var v in valuesArray){
      var p=Number.parseFloat(valuesArray[v]);
      valuesArray[v] = (((1-Math.pow((p/1013.25),0.190284))*145366.45)*.3048);
    }
  }else if(conversionType === "eliminateExtraTimes"){
    valuesArray=eliminateExtraTimes(valuesArray);
  }
  return valuesArray;
}

/**
 * Sets the dimension values for the layer based on a get capabilities request for the layer
 * 
 * @param {json object} pfLayerObj - layer from the pForecast json object dictionary
 * @returns {undefined}
 */
function setDimensions (pfLayerObj){  
  parser = new DOMParser();
  //don't call get cap if it's already stored 
  if (getCapStore[pfLayerObj.getCapabilitiesUrl] !== undefined ){
    pfLayerObj.getCapResults = getCapStore[pfLayerObj.getCapabilitiesUrl];
    if(debug){console.log ("saved a get cap call!",pfLayerObj.getCapabilitiesUrl);}
  }
  else{
    //httpGet is in slideInPanel.js
    //getCapUrlEnd is defined in layout.js
    pfLayerObj.getCapResults = parser.parseFromString(httpGet(pfLayerObj.getCapabilitiesUrl+getCapUrlEnd),"text/xml");
    //add the layer's get cap to the store
    getCapStore[pfLayerObj.getCapabilitiesUrl] = pfLayerObj.getCapResults;    
    if(debug){console.log ("made a get cap call.",pfLayerObj.getCapabilitiesUrl);}
  } 
  
  var layer = pfLayerObj.service+":"+pfLayerObj.layer;
  //get all the layers
  var capLayers = pfLayerObj.getCapResults.getElementsByTagName("Layer");
  //loop through the results, but not the __proto__ object
  for (let l=0; l<capLayers.length; l++){
    //does the service's layer name match the target layer name? 
    if(capLayers[l].children[0].innerHTML === layer){
      //grab all the dimensions to loop through
      var dims = capLayers[l].getElementsByTagName("Dimension");
      //loop through the results, but not the __proto__ object
      for(let d=0; d<dims.length;d++){
        //get the name attribute from the tag then test it against the target dimensions
        var dimType = dims[d].attributes[0].nodeValue;
        for(var fd in pfLayerObj.dimensions){
          if(pfLayerObj.dimensions[fd].xmlDimType === dimType){
            //keep a record of values from the server and converted values to use original values when talking to the server 
            if (debug){console.log("Dimensions",dims[d]);}
            pfLayerObj.dimensions[fd].serverValues = dims[d].innerHTML.split(",");
            pfLayerObj.dimensions[fd].values = convertValues(dims[d].innerHTML.split(","),pfLayerObj.dimensions[fd].conversion);
            //invert the values if desired
            if(pfLayerObj.dimensions[fd].invert){
              pfLayerObj.dimensions[fd].values.reverse();
              pfLayerObj.dimensions[fd].serverValues.reverse();
            }
          }
        }
      }
    }
  }
}

/**
 * Extracts unique dates from an array of dates (requires a datetime string with a "T" seperator) 
 * 
 * @param {Array} datesArr - array of datetime strings
 * @returns {Array|getUniqueDates.datesToUse} - array of unique, sorted dates
 */
function getUniqueDates(datesArr){
  var datesToUse = [];
  for (var d in datesArr){
    var theDate = datesArr[d].split("T")[0]; 
    if (!datesToUse.includes(theDate)){
      datesToUse.push(theDate);
    }
  }
  datesToUse.sort();
  return datesToUse;
}

/**
 * Extracts the date from a datetime string
 * 
 * @param {String} thisDate - datetime value
 * @returns {String} - the date portion of the datetime value
 */
function getDateFromTimestamp(thisDate){
  var theDate = "";
  try {
    theDate = thisDate.split("T")[0];
  }
  catch (err) { 
    console.log("WARNING:: Failed to get date from timestamp: "+thisDate);
    console.log(err);
  }
  return theDate;
}

/* Adapted from https://gist.github.com/fpillet/993002 */
// Used for dynamically coloring cells with temperature data and helps with converting from web mercator to geographic coordinates
/* Scale a value from one range to another
   * Example of use:
   *
   * // Convert 33 from a 0-100 range to a 0-65535 range
   * var n = scaleValue(33, [0,100], [0,65535]);
   *
   * // Ranges don't have to be positive
   * var n = scaleValue(0, [-50,+50], [0,65535]);
   *
   * Ranges are defined as arrays of two values, inclusivehttps://portal.fnmoc.navy.mil/geoserver/HYCOM_GLOBAL/wms/ows?SERVICE=WMS&version=1.3.0&request=GetFeatureInfo&LAYERS=HYCOM_GLOBAL:global_2880x1441.sal.dpth_sfc&QUERY_LAYERS=HYCOM_GLOBAL:global_2880x1441.sal.dpth_sfc&CRS=EPSG:3857&STYLES=&EXCEPTIONS=XML&FORMAT=image/png&INFO_FORMAT=text/xml&FEATURE_COUNT=50&BBOX=0,-180,90,0&X=898&Y=354&TIME=2020-10-12T00:00:00.000Z&ELEVATION=0.0&ANALYSIS_TIME=current
   *
   * The ~~ trick on return value does the equivalent of Math.floor, just faster.
   *
   */
function scaleValue(value, from, to) {
  var scale = (to[1] - to[0]) / (from[1] - from[0]);
  var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
  var result = capped * scale + to[0];
  return result;
}

/**
 * Used to remove dates < today from a get capabilites request for the time slider and setDimensions()
 * 
 * @param {Array} timeValues - datetime strings
 * @returns {Array|eliminateExtraTimes.newTimeValues} - Array of datetime strings with only dates >= today
 */
function eliminateExtraTimes(timeValues){
    var newTimeValues = [];
    var today = new Date();
    today = new Date(today.getFullYear(),today.getMonth(),today.getDate(),null,null,null,null);
    for (var index = 0; index <timeValues.length; index++){
        var pieces = timeValues[index].split('-');
        timeSlice = new Date(pieces[0], pieces[1]-1, pieces[2].split('T')[0],null,null,null,null);
        if (timeSlice >= today){
          newTimeValues.push(timeValues[index]);
        }
    }
  return newTimeValues;
}

/**
 * Cleans up the table and/or executes the fillTable() function on the passed layer
 * Fires when 'start new' or 'next day' button in the slide-in panel is clicked
 * 
 * @param {String} utPfLayer - identifys the layer object in the pForecast json object dictionary 
 * @param {Boolean} afterFirst - is data expected to already exist in the table
 * @returns {undefined} - returns nothing, but executes a fillTable() function with the layer submitted
 */
function updateTable(utPfLayer,afterFirst) {
  if (debug){console.log("updateTable() STARTED!");}
  //when executing the table's first 'update' complete these actions
  if (!afterFirst) {
    //get a new, empty table
    showTable(utPfLayer);
    //reset the getFeatureInfo counter
    getFeatInfoCounter = 0;
    //enable the next day button
    var nextDayBtn = document.getElementById(utPfLayer+"-nextDay-btn");
    removeClass(nextDayBtn,'disabled');
    nextDayBtn.onclick = function(){updateTable(utPfLayer,true);};
  }
  
  // Put data in the table
  fillTable(pForecast[utPfLayer], afterFirst);
}

/**
 * Fires from layout.js after the map data layer is loaded
 * - gets dimensions, builds empty 2D arrays, calls showTable() to build and place the table elements
 * 
 * @returns {undefined} - no return value, but calls showTable() function on each layer in the pForecast json object
 */
function buildTables() {
  if (debug){console.log("buildTable() STARTED! ");}  
  //loop through the layer objects in the pForecast json object dictionary
  for (var pfLayer in pForecast){
    // test to see if a table has already been constructed for this layer
    // if it has not, this is assumed to be the initial call of buildTables and not
    // a subsequent call when additional data layers were loaded/switched in the map view
    dvTableId = "pf-dvTable-"+pfLayer;
    if (document.getElementById(dvTableId) === null){
      // Set dimensions such as time and depth from the layer's get capabilities functionality
      setDimensions(pForecast[pfLayer]);
      
      buildArrays(pForecast[pfLayer]);
      
      showTable(pfLayer);
    }
  }
}

/*
 * Builds new clean data arrays
 * 
 * @param {type} baPfLayerObj
 * @returns {undefined}
 */
function buildArrays(baPfLayerObj){
  //clear scale values arrays
  for (var scaleType in baPfLayerObj.scaleValues){
    baPfLayerObj.scaleValues[scaleType] = [];
  } 
  // Make empty 2d arrays
  for (var j = 0; j < baPfLayerObj.dimensions.rows.values.length; j++) {
    for (var scaleType in baPfLayerObj.scaleValues){
      baPfLayerObj.scaleValues[scaleType].push([]);
    }
    for (var i = 0; i < baPfLayerObj.dimensions.columns.values.length; i++) {
      for (var scaleType in baPfLayerObj.scaleValues){
        baPfLayerObj.scaleValues[scaleType][j].push(null);
      }
    }
  }
}

/**
 * Constructs a blank html table from the arrays created in buildTable()
 * 
 * @param {String} stPfLayer - name of a layer in the pForecast json object dictionary
 * @returns {undefined} 
 */
function showTable(stPfLayer) {
  if (debug){console.log("Starting showTable(stPfLayer) - "+stPfLayer);}
  //reset the dates for the data when clearing the table
  if (typeof pForecast[stPfLayer].dimensions.columns.values !== "undefined"){
    pForecast[stPfLayer].daysInData = getUniqueDates(pForecast[stPfLayer].dimensions.columns.values);
  }
  
  // Empty out dataTables, needs to be done when fetching data for a new point on the map when data has already been filled for a previous point
  panelContentDiv = document.getElementById("panel-content");    
  //add a dvTable div for the layer to the panel content div - only once!
  dvTableId = "pf-dvTable-"+stPfLayer;
  
  //if the table does not yet exist, create it
  if (document.getElementById(dvTableId) === null){
    var dvTable = document.createElement("div");
    dvTable.id = dvTableId;
    addClass( dvTable,"pf-dvTable");
    if(pForecast[stPfLayer].default){
      addClass(dvTable,"show");
    }
    panelContentDiv.appendChild(dvTable);
  }else{
    var dvTable = document.getElementById(dvTableId);
  }
  
  //blank out any existing values
  for (var j = 0; j < pForecast[stPfLayer].dimensions.rows.values.length; j++) {
    for (var i = 0; i < pForecast[stPfLayer].dimensions.columns.values.length; i++) {
      for (var scaleType in pForecast[stPfLayer].scaleValues){
        pForecast[stPfLayer].scaleValues[scaleType][j][i] = null;
      }
    }
  }
  
  // Adapted (partially) from https://www.aspsnippets.com/Articles/Create-dynamic-Table-in-HTML-at-runtime-using-JavaScript.aspx 
  //Create a HTML Table element.
  var table = document.createElement("TABLE");
  table.id = "pf-panelTable-"+stPfLayer;
  addClass(table,"pf-panelTable");

  //Get the count of columns.
  var columnCount = pForecast[stPfLayer].dimensions.columns.values.length;

  //Add header rows.
  // Row labelling hours
  var hourRow = table.insertRow(0);

  // Blank cell for formatting purposes
  var blankCell = document.createElement("TD");
  blankCell.innerHTML = "";
  addClass(blankCell, "blankCell");                                     
  hourRow.appendChild(blankCell);

  // Parse times from datetimes, which are usually formatted "(date)T(time)Z"
  // Then display hours in the hour header row
  for (var i = 0; i < columnCount; i++) {
    var headerCell = document.createElement("TH");
    var thisHour = pForecast[stPfLayer].dimensions.columns.values[i].split('T')[1].split('Z')[0].split(":")[0]+":00";
    headerCell.title = pForecast[stPfLayer].dimensions.columns.values[i];
    headerCell.innerHTML = thisHour;
    hourRow.appendChild(headerCell);
  }

  // Row labelling days, will have wider cells
  var dayRow = table.insertRow(0);
  blankCell = document.createElement("TD");
  addClass(blankCell, "blankCell");                                     
  blankCell.innerHTML = "";
  dayRow.appendChild(blankCell);
  
  // Parse dates from datetimes, which are usually formatted "(date)T(time)Z"
  // Then display dates in the day header row
  for (var i = 0; i < columnCount; i++) {
    var headerCell = document.createElement("TH");
    addClass(headerCell, "headerDateCell");                                           
    var thisDate = pForecast[stPfLayer].dimensions.columns.values[i].split('T')[0];
    headerCell.innerHTML = thisDate;
    dayRow.appendChild(headerCell);
  }

  // Combine adjacent cells in the day header that display the same day, make wider cells that cover all hours of the day
  for (var i = 0; i < columnCount; i++) {
    // Stop when there are no more cells with dates
    if (typeof dayRow.cells[i+1] === 'undefined') {
      break;
    }
    // Combine two adjacent cells that read the same date
    if (i>0 && dayRow.cells[i+1].innerHTML === dayRow.cells[i].innerHTML){
      dayRow.cells[i].colSpan++;
      dayRow.cells[i+1].remove();
      i--;
    }
  }

  //Add the data rows.
  for (var i = 0; i < pForecast[stPfLayer].scaleValues[pForecast[stPfLayer].scaleDefault].length; i++) {
    var newRow = table.insertRow(-1);
    // var cell = newRow.insertCell(-1);
    var cell = document.createElement("TH");

    // Unit for depth; should probably be more dynamically displayed than this
    cell.innerHTML = Number.parseFloat(pForecast[stPfLayer].dimensions.rows.values[i]).toFixed(pForecast[stPfLayer].dimensions.rows.dispPrec)+" m";
    addClass(cell, "pf-depthHeader");
    newRow.appendChild(cell);

    // Fill cells with data (as of 8/5/20 this is just null data)
    for (var j = 0; j < columnCount; j++) {
      var cell = newRow.insertCell(-1);
      cell.innerHTML = pForecast[stPfLayer].scaleValues[pForecast[stPfLayer].scaleDefault][i][j];
    }
  }

  // Put this table into the html
  //var dvTable = document.getElementById("dvTable"+stPfLayer);
  dvTable.innerHTML = "";  
  dvTable.appendChild(table);
  if (debug){console.log('Table updated!');}
}

/**
 * Returns the index of the first empty column in the table
 * 
 * @param {DOM table element} elPanelTable - the panel table being addressed
 * @param {json object} fstColPfLayerObj - targeted layer from the pForecast json object dictionary
 * @returns {Number} - index of the first column without data in the passed table element
 */
function firstEmptyColumn(elPanelTable, fstColPfLayerObj) {
  var emptyColIndex = 0;
  for (emptyColIndex; emptyColIndex < elPanelTable.rows.length; emptyColIndex++) {
    //check in row 4 because the 0-1 are header info and 3 may be all filled in by the column check
    if (elPanelTable.rows[3].cells[emptyColIndex+1].innerHTML === '') {
      return emptyColIndex;
    }
  }
  return emptyColIndex;
}

/**
 * Converts temperature (from Kelvin)
 * 
 * @param {Number(Float)} temp - temperature value in Kelvin
 * @param {String} option - destination temperature scale
 * @returns {Number|@var;temp} - Float value for converted temperature
 */
function convertTemp(temp, option) {
  // Default value for option would be K
  if (typeof option === 'undefined') {
    option = "K";
  }

  // Convert if option is C or F
  if (option === "C") {
    temp = (temp - 273.15);
  }
  else if (option === "F") {
    temp = (temp - 273.15) * 1.8 + 32;
  }
  return temp;
}

/**
 * Converts speeds (from knots)
 * 
 * @param {Number(float)} speed - speed value in knots
 * @param {String} option - destination speed scale
 * @returns {Number|@var;speed} - Float value for converted speed
 */
function convertSpeed(speed, option) {
  // options: 
  // N - pass-through, leave as knots
  // M - knots to mph
  // K - knots to kph

  // Default value for option would be N
  if (typeof option === 'undefined') {
    option = "N";
  }

  if (option === "M") {
    speed = speed * 1.15078;
  }
  else if (option === "K") {
    speed = speed * 1.852;
  }

  return speed;
}

/**
 * Sets the current scale for the data layer and swaps the data values in the panel table to the selected scale
 * 
 * @param {String} swapPfLayer - targeted layer in the pForecast json object dictionary
 * @param {String} newScale - the scale to change to
 * @returns {undefined}
 */
function swapData (swapPfLayer,newScale) {
  swapThisLayer = pForecast[swapPfLayer];
  if(swapThisLayer.scaleCurrent !== newScale){
    swapThisLayer.scaleCurrent = newScale;
    var swapPanelTable = document.getElementById("pf-panelTable-"+swapPfLayer);
    var dataTable = swapThisLayer.scaleValues[newScale];
    // Insert dataTable (2d array) into panelTable (html table)
    for (var i = 0; i < swapThisLayer.dimensions.columns.values.length; i++) {
      for (var j = 0; j < swapThisLayer.dimensions.rows.values.length; j++) {
        if (dataTable[j][i]) {
          swapPanelTable.rows[j + 2].cells[i + 1].innerHTML = dataTable[j][i];
        }
      }
    }
    //display the row header units as feet or meters depending on the scale selected
    if(newScale === "F"){
      swapDisplayRow(swapPfLayer,"ft");
    }else{    
      swapDisplayRow(swapPfLayer,"m");
    }
  }
}

/**
 * Swaps the units in the row headers according to the sdrUnit value
 * 
 * @param {String} sdrPfLayer - name of the layer targeted
 * @param {String} sdrUnit - scale to be changed to
 * @returns {undefined}
 */
function swapDisplayRow(sdrPfLayer,sdrUnit){
  if(debug){console.log("swapDisplayRow ",sdrPfLayer,sdrUnit);}
  var sdrPanelTableId = 'pf-panelTable-'+sdrPfLayer;
  var sdrPanelTable = document.getElementById(sdrPanelTableId);
  var firstRowText = sdrPanelTable.rows[2].cells[0].textContent;
  //pfLayerObj.dimensions[fd].values = convertValues(dims[d].innerHTML.split(","),pfLayerObj.dimensions[fd].conversion);
  if (!firstRowText.includes(sdrUnit)){
    var sdrPfLayerRowObj = pForecast[sdrPfLayer].dimensions.rows;
    if (sdrUnit === "m"){
      for (var valInd=0; valInd< sdrPanelTable.rows.length-2; valInd++){
        var tableVal = sdrPfLayerRowObj.values[valInd];
        sdrPanelTable.rows[2+valInd].cells[0].textContent = Number.parseFloat(tableVal).toFixed(sdrPfLayerRowObj.dispPrec)+" "+sdrUnit;
      }
    }else if (sdrUnit === "ft"){
      for (var valInd=0; valInd< sdrPanelTable.rows.length-2; valInd++){
        var conFac = 3.28084;
        var tableVal = sdrPfLayerRowObj.values[valInd];        
        sdrPanelTable.rows[2+valInd].cells[0].textContent = (tableVal*conFac).toFixed(sdrPfLayerRowObj.dispPrec)+" "+sdrUnit;
      }
    }
  }
}

/**
 * Asynchronous get feature info call, requires full url to a single data value and throws the value into a cell in the data table (and colors the cell)
 * 
 * @param {String} url - String url constructed for a get feature request
 * @param {DOM table element} gfPanelTable - targeted panel table
 * @param {Number} i - index value for the array controlling columns
 * @param {Number} j - index value for the array controlling rows
 * @param {json object} gfThisLayerObj -  layer for which the call is being called
 * @returns {String} - value to be placed into the table 
 */
async function getFeatureInfo(url,gfPanelTable, i, j, gfThisLayerObj) {
  // Used for coloring the cell
  var intensity = 0;
  var rgbaVal = "rgba(255, 255, 255, " + intensity + ")";
  try {
    await fetch(url, { credentials: "same-origin", mode: "cors" }).then(function (response) {
      return response.text();
    }).then(function (text) {

      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(text, "text/xml");

      var value = "";
      
      //FNMOC expires taus in the NAVGEM layer and we must account for and represent these expired values
      // this method assumes that any service exception tag means that the data has expired
      var serviceException = xmlDoc.getElementsByTagName("ServiceException");
      if (serviceException.length>0){
        if (debug){console.log("A service exception was returned.");}
        //if (debug){console.log(url);}
        //if (debug){console.log(text);}
        value = "EXP";
        addClass(gfPanelTable.rows[j + 2].cells[i + 1],"noDataCell");
        gfPanelTable.rows[j + 2].cells[i + 1].title = "No data at this "+gfThisLayerObj.dimensions.columns.label;
      }else{
        value = Number.parseFloat(xmlDoc.getElementsByTagName(gfThisLayerObj.xmlTagName)[0].childNodes[0].nodeValue);

        //
        // Temperature data-specific
        //
  
        // Change intensity of cell color based on value's distance from a median value
        // In this case, median temp of 294.261K, or 70F
        // 328.37222K = 131.4F, hottest recorded temp by WMO
        intensity = scaleValue(Math.abs(294.261-value), [0.0, 328.37222- 294.261], [0.0, 1.0]);
        intensity255 = 255.0 * (1 - intensity);    
  
        // If value is greater than 294.261K, or 70F
        if (value > 294.261) {
          // Color cell red for hot temps
          //rgbaVal = "rgba(255, 0, 0, " + intensity + ")";
          rgbaVal = "rgba(255, " + intensity255 + ", " + intensity255 + ", 1)";                              
        } else if (value < 0.0) {
          // Missing temps are returned by HYCOM GLOBAL as -9999
          value = "N/A";
          addClass(gfPanelTable.rows[j + 2].cells[i + 1],"noDataCell");
          gfPanelTable.rows[j + 2].cells[i + 1].title = "No data at this "+gfThisLayerObj.dimensions.rows.label;
        } else {
          // Color cell blue for cold temps
          //rgbaVal = "rgba(0, 0, 255, " + intensity + ")";
          rgbaVal = "rgba(" + intensity255 + ", " + intensity255 + ", 255, 1)";
          if (intensity > 0.59) {
            gfPanelTable.rows[j + 2].cells[i + 1].style.color = "white";
          }                                                             
        }
      }

      if (value !== "N/A" && value !== "EXP") {
        // Store truncated value in data arrays
        // Separate arrays needed for the user to quickly switch displayed units
        for (var thisScale in gfThisLayerObj.scale){
          gfThisLayerObj.scaleValues[thisScale][j][i] = convertTemp(value,thisScale).toFixed(gfThisLayerObj.scaleDispPrec) + " "+thisScale;
        }
        
        //convert the value going into the table according to the current temperature scale
        value =convertTemp(value,gfThisLayerObj.scaleCurrent).toFixed(gfThisLayerObj.scaleDispPrec)+" "+gfThisLayerObj.scaleCurrent;
      }
      //
      // Temperature data-specific END
      //

      // Directly print the value into the table, color the cell
      gfPanelTable.rows[j + 2].cells[i + 1].style.backgroundColor = rgbaVal;
      gfPanelTable.rows[j + 2].cells[i + 1].innerHTML = value;

      getFeatInfoCounter++;
      return value;
    });

  }
  catch (err) {
    // When this comes up in the console, you can check the url to see what went wrong
    if(debug){
      console.log('ERROR with getFeatureInfo:');
      console.log(err);
      console.log('url:',url);
    }

    // Different from an "N/A" cell
    var value = "ERR";
    gfPanelTable.rows[j + 2].cells[i + 1].innerHTML = value;
    rgbaVal = "rgba(100, 50, 0, 1)";
    gfPanelTable.rows[j + 2].cells[i + 1].style.backgroundColor = rgbaVal;
    gfPanelTable.rows[j + 2].cells[i + 1].style.color = "white";
    
    getFeatInfoCounter++;
    return value;
  }
}

/**
 * Writes values to a table for a given layer
 * 
 * @param {json object} ftPfLayerObj - layer from the pForecast json object dictionary
 * @param {boolean} afterFirst - triggers data checks on the first data pull 
 * @returns {undefined}
 */
async function fillTable(ftPfLayerObj, afterFirst = false) {  
  
  if(debug){console.log("async fillTable for passed var ftPfLayerObj ",ftPfLayerObj);}
  
  var urlIValue = 0;
  var urlJValue = 0;
  var urlRow = '&'+ftPfLayerObj.dimensions.rows.xmlDimType.toUpperCase()+'=';
  var urlCol = '&'+ftPfLayerObj.dimensions.columns.xmlDimType.toUpperCase()+'=';

  // Scale coordinates (from map) to pixels (from imaged data)
  if(debug){console.log("Number.parseFloat(mapX), [Number.parseFloat(ftPfLayerObj.getCapMinX), Number.parseFloat(ftPfLayerObj.getCapMaxX)], [0, Number.parseFloat(ftPfLayerObj.getCapWidth)]",Number.parseFloat(mapX), [Number.parseFloat(ftPfLayerObj.getCapMinX), Number.parseFloat(ftPfLayerObj.getCapMaxX)], [0, Number.parseFloat(ftPfLayerObj.getCapWidth)]);}
  if(debug){console.log("Number.parseFloat(mapy), [Number.parseFloat(ftPfLayerObj.getCapMiny), Number.parseFloat(ftPfLayerObj.getCapMaxy)], [0, Number.parseFloat(ftPfLayerObj.getCapHeight)]",Number.parseFloat(mapY), [Number.parseFloat(ftPfLayerObj.getCapMinY), Number.parseFloat(ftPfLayerObj.getCapMaxY)], [0, Number.parseFloat(ftPfLayerObj.getCapHeight)]);}
  urlIValue = Math.floor(scaleValue(Number.parseFloat(mapX), [Number.parseFloat(ftPfLayerObj.getCapMinX), Number.parseFloat(ftPfLayerObj.getCapMaxX)], [0, Number.parseFloat(ftPfLayerObj.getCapWidth)]));
  urlJValue = Math.floor(scaleValue(Number.parseFloat(mapY), [Number.parseFloat(ftPfLayerObj.getCapMinY), Number.parseFloat(ftPfLayerObj.getCapMaxY)], [Number.parseFloat(ftPfLayerObj.getCapHeight), 0]));
  if(debug){console.log("urlIValue,urlJValue",urlIValue,urlJValue);}
  if(debug){console.log('Map I & J - i=',urlIValue,'j=',urlJValue);}
  
  // reference the data table
  var ftPanelTable = document.getElementById('pf-panelTable-'+ftPfLayerObj.localLayerName);
  
  /**
   * Delays a given number of milliseconds
   * 
   * @param {Number(integer)} ms - time in milliseconds
   * @returns {Promise}
   */
  function sleep(ms) {
     return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch data for first column before doing other columns to know what rows to skip
   * 
   * @param {json object} checkRowPfLayerObj - layer from the pForecast json object dictionary
   * @param {DOM table object} checkRowFtPanelTable - data table corresponding to the layer
   * @returns {undefined}
   */
  async function checkRowData(checkRowPfLayerObj, checkRowFtPanelTable){
    var text = "";
    skipRows[checkRowPfLayerObj.localLayerName] = [];
    for (var j = 0; j < checkRowPfLayerObj.dimensions.rows.values.length; j++) {
      // fill rows below the first "N/A", with "N/A", automatically OR get the feature info
      if (text === "N/A"){
        addClass(checkRowFtPanelTable.rows[j + 2].cells[1],"noDataCell");
        checkRowFtPanelTable.rows[j + 2].cells[1].title = "No data at this "+checkRowPfLayerObj.dimensions.rows.label; 
        checkRowFtPanelTable.rows[j + 2].cells[1].innerHTML = text;
      } else {          
        var url = buildInfoURL(checkRowPfLayerObj,urlIValue,urlJValue) + urlRow + checkRowPfLayerObj.dimensions.rows.serverValues[j] + urlCol + checkRowPfLayerObj.dimensions.columns.values[0].replace(":","%3A");
        getFeatureInfo(url, checkRowFtPanelTable, 0, j,checkRowPfLayerObj);
      }
    }
    //waits for a reponse from all getFeatureInfo() calls
    while (getFeatInfoCounter < checkRowPfLayerObj.dimensions.rows.values.length){
      //wait]
      await sleep(1000);
      //getFeatInfoCounter++; //getFeatInfoCounter is incremented in getFeatureInfo(), but incrementing it here prevents waiting too long to proceed with getting the rest of the tables data
      if (debug){console.log("Waiting for all reponses from getFeatureInfo() in async function checkRowData: "+getFeatInfoCounter);}
    }
    if (debug){console.log('checkRowData DONE '+checkRowPfLayerObj.localLayerName);}
  }
  
  /**
   * Fetch data for first row to know what columns to skip
   * 
   * @param {json object} checkColPfLayerObj - layer from the pForecast json object dictionary
   * @param {DOM table object} checkColFtPanelTable - data table corresponding to the layer
   * @returns {undefined}
   */
  async function checkColumnData(checkColPfLayerObj, checkColFtPanelTable){    
    //var getFeatInfoCounter = 0;
    var text = "";
    skipCols[checkColPfLayerObj.localLayerName] = [];
    // the number of columns to check for a given day may/will vary based on dataset and will be less than the total number of columns
    // so only check the necessary columns - occurrences of the first date in the array of possible dates 
    // (batch call will remove a date when it is has been fulfilled so we must make sure there are days to check)
    var colsToCheck = 0;
    if (checkColPfLayerObj.daysInData.length>0){
      colsToCheck = countOccurrences(checkColPfLayerObj.dimensions.columns.values,checkColPfLayerObj.daysInData[0]);
    }
    for (var i = 0; i < colsToCheck; i++) {
      // Should fill rows below the first "N/A", with "N/A", automatically; 
      // if-else structure here is currently not working, always goes to else{}
      if (text === "EXP"){
        addClass(checkColFtPanelTable.rows[i + 2].cells[1],"noDataCell");
        checkColFtPanelTable.rows[i + 2].cells[1].title = "No data at this "+checkColPfLayerObj.dimensions.columns.label; 
        checkColFtPanelTable.rows[i + 2].cells[1].innerHTML = text;
      } else {          
        var url = buildInfoURL(checkColPfLayerObj,urlIValue,urlJValue) + urlRow + checkColPfLayerObj.dimensions.rows.serverValues[0].replace(checkColPfLayerObj.dimensions.rows.replaceVals[0],checkColPfLayerObj.dimensions.rows.replaceVals[1]) + urlCol + checkColPfLayerObj.dimensions.columns.values[i].replace(checkColPfLayerObj.dimensions.columns.replaceVals[0],checkColPfLayerObj.dimensions.columns.replaceVals[1]);
        getFeatureInfo(url, checkColFtPanelTable, i, 0,checkColPfLayerObj);
      }
    }
    //getFeatInfoCounter increments in the async getFeatureInfo() and counts the number of times a value is returned
    // this counter holds back the completion until all values are returned
    while (getFeatInfoCounter < colsToCheck){
      await sleep(1000);
      if(debug){console.log("Waiting for reponse in async function checkColumnData: "+getFeatInfoCounter);}
    }
    if(debug){console.log('checkColumnData DONE '+checkColPfLayerObj.localLayerName);}
  }

  /**
   * Adds row and column numbers for rows and columns without data to the skipRows and skipCols objects
   * 
   * @param {json object} popSkipPfLayerObj - layer from the pForecast json object dictionary
   * @param {DOM table object} popSkipFtPanelTable - data table corresponding to the layer
   * @returns {undefined}
   */
  function populateSkips(popSkipPfLayerObj, popSkipFtPanelTable){  
    for (var j = 0; j < popSkipPfLayerObj.dimensions.rows.values.length; j++) {
      if (popSkipFtPanelTable.rows[j + 2].cells[1].innerHTML === "N/A") {
        skipRows[popSkipPfLayerObj.localLayerName].push(j);
      }
    }  
    for (var i = 0; i < popSkipPfLayerObj.dimensions.rows.values.length; i++) {
      if (popSkipFtPanelTable.rows[2].cells[i+1].innerHTML === "EXP") {
        skipCols[popSkipPfLayerObj.localLayerName].push(i);
      }
    }
    skipRows[popSkipPfLayerObj.localLayerName].sort();
    skipCols[popSkipPfLayerObj.localLayerName].sort();
    if (skipRows[popSkipPfLayerObj.localLayerName].length >0){
      popSkipPfLayerObj.chopRowStart = skipRows[popSkipPfLayerObj.localLayerName][0];
    }else{
      popSkipPfLayerObj.chopRowStart = popSkipPfLayerObj.dimensions.rows.values.length+1;
    }
    if (skipCols[popSkipPfLayerObj.localLayerName].length >0){
      var maxdex = skipCols[popSkipPfLayerObj.localLayerName].length-1;
      popSkipPfLayerObj.chopColStop = skipCols[popSkipPfLayerObj.localLayerName][maxdex];
    }else{
      popSkipPfLayerObj.chopColStop = 0;
    }
    if(debug){console.log("skipRows[ "+popSkipPfLayerObj.localLayerName+"] = ", skipRows[popSkipPfLayerObj.localLayerName]);}
    if(debug){console.log("skipCols[ "+popSkipPfLayerObj.localLayerName+"] = ", skipCols[popSkipPfLayerObj.localLayerName]);}
    if(debug){console.log("chopRowStart",popSkipPfLayerObj.chopRowStart);}
    if(debug){console.log("chopColStop",popSkipPfLayerObj.chopColStop);}
    if(debug){console.log('populateSkips DONE '+popSkipPfLayerObj.localLayerName);}
  }
  
  /**
   * trims the rows and columns from the panel table and returns true if columns are trimmed
   * to notify the batchCall function that the columns are not normal
   * 
   * @param {json object} ttPfLayerObj - layer from the pForecast json object dictionary 
   * @param {DOM table object} ttPanelTable - data table corresponding to the layer
   * @returns {boolean}
   */
  function trimTable(ttPfLayerObj, ttPanelTable){    
    var colsTrimmed = false;
    var dateHeadRow = 0;
    var hourHeadRow = 1;
    var elevationCol = 0;
    var startDataCol = 1;
    var startDataRow = 2;
    
    skipRows[ttPfLayerObj.localLayerName].reverse();
    for (var r = 0; r<skipRows[ttPfLayerObj.localLayerName].length; r++){
      ttPanelTable.deleteRow(skipRows[ttPfLayerObj.localLayerName][r]+startDataRow);
    }
    
    skipCols[ttPfLayerObj.localLayerName].reverse();
    if (skipCols[ttPfLayerObj.localLayerName].length>0){
      var oldColSpan = ttPanelTable.rows[dateHeadRow].cells[startDataCol].colSpan;
      ttPanelTable.rows[dateHeadRow].cells[startDataCol].colSpan = oldColSpan - skipCols[ttPfLayerObj.localLayerName].length;
      colsTrimmed=true;      
      //rebuild the data arrays to get rid of ghosts when columns are trimmed
      buildArrays(ttPfLayerObj);
    }
    for (var r=hourHeadRow;r<ttPanelTable.rows.length;r++){
      for (var c = 0; c<skipCols[ttPfLayerObj.localLayerName].length; c++){
        ttPanelTable.rows[r].deleteCell(skipCols[ttPfLayerObj.localLayerName][c]+startDataCol);
        if(debug){console.log("deleteCell["+r+"]["+(skipCols[ttPfLayerObj.localLayerName][c]+startDataCol)+"]",c,startDataCol);}
      }
    }  
    return colsTrimmed;
  }

  //https://www.codegrepper.com/code-examples/delphi/javascript+count+number+of+occurrences+in+array (modified to includes instead of ===)
  /**
   * Counts occurrences of val in an array
   * 
   * @param {Array} arr
   * @param {variable} val
   */
  const countOccurrences = (arr, val) => arr.reduce((a, v) => (v.includes(val) ? a + 1 : a), 0);
    
  /**
   * Makes calls to the server to get feature info and populate the returned values into the layer's panel table
   * 
   * @param {json object} ftPfLayerObjBatch - layer from the pForecast json object dictionary
   * @param {DOM table object} ftPanelTableBatch - data table corresponding to the layer
   * @param {boolean} colsTrimmed - lets the function know that the table columns have been trimmed
   * @returns {undefined}
   */
  function batchCall(ftPfLayerObjBatch, ftPanelTableBatch, colsTrimmed=false) {
    if(debug){console.log("batchCall start - passed ftPanelTableBatch, layer: "+ftPfLayerObjBatch,ftPanelTableBatch);}
    
    //if there are no values in the pool of dates, the table is full.  Don't do anything. Otherwise, grab a date and geaux
    if (ftPfLayerObjBatch.daysInData.length === 0){
      if(debug){console.log("Table full");}
      return;
    }else{
      //remove the date to run queries on from the pool of dates
      var currentBatchDate = ftPfLayerObjBatch.daysInData.shift();
    }
    
    //this is an area for future work where the panel table size is reduced according to the amount of missing data rows and columns
    //var startIndex = Math.max(firstEmptyColumn(ftPanelTableBatch,ftPfLayerObjBatch),ftPfLayerObjBatch.chopColStop);
    var startIndex = firstEmptyColumn(ftPanelTableBatch,ftPfLayerObjBatch)+ftPfLayerObj.chopColStop;
    if(debug){console.log(firstEmptyColumn(ftPanelTableBatch,ftPfLayerObjBatch),ftPfLayerObj.chopColStop);}
    /*if (startIndex == ftPfLayerObjBatch.dimensions.columns.values.length) {
      return;
    }*/

    // Fill the columns where the date matches the date being batched
    var endIndex = ftPfLayerObjBatch.dimensions.columns.values.length;
    if (endIndex > ftPfLayerObjBatch.dimensions.columns.values.length) {
      endIndex = ftPfLayerObjBatch.dimensions.columns.values.length;
    }
    
    //tableIndexCounter controls what column the data is added - start at the first data column
    var tableIndexCounter = firstEmptyColumn(ftPanelTableBatch,ftPfLayerObjBatch);
    
    //add the choped columns to index the getFeatureInfo queries properly
    //startIndex += ftPfLayerObj.chopColStop;
    
    // Fetch data for each cell
    for (let i=startIndex; i<endIndex; i++){
      //don't double tap the first column if it was not trimmed
      if(colsTrimmed){
        i++;
        colsTrimmed=false;
        tableIndexCounter=0;
      }
      if (getDateFromTimestamp(ftPfLayerObjBatch.dimensions.columns.values[i]) === currentBatchDate){
        for (var j = 0; j < ftPfLayerObjBatch.dimensions.rows.values.length - skipRows[ftPfLayerObjBatch.localLayerName].length; j++) {
          getFeatureInfo(buildInfoURL(ftPfLayerObjBatch,urlIValue,urlJValue) + urlRow + ftPfLayerObjBatch.dimensions.rows.serverValues[j].replace(ftPfLayerObjBatch.dimensions.rows.replaceVals[0],ftPfLayerObjBatch.dimensions.rows.replaceVals[1]) + urlCol + ftPfLayerObjBatch.dimensions.columns.values[i].replace(ftPfLayerObjBatch.dimensions.columns.replaceVals[0],ftPfLayerObjBatch.dimensions.columns.replaceVals[1]), ftPanelTableBatch, tableIndexCounter, j,ftPfLayerObjBatch);
        }
        tableIndexCounter++;
      }
    }
    if(debug){console.log('BATCH DONE '+ftPfLayerObjBatch.localLayerName);}
  }
  
  // If new table is started, check for skippable rows
  if (!afterFirst) {
    await checkRowData(ftPfLayerObj,ftPanelTable).then( function(){
      return;
    });
    getFeatInfoCounter = 0;
    await checkColumnData(ftPfLayerObj,ftPanelTable).then( function(){
      return;
    });
    populateSkips(ftPfLayerObj, ftPanelTable);
    //trimTable returns true if the columns were trimmed, which helps batchCall to act accordingly
    batchCall(ftPfLayerObj, ftPanelTable, trimTable(ftPfLayerObj, ftPanelTable));
  // else just fill more cells  
  } else {
    batchCall(ftPfLayerObj, ftPanelTable);
  }
  //ftPfLayerObj.chopRowStart = ftPfLayerObj.dimensions.rows.values.length+1;
  //reset the column chopper to prevent additional column removal
  //ftPfLayerObj.chopColStop = 0;
};