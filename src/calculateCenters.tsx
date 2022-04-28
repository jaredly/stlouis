import { Feature, LineString, Position } from 'geojson';
import { Centers, labeled, Pos, toStl, dist } from './App';

export function calculateCenters(types: {
    [key: string]: Array<Feature<LineString>>;
}) {
    const centers: Centers = {};
    labeled.forEach((key) => {
        const byName: { [key: string]: Array<Feature<LineString>> } = {};
        types[key].forEach((feature) => {
            const name = feature.properties!.name;
            if (!byName[name]) {
                byName[name] = [feature];
            } else {
                byName[name].push(feature);
            }
        });
        Object.keys(byName).forEach((name) => {
            let n = 0;
            let px = 0;
            let py = 0;
            byName[name].forEach((feature) => {
                feature.geometry.coordinates.forEach(([x, y]) => {
                    n++;
                    px += x;
                    py += y;
                });
            });
            px /= n;
            py /= n;
            const center = { x: px, y: py };
            let totalLength = 0;
            let closest = null as
                | null
                | [number, Feature<LineString>, Pos, Position, Position];
            byName[name].forEach((feature) => {
                if (feature.geometry.coordinates.length < 2) {
                    return;
                }

                feature.geometry.coordinates.slice(1).forEach((coord, i) => {
                    const last = feature.geometry.coordinates[i];
                    const p1 = toStl.forward(last);
                    const p2 = toStl.forward(coord);
                    const dx = p1[0] - p2[0];
                    const dy = p1[1] - p2[1];
                    totalLength += Math.sqrt(dx * dx + dy * dy);
                });

                const midx = Math.floor(
                    (feature.geometry.coordinates.length - 1) / 2,
                );
                const p1 = feature.geometry.coordinates[midx];
                const p2 = feature.geometry.coordinates[midx + 1];
                const mid = {
                    x: (p1[0] + p2[0]) / 2,
                    y: (p1[1] + p2[1]) / 2,
                };
                const d = dist(center, mid);
                if (closest === null || d < closest[0]) {
                    closest = [d, feature, mid, p1, p2];
                }
            });
            centers[key + ':' + name] = {
                center,
                closest: closest!,
                totalLength,
            };
        });
    });
    return centers;
}
