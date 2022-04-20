import { Feature, LineString } from 'geojson';

function findBoundsFromRoads(types: { [key: string]: Array<Feature> }): {
    x0: number;
    y0: number;
    y1: number;
    x1: number;
} {
    return Object.keys(types).reduce(
        (bounds, k) =>
            types[k].reduce(
                (bounds, shape) =>
                    (shape.geometry as LineString).coordinates.reduce(
                        (bounds, [x, y]) => ({
                            x0: Math.min(x, bounds.x0),
                            y0: Math.min(y, bounds.y0),
                            x1: Math.max(x, bounds.x1),
                            y1: Math.max(y, bounds.y1),
                        }),
                        bounds,
                    ),
                bounds,
            ),
        { x0: Infinity, y0: Infinity, y1: -Infinity, x1: -Infinity },
    );
}
