import * as React from 'react';
import { render } from 'react-dom';
import shapefile from 'shapefile';
import proj4 from 'proj4';

const dest = `PROJCS["USA_Contiguous_Albers_Equal_Area_Conic_USGS_version",
GEOGCS["GCS_North_American_1983",
	DATUM["D_North_American_1983",
		SPHEROID["GRS_1980",6378137.0,298.257222101]],
	PRIMEM["Greenwich",0.0],
	UNIT["Degree",0.0174532925199433]],
PROJECTION["Albers"],
PARAMETER["False_Easting",0.0],
PARAMETER["False_Northing",0.0],
PARAMETER["Central_Meridian",-96.0],
PARAMETER["Standard_Parallel_1",29.5],
PARAMETER["Standard_Parallel_2",45.5],
PARAMETER["Latitude_Of_Origin",23.0],
UNIT["Meter",1.0]]`;

// https://spatialreference.org/ref/sr-org/california-teale-albers-nad83-projection/

const proj2 =
    '+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees +axis=neu';

proj4.defs(
    'WGS84',
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
);

proj4.defs([
    [
        'EPSG:4326',
        '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
    ],
    [
        'EPSG:4269',
        '+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees',
    ],
]);
