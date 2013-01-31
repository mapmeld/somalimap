var DEBUG = false;
var firstfile = true;

var map, anim, adjustAnim;
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
  
  var layers = [ ];
  $.getJSON("content1.geojson", function(frame0){
    for(var p=0;p<frame0.features.length;p++){
      var coords = frame0.features[p].geometry.coordinates[0];
      for(var c=0;c<coords.length;c++){
        coords[c] = { lat: coords[c][1], lng: coords[c][0], match: -1 };
      }
      //var poly = new L.polygon( coords );
      layers.push(coords);
      //map.addLayer(poly);
    }
    $.getJSON("content2.geojson", function(frame1){
      var animcoords = [ ];
      //for(var p=0;p<Math.min( layers.length, frame1.features.length );p++){
      for(var p=0;p<frame0.features.length;p++){
        var oldcoords = layers[p];
        // remove repeat coordinates
        if(oldcoords[0].lat == oldcoords[oldcoords.length-1].lat && oldcoords[0].lng == oldcoords[oldcoords.length-1].lng){
          oldcoords.pop();
        }
        // if there is no match in the next frame, shrink this to nothing
        if(p >= frame1.features.length){
          for(var i=0;i<oldcoords.length;i++){
            oldcoords[i] = { lat: oldcoords[i].lat, lng: oldcoords[i].lng };
          }
        }
        else{

          var newcoords = frame1.features[p].geometry.coordinates[0];
          // remove repeat coordinates
          if(newcoords[0][1] == newcoords[newcoords.length-1][1] && newcoords[0][0] == newcoords[newcoords.length-1][0]){
            newcoords.pop();
          }
          for(var n=0;n<newcoords.length;n++){
            var nearest = { index: -1, distance: 360 };
            for(var i=0;i<oldcoords.length;i++){
              var dist = Math.pow( Math.pow(oldcoords[i].lat - newcoords[n][1], 2) + Math.pow(oldcoords[i].lng - newcoords[n][0], 2), 0.5);
              if(dist < nearest.distance){
                nearest = { index: i, distance: dist };
              }
            }
            if(oldcoords[nearest.index].match == -1){
              // first coordinate to match this existing coordinate
              oldcoords[nearest.index].match = n;
            }
            else{
              // add a repeat coordinate to move to this new coordinate
              var prevcoords = oldcoords.concat(-1).splice(0, nearest.index);
              var repeat = { lat: oldcoords[nearest.index].lat, lng: oldcoords[nearest.index].lng, match: n };            
              for(var i=nearest.index;i<oldcoords.length;i++){
                if(oldcoords[i].lat != oldcoords[nearest.index].lat || oldcoords[i].lng != oldcoords[nearest.index].lng){
                  // reached end of matching coordinates
                  prevcoords = prevcoords.concat( repeat );
                  break;
                }
                if(oldcoords[i].match < n){
                  prevcoords = prevcoords.concat( { lat: oldcoords[i].lat, lng: oldcoords[i].lng, match: oldcoords[i].match } );
                }
                else{
                  prevcoords = prevcoords.concat( repeat );
                  break;
                }
              }
              oldcoords = prevcoords.concat( oldcoords.slice( prevcoords.length - 1 ) );
              //console.log(oldcoords);
            }
          }
        }
        var latlngs = [ ];
        for(var r=0;r<oldcoords.length;r++){
          oldcoords[r].start_index = r;
          latlngs.push( new L.LatLng( oldcoords[r].lat, oldcoords[r].lng ) );
        }
        layers[p] = new L.polygon( latlngs );
        map.addLayer(layers[p]);
        animcoords.push( oldcoords );
      }
      anim = 1;

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
        for(var p=0;p<animcoords.length;p++){
          var coords = animcoords[p];
          if(anim >= 50){
            coords.sort(function(a,b){ return b.match - a.match; });
          }
          else{
            coords.sort(function(a,b){ return b.start_index - a.start_index; });          
          }
          var latlngs = [ ];
          if(p < frame1.features.length){
            // matching polygon exists
            var newcoords = frame1.features[p].geometry.coordinates[0];
            var toLeft = function(c){
              if(c == 0){
                c = coords.length;
              }
              if(coords[c-1].match > -1){
                return new L.LatLng( newcoords[coords[c-1].match][1], newcoords[coords[c-1].match][0] );
              }
              else{
                return toLeft(c-1);
              }
            };
            var toRight = function(c){
              if(c == coords.length - 1){
                c = -1;
              }
              if(coords[c+1].match > -1){
                return new L.LatLng( newcoords[coords[c+1].match][1], newcoords[coords[c+1].match][0] );
              }
              else{
                return toRight(c+1);
              }
            };
            for(var c=0;c<coords.length;c++){
              if(coords[c].match > -1){
                // coordinate has a destination
                var animlat = coords[c].lat + (newcoords[coords[c].match][1] - coords[c].lat) * anim / 100;
                var animlng = coords[c].lng + (newcoords[coords[c].match][0] - coords[c].lng) * anim / 100;
                latlngs.push( new L.LatLng(animlat, animlng) );
              }
              else{
                // coordinate has no destination, slip between next-door coordinates
                var animlat = coords[c].lat + ((toLeft(c).lat + toRight(c).lat) / 2 - coords[c].lat) * anim / 100;
                var animlng = coords[c].lng + ((toLeft(c).lng + toRight(c).lng) / 2 - coords[c].lng) * anim / 100;              
                latlngs.push( new L.LatLng(animlat, animlng) );
              }
            }
          }
          else{
            // disappearing polygon
            if(anim == 100){
              map.removeLayer(layers[p]);
            }
            else{
              if(!map.hasLayer(layers[p])){
                map.addLayer(layers[p]);
              }
              if(typeof layers[p].avglat == 'undefined'){
                var avglat = 0;
                var avglng = 0;
                for(var c=0;c<coords.length;c++){
                  avglat += coords[c].lat;
                  avglng += coords[c].lng;
                }
                avglat /= coords.length;
                avglng /= coords.length;
                layers[p].avglat = avglat;
                layers[p].avglng = avglng;
              }
              for(var c=0;c<coords.length;c++){
                latlngs.push( new L.LatLng( coords[c].lat + (layers[p].avglat - coords[c].lat) * anim / 100 , coords[c].lng + (layers[p].avglng - coords[c].lng) * anim / 100 ) );
              }
            }
          }
          layers[p].setLatLngs( latlngs );
        }
        anim++;
        if(anim == 101){
          clearInterval(tick);
        }
      };

      tick = setInterval(adjustAnim, 30);
    });
  });
});

var displayTime = function(t){
  $("#readtime").text( (new Date(t)).toUTCString() );
};