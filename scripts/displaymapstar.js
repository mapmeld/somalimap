var map, anim, adjustAnim;
var polys = [ ];
var tick = null;

$(document).ready(function(){
  // make a Leaflet map
  map = new L.Map('map');
  map.attributionControl.setPrefix('');
  var terrain = 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.png';
  var terrainAttrib = 'Map data &copy; 2013 OpenStreetMap contributors, Tiles by Stamen Design';
  terrainLayer = new L.TileLayer(terrain, {maxZoom: 17, attribution: terrainAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(3.875436, 43.811432), 6);

  // set up the jQuery timeline slider
  $("#slidebar").slider({
    orientation: "horizontal",
    range: "min",
    min: 0,
    max: 100,
    value: 0,
    slide: function(event, ui){
      adjustAnim(ui.value);
    }
  });
  
  var oldlayers = [ ];
  $.getJSON("content0.geojson", function(frame0){
    for(var p=0;p<frame0.features.length;p++){
      var coords = frame0.features[p].geometry.coordinates[0];
      if(coords[0][0] == coords[coords.length-1][0] && coords[0][1] == coords[coords.length-1][1]){
        // remove redundant coordinate
        //coords.pop();
      }
      for(var c=0;c<coords.length;c++){
        coords[c] = new L.LatLng( coords[c][1], coords[c][0] );
      }
      oldlayers.push(coords);
      //var poly = new L.polygon( coords );
      //map.addLayer(poly);
    }
    $.getJSON("content1.geojson", function(frame1){

      var nextlayers = [ ];
      for(var f=0;f<frame1.features.length;f++){
        var coords = frame1.features[f].geometry.coordinates[0];
        if(coords[0][0] == coords[coords.length-1][0] && coords[0][1] == coords[coords.length-1][1]){
          // remove redundant coordinate
          //coords.pop();
        }
        for(var c=0;c<coords.length;c++){
          coords[c] = new L.LatLng( coords[c][1], coords[c][0] );
        }
        nextlayers.push( coords );
      }
      
      var animateds = [ ];
      for(var n=0;n<Math.max(oldlayers.length,nextlayers.length);n++){
        // collect min and max coordinates
        var minlat = 90;
        var maxlat = -90;
        var minlng = 180;
        var maxlng = -180;

        if(n < oldlayers.length){
          for(var pt=0;pt<oldlayers[n].length;pt++){
            minlat = Math.min(minlat, oldlayers[n][pt].lat);
            maxlat = Math.max(maxlat, oldlayers[n][pt].lat);
            minlng = Math.min(minlng, oldlayers[n][pt].lng);
            maxlng = Math.max(maxlng, oldlayers[n][pt].lng);
          }
        }
        if(n < nextlayers.length){
          for(var pt=0;pt<nextlayers[n].length;pt++){
            minlat = Math.min(minlat, nextlayers[n][pt].lat);
            maxlat = Math.max(maxlat, nextlayers[n][pt].lat);
            minlng = Math.min(minlng, nextlayers[n][pt].lng);
            maxlng = Math.max(maxlng, nextlayers[n][pt].lng);
          }
        }
        var center = [ (minlng + maxlng) / 2, (minlat + maxlat) / 2 ];
    
        // if there is no match in old or new layer, create a singularity
        if(n >= oldlayers.length){
          var animcoords = [ ];
          for(var i=0;i<nextlayers[n].length;i++){
            animcoords.push({
              start_lat: center[1] * 1,
              start_lng: center[0] * 1,
              end_lat: nextlayers[n][i].lat,
              end_lng: nextlayers[n][i].lng              
            });
          }
          animateds.push( animcoords );
          continue;
        }
        else if(n >= nextlayers.length){
          var animcoords = [ ];
          for(var i=0;i<oldlayers[n].length;i++){
            animcoords.push({
              end_lat: center[1] * 1,
              end_lng: center[0] * 1,
              start_lat: oldlayers[n][i].lat,
              start_lng: oldlayers[n][i].lng              
            });
          }
          animateds.push( animcoords );
          continue;
        }
        
        // initialize 80x80 grid to use start and end layers in A Star
        var pgrid = [ ];
        for(var r=0;r<80;r++){
          var row = [ ];
          for(var c=0;c<80;c++){
            row.push(1);
          }
          pgrid.push(row);
        }
        var geom0 = oldlayers[n];
        var geom1 = nextlayers[n];
        var topleft = [ center[0] - 40.5/40 * (center[0] - minlng), center[1] - 40.5/40 * (center[1] - minlat) ];
        var bottomright = [ center[0] + 40.5/40 * (maxlng - center[0]), center[1] + 40.5/40 * (maxlat - center[1]) ];

        var shapeHoldsPt = function(poly, pt){
          for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
            ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1]))
            && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
            && (c = !c);
          return c;
        };

        var addpt = function(lastbox, mypt){
          if(lastbox[0] != -1 && (lastbox[0] != mypt[0] || lastbox[1] != mypt[1] )){
            // draw line from last pixel
            if(mypt[0] > lastbox[0]){
              // somewhere to the right
              if(mypt[1] != lastbox[1]){
                // slope
                var m = (lastbox[1] - mypt[1]) / (lastbox[0] - mypt[0]);
                var b = lastbox[1] - m * lastbox[0];
                for(var x=lastbox[0];x<=mypt[0];x++){
                  var ymin = Math.min(m * (x-1) + b, m * (x+1) + b);
                  var ymax = Math.max(m * (x-1) + b, m * (x+1) + b);
                  for(var y=Math.floor(ymin);y<=Math.ceil(ymax);y++){
                    pgrid[x][y] = 0;
                  }
                }
                // 0 0 1 0 0 0 0
                // 0 0 0 0 0 0 1
              }
              else{
                // directly to the right
                for(var x=lastbox[0];x<=mypt[0];x++){
                  pgrid[x][mypt[1]] = 0;
                }
              }
            }
            else if(mypt[0] == lastbox[0]){
              // directly above or below
              if(mypt[1] > lastbox[1]){
                // draw down
                for(var y=lastbox[1];y<=mypt[1];y++){
                  pgrid[mypt[0]][y] = 0;
                }
              }
              else{
                // draw up
                for(var y=mypt[1];y<=lastbox[1];y++){
                  pgrid[mypt[0]][y] = 0;
                }
              }
            }
            else{
              if(mypt[1] != lastbox[1]){
                // slope left
                var m = (lastbox[1] - mypt[1]) / (lastbox[0] - mypt[0]);
                var b = lastbox[1] - m * lastbox[0];
                for(var x=mypt[0];x<=lastbox[0];x++){
                  var ymin = Math.min(m * (x-1) + b, m * (x+1) + b);
                  var ymax = Math.max(m * (x-1) + b, m * (x+1) + b);
                  for(var y=Math.floor(ymin);y<=Math.ceil(ymax);y++){
                    pgrid[x][y] = 0;
                  }
                }
              }
              else{
                // directly to the left
                for(var x=mypt[0];x<=lastbox[0];x++){
                  pgrid[x][mypt[1]] = 0;
                }
              }
            }
          }
        };
    
        var lastbox = [-1, -1];
        for(var pt=0;pt<geom0.length;pt++){
          var mypt = [
            Math.floor( (geom0[pt].lng - topleft[0]) / (bottomright[0] - topleft[0]) * 80 ),
            Math.floor( (geom0[pt].lat - topleft[1]) / (bottomright[1] - topleft[1]) * 80 )
          ];
          addpt(lastbox, mypt);
          lastbox = [mypt[0], mypt[1]];
        }
        var lastbox = [-1, -1];
        for(var pt=0;pt<geom1.length;pt++){
          var mypt = [
            Math.floor( (geom1[pt].lng - topleft[0]) / (bottomright[0] - topleft[0]) * 80 ),
            Math.floor( (geom1[pt].lat - topleft[1]) / (bottomright[1] - topleft[1]) * 80 )
          ];
          addpt(lastbox, mypt);
          lastbox = [mypt[0], mypt[1]];
        }
    
        //geom0.pop();
        //geom1.pop();
    
        for(var row=0;row<pgrid.length;row++){
          var last = -1;
          for(var col=pgrid[row].length-1;col>=0;col--){
            if(pgrid[row][col] == 0){
              last = col;
              break;
            }
          }
          var metfirst = false;
          for(var col=0;col<last;col++){
            if(!metfirst){
              if(pgrid[row][col] == 0){
                metfirst = true;
              }
            }
            else if(pgrid[row][col] == 1){
              var ctrlat = topleft[1] + (row+0.5)/80 * (bottomright[1] - topleft[1]);
              var ctrlng = topleft[0] + (col+0.5)/80 * (bottomright[0] - topleft[0]);
              //console.log(ctrlng);
              if(shapeHoldsPt( geom0, [ ctrlng, ctrlat ] ) || shapeHoldsPt( geom1, [ ctrlng, ctrlat ] ) ){
                pgrid[row][col] = 0;
              }
            }
          }
        }
      
        //console.log(pgrid);
        var graph = new Graph(pgrid);

        var toLeft = function(coords, c){
          if(c == 0){
            c = coords.length;
          }
          if(coords[c-1].end_lat && coords[c-1].end_lng){
            return new L.LatLng( coords[c-1].end_lat, coords[c-1].end_lng );
          }
          else{
            return toLeft(coords, c-1);
          }
        };
        var toRight = function(coords, c){
          if(c >= coords.length - 1){
            c = -1;
          }
          if(coords[c+1].end_lat && coords[c+1].end_lng){
            return new L.LatLng( coords[c+1].end_lat, coords[c+1].end_lng );
          }
          else{
            return toRight(coords, c+1);
          }
        };

        //var getPath = function(start, end){
        var getPath = function(acoords, c){
          var start = [acoords[c].start_lng, acoords[c].start_lat];
          var end = [acoords[c].end_lng, acoords[c].end_lat];

          // return null if the start and end points are the same
          if(start[0] === end[0] && start[1] === end[1]){
            return null;
          }
          if(end[0] === null && end[1] === null){
            // get nearby endpoint
            var end_left = toLeft(acoords, c);
            var end_right = toRight(acoords, c);
            end = [ (end_left.lng + end_right.lng) / 2, (end_left.lat + end_right.lat) / 2 ];
          }
          // A Star
          var startgrid = [
            Math.floor( (start[0] - topleft[0]) / (bottomright[0] - topleft[0]) * 80 ),
            Math.floor( (start[1] - topleft[1]) / (bottomright[1] - topleft[1]) * 80 )
          ];
          var endgrid = [
            Math.floor( (end[0] - topleft[0]) / (bottomright[0] - topleft[0]) * 80 ),
            Math.floor( (end[1] - topleft[1]) / (bottomright[1] - topleft[1]) * 80 )
          ];
          // avoid trips in same grid cell
          if(startgrid[0] === endgrid[0] && startgrid[1] === endgrid[1]){
            return null;
          }
          //console.log(startgrid);
          //console.log(endgrid);
          var pathgrid = astar.search( graph.nodes, graph.nodes[startgrid[0]][startgrid[1]], graph.nodes[endgrid[0]][endgrid[1]], astar.manhattan );
          //console.log(pathgrid);
          // add initial point
          var pathll = [ new L.LatLng( start[1], start[0] ) ];
          // add first box's center
          pathll.push( new L.LatLng(
            topleft[1] + (startgrid[1] + 0.5) / 80 * (bottomright[1] - topleft[1]),
            topleft[0] + (startgrid[0] + 0.5) / 80 * (bottomright[0] - topleft[0])
          ) );
          // add following box centers
          for(var g=0;g<pathgrid.length;g++){
            pathll.push( new L.LatLng(
              topleft[1] + (pathgrid[g].y + 0.5) / 80 * (bottomright[1] - topleft[1]),
              topleft[0] + (pathgrid[g].x + 0.5) / 80 * (bottomright[0] - topleft[0])
            ) );
          }
          pathll.push( new L.LatLng( end[1], end[0] ) );
          //map.addLayer(new L.Polyline( pathll ) );
          //console.log(start);
          //console.log(end);
          return pathll;
        };

        var animcoords = [ ];

        // find closest point in frame0 layer to the first coordinate in the frame1 layer
        var first_nearest = { dist: 1000, index: -1 };
        for(var c=0;c<oldlayers[n].length;c++){
          var dist = Math.pow( Math.pow(oldlayers[n][c].lat - nextlayers[n][0].lat, 2) + Math.pow(oldlayers[n][c].lng - nextlayers[n][0].lng, 2), 0.5);
          if(dist < first_nearest.dist){
            first_nearest = { dist: dist, index: c};
          }
        }
        
        //console.log(first_nearest);
        animcoords.push({
          start_lat: oldlayers[n][first_nearest.index].lat,
          start_lng: oldlayers[n][first_nearest.index].lng,
          end_lat: nextlayers[n][0].lat,
          end_lng: nextlayers[n][0].lng
        });

        var samedir = true;
        var last_oldlayer_index = first_nearest.index;
        
        for(var i=1;i<nextlayers[n].length;i++){
          var nearest = { dist: 1000, index: -1 };
          for(var c=0;c<oldlayers[n].length;c++){
            var dist = Math.pow( Math.pow(oldlayers[n][c].lat - nextlayers[n][i].lat, 2) + Math.pow(oldlayers[n][c].lng - nextlayers[n][i].lng, 2), 0.5);
            if(dist < nearest.dist){
              nearest = { dist: dist, index: c};
            }
          }
          if(nearest.index == last_oldlayer_index){
            // no problem, add the coordinate
            animcoords.push({
              start_lat: oldlayers[n][nearest.index].lat,
              start_lng: oldlayers[n][nearest.index].lng,
              end_lat: nextlayers[n][i].lat,
              end_lng: nextlayers[n][i].lng
            });
          }
          else if(nearest.index == last_oldlayer_index + 1){
            // no problem, add the next coordinate
            last_oldlayer_index++;
            animcoords.push({
              start_lat: oldlayers[n][nearest.index].lat,
              start_lng: oldlayers[n][nearest.index].lng,
              end_lat: nextlayers[n][i].lat,
              end_lng: nextlayers[n][i].lng
            });
          }
          else if(nearest.index > last_oldlayer_index + 1){
            // add some old layer points that go to nowhere, until reaching the matching coordinate
            for(var x=last_oldlayer_index+1;x<nearest.index;x++){
              animcoords.push({
                start_lat: oldlayers[n][x].lat,
                start_lng: oldlayers[n][x].lng,
                end_lat: null,
                end_lng: null
              });
            }
            animcoords.push({
              start_lat: oldlayers[n][nearest.index].lat,
              start_lng: oldlayers[n][nearest.index].lng,
              end_lat: nextlayers[n][i].lat,
              end_lng: nextlayers[n][i].lng
            });
            last_oldlayer_index = nearest.index;
          }
          else if(nearest.index < last_oldlayer_index){
            // wrap around
            for(var x=last_oldlayer_index+1;x<oldlayers[n].length;x++){
              // DEBUG: why does this remove insides of polygon n=8?
              if(n!=8){
                animcoords.push({
                  start_lat: oldlayers[n][x].lat,
                  start_lng: oldlayers[n][x].lng,
                  end_lat: null,
                  end_lng: null
                });
              }
            }
            for(var x=0;x<nearest.index;x++){
              animcoords.push({
                start_lat: oldlayers[n][x].lat,
                start_lng: oldlayers[n][x].lng,
                end_lat: null,
                end_lng: null
              });
            }
            animcoords.push({
              start_lat: oldlayers[n][nearest.index].lat,
              start_lng: oldlayers[n][nearest.index].lng,
              end_lat: nextlayers[n][i].lat,
              end_lng: nextlayers[n][i].lng
            });
            last_oldlayer_index = nearest.index;
          }
        }
        if(last_oldlayer_index <= first_nearest.index){
          // add all in between
          for(var x=last_oldlayer_index + 1;x<first_nearest.index;x++){
            animcoords.push({
              start_lat: oldlayers[n][x].lat,
              start_lng: oldlayers[n][x].lng,
              end_lat: null,
              end_lng: null
            });
          }
        }
        else{
          // wrap around
          for(var x=last_oldlayer_index + 1;x<oldlayers[n].length;x++){
            animcoords.push({
              start_lat: oldlayers[n][x].lat,
              start_lng: oldlayers[n][x].lng,
              end_lat: null,
              end_lng: null
            });
          }
          for(var x=0;x<first_nearest.index;x++){
            animcoords.push({
              start_lat: oldlayers[n][x].lat,
              start_lng: oldlayers[n][x].lng,
              end_lat: null,
              end_lng: null
            });
          }
        }
        // create A Star paths
        for(var c=0;c<animcoords.length;c++){
          animcoords[c].path = getPath(animcoords, c);
        }
        animateds.push( animcoords );
      }
      
      var anim = 1;
      
      adjustAnim = function(count){
        if(typeof count == 'undefined'){
          count = null;
        }
        else{
          anim = count;
          if(tick){
            clearInterval(tick);
            tick = null;
          }
        }
        for(var p=0;p<animateds.length;p++){
          var latlngs = [ ];
          for(var c=0;c<animateds[p].length;c++){
            if(animateds[p][c].path){
              var startindex = Math.floor( (anim-1) / 100 * (animateds[p][c].path.length-1) );
              startindex = Math.max(0, startindex);
              startindex = Math.min(animateds[p][c].path.length - 2, startindex);
              var endindex = startindex + 1;
              var animfrac = (anim % ( 100 / (animateds[p][c].path.length-1) )) / ( 100 / (animateds[p][c].path.length-1) );
              latlngs.push(
                new L.LatLng(
                  animateds[p][c].path[startindex].lat + (animateds[p][c].path[endindex].lat - animateds[p][c].path[startindex].lat) * animfrac,
                  animateds[p][c].path[startindex].lng + (animateds[p][c].path[endindex].lng - animateds[p][c].path[endindex].lng) * animfrac
                )
              );
            }
            else if(animateds[p][c].end_lat && animateds[p][c].end_lng){
              latlngs.push(
                new L.LatLng(
                  animateds[p][c].start_lat + (animateds[p][c].end_lat - animateds[p][c].start_lat) * anim / 100,
                  animateds[p][c].start_lng + (animateds[p][c].end_lng - animateds[p][c].start_lng) * anim / 100
                )
              );
            }
            else{
              // move to end_lat and end_lng between neighbors
              var end_left = toLeft(animateds[p], c);
              var end_right = toRight(animateds[p], c);              
              latlngs.push(
                new L.LatLng(
                  animateds[p][c].start_lat + ((end_left.lat + end_right.lat) / 2 - animateds[p][c].start_lat) * anim / 100,
                  animateds[p][c].start_lng + ((end_left.lng + end_right.lng) / 2 - animateds[p][c].start_lng) * anim / 100
                )
              );
            }
          }
          if(polys.length <= p){
            var npoly = new L.Polygon( latlngs );
            map.addLayer(npoly);
            polys.push( npoly );
          }
          else{
            polys[p].setLatLngs( latlngs );
          }
        }
        // if animation is on, keep it running until 101
        if(tick){
          anim++;
          if(anim == 101){
            clearInterval(tick);
          }
        }
      };
      tick = setInterval(adjustAnim, 30);
    });
  });
});

var displayTime = function(t){
  $("#readtime").text( (new Date(t)).toUTCString() );
};