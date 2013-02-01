# SomaliMap

Working toward a JavaScript library to animate changing borders

Border lines 'flow' to their new locations, through their polygon boundaries, using a wayfinding algorithm for games called A* (A Star).

<img src="http://mapmeld.github.com/somalimap/transition.png"/>

To transition from the map on the left to the one on the right, there are three changes:

* A light blue region from the left map disappears

* The orange-red region shrinks away from the coast

* The purple region expands toward the coast (replacing the orange-red and blue regions)

The disappearing region is dissolved into its center. The other regions are reprojected onto
an 80x80 grid for processing by the A* algorithm. The suggested path is returned as an array
of grid squares, which can be reprojected as a path of latitude / longitude coordinates.

Here is a map showing the paths taken by moving points. They are somewhat blocky because they follow a grid:

<img src="http://mapmeld.github.com/somalimap/paths.png"/>

Working on Leaflet.js library first, then D3

## A* in JavaScript

The JavaScript implementation of A* is written by Brian Grinstead. <a href="http://www.briangrinstead.com/blog/astar-search-algorithm-in-javascript">See his blog post</a>.

I heard about A* from <a href="http://www.youtube.com/watch?v=4suJJRh9V-k">Tesca Fitzgerald's talk</a> at the 2011 Google Science Fair.

## License

Somalimap is available under an open source MIT License

It is based on maps of the 2006-2007 conflict in Somalia which were uploaded to Wikipedia and put into the public domain