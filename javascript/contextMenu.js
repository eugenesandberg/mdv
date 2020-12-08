/**
 * Creates a context menu and binds it to the DOM
 * 
 * @returns {undefined}
 */
function createToolbarAndContextMenu() {
	require([
			"esri/map", "esri/geometry/Point", 
			"dijit/Menu", "dijit/MenuItem", "dijit/MenuSeparator",
			"esri/geometry/webMercatorUtils",
			"dijit/form/Button", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", 
			"dojo/domReady!"
		], function(
			Map, Point, 
			Menu, MenuItem, MenuSeparator,
			webMercatorUtils
		) {
			//parser.parse();
			createMapMenu();
			
			function createMapMenu() {
				// Creates right-click context menu for map
				ctxMenuForMap = new Menu({
					onOpen: function(box) {
						// Lets calculate the map coordinates where user right clicked.
						// We'll use this to create the graphic when the user clicks
						// on the menu item to "Add Point"
						mp = getMapPointFromMenuPosition(box);	
						mapX = mp.x;
						mapY = mp.y;			
					}
				});
				profileMenuItem = new MenuItem({ 
					label: "Sound Speed Profile",
					onClick: function() {doProfile(mp);}
				});				
				ctxMenuForMap.addChild(profileMenuItem);
				
				//if the forecast point option is displayed on the context menu, update the click action with the position 
        // forecastMenuItem,forecastAndProfileMenuItem,map - all declared in layout.js
				if (ctxMenuForMap.getIndexOfChild(forecastMenuItem) !== -1){
					forecastMenuItem.set('onClick', function() {openSlider(mp);});
				}
				if (ctxMenuForMap.getIndexOfChild(forecastAndProfileMenuItem) !== -1){
					forecastAndProfileMenuItem.set('onClick', function() {openSlider(mp);doProfile(mp);});
				}
				
				ctxMenuForMap.startup();
				ctxMenuForMap.bindDomNode(map.container);
			}
			
			// Helper Methods
			function getMapPointFromMenuPosition(box) {
				var x = box.x, y = box.y;
				switch( box.corner ) {
					case "TR":
						x += box.w;
						break;
					case "BL":
						y += box.h;
						break;
					case "BR":
						x += box.w;
						y += box.h;
						break;
				}			
				var screenPoint = new Point(x - map.position.x, y - map.position.y);
				return webMercatorUtils.webMercatorToGeographic(map.toMap(screenPoint));
			}
      
		}
	);
}