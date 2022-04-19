import shapefile from 'shapefile';
import fs from 'fs';

const types = {};

shapefile
    .open('./data/roads.shp')
    .then((source) =>
        source.read().then(function log(result) {
            if (result.done) return;
            // console.log(result.value);
            types[result.value.properties.type] = (
                types[result.value.properties.type] || []
            ).concat([result.value]);
            return source.read().then(log);
        }),
    )
    .catch((error) => console.error(error.stack))
    .then(() => {
        // console.log(JSON.stringify(types.primary[0], null, 2));
        delete types['footway'];
        delete types['service'];
        delete types['residential'];
        fs.writeFileSync('./roads.json', JSON.stringify(types));
    });

// const ok = {
//     type: 'Feature',
//     properties: {
//         osm_id: 4984405,
//         name: 'Market Street',
//         ref: null,
//         type: 'primary',
//         oneway: 0,
//         bridge: 0,
//         maxspeed: null,
//     },
//     geometry: {
//         type: 'LineString',
//         coordinates: [
//             [-90.220399, 38.6311284],
//             [-90.2197641, 38.631144],
//             [-90.2196327, 38.6311482],
//             [-90.2195438, 38.6311518],
//             [-90.219433, 38.6311533],
//             [-90.2190656, 38.6311583],
//             [-90.2187636, 38.6311687],
//             [-90.2186939, 38.6311703],
//             [-90.2180423, 38.6311859],
//             [-90.2176814, 38.6311979],
//             [-90.2173161, 38.6312041],
//             [-90.2165967, 38.631196],
//             [-90.2159747, 38.6311551],
//             [-90.2155071, 38.6311038],
//         ],
//     },
// };

// {
// 	primary: 2115,
// 	secondary: 1575,
// 	primary_link: 491,
// 	tertiary: 1731,
// 	tertiary_link: 107,
// 	trunk: 352,
// 	trunk_link: 196,
// 	motorway:      1337,
// 	motorway_link: 1552,
//  ---
// 	unclassified: 800,
// 	trailhead: 3,
// 	track: 207,
// 	steps: 430,
// 	secondary_link: 186,
// 	road: 2,
// 	rest_area: 1,
// 	raceway: 10,
// 	proposed: 3,
// 	pedestrian: 250,
// 	path: 324,
// 	living_street: 2,
// 	elevator: 3
// 	cycleway: 686,
// 	corridor: 8,
// 	construction: 38,

// 	footway:     11857,
// 	service:     41950,
// 	residential: 19769,
//   }
