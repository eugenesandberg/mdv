dojo.require("esri.map");
dojo.require('esri.dijit.Attribution');
dojo.require("esri.arcgis.utils");
dojo.require("esri.dijit.Scalebar");
dojo.require("esri.dijit.BasemapGallery");
dojo.require("esri.layers.DynamicMapServiceLayer");
dojo.require("esri.layers.KMLLayer");
dojo.require("dojo/json");
dojo.require("dojo/on");
dojo.require("dojo/dom");
dojo.require("dojo/domReady!");
dojo.require("plugins/RasterLayer");

// URLS
// Use a relative path when possible to reduce the need to reconfigure
var LAYER_LIST_URL = "./doc/LayersList.json";
var SERVICE_LIST_URL = "./doc/ServicesList.json";
var windWave = "Wind"; // holds the value of which particle to display
// This holds the url path to the json files (if you add depths you need to update code in updateDimension() and perhaps fix format in updateWindyLayer()
var WINDY_FILES_URL = "./" + windWave + "GeoJson/";

//GLOBALS
var debug = false;  //DEBUG MODE -- set to true to display stuff in the console
var getCapStore = {};
var getCapUrlEnd = "?request=GetCapabilities&service=WMS";
var getFeatureInfoUrlEnd = "?SERVICE=WMS&version=1.3.0&request=GetFeatureInfo";
var map;
var windy;
var rasterLayer;
var currentLayerUrl = "";
var eventSliderOb = null;
var dimSliderOb = null;
var wmsLayer = null;
var kmlLayer = null;
var timeDim = '';
var nDim = '';
var fourDLayerID = '';
var month = 01;
var mp; //mapPoint of current position based on click events or context menus
var mapX; //map x coord from current position based on click events or context menus
var mapY; //map y coord from current position based on click events or context menus
var profilePopup; //dijit/popup object for profiles
//globals for context menu
var forecastAllowed = false; //signifies that multivariate data has been loaded and a forecast can be made
var forecastActive = false; //signifies that a forcast window is active and that a left click should be allowed to update it
var profileActive = false; //signifies that a sound speed profile window is active and that a left click should be allowed to update it
var forecastMenuItem = null; //dijit/MenuItem for the point forecast
var profileMenuItem = null; //dijit/MenuItem for the sound speed profile
var forecastAndProfileMenuItem = null; //dijit/MenuItem for the point forecast and profile combo
var ctxMenuForMap; //dijit/Menu object for the context menu
var currentSelectedBtn = null; // Holds currently selected layer
var customWmsRevealed = false; // Remembers if a custom WMS capabilities has been loaded
var serviceJSON = "{}";
var categoryJSON = "{}";
var categoriesArray = []; //holds all the category buttons
var buttonsArray = []; // holds all the buttons
var today = new Date();
var currentTime = parseInt(today.getMonth()+1).toString()+"_"+parseInt(today.getDate()).toString()+"_"+today.getFullYear(); //holds the currently selected time value
var currentNDim = '00'; //holds the currently selected time value
//globals for particle settings
var mapZoom = 3; //holds the current zoom. Default is 3
var windyParticleSetting = 1; //windy particle slider setting
var windyVelocitySetting = 1; //windy velocity slider setting
var intensityColorSetting = 0; //windy particle color scale
var downServices = [];
var navToolbar;
var layerButtons = [];

var utils = {
  applyOptions : function(configVariable, newConfig) {
    var q;

    //Override any config options with query parameters
    for (q in newConfig) {
      configVariable[q] = newConfig[q];
    }
    return configVariable;
  },
  mapResize : function(mapNode) {
    //Have the map resize on a window resize
    dojo.connect(dijit.byId('map'), 'resize', map, map.resize);
  },
  onError : function(error) {
    console.log('Error occured');
    console.log(error);
  }
};

/**
 *Fires off when the web pages is loaded
 */
function initMap() {
  esri.config.defaults.io.proxyUrl =  location.protocol + '//' + location.host + "/WMSMultiDimensionalEsriViewer/proxy.jsp";
  esri.config.defaults.io.alwaysUseProxy = false;

  require([
    "esri/map",
    "esri/geometry/webMercatorUtils",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/request",
    "plugins/RasterLayer",
    
    
    "esri/dijit/Popup",
    "esri/dijit/PopupTemplate",
    "dojo/dom-class", 
    "dojo/dom-construct",
    "esri/symbols/SimpleFillSymbol",
	
    "dojo/dom",
    "dojo/domReady!"
  ], function(
    Map, 
    webMercatorUtils, 
    Graphic, 
    SimpleMarkerSymbol, 
    SimpleLineSymbol, 
    Color,
    esriRequest,
    RasterLayer, 
    
    
    Popup,
    PopupTemplate,
    domClass, 
    domConstruct,
    SimpleFillSymbol,
    dom) {
    //parser.parse();
    // does the browser support canvas?
    canvasSupport = supports_canvas();
    
    //popup to display profile and topLayer click info
    profilePopup = new Popup({
      fillSymbol: null,
      lineSymbol: null,
      titleInBody: false,
      markerSymbol: null
    }, 
      domConstruct.create("div")
    );
    
    //to be used later when we have data loaded and read out the click values for them
    var layerTemplate = new PopupTemplate({
      title: "Layer Value", //we should be able to write this value based on the layer clicked
      description: "Coordinates for the point clicked.",
      fieldInfos: [{ //define field infos so we can specify an alias
        fieldName: "depth",
        label: "Depth: "
      },{
        fieldName: "???",  //maybe we can push to this array once we determine the field of intetest in the layer???
        label: "???: "
      }]
    });
    
    // Declare map object
    map = new Map("map", {
      center: [-56.049, 38.485],
      zoom: 3,
      basemap: "dark-gray",
      infoWindow: profilePopup,   
	  logo:false
    });
    // kick off the onLoad items
    map.on("load", doOnLoad);
    function doOnLoad() {
      createToolbarAndContextMenu(); //in contextMenu.js
      mapLoaded(); //in layout.js
    }
    
    // Click handler for the map
    map.on("click", function (evt) {
      if (debug) { console.log("Map clicked: " + evt.toString()); }
      require(["esri/geometry/webMercatorUtils"], function(webMercatorUtils) {
        mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
      });

      mapX = mp.x;
      mapY = mp.y;

      if (forecastActive || profileActive) {
        if (forecastActive) {
          if (debug) { console.log("forecast is active! - sending event to forecast"); }
          openPointForecast(mp);
        }
        if (profileActive) {
          if (debug) { console.log("profile is active! - sending event to profile"); }
          doProfile(mp);
        }
      }else if(kmlLayer != null) {
		  profilePopup.show(evt.screenPoint);
		  /**
       * [11:12 AM] Joshua
          When the KML feature is clicked, there is a popup that is associated with that and it contains data about the feature. 
          If we do not catch the popup and distinguish the difference only the lat and long is diaplayed. 
​         [11:13 AM] Brandon
          roger.  would it make sense to handle the popups from a common location?
​         [11:15 AM] Joshua
          Potentially. The native popups have a different way of handling features in kml (buttons to navigation between feature and such) 
          with the custom styling of our current popup it overrides these feature. This is another on of those, we need to get the team 
          together to plan out how to handle it. I was trying to add kml support without stepping on all of the profile work you had already 
          accomplished
       * 
       */
	  }else {
        var latlonText = "Latitude: " + mapY.toFixed(4)  + "<br/>Longitude: " + mapX.toFixed(4);
        profilePopup.resize(170,600);
        profilePopup.setTitle("Coordinates <div onClick='closeProfilePopup()' class='closeProfile'>X</div>");
        profilePopup.setContent(latlonText);
        profilePopup.show(evt.screenPoint);
        //requires inclusion of WMSLayerTools.js and WMSLayerTools.css 
        if (wmsLayer !== null){
          profilePopup.setContent("<div width='100%' style='text-align:center'>Value Loading<br/><img src='images/loader.gif' height='50px' width='50px'>,</div>");
          setPopupWMSLayerValue(wmsLayer,mp,profilePopup);
        }        
      }
    });

    require(["dojo/on",
    "dojo/dom",
    "dojo/dom-style",
    "dojo/domReady!"], function(on, dom, domStyle) {
      // Listener for Custom WMS submission
      on(dom.byId("btnSubmitCustomLayer"), "click", function() {
        dom.byId("CustomLayerPanel").style.visibility = "visible";
        dom.byId("CustomLayerPanel").style.zIndex = 1000;
        dom.byId("CustomLayerPanel").classList.add("fade-in");
        if (customWmsRevealed)
          dom.byId("layerSelector").style.visibility = "visible";
      });

      // Initial call to the JSON layer list -- Create the button categories
    	fetch(LAYER_LIST_URL).then(function(response) {
        return response.text();
      }).then(function(text) {
        categoryJSON = JSON.parse(text);
        createButtons(categoryJSON, "False");			
      });

      // Initial call to the JSON services list -- Populate the button categories
      fetch(SERVICE_LIST_URL).then(function(response) {
        return response.text();
      }).then(function(text) {
        serviceJSON = JSON.parse(text);
        callGetCapabilitiesFromJSON(serviceJSON, "False");
      });
    });

    function mapLoaded() {
      // Add a raster layer that will hold the windy vectors
      if (canvasSupport) {
        rasterLayer = new RasterLayer(null, {opacity: 0.55});
        map.addLayer(rasterLayer);
		
        map.on("extent-change", redrawWindy);
        map.on("resize", function() {});
        map.on("zoom-start", stopWindy);
        map.on("pan-start", stopWindy);

        var layersRequest = esriRequest({
          //url: WINDY_FILES_URL + currentTime + "/gfs_" + currentNDim + ".json",
          url: WINDY_FILES_URL + currentTime + "/T" + currentNDim + ".json",
          content: {},
          handleAs: "json"
        });

        layersRequest.then(function(response) {
          windy = new Windy({ canvas: rasterLayer._element, data: response });
          redrawWindy();
        }, function(error) {
          console.log("Error loading Windy Vectors: ", error.message);
        });
      }
      else {
        dom.byId("mapCanvas").innerHTML = "This browser doesn't support canvas. Visit <a target='_blank' href='http://www.caniuse.com/#search=canvas'>caniuse.com</a> for supported browsers";
      }
    }

    // does the browser support canvas?
    function supports_canvas() {
      return !!document.createElement("canvas").getContext;
    }

    function redrawWindy() {
      rasterLayer._element.width = map.width;
      rasterLayer._element.height = map.height;
      // Check whether windy vectors should be redrawn also
      toggleWindyVectors();
    }
    
    function stopWindy() {
      if (windy) {
        windy.stop();
      }
    }
  });

  require([
    "esri/map",
    "esri/dijit/BasemapToggle",
    "dojo/domReady!"
  ], function(Map, BasemapToggle) {
    var toggle = new BasemapToggle({
      map: map,
      basemap: "oceans"
    }, "BasemapToggle");
    toggle.startup();
  });
  
  require([
    "esri/map",
        "esri/toolbars/navigation",
        "dojo/on",
        "dojo/parser",
        "dijit/registry",
        "dijit/Toolbar",
        "dijit/form/Button",
        "dojo/domReady!"
      ],
        function (Map, Navigation, on, parser, registry) {
		navToolbar = new Navigation(map);
  });

  //add chrome theme for popup.
  dojo.addClass(map.infoWindow.domNode, "chrome");
}

// Create menu items to be added to a menu (intended for context menu, but can be added to any menu)
// initialize the variable at the top of the file in the "//globals for context menu" section
// IMPORTANT - when adding a menu item that sends info from a click event, you must also update that item's
//             click function in contextMenu.js so that it passes the proper mapPoint object
require([
    "dijit/MenuItem",
    "dojo/domReady!"
  ], function(MenuItem) {
    //menu item for the point forcast
    forecastMenuItem = new MenuItem({
      label: "Point Forecast",
      onClick: function() { openPointForecast(mp); }
    });
    //menu item for the point forcast and profile combo menuItem
    forecastAndProfileMenuItem = new MenuItem({
      label: "Point Forecast and Sound Speed Profile",
      onClick: function() { openPointForecast(mp); doProfile(mp); }
    });
  }
);

//the context menu clicks send map points because of how the coords are determined and the left clicks are events
//this function will turn the event into a mapPoint or pass through input that is already a mapPoint
function getMapPointFromMapPointOrEvent(mapPointOrEvent) {
  if (typeof mapPointOrEvent.mapPoint === 'undefined') {
    //nope, we already have a point just pass it through
    var mp = mapPointOrEvent;
    //console.log("mapPointOrEvent.mapPoint is undefined - not an event")
  }
  else {
    //looks like we have an event...fix it
    require(["esri/geometry/webMercatorUtils"], function(webMercatorUtils) {
      var mp = webMercatorUtils.webMercatorToGeographic(mapPointOrEvent.mapPoint);
    });
    //console.log("mapPointOrEvent.mapPoint is defined - using webMercatorUtils to get a point from the event")
  }
  return mp;
}

/**
 * "Closes" the custom WMS panel
 * Not actually closed but moved behind the map, so it is hidden
 * This function is called from index.html and from another function in this file
 */
function closeCustomLayerPanel() {
  document.getElementById("layerSelector").style.visibility = "hidden";
  document.getElementById("CustomLayerPanel").style.zIndex = -1000;
  document.getElementById("CustomLayerPanel").style.visibility = "hidden";
  document.getElementById("CustomLayerPanel").classList.remove("fade-in");
}

/**
 * Called from index.html when user clicks Load WMS Layers in the custom WMS panel
 * Once clicked, parse the GetCapabilities file of the URL entered
 * for the necessary information to use for the GetMap request
 */
function loadCustomWMSCapabilities(evt) {
  //Get the URL the user added to the Form within the splash screen
  var wmsURL = document.getElementById('wmsTextInput').value;

  //Remove everything after the '?' mark
  var questIndex = wmsURL.indexOf('?');
  if (questIndex != -1) {
    wmsURL = wmsURL.substring(0,questIndex);
    document.getElementById('wmsTextInput').value = wmsURL;
  }

  // Register an event that will be triggered from inside the WMSLayerWithTime class
  // when the WMS is fully loaded; then the next step happens
  // Note: this event name is also used for pre-configured WMS, pointing to a different function
  wmsLayer = new WMSLayerWithTime(wmsURL);
  document.addEventListener("WMSDimensionsLoaded", customWmsLoaded, false);
}

/**
 * Once the custom WMS has been parsed and ready to load we can let the user
 * know which layers and dimensions can be displayed
 */
function customWmsLoaded() {
  //Set Initial Values
  var subLayers = wmsLayer.getSubLayerWDim();
  if (subLayers.length > 0) {
    var groupElement = document.getElementById('radioButtonGroup');
    //Removing all old Radio Boxes
    groupElement.innerHTML = '';

    //Adding a radio button for each layer that contains at least one dimension
    for (layerIndex = 0; layerIndex < subLayers.length; layerIndex++) {
      var layerName = subLayers[layerIndex];
      var dimensions;
      try {
        dimensions = wmsLayer.getDimensions(layerName);
      }
      catch (error) {
        if (debug) { console.log("Layer " + layerName + " had no dimensions, skipping"); }
        continue;
      }

      if (dimensions.length != 0) {
        var dimNames = "&nbsp;&nbsp;(" + dimensions.toString() + ")";

        var label = document.createElement("label");
        var element = document.createElement("input");
        element.setAttribute("type", "radio");
        element.setAttribute("value", layerName);
        element.setAttribute("name", 'rbGroup');
        element.setAttribute("id", 'rb' + layerName);
        element.style = 'margin:5px;';
        if (layerIndex == 0)
          element.setAttribute("checked", true);

        label.appendChild(element);
        label.innerHTML += layerName + dimNames;
        label.innerHTML += '<br />';
        groupElement.appendChild(label);
      }
    }

    // Display the layerSelector
    document.getElementById("layerSelector").style.visibility = "visible";
    customWmsRevealed = true;
  }
  else {
    alert("Web Map Service loaded does not have any multi-dimensional layers contained within it.");
  }
}

/**
 * Once the WMS has been parsed and ready to load we can let the user
 * know which layers and dimensions can be displayed
 */
function wmsParsedCapabilities(evt) {
  //Set Initial Values
  var subLayers = wmsLayer.getSubLayerWDim();
  if (subLayers.length > 0) {
    addWMSLayerToMap(evt.detail.parameterToLoad);
  }
  else {
    alert("Web Map Service loaded does not have any multi-dimensional layers contained within it.");
  }
}

/**
 * Show or hide the 'More Layers' in the layer selector
 */
function toggleMoreLayers() {
  SHOW_LABEL = "[ Show More Layers ]";
  HIDE_LABEL = "[ Hide More Layers ]";

  // Examine the button's current text and perform the action
  btn = document.getElementById("mlsShowButton");
  if (btn.innerHTML == SHOW_LABEL) {
    // Create the category buttons for the extra layers and then populate the service layers
    createButtons(categoryJSON, "True");
    callGetCapabilitiesFromJSON(serviceJSON, "True");
	
	
    // Show the scrolling arrows
    document.getElementById("mlsUpArrow").style.display = "";
    document.getElementById("mlsDownArrow").style.display = "";
    // Change the label of the toggle button
    document.getElementById("mlsShowButton").innerHTML = HIDE_LABEL;
    // Reveal the extra buttons
    var buttons = document.getElementsByTagName("button");
    for (var index = 0; index < buttons.length; index++) {
      if (buttons[index].hasAttribute("data-more") && buttons[index].getAttribute("data-more") == "True") {
        buttons[index].parentElement.style.display = "";
      }
    }
  }
  else {
    // Hide the scrolling arrows
    document.getElementById("mlsUpArrow").style.display = "none";
    document.getElementById("mlsDownArrow").style.display = "none";
    // Change the label of the toggle button
    document.getElementById("mlsShowButton").innerHTML = SHOW_LABEL;
    // Hide the extra buttons
    var buttons = document.getElementsByTagName("button");
    for (var index = 0; index < buttons.length; index++) {
      if (buttons[index].hasAttribute("data-more") && buttons[index].getAttribute("data-more") == "True") {
        buttons[index].parentElement.style.display = "none";
      }
    }
  }
}

/**
* Reloads the current layer on the map
*/
function refreshLayer() {
  document.getElementById("layerLoadingDiv").style.visibility = "visible";
  document.getElementById("layerLoadingDiv").style.zIndex = 10;
  wmsLayer.refresh();
}

/**
 * Clear the workspace to prepare for a new layer load
 */
function clearCurrentLayer() {
  // Clear any previously loaded layer
  if (fourDLayerID !== "") {
    var mapLayers = map.layerIds.length
    for (var j = mapLayers-1; j >=0; j--) {
      var layer = map.getLayer(map.layerIds[j]);
      if (layer.id == fourDLayerID) {
        map.removeLayer(layer);
		kmlLayer = null;
      }
    }
  }

  // Remove the styling from the previously selected layer button
  if (currentSelectedBtn) {
    currentSelectedBtn.classList.remove("selectedLyrBtn");
  }

  // Clear out the dimensional panels before loading the new layer
  document.getElementById("eventSliderPanel").innerHTML = "";
  document.getElementById("elevationSliderPanel").innerHTML = "";

  // Clear the labels
  document.getElementById("timeLabel").textContent = "";
  document.getElementById("nameLabel").textContent = "";

  // Move the panels to the back and hide
  document.getElementById("leftChart").style.zIndex = -100;
  document.getElementById("leftChart").style.visibility = "hidden";
  document.getElementById("footer").style.zIndex = -100;
  document.getElementById("footer").style.visibility = "hidden";
}

/**
 * Process the custom WMS layer before calling general Add WMS Layer function
 */
function addCustomWMSLayer() {
  // Clear the workspace first
  clearCurrentLayer();

  // Get the selected layer from the radio button group
  var selLayer = "";
  var elements = document.getElementsByName("rbGroup");
  for (elemIndex = 0 ; elemIndex < elements.length; elemIndex++) {
    var element = elements[elemIndex];
    if (element.checked) {
      selLayer = element.value;
      break;
    }
  }

  // Show the loading panel
  document.getElementById("loadingGifFrame").style.visibility = "visible";
  document.getElementById("loadingGifFrame").style.zIndex = 10;
  document.getElementById('nameLabel2').textContent = selLayer;

  // Now call the general Add WMS Layer function
  addWMSLayerToMap(selLayer);
}

/**
 * Called from both preconfigured WMS layer adds and custom WMS layer adds
 * Add the selected layer to the map, then adds dimension sliders as needed
 */
function addWMSLayerToMap(parameterToLoad) {
  // If for some reason the parameter is blank, do nothing
  if (!parameterToLoad || parameterToLoad == "")
    return;

  //enable the reload button
  document.getElementById('refreshButton').disabled = false;
  
  // Initialize the WMS Layer with the default dimension values
  wmsLayer.initializeDimensionParams(parameterToLoad);
  map.addLayer(wmsLayer);
  fourDLayerID = wmsLayer.id;
  map.reorderLayer(wmsLayer,1);

  // When the map finishes updating, hide the loading gifs
  wmsLayer.on("update-end", function (evt) {
    if (debug) { console.log("Map updated"); }
    document.getElementById("loadingGifFrame").style.zIndex = -10;
    document.getElementById("loadingGifFrame").style.visibility = "hidden";
    document.getElementById("layerLoadingDiv").style.zIndex = -10;
    document.getElementById("layerLoadingDiv").style.visibility = "hidden";
  });

  //Get Dimension Values from WMS Layer
  var dimensions = wmsLayer.getDimensions();
  if (debug) { console.log("Service has " + dimensions.length.toString() + " dimensions"); }

  timeDim = '';
  nDim = '';
  for (index = 0; index < dimensions.length; index++) {
    var dim = dimensions[index];
    if (dim.indexOf("time") != -1 || dim.indexOf("date") != -1)
      timeDim = dim;
    else if (dim.indexOf("elevation") != -1) {
      nDim = dim;
    }
  }

  //Only show the Time/Event Slider when there is a time dimension
  if (timeDim != '') {
    if (eventSliderOb == null) {
      eventSliderOb = new EventSlider();
      document.addEventListener("EventSliderDateChanged", updateMapTime, false);
    }
    var timeValues = wmsLayer.getDimensionValues(timeDim);
    if (parameterToLoad.includes('HYCOM') || parameterToLoad.includes('WW3') || parameterToLoad.includes('NAVGEM')) {
      timeValues = eliminateExtraTimes(timeValues);
    }
    eventSliderOb.setTimeField(timeDim);
    eventSliderOb.setTimeSlices(timeValues);
    eventSliderOb.generateChart();

    // Show the time slider
    document.getElementById("footer").style.visibility = "visible";
    document.getElementById("footer").style.zIndex = 10;
  }

  //Only show the n Dim Slider when there is a dimension other than time
  if (nDim != '') {
    // Create the slider if it has not yet been created previously
    if (dimSliderOb == null) {
      dimSliderOb = new nDimSlider();
      document.addEventListener("DimSliderDateChanged", updateDimension, false);
    }
    var leftChartElem = document.getElementById("leftChart");
    // Check if multiple values exist for the dimensions
    var dimValues = wmsLayer.getDimensionValues(nDim);
    if (dimValues.length > 1) {
      var dimParams = wmsLayer.getDimensionProperties(nDim);
      dimSliderOb.setDimensionField(nDim);
      dimSliderOb.setDimensionUnits(dimParams.units);
      dimSliderOb.setDefaultValue(dimParams.defaultValue);

      // We want to check if it's a depth value, because then the dim slider inverses the values
      var isDepthValue = false;
      if (nDim.toLowerCase().indexOf('depth') != -1 || nDim.toLowerCase().indexOf('elevation') != -1) {
        isDepthValue = true;
        dimField = "depth";
      }

      dimSliderOb.setSlices(dimValues,isDepthValue);
      dimSliderOb.createDimensionSlider();

      // Show the Dimension Slider
      leftChartElem.style.visibility = "visible";
      leftChartElem.style.zIndex = 9;
    }
    else {
      // Hide the slider if this layer does not support the extra dimension
      leftChartElem.style.zIndex = -100;
      leftChartElem.style.visibility = "hidden";
    }
  }

  //We want to make sure that the current time is shown
  updateMapTime();

  // Make sure the layer data name is shown
  updateMapName(parameterToLoad);

  // Hide the custom WMS panel now that the service is loaded
  closeCustomLayerPanel();

  // Enable the point forecast panel in the right-click context menu
  forecastAllowed = true;
  if (ctxMenuForMap.getIndexOfChild(forecastMenuItem) === -1) {
    ctxMenuForMap.addChild(forecastMenuItem);
  }
  if (ctxMenuForMap.getIndexOfChild(forecastAndProfileMenuItem) === -1) {
    ctxMenuForMap.addChild(forecastAndProfileMenuItem);
  }
  // The following function lives in slideInPanel.js
  // This prepares the point-forecast table for use
  buildTables();
    
  // Close the profile window if it is open
  // closeProfilePopup() is in the profile.js file
  if (profileActive){
    closeProfilePopup();
  }
}

function eliminateExtraTimes(timeValues) {
  var newTimeValues = [];
  var today = new Date();
  today = new Date(today.getFullYear(),today.getMonth(),today.getDate(),null,null,null,null);
  for (index = 0; index <timeValues.length; index++) {
    var pieces = timeValues[index].split('-');
    var pieces = timeValues[index].split('-');
    timeSlice = new Date(pieces[0], pieces[1]-1, pieces[2].split('T')[0],null,null,null,null)
    if (timeSlice >= today) {
      newTimeValues.push(timeValues[index]);
      //console.log("Good TIME VALUE: " + timeValues[index]);
    }
    else {
      //console.log("Bad TIME VALUE: " + timeValues[index]);
    }
  }
  return newTimeValues;
}

/**
 * When the application is reized, we want to refresh the graph
 # This function is called from index.html in the body tag.
 */
function resetLayout() {
  if (eventSliderOb != null) {
    eventSliderOb.updateChartSize();
  }
}

function updateDimension() {
  //Gets the current selected dimension value from the Dimension Slider
  document.getElementById("layerLoadingDiv").style.visibility = "visible";
  document.getElementById("layerLoadingDiv").style.zIndex = 10;
  document.getElementById('nameLabel2').textContent = dimSliderOb.getDimensionValue().toString();
  var dimensionValue = dimSliderOb.getDimensionValue();

  //Update with dimension from WMS Layer
  wmsLayer.paramsOb[nDim] = dimensionValue.toString();
  wmsLayer.refresh();
	
	/* To Be uncommented once we have working depths*/
	//currentNDim = dimensionValue;
	//updateWindyLayer();
}

/***
* Event Handler Listener function for when the Event Sliders Date Changes.
* We want to update our Animation Widgets Date to be the same as the Event Slider
* Also Enable/Disable the Animation buttons depending on where we are at within the
* Event Slider.  For example disable the Forward button when we are at the last event
* within the map.
*/
function updateMapTime(retVal) {
  // Do nothing if there is no event slider active
  if (eventSliderOb == null) {
    return;
  }

  document.getElementById("layerLoadingDiv").style.visibility = "visible";
  document.getElementById("layerLoadingDiv").style.zIndex = 10;
  document.getElementById('nameLabel2').textContent = eventSliderOb.getDateTimeInitialValue().toString();
  var dateTimeStr = eventSliderOb.getDateTimeInitialValue();

  // Update the wmsLayer with date time parameter
  wmsLayer.paramsOb[timeDim] = dateTimeStr;
  wmsLayer.refresh();

  // Update the label on the map
  document.getElementById('timePanel').classList.remove('hiddenElem');
  document.getElementById('timeLabel').textContent = dateTimeStr;

  // Enable or disable buttons depending on the current position on the timeline
  animForwardBtn.disabled = eventSliderOb.isSlidersLastSpot();
  animBackwordBtn.disabled = eventSliderOb.isSlidersFirstSpot();

  month = dateTimeStr.split('-')[1];
  currentTime = convertTimetoFileFormat(dateTimeStr);

  // Also update the particle layer when the time changes
  updateWindyLayer();
  if (retVal) { 
    return month;
  }
}

/**
 * Update the label that shows the map data name
 */
function updateMapName(parameterToLoad) {
  document.getElementById('namePanel').classList.remove('hiddenElem');
  document.getElementById('nameLabel').textContent = parameterToLoad;
}

/**
 * Move the Event Slider to the next event
 */
function animationGoForward() {
  if (eventSliderOb != null) {
    eventSliderOb.moveSliderForward();
  }
}
/**
 * Move the Event Slider to the previous event
 */
function animationGoBackward() {
  if (eventSliderOb != null) {
    eventSliderOb.moveSliderBackward();
  }
}

/**
 * Animates through all the events
 */
function animationPlay() {
  if (eventSliderOb == null)
    return;
  eventSliderOb.playButtonClicked();
  var playButton = document.getElementById('animPlayBtn');
  var img = playButton.children[0];
  if (eventSliderOb.isPlayActive())
    img.src = "./images/Button-Pause-16.png";
  else
    img.src = "./images/Button-Play-16.png";
}

function closeInfoWindow(toggleVar) {
  map.infoWindow.hide();
  toggleVar ? true : false;
}

function setCurrentLayerUrl(url) {
  if (debug) { console.log("currentLayerUrl = " + url); }
	currentLayerUrl = url;
}

function showOutageBox() {
	document.getElementById("serviceOutageFrame").style.zIndex=9999;
	document.getElementById("serviceOutageFrame").style.display="block";
}

/* Hide DOD Warning Banner when accepted */
function acceptDODWarning() {
  div = document.getElementById("DODNoticeFrame");
  div.style.display = "none";
  div.style.zIndex = -9999;
  if(downServices.length > 0)
  {
	buildServiceOutage();
	document.getElementById("serviceOutageFrame").style.zIndex=9999;
	document.getElementById("serviceOutageFrame").style.display="block";
  }
}

/* Hide Outage Warning Banner when accepted */
function acceptOutageWarning() {
  div = document.getElementById("serviceOutageFrame");
  div.style.display = "none";
  div.style.zIndex = -9999;
}

/* Build Service Outage Message */
function buildServiceOutage() {
  var fullMsg = "";
	var msgLayers = "";
	downServices.forEach(function(entry) {
		fullMsg += "<center><strong>Model:</strong> " + entry + "</center><br/>" + "<center><strong><u>Affected Layers</u></strong></center>";
		Array.prototype.forEach.call(Object.keys(categoryJSON), function(key) {
			if(key.includes(entry)){    
				msgLayers += ", " + categoryJSON[key].Title;
			}
		});
		fullMsg += msgLayers.substr(2) + "<br/><br/>";
	});
	document.getElementById("outageList").innerHTML = fullMsg;
}

function zoomTo()
{
	require([
	"esri/geometry/Point",
	"esri/SpatialReference"

	], function( 
		Point,
		SpatialReference
		){
		map.setLevel(3);
		var point = new Point([-56.049, 38.485],new SpatialReference({ wkid:4326 }));
		map.centerAt(point);
		});
}

/* Set the width of the side navigation to 250px */
function showLegend() {
  document.getElementById("legendDiv").style.width = "150px";
}

/* Set the width of the side navigation to 0 */
function hideLegend() {
  document.getElementById("legendDiv").style.width = "0";
}

/* Update the legend image */
function updateLegend(layerName) {
  // FIX LATER ====
  // Height and Width are hard-coded to 20 pixels here, which is the case for most FNMOC layers
  // But not all of them. Scraping GetCapabilities should take note of the LegendURL in the future
  imgURL = currentLayerUrl + "?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=" + layerName;
  var img = new Image(); 
  img.src = imgURL;
  document.getElementById('legendArea').innerHTML = "";
  document.getElementById('legendArea').appendChild(img);
  if (debug) console.log("Loaded new legend - " + imgURL);
}

/* Turn on or off the particle layer */
function toggleWindyVectors() {
  // If there were previous windy errors and this layer is not active, don't do anything
  if (!windy) {
    return;
  }
  btn = document.getElementById("windyToggleBtn");
  if (btn.checked) {
    var extent = map.geographicExtent;
    mapZoom = map.getZoom();
    windy.start(
      [[0,0],[map.width, map.height]],
      map.width,
      map.height,
      [[extent.xmin, extent.ymin],[extent.xmax, extent.ymax]]
    );
  }
  else {
    windy.stop();
    rasterLayer.clear();
  }
}

/* Scroll up or down on the layer selector */
function mlsScroll(direction) {
  var distance = 400;
  var div = document.getElementById("mainLayerSelector");
  if (direction > 0) {
    if (div.scrollBy) { div.scrollBy(0, -1 * distance); }
    else { div.scrollTop -= distance; }
  }
  else {
    if (div.scrollBy) { div.scrollBy(0, distance); }
    else { div.scrollTop += distance; }
  }
}

/**
 * Create category buttons -- called for each category button
 * Called additionally when "Show More" is clicked
 */
function createCategoryButtons(par, more) {
	var primary = "";
	var secondary = "";
	if (par.indexOf('/') >= 0) {
		primary = par.split('/')[0];
		secondary = par.split('/')[1]
	}

	// Set up the category button
  var btn = document.createElement("button");
	btn.id = par;
	btn.innerHTML = par;
	btn.setAttribute("data-more", more);

  // Create a div container for the category button
	var cDiv = document.createElement("div");
	cDiv.className = "categoryBtnOff";
  cDiv.appendChild(btn);

	// Show/Hide the subcategory div when category button is clicked
	btn.addEventListener("click", function() {
		var catDiv = document.getElementById(this.id + "_div");
		this.parentElement.classList.toggle("categoryBtnOn");
		this.parentElement.classList.toggle("categoryBtnOff");
		catDiv.classList.toggle("categoryDivOpen");
		catDiv.classList.toggle("categoryDivClosed");
	});

	// Create the div that will hold the subcategory buttons
	var sDiv = document.createElement("div");
	sDiv.className = "categoryDiv categoryDivClosed";
  sDiv.id = par + "_div";

	if (secondary === "") {
		// Layers without a secondary category are added to the main list
		span = document.getElementById("sublayerContainer");
		span.appendChild(cDiv);
		span.appendChild(sDiv);
	}
	else {
		// Layers with a secondary category are added to their respective main categories
		var subcatDiv = document.getElementById(primary + "_div");
		subcatDiv.appendChild(cDiv);
		subcatDiv.appendChild(sDiv);
	}
}

/**
 * Called at the beginning  -- create the category buttons
 * and again on "Show More" -- create additional category buttons
 */
function createButtons(j,moreFlag) {
	Array.prototype.forEach.call(Object.keys(j), function(key) {
		var par = j[key].Parent;
		var more = j[key].More;
		if (!categoriesArray.includes(par) && more == moreFlag && par != "NOSHOW" && par.length > 0) {
			categoriesArray.push(par);
			if (par.indexOf('/') >= 0 && !categoriesArray.includes(par.split('/')[0])) {
				createCategoryButtons(par.split('/')[0],more);
				categoriesArray.push(par.split('/')[0],more);
			}
			createCategoryButtons(par,more);
		}
	});
}

/**
 * Queue up GetCapabilities calls based on what is specified in the JSON
 */
function callGetCapabilitiesFromJSON(serviceJSON, moreFlag) {
  Array.prototype.forEach.call(Object.keys(serviceJSON), function(key) {
    var serviceLink = serviceJSON[key].url;
    var resolution = serviceJSON[key].res;
    var parameter = serviceJSON[key].param;
    var more = serviceJSON[key].more;
    if (more == moreFlag) {
      getCapabilities(serviceLink, resolution, parameter, moreFlag);
    }
  });
  
}

/**
 * Call GetCapabilities to dynamically add in services to the layer list
 */
async function getCapabilities(url, res, param, extras) {
	try {
    var layerJSON = "{}";    
		// Preload the JSON layer list
		await fetch(LAYER_LIST_URL).then(function(response) {
			return response.text();
		}).then(function(text) {
			layerJSON = JSON.parse(text);				
		});
		// Fetch GetCapabilities
		await fetch(url + getCapUrlEnd).then(function(response) {
			if(response.status != 200)
			{
				downServices.push(param);
				buildServiceOutage();
				document.getElementById("outaegIconLayer").style.display = "block";
			}
			return response.text();
		}).then(function(text) {
      parser = new DOMParser();
      data = parser.parseFromString(text, "text/xml");
      //write the xml to the getCapStore for later use
      getCapStore[url]=data;
      var layersDom = data.getElementsByTagName('Layer');
      for (layersIndex = 1; layersIndex < layersDom.length; layersIndex++) {
        var layerDom = layersDom[layersIndex];
        var nameDom = layerDom.getElementsByTagName('Name');
        for (var index = 0; index < nameDom.length; index++) {
          var name = nameDom[index].childNodes[0].nodeValue;
          // Keep looping if this name is not in the JSON
          if (Object.keys(layerJSON).indexOf(name) < 0) {
            continue;
          }
          //if the button is already been created don't make it again
          if (buttonsArray.includes(name)){
            continue;
          }
          var more = layerJSON[name].More;
          var particle2Display = layerJSON[name].Particle;
          // For names that match the criteria, create a button for it
          if (name.includes(param) && name.includes(res) && more == extras) {
            var btn = document.createElement("button");
            btn.setAttribute("data-layer-name", name);
            btn.setAttribute("data-url", url);
            btn.setAttribute("data-more", more);
			btn.setAttribute("data-particle", particle2Display);
            btn.innerHTML = layerJSON[name].Title;
            // Add listener to activate the service when button is clicked
            btn.addEventListener("click", function() {
              // Clear the current layer from the workspace first
              clearCurrentLayer();
              // Style the button to show that it is selected
              this.classList.add("selectedLyrBtn");
              currentSelectedBtn = this;
              // Retrieve the data parameters for the new layer
              var wmsURL = this.getAttribute("data-url");
              var parameterToLoad = this.getAttribute("data-layer-name");
              // Show the loading panel
              document.getElementById("loadingGifFrame").style.visibility = "visible";
              document.getElementById("loadingGifFrame").style.zIndex = 10;
              document.getElementById('nameLabel2').textContent = parameterToLoad;
              // Register an event that will be triggered from inside the WMSLayerWithTime class
              //   when the WMS is fully loaded; then the next step happens
              // Note: this event name is also used for custom WMS, pointing to a different function
              wmsLayer = new WMSLayerWithTime(wmsURL, parameterToLoad);
              document.addEventListener("WMSDimensionsLoaded", wmsParsedCapabilities, false);
              // Update particle layer
              windWave = particle2Display;
              windWaveChange();
              updateWindyLayer();
              // Remember the current URL to use later
              setCurrentLayerUrl(wmsURL);
              // Update the legend
              updateLegend(parameterToLoad);
            });
            buttonsArray.push(name);
            layerButtons.push(btn);
            // Add the button to its container div
            var cDiv = document.createElement("div");
            cDiv.appendChild(btn);
            // Check the parent attribute to find out where the button belongs
            var parent = layerJSON[name].Parent;
            if (parent == "") {
              // Elements without parents get added to the main list
              span = document.getElementById("layerContainer");
              span.appendChild(cDiv, span.lastElementChild);
            }
            else if (parent != "NOSHOW") {
              // Elements with parents are added to the proper category or subcategory
              var subcatDiv = document.getElementById(parent + "_div");
              cDiv.className = "subcategoryBtn";
              subcatDiv.appendChild(cDiv);
            }
          }
        }
      }
    });
	}
	catch(err) {
		console.log(err);
	}
}

/**
 * Convert Time to proper file format
 */
function convertTimetoFileFormat(time){
	var date = time.split(":")[0].split("-")
	return parseInt(date[1]).toString() + "_" + parseInt(date[2]).toString() + "_" + date[0];
}

/**
 * Update the particle vectors on the screen
 */
function updateWindyLayer() {
	btn = document.getElementById("windyToggleBtn");
  if (!btn.checked) {
    return;
  }
  // Stop the current animation
  if (windy) {
    windy.stop();
  }
  rasterLayer.clear();
  // Initiate the new animation
	require(["esri/request", "plugins/RasterLayer"], function(esriRequest, RasterLayer) {
    var layersRequest = esriRequest({
      //url: WINDY_FILES_URL + currentTime + '/' + 'gfs_' + currentNDim + '.json',
      url: WINDY_FILES_URL + currentTime + '/' + 'T' + currentNDim + '.json',
      content: {},
      handleAs: "json"
    });

    layersRequest.then(function(response) {
	  if(windy){windy.stop();} //stops double particle bug. updateWindyLayer gets called twice when loading layer??
      windy = new Windy({ canvas: rasterLayer._element, data: response });
      if (btn.checked) {
        redrawWindy();
      }
		}, function(error) {
      console.log("Error loading Windy Vectors: ", error.message);
    });

    function redrawWindy() {
      rasterLayer._element.width = map.width;
      rasterLayer._element.height = map.height;
      // Check whether windy vectors should be redrawn also
      toggleWindyVectors();
    }
  });
}

function openWindySettings(){
  settingsPanel = document.getElementById("ParticleSettingsPanel");
  if(settingsPanel.style.visibility === "visible"){
    closeWindySettings();
    return;
  }
  settingsPanel.style.visibility = "visible";
  settingsPanel.style.zIndex = 900;
  settingsPanel.classList.add("fade-in");
}

function closeWindySettings(){
  settingsPanel = document.getElementById("ParticleSettingsPanel");
  settingsPanel.style.visibility = "hidden";
  settingsPanel.style.zIndex = 0;
  settingsPanel.classList.remove("fade-in");
}

function updateAnimationSpeed() {
	document.getElementById("animationSpeedDisplay").innerHTML = document.getElementById('animationSpeed').value;
	if (eventSliderOb != null) {
	  changeTimerVal();
    }
}

function updateWindySettings(){
  sliders = document.getElementsByClassName('settingSlider');
  displays = document.getElementsByClassName("sliderValue");
  for(i = 0; i < displays.length; i++){
	  if(displays[i].id != "animationSpeedDisplay")
    displays[i].textContent = sliders[i].value*10; //iterate through the displays and update the text with current values
  }
  windyParticleSetting = sliders[0].value/10; //update global variables with slider values
  windyVelocitySetting = sliders[1].value/10; 
  radios = document.getElementsByName(windWave + "Colorscale");
  for(let radio of radios){
    if(radio.checked){
      intensityColorSetting = radio.value; //update global variable with intensity color setting
    }
  }
  toggleWindyVectors(); //refresh particles
}

function windWaveSettingsToggle(){
  toggle= document.getElementById("windWaveToggleBtn");
  if(toggle.checked){
    windWave = "Wave";
  }
  else {
    windWave = "Wind";
  }
  windWaveChange();
  updateWindyLayer();
}

function windWaveChange(){
  WINDY_FILES_URL = "./" + windWave + "GeoJson/";
  particleAnimToggle = document.getElementById("windyToggleBtnRound");
  windWaveToggleValue = document.getElementById("windWaveValue");
  windWaveToggleBtn = document.getElementById("windWaveToggleBtn");
  switch (windWave){
    case "Wind":
      particleAnimToggle.title = "UNCLASSIFIED - Wind Data from NAVGEM";
      form = document.getElementById("WindForm");
      form.style.display = "inline";
      form = document.getElementById("WaveForm");
      form.style.display = "none";
      windWaveToggleBtn.checked = false;
      windWaveToggleValue.textContent = "Wave";
      windWaveToggleValue.style.textIndent = "12px";
      break;
    case "Wave":
      particleAnimToggle.title = "UNCLASSIFIED - Wave Data from WW3";
      form = document.getElementById("WaveForm");
      form.style.display = "inline";
      form = document.getElementById("WindForm");
      form.style.display = "none";
      windWaveToggleBtn.checked = true;
      windWaveToggleValue.textContent = "Wind";
      windWaveToggleValue.style.textIndent = "-12px";
      break;
  } 
  radios = document.getElementsByName(windWave + "Colorscale");
  for(let radio of radios){
    if(radio.checked){
      intensityColorSetting = radio.value;
    }
  }
}

/***
* funtion to activate navigation tool and change cursor to crosshairs
*
****/    
function bboxChange(box) {
	require([
        "esri/toolbars/navigation",
      ],
        function (Navigation) {
			
			if(box.checked) {
			//document.getElementById("mainWindow").style.cursor = "crosshair";
				map.setCursor("crosshair");
				navToolbar.activate(Navigation.ZOOM_IN);
			}
			else {
				//document.getElementById("mainWindow").style.cursor = "default";
				map.setCursor("default");
				navToolbar.deactivate();
			}
		});
	
}

/***
* funtion to search all buttons on page and filter by keyword. populates a hidden div with the search results
*
****/   
function searchLayers() {
	var param = document.getElementById("search").value;
	document.getElementById("searchDiv").innerHTML="";
	if(param.length > 2) {
		document.getElementById("layerContainer").style.display="none";
		document.getElementById("searchDiv").style.display="block";
		layerButtons.forEach(function(entry) {
			if(entry.textContent.toLowerCase().includes(param.toLowerCase()))
			{
				var newbtn = entry.cloneNode();
				newbtn.addEventListener("click", function() {
              // Clear the current layer from the workspace first
              clearCurrentLayer();
              // Style the button to show that it is selected
              this.classList.add("selectedLyrBtn");
              currentSelectedBtn = this;
              // Retrieve the data parameters for the new layer
              var wmsURL = this.getAttribute("data-url");
              var parameterToLoad = this.getAttribute("data-layer-name");
              // Show the loading panel
              document.getElementById("loadingGifFrame").style.visibility = "visible";
              document.getElementById("loadingGifFrame").style.zIndex = 10;
              document.getElementById('nameLabel2').textContent = parameterToLoad;
              // Register an event that will be triggered from inside the WMSLayerWithTime class
              //   when the WMS is fully loaded; then the next step happens
              // Note: this event name is also used for custom WMS, pointing to a different function
              wmsLayer = new WMSLayerWithTime(wmsURL, parameterToLoad);
              document.addEventListener("WMSDimensionsLoaded", wmsParsedCapabilities, false);
              // Update particle layer
              windWave = this.getAttribute("data-particle");;
              WINDY_FILES_URL = "./" + windWave + "GeoJson/";
              updateWindyLayer();
              // Remember the current URL to use later
              setCurrentLayerUrl(wmsURL);
              // Update the legend
              updateLegend(parameterToLoad);
            });
				newbtn.textContent = entry.textContent;
				var cDiv = document.createElement("div");
				cDiv.appendChild(newbtn);
				span = document.getElementById("searchDiv");
				span.appendChild(cDiv, span.lastElementChild);
			}
		});
	}
	else if(param.length == 0){
		document.getElementById("layerContainer").style.display="block";
		document.getElementById("searchDiv").style.display="none";
	}
}
/***
* funtion to handle the changing of custom layer loads tabs
*
****/
function openTab(evt, tab) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("layerSelectTabcontent");
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tab).style.display = "block";
	evt.currentTarget.className += " active";
}

/***
* funtion to add kml or kmz files to the map
*
****/
function kmlAdd() {
	require([
        "esri/layers/KMLLayer",
      ],
        function (KMLLayer) {
			var kml_url = document.getElementById("kmlTextInput").value;
			if(kml_url != ""){
				document.getElementById("loadingGifFrame").style.visibility = "visible";
				document.getElementById("loadingGifFrame").style.zIndex = 10;
				document.getElementById('nameLabel2').textContent = "Loading Custom KML";
				kmlLayer = new KMLLayer(kml_url);
				map.addLayer(kmlLayer);
				kmlLayer.on("load", function() {
					document.getElementById("loadingGifFrame").style.visibility = "hidden";
					document.getElementById("loadingGifFrame").style.zIndex = -9999;
					document.getElementById('nameLabel2').textContent = "";
				});
				fourDLayerID = kmlLayer.id;
				map.reorderLayer(kmlLayer,1);
				closeCustomLayerPanel();
			}
			else{
				window.alert("Please enter a URL to KML or KMZ");
			}
		});
	
}    
