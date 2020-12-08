/*  Global class for simulating the movement of particle through a 1km wind grid

    credit: All the credit for this work goes to: https://github.com/cambecc for creating the repo:
      https://github.com/cambecc/earth. The majority of this code is directly take nfrom there, since its awesome.

    This class takes a canvas element and an array of data (1km GFS from http://www.emc.ncep.noaa.gov/index.php?branch=GFS)
    and then uses a mercator (forward/reverse) projection to correctly map wind vectors in "map space".

    The "start" method takes the bounds of the map at its current extent and starts the whole gridding,
    interpolation and animation process.
*/

var Windy = function( params ){
  var VELOCITY_SCALE;             // scale for wind velocity, gets updated later in start()
  var INTENSITY_COLOR_SCALE = 0;            // step size of particle intensity color scale, , gets updated later in start()
  var MAX_WIND_INTENSITY = 40;              // wind velocity at which particle intensity is maximum (m/s)
  var MAX_PARTICLE_AGE = 25;                // max number of frames a particle is drawn before regeneration
  var PARTICLE_LINE_WIDTH = 3;              // line width of a drawn particle
  var PARTICLE_MULTIPLIER;      // particle count scalar, gets updated later in start()
  var PARTICLE_REDUCTION = 0.2;            // reduce particle count to this much of normal for mobile devices
  var FRAME_RATE = 20;                      // desired milliseconds per frame
  var BOUNDARY = 0.45;
  var FADE_FILL_STYLE = "rgba(0, 0, 0, 0.97)"; //opacity controls length of particle tail

  var NULL_WIND_VECTOR = [NaN, NaN, null];  // singleton for no wind in the form: [u, v, magnitude]
  var TRANSPARENT_BLACK = [255, 0, 0, 0];

  var tau = 2 * Math.PI;
  var H = Math.pow(10, -5.2);

  // interpolation for vectors like wind (u,v,m)
  var bilinearInterpolateVector = function(x, y, g00, g10, g01, g11) {
      var rx = (1 - x);
      var ry = (1 - y);
      var a = rx * ry,  b = x * ry,  c = rx * y,  d = x * y;
      var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
      var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
      return [u, v, Math.sqrt(u * u + v * v)];
  };


  var createWindBuilder = function(uComp, vComp) {
      var uData = uComp.data, vData = vComp.data;
      return {
          header: uComp.header,
          //recipe: recipeFor("wind-" + uComp.header.surface1Value),
          data: function(i) {
              return [uData[i], vData[i]];
          },
          interpolate: bilinearInterpolateVector
      }
  };

  var createWaveBuilder = function(uComp, vComp) {
      var dirData = uComp.data, perData = vComp.data;
      return {
          header: uComp.header,
          data: function(i) {
              if(isValue(dirData[i]) && isValue(perData[i])){
                  var dir = dirData[i] / 360 * (2 * Math.PI);
                  var m = perData[i];
                  var u = -m * Math.sin(dir);
                  var v = -m * Math.cos(dir);
                  return [u, v];
              } 
              else {
                  return null;
              }
          },
          interpolate: bilinearInterpolateVector
      }
  };

  var createBuilder = function(data) {
      var uComp = null, vComp = null, scalar = null;

      uComp = data[0]; //used for operational data (T00.json)
      vComp = data[1];
	  
	//uncomment for gfs_XX.json data
    //   data.forEach(function(record) {
    //       switch (record.header.parameterCategory + "," + record.header.parameterNumber) {
    //           case "2,2": uComp = record; break;
    //           case "2,3": vComp = record; break;
    //           default:
    //             scalar = record;
    //       }
    //   });

    switch(windWave){
        case "Wind":
            return createWindBuilder(uComp, vComp);
        case "Wave":
            return createWaveBuilder(uComp, vComp);
    }

  };

  var buildGrid = function(data, callback) {
      var builder = createBuilder(data);

      var header = builder.header;
      var lambda0 = header.lo1, phi0 = header.la1;  // the grid's origin (e.g., 0.0E, 90.0N)
      var deltaLambda = header.dx, deltaPhi = header.dy;    // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)
      var ni = header.nx, nj = header.ny;    // number of grid points W-E and N-S (e.g., 144 x 73)
      var date = new Date(header.refTime);
      date.setHours(date.getHours() + header.forecastTime);

      // Scan mode 0 assumed. Longitude increases from lambda0, and latitude decreases from phi0.
      // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
      var grid = [], p = 0;
      var isContinuous = Math.floor(ni * deltaLambda) >= 360;
      for (var j = 0; j < nj; j++) {
          var row = [];
          for (var i = 0; i < ni; i++, p++) {
              row[i] = builder.data(p);
          }
          if (isContinuous) {
              // For wrapped grids, duplicate first column as last column to simplify interpolation logic
              row.push(row[0]);
          }
          grid[j] = row;
      }

      function interpolate(lambda, phi) {
          var i = floorMod(lambda - lambda0, 360) / deltaLambda;  // calculate longitude index in wrapped range [0, 360)
          var j = (phi0 - phi) / deltaPhi;                 // calculate latitude index in direction +90 to -90

          var fi = Math.floor(i), ci = fi + 1;
          var fj = Math.floor(j), cj = fj + 1;

          var row;
          if ((row = grid[fj])) {
              var g00 = row[fi];
              var g10 = row[ci];
              if (isValue(g00) && isValue(g10) && (row = grid[cj])) {
                  var g01 = row[fi];
                  var g11 = row[ci];
                  if (isValue(g01) && isValue(g11)) {
                      // All four points found, so interpolate the value.
                      return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
                  }
              }
          }
          return null;
      }
      callback( {
          date: date,
          interpolate: interpolate
      });
  };



  /**
   * @returns {Boolean} true if the specified value is not null and not undefined.
   */
  var isValue = function(x) {
      return x !== null && x !== undefined;
  }

  /**
   * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
   *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
   */
  var floorMod = function(a, n) {
      return a - n * Math.floor(a / n);
  }

  /**
   * @returns {Number} the value x clamped to the range [low, high].
   */
  var clamp = function(x, range) {
      return Math.max(range[0], Math.min(x, range[1]));
  }

  /**
   * @returns {Boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
   */
  var isMobile = function() {
      return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
  }

  /**
   * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
   * vector is modified in place and returned by this function.
   */
  var distort = function(projection, lambda, phi, x, y, scale, wind, windy) {
      var u = wind[0] * scale;
      var v = wind[1] * scale;
      var d = distortion(projection, lambda, phi, x, y, windy);

      // Scale distortion vectors by u and v, then add.
      wind[0] = d[0] * u + d[2] * v;
      wind[1] = d[1] * u + d[3] * v;
      return wind;
  };

  var distortion = function(projection, lambda, phi, x, y, windy) {
      var tau = 2 * Math.PI;
      var H = Math.pow(10, -5.2);
      var hLambda = lambda < 0 ? H : -H;
      var hPhi = phi < 0 ? H : -H;

      var pLambda = project(phi, lambda + hLambda,windy);
      var pPhi = project(phi + hPhi, lambda, windy);

      // Meridian scale factor (see Snyder, equation 4-3), where R = 1. This handles issue where length of 1º lambda
      // changes depending on phi. Without this, there is a pinching effect at the poles.
      var k = Math.cos(phi / 360 * tau);
      return [
          (pLambda[0] - x) / hLambda / k,
          (pLambda[1] - y) / hLambda / k,
          (pPhi[0] - x) / hPhi,
          (pPhi[1] - y) / hPhi
      ];
  };



  var createField = function(columns, bounds, callback) {

      /**
       * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
       *          is undefined at that point.
       */
      function field(x, y) {
          var column = columns[Math.round(x)];
          return column && column[Math.round(y)] || NULL_WIND_VECTOR;
      }

      // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
      // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
      field.release = function() {
          columns = [];
      };

      field.randomize = function(o) {  // UNDONE: this method is terrible
          var x, y;
          var safetyNet = 0;
          do {
              x = Math.round(Math.floor(Math.random() * bounds.width) + bounds.x);
              y = Math.round(Math.floor(Math.random() * bounds.height) + bounds.y)
          } while (field(x, y)[2] === null && safetyNet++ < 30);
          o.x = x;
          o.y = y;
          return o;
      };

      //field.overlay = mask.imageData;
      //return field;
      callback( bounds, field );
  };

  var buildBounds = function( bounds, width, height ) {
      var upperLeft = bounds[0];
      var lowerRight = bounds[1];
      var x = Math.round(upperLeft[0]); //Math.max(Math.floor(upperLeft[0], 0), 0);
      var y = Math.max(Math.floor(upperLeft[1], 0), 0);
      var xMax = Math.min(Math.ceil(lowerRight[0], width), width - 1);
      var yMax = Math.min(Math.ceil(lowerRight[1], height), height - 1);
      return {x: x, y: y, xMax: width, yMax: yMax, width: width, height: height};
  };

  var deg2rad = function( deg ){
    return (deg / 180) * Math.PI;
  };

  var rad2deg = function( ang ){
    return ang / (Math.PI/180.0);
  };

  var invert = function(x, y, windy){
    var mapLonDelta = windy.east - windy.west;
    var worldMapRadius = windy.width / rad2deg(mapLonDelta) * 360/(2 * Math.PI);
    var mapOffsetY = ( worldMapRadius / 2 * Math.log( (1 + Math.sin(windy.south) ) / (1 - Math.sin(windy.south))  ));
    var equatorY = windy.height + mapOffsetY;
    var a = (equatorY-y)/worldMapRadius;

    var lat = 180/Math.PI * (2 * Math.atan(Math.exp(a)) - Math.PI/2);
    var lon = rad2deg(windy.west) + x / windy.width * rad2deg(mapLonDelta);
    return [lon, lat];
  };

  var mercY = function( lat ) {
    return Math.log( Math.tan( lat / 2 + Math.PI / 4 ) );
  };


  var project = function( lat, lon, windy) { // both in radians, use deg2rad if neccessary
    var ymin = mercY(windy.south);
    var ymax = mercY(windy.north);
    var xFactor = windy.width / ( windy.east - windy.west );
    var yFactor = windy.height / ( ymax - ymin );

    var y = mercY( deg2rad(lat) );
    var x = (deg2rad(lon) - windy.west) * xFactor;
    var y = (ymax - y) * yFactor; // y points south
    return [x, y];
  };


  var interpolateField = function( grid, bounds, extent, callback ) {

    var projection = {};
    var velocityScale = VELOCITY_SCALE;

    var columns = [];
    var x = bounds.x;

    function interpolateColumn(x) {
        var column = [];
        for (var y = bounds.y; y <= bounds.yMax; y += 2) {
                var coord = invert( x, y, extent );
                if (coord) {
                    var lambda = coord[0], phi = coord[1];
                    if (isFinite(lambda)) {
                        var wind = grid.interpolate(lambda, phi);
                        if (wind) {
                            wind = distort(projection, lambda, phi, x, y, velocityScale, wind, extent);
                            column[y+1] = column[y] = wind;

                        }
                    }
                }
        }
        columns[x+1] = columns[x] = column;
    }

    (function batchInterpolate() {
                var start = Date.now();
                while (x < bounds.width) {
                    interpolateColumn(x);
                    x += 2;
                    if ((Date.now() - start) > 1000) { //MAX_TASK_TIME) {
                        setTimeout(batchInterpolate, 25);
                        return;
                    }
                }
          createField(columns, bounds, callback);
    })();
  };


  var animate = function(bounds, field) {

    function windIntensityColorScale(colorScale, maxWind) {

        var result = [
            // gray to white (with blue tint)
            [
            "rgba(120,120,120,0.5)",
            "rgba(140,140,140,0.5)",
            "rgba(160,160,160,0.5)",
            "rgba(180,180,180,0.5)",
            "rgba(200,200,200,0.5)",
            "rgba(200,210,210,0.5)",
            "rgba(200,220,220,0.5)",
            "rgba(200,230,230,0.5)",
            "rgba(200,240,240,0.5)",
            "rgba(200,255,255,0.5)"
            ],
            [
            // blue to red
            "rgba(23,139,231,0.5)",
            "rgba(136,136,189,0.5)",
            "rgba(178,132,153,0.5)",
            "rgba(204,126,120,0.5)",
            "rgba(222,118,91,0.5)",
            "rgba(236,108,66,0.5)",
            "rgba(245,95,44,0.5)",
            "rgba(251,79,23,0.5)",
            "rgba(254,55, 5,0.5)",
            "rgba(255,0, 0,0.5)"
            ],
            [
            //cyan to purple?
            "rgba(0, 255, 255,0.5)",
            "rgba(100, 240, 255,0.5)",
            "rgba(135, 225, 255,0.5)",
            "rgba(160, 208, 255,0.5)",
            "rgba(181, 192, 255,0.5)",
            "rgba(198, 173, 255,0.5)",
            "rgba(212, 155, 255,0.5)",
            "rgba(225, 133, 255,0.5)",
            "rgba(236, 109, 255,0.5)",
            "rgba(255, 30, 219,0.5)"
            ],
			[
			//white waves
			"rgba(200,255,255,0.5)"
			],
			[
			//red waves
			"rgba(255,0, 0, 1)"
			],
			[
			//purple waves
			"rgba(165, 55, 253, 1)"
            ],
            [
			//black waves
			"rgba(0, 0, 0, 1)"
			]
        ]
        /*
        var result = [];
        for (var j = 225; j >= 100; j = j - step) {
          result.push(asColorStyle(j, j, j, 1));
        }
        */
        result[colorScale].indexFor = function(m) {  // map wind speed to a style
            return Math.floor(Math.min(m, maxWind) / maxWind * (result[colorScale].length - 1));
        };
        return result[colorScale];
    }

    var colorStyles = windIntensityColorScale(INTENSITY_COLOR_SCALE, MAX_WIND_INTENSITY);
    var buckets = colorStyles.map(function() { return []; });

    var particleCount = Math.round(bounds.width * bounds.height * PARTICLE_MULTIPLIER);
    if (isMobile()) {
      particleCount *= PARTICLE_REDUCTION;
    }

    var particles = [];
    for (var i = 0; i < particleCount; i++) {
        particles.push(field.randomize({age: Math.floor(Math.random() * MAX_PARTICLE_AGE) + 0}));
    }

    function evolve() {
        buckets.forEach(function(bucket) { bucket.length = 0; });
        particles.forEach(function(particle) {
            if (particle.age > MAX_PARTICLE_AGE) {
                field.randomize(particle).age = 0;
            }
            var x = particle.x;
            var y = particle.y;
            var v = field(x, y);  // vector at current position
            var m = v[2];
            if (m === null) {
                particle.age = MAX_PARTICLE_AGE;  // particle has escaped the grid, never to return...
            }
            else {
                var xt = x + v[0];
                var yt = y + v[1];
                if (field(xt, yt)[2] !== null) {
                    // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
                    particle.xt = xt;
                    particle.yt = yt;
                    buckets[colorStyles.indexFor(m)].push(particle);
                }
                 else {
                    // Particle isn't visible, but it still moves through the field.
                    particle.x = xt;
                    particle.y = yt;
                }
            }
            particle.age += 1;
        });
    }

    var g = params.canvas.getContext("2d");
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = FADE_FILL_STYLE;

    function draw() {
        // Fade existing particle trails.
        var prev = g.globalCompositeOperation;
        g.globalCompositeOperation = "destination-in";
        g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        g.globalCompositeOperation = prev;

        // Draw new particle trails.
        buckets.forEach(function(bucket, i) {
            if (bucket.length > 0) {
                g.beginPath();
                g.strokeStyle = colorStyles[i];
                bucket.forEach(function(particle) {
                    g.moveTo(particle.x, particle.y);
                    g.lineTo(particle.xt, particle.yt);
                    particle.x = particle.xt;
                    particle.y = particle.yt;
                });
                g.stroke();
            }
        });
    }

    (function frame() {
        try {
            windy.timer = setTimeout(function() {
              requestAnimationFrame(frame);
              evolve();
              draw();
            }, 1000 / FRAME_RATE);
        }
        catch (e) {
            console.error(e);
        }
    })();
  }

  var start = function( bounds, width, height, extent ){

    var mapBounds = {
      south: deg2rad(extent[0][1]),
      north: deg2rad(extent[1][1]),
      east: deg2rad(extent[1][0]),
      west: deg2rad(extent[0][0]),
      width: width,
      height: height
    };
    PARTICLE_MULTIPLIER = (.2/75)*windyParticleSetting;
    INTENSITY_COLOR_SCALE = intensityColorSetting;
    switch (windWave){
        case "Wind":
            VELOCITY_SCALE = (0.5**(mapZoom))/(125/11)*windyVelocitySetting; //scales the wind velocity in half by every zoom value (0.011 at zoom=3 as baseline)
            PARTICLE_LINE_WIDTH = 3;
            MAX_PARTICLE_AGE = 25;
            FADE_FILL_STYLE = "rgba(0, 0, 0, 0.97)";
        break;
        case "Wave":
            PARTICLE_LINE_WIDTH = 7;
            MAX_PARTICLE_AGE = 30;
            FADE_FILL_STYLE = "rgba(0, 0, 0, 0.9)"; //decreased opactiy so tail is short
            VELOCITY_SCALE = (0.5**(mapZoom))/(50)*windyVelocitySetting;
        break;
    } 
    stop();

    // build grid
    buildGrid( params.data, function(grid){
      // interpolateField
      interpolateField( grid, buildBounds( bounds, width, height), mapBounds, function( bounds, field ){
        // animate the canvas with random points
        windy.field = field;
        animate( bounds, field );
      });

    });
  };

  var stop = function(){
    if (windy.field) windy.field.release();
    if (windy.timer) clearTimeout(windy.timer)
  };


  var windy = {
    params: params,
    start: start,
    stop: stop
  };

  return windy;
}



// shim layer with setTimeout fallback
window.requestAnimationFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame ||
          window.msRequestAnimationFrame ||
          function( callback ){
            window.setTimeout(callback, 1000 / 20);
          };
})();
