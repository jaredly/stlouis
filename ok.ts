import shapefile from 'shapefile';
import fs from 'fs';
import { Feature, LineString, Position } from 'geojson';

const epsilon = 0.0001;
const closeEnough = (a: number, b: number) => Math.abs(a - b) < epsilon;
const coordsEqual = (one: Position, two: Position) =>
    closeEnough(one[0], two[0]) && closeEnough(one[1], two[1]);

const connectRoads = (roads: { [key: string]: Array<Feature<LineString>> }) => {
    const last = <T>(x: Array<T>) => x[x.length - 1];
    Object.keys(roads).forEach((type) => {
        const byName: { [key: string]: Array<Feature<LineString>> } = {};
        roads[type].forEach((shape) => {
            const name = shape.properties!.name;
            if (!byName[name]) {
                byName[name] = [shape];
            } else {
                byName[name].push(shape);
            }
        });
        Object.keys(byName).forEach((name) => {
            let items = byName[name];
            let finished: Array<Feature<LineString>> = [];
            while (items.length) {
                const first = items.shift()!;
                finished.push(first);
                let changed = true;
                while (changed) {
                    changed = false;
                    items = items.filter((item, i) => {
                        const ff = first.geometry.coordinates[0];
                        const fl = last(first.geometry.coordinates);
                        const pf = item.geometry.coordinates[0];
                        const pl = last(item.geometry.coordinates);
                        if (coordsEqual(ff, pf)) {
                            first.geometry.coordinates =
                                item.geometry.coordinates
                                    .reverse()
                                    .concat(
                                        first.geometry.coordinates.slice(1),
                                    );
                        } else if (coordsEqual(ff, pl)) {
                            first.geometry.coordinates =
                                item.geometry.coordinates.concat(
                                    first.geometry.coordinates.slice(1),
                                );
                        } else if (coordsEqual(fl, pf)) {
                            first.geometry.coordinates =
                                first.geometry.coordinates.concat(
                                    item.geometry.coordinates.slice(1),
                                );
                        } else if (coordsEqual(fl, pl)) {
                            first.geometry.coordinates =
                                first.geometry.coordinates.concat(
                                    item.geometry.coordinates
                                        .reverse()
                                        .slice(1),
                                );
                        } else {
                            return true;
                        }
                        changed = true;
                        return false;
                    });
                }
            }
            byName[name] = finished;
        });
        roads[type] = Object.keys(byName)
            .map((n) => byName[n])
            .flat();
    });
};

const types: { [key: string]: Array<Feature<LineString>> } = {};

console.log('Reading shapefile');
shapefile
    .read('./data/roads.shp')
    .then((source) => {
        source.features.forEach((feature) => {
            const type = feature.properties!.type;
            types[type] = (types[type] || []).concat([
                feature as Feature<LineString>,
            ]);
        });
        console.log('Connecting roads');
        connectRoads(types);
    })
    .catch((error) => console.error(error.stack))
    .then(() => fs.writeFileSync('./roads.json', JSON.stringify(types)));

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
