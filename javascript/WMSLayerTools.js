/* 
 * 
 * requires inclusion of layout.js, slideInPanel.js, WMSLayerTools.css 
 *
 */

/////////  GLOBAL VARS  /////////

//controls the console.log messages
var debug = false;

//number of significant digits to use in the posted layer value
var valueSignificantDigits = 4;
//var getCapabilitiesUrlPart = "/?request=GetCapabilities";
//var getFeatureInfoUrlPart = "/ows?SERVICE=WMS&version=1.3.0&request=GetFeatureInfo"
var XMLTags = {
  "bBox":{"parent":"EX_GeographicBoundingBox",
    "west":"westBoundLongitude",
    "east":"eastBoundLongitude",
    "south":"southBoundLatitude",
    "north":"northBoundLatitude"},
  "title":"Title",
  "crs":"CRS",
  "crsTarget":"EPSG",
  "layer":"Layer"
};

/**
 * Updates the infoWindow popup with layer value information
 * 
 * @param {WMSLayer} glvWMSLayer
 * @param {mapPoint} glvMp
 * @param {Popup object} profilePopup
 * @returns {undefined}
 */
function setPopupWMSLayerValue(glvWMSLayer,glvMp,profilePopup){
  if(debug){console.log("glvWMSLayer",glvWMSLayer);}    
  if(debug){console.log("glvMp",glvMp);}

//  //needed vars
//  var layerTitle = null;
//  var crs = null;
//  var bBox = {};

  var parsedGetCap = parseGetCapabilities(glvWMSLayer.url,XMLTags,glvWMSLayer.paramsOb.layers);
  
  //get the value and set the popup title and content
  var url = buildValueInfoURL(glvWMSLayer, glvMp.x, glvMp.y,parsedGetCap.crs,parsedGetCap.bBox);
  
  //test the return from the builder - a null value indicates a problem with the builder and the user must be notified without crashing the script
  if (url === null){
    var contentText = "<div class='li-content li-layerTitle'>" + parsedGetCap.title  +"</div>"
              + "<div class='li-content li-latLon'>Latitude, Longitude:<br/>" + glvMp.y.toFixed(2)  + ", " + glvMp.x.toFixed(2)+"</div>"
              + "<div class='li-content li-value'>Value:<br/>Value unable to be retrieved. Please contact POC if the problem persists.</div>";
      profilePopup.resize(300,700);
      profilePopup.setTitle("Layer Value at Coordinate <div onClick='closeProfilePopup()' class='closeProfile'>X</div>");
      profilePopup.setContent(contentText);
  }else{
    if(debug){console.log("glvWMSLayer.getDimensions(glvWMSLayer.paramsOb.layers)",glvWMSLayer.getDimensions(glvWMSLayer.paramsOb.layers));}
    if(debug){console.log("buildValueInfoURL(bglvWMSLayer, glvMp.x, glvMp.y,crs,bBox)",url);}

    try {
      fetch(url, { credentials: "same-origin", mode: "cors" }).then(function (response) {
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
          if (debug){console.log(url);}
          //if (debug){console.log(text);}
          value = "Not Available";          
        }else{
          value = Number.parseFloat(xmlDoc.getElementsByTagName(glvWMSLayer.paramsOb.layers)[0].childNodes[0].childNodes[0].nodeValue);
         if (value === -9999) {
            // Missing temps are returned by HYCOM GLOBAL as -9999
            value = "Not Available";
          }else{          
            value = value.toPrecision(valueSignificantDigits);
          }
        }

        var contentText = "<div class='li-content li-layerTitle'>" + parsedGetCap.title  +"</div>"
                + "<div class='li-content li-latLon'>Latitude, Longitude:<br/>" + glvMp.y.toFixed(2)  + ", " + glvMp.x.toFixed(2)+"</div>"
                + "<div class='li-content li-value'>Value:<br/>"+value+"</div>";
        profilePopup.resize(300,700);
        profilePopup.setTitle("Layer Value at Coordinate <div onClick='closeProfilePopup()' class='closeProfile'>X</div>");
        profilePopup.setContent(contentText);
        if(debug){console.log("value",value);}
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
  }
  /**
   * Builds the URL for a GetFeatureInfo request to retrive the layer value at a given point
   * 
   * @param {WMSLayer object} bldWMSLayer
   * @param {string} buildX - mapPoint.x
   * @param {string} buildY - mapPoint.y
   * @param {string} crs
   * @param {object} bBox
   * @returns {String}
   */
  
}

/**
 * 
 * @param {type} pgc_url
 * @param {type} XMLTagsObj
 * @returns {undefined}
 * 
 * XMLTagsObj must include the following items
 * {
 *  "bBox":{ //bounding box
 *    "parent":"EX_GeographicBoundingBox", //the tag that contains the box components the other tags are children of this tag
 *    "west":"westBoundLongitude", 
 *    "east":"eastBoundLongitude",
 *    "south":"southBoundLatitude",
 *    "north":"northBoundLatitude"
 *  },
 *  "title":"Title", //tag for the title
 *  "crs":"CRS", //tag holding the coordinate systems
 *  "crsTarget":"EPSG", //type of CRS desired
 *  "layer":"Layer" //tag for the layer items
 * };
 */
function parseGetCapabilities(pgc_url,XMLTagsObj,targetLayer){
  var parsedGetCap = {};
  parsedGetCap["bBox"]={};
  try {
    var parser = new DOMParser();
    //don't call get cap if it's already stored 
    if (getCapStore[pgc_url] !== undefined ){
      var xmlDoc = getCapStore[pgc_url];
      if(debug){console.log ("saved a get cap call!",pgc_url);}
    }
    else{
      //httpGet is in slideInPanel.js
      var xmlDoc = parser.parseFromString(httpGet(pgc_url+getCapUrlEnd),"text/xml");  
      //add the layer's get cap to the store
      getCapStore[pgc_url] = xmlDoc;
      if(debug){console.log ("made a get cap call.",pgc_url);}
    }    
    var capLayers = xmlDoc.getElementsByTagName(XMLTagsObj.layer);
    //loop through the results, but not the __proto__ object
    for (let l=0; l<capLayers.length; l++){
      //does the service's layer name match the target layer name? 
      if(capLayers[l].children[0].innerHTML === targetLayer){
        //get the title to use as a layer description
        parsedGetCap["title"] = capLayers[l].getElementsByTagName(XMLTagsObj.title)[0].innerHTML;
        //get the targeted value of the CRS variables to use in the getFeatureInfo URL
        var crsEl = capLayers[l].getElementsByTagName(XMLTagsObj.crs);
        for (var i in crsEl){
          if (crsEl[i].innerHTML.includes(XMLTagsObj.crsTarget)){
             parsedGetCap["crs"] = crsEl[i].innerHTML;
            break;
          }
        }
        //build the bounding box
        parsedGetCap["bBox"]["minX"] = capLayers[l].getElementsByTagName(XMLTagsObj.bBox.parent)[0].getElementsByTagName(XMLTagsObj.bBox.west)[0].innerHTML;
        parsedGetCap["bBox"]["maxX"] = capLayers[l].getElementsByTagName(XMLTagsObj.bBox.parent)[0].getElementsByTagName(XMLTagsObj.bBox.east)[0].innerHTML;
        parsedGetCap["bBox"]["minY"] = capLayers[l].getElementsByTagName(XMLTagsObj.bBox.parent)[0].getElementsByTagName(XMLTagsObj.bBox.south)[0].innerHTML;
        parsedGetCap["bBox"]["maxY"] = capLayers[l].getElementsByTagName(XMLTagsObj.bBox.parent)[0].getElementsByTagName(XMLTagsObj.bBox.north)[0].innerHTML;
      }
    }
    return parsedGetCap;
  }
  catch (error){
    console.log("::ERROR:: GetCapabilities request and parse failed: ",error);
    console.log("URL: ",pgc_url+getCapUrlEnd);
  }
}

/**
 * 
 * uses a WMSLayer object to build a getFeatureInfo url 
 * 
 * @param {WMSLayer object} bldWMSLayer
 * @param {string} buildX
 * @param {string} buildY
 * @param {string} crs
 * @param {object} bBox - object with values for "minX", "minY", "maxX", "maxY"
 * @param {number} buildElevation - (optional) used to override the object's elevation dimension value if it exists
 * @returns {String}
 */
function buildValueInfoURL(bldWMSLayer, buildX, buildY, crs, bBox, buildElevation=null){
  //if maxHeight is not provided by the server, hope it's FNMOC and can be parsed from the layer name
  var maxHeight = 0;
  var maxWidth = 0;
  if (typeof bldWMSLayer.maxHeight !== "undefined"){
    maxHeight = bldWMSLayer.maxHeight;
    maxWidth = bldWMSLayer.maxWidth;
  }else{ 
    try {
      //"HYCOM_GLOBAL:global_2880x1441.sea_temp.dpth_sfc"
      var lyr = bldWMSLayer.paramsOb.layers;
      lyr = lyr.split(".")[0];
      lyr = lyr.split("_").pop();
      lyr = lyr.split("x");
      maxHeight = lyr[1];
      maxWidth = lyr[0];
    }
    catch (error) {
      console.log("Layer " + bldWMSLayer.paramsOb.layers + " had no maxHeight property and the value could not be parsed from the layer name. A GetFeatureInfo URL cannot be created for this layer."); 
      console.log("ERROR: ",error);
      return null;
    }
  }

  var scaledI =  Math.floor(scaleValue(Number.parseFloat(buildX),[bBox.minX,bBox.maxX],[0,Number.parseFloat(maxWidth)]));
  var scaledJ =  Math.floor(scaleValue(Number.parseFloat(buildY),[bBox.minY,bBox.maxY],[Number.parseFloat(maxHeight),0]));
  var urlBBox = '&BBOX='+bBox.minY+','+bBox.minX+','+bBox.maxY+','+bBox.maxX+'&WIDTH='+maxWidth+'&HEIGHT='+maxHeight+'&I='+scaledI+'&J='+scaledJ;
  var featureInfoUrlLayers = "&LAYERS="+bldWMSLayer.paramsOb.layers+"&QUERY_LAYERS="+bldWMSLayer.paramsOb.layers;
  var featureInfoUrlParams ="&CRS="+crs+"&STYLES=&EXCEPTIONS=XML&FORMAT="+bldWMSLayer.paramsOb.format+"&INFO_FORMAT=text/xml&FEATURE_COUNT=50";
  //["time", "elevation", "ANALYSIS_TIME"]
  //urlRow = '&'+ftPfLayerObj.dimensions.rows.xmlDimType.toUpperCase()+'=';
  //+ urlRow + checkRowPfLayerObj.dimensions.rows.serverValues[j] + urlCol + checkRowPfLayerObj.dimensions.columns.values[0].replace(":","%3A");
  var dimsURL = "";
  var dims=bldWMSLayer.getDimensions(bldWMSLayer.paramsOb.layers);

  for (var d=0;d<dims.length;d++){
    //if an elevation is submitted, try to use it
    
    if (dims[d].toUpperCase() === "ELEVATION" && buildElevation !==null){
      dimsURL += '&'+dims[d].toUpperCase()+'='+buildElevation;
    }else{
      dimsURL += '&'+dims[d].toUpperCase()+'='+bldWMSLayer.paramsOb[dims[d]];
    }

  }
  //getFeatureInfoUrlEnd is defined in layout.js
  return bldWMSLayer.wmsURL + getFeatureInfoUrlEnd + featureInfoUrlLayers + featureInfoUrlParams + urlBBox + dimsURL;
}

/**
 * recursively copies an object to a completely new object
 * 
 * @param {object} inObject
 * @returns {Array}
 */
const deepCopyFunction = (inObject) => {
  let outObject, value, key

  if (typeof inObject !== "object" || inObject === null) {
    return inObject // Return the value if inObject is not an object
  }

  // Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {}

  for (key in inObject) {
    value = inObject[key]

    // Recursively (deep) copy for nested objects, including arrays
    outObject[key] = deepCopyFunction(value)
  }

  return outObject
}