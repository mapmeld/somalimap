# flight-map

flight-map shows your flight over a rotating globe

## Available functions

Highlight and rotate the globe to a specific country (not all countries are included in the dataset):

    selectCountry("United States")

Rotate the globe to a specific latitude / longitude coordinate:

    centerAt( [ 37.77493, -122.419416 ] );

Turn the plane graphic on (currently just a red box)

    planeOn = true;

## International Date Line

The example at http://mapmeld.github.com/flight-map crosses the International Date Line. If you are traveling west from Honolulu to Japan, you should give Honolulu's longitude as usual:

    centerAt([21.683414, -158.031954]);

Then wrap Japan's longitude to a value less than -180. For example +140 degrees East could be represented as -220 degrees West.

    centerAt([35.64, -220]);

If you were traveling in the other direction, you could give Japan's longitude as +140 degrees East and Honolulu's longitude as +202 degrees East.

## License

flight-map is available under an open source MIT License

It is based on the World Tour topojson / orthographic projection example at http://bl.ocks.org/d/4183330/