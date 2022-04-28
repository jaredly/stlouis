import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as shapefile from 'shapefile';
import {
    Feature,
    LineString,
    Polygon,
    MultiPolygon,
    FeatureCollection,
    Point,
    Geometry,
    GeoJsonProperties,
} from 'geojson';
import opentype from 'opentype.js';
import PathKitInit from 'pathkit-wasm';
import { App } from './App';

export const empty = {};

const root = createRoot(document.getElementById('root')!);

const getShp = <T extends Geometry | null = Geometry, P = GeoJsonProperties>(
    name: string,
): Promise<FeatureCollection<T, P>> => {
    return Promise.all([
        fetch(name + '.shp').then((r) => r.arrayBuffer()),
        fetch(name + '.dbf').then((r) => r.arrayBuffer()),
    ]).then(([shp, dbf]) => {
        return shapefile.read(shp, dbf);
    }) as Promise<FeatureCollection<T, P>>;
};

const run = async () => {
    const [
        roads,
        font,
        headerFont,
        boundary,
        places,
        neighborhoods,
        waterways,
        natural,
        PathKit,
    ] = await Promise.all([
        fetch('./roads.json').then(
            (r): Promise<{ [key: string]: Array<Feature<LineString>> }> =>
                r.json(),
        ),
        opentype.load(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Regular.ttf',
        ),
        opentype.load(
            '/data/Open_Sans/static/OpenSans_Condensed/OpenSans_Condensed-Bold.ttf',
        ),
        getShp('./data/stl_boundary/stl_boundary'),
        getShp('./data/places'),
        getShp<Polygon | MultiPolygon>(
            './data/nbrhds_wards/Neighborhood_Boundaries',
        ),
        getShp<LineString>('./data/waterways'),
        getShp<Polygon>('./data/natural'),
        PathKitInit({
            locateFile: (file: string) =>
                '/node_modules/pathkit-wasm/bin/' + file,
            // '/bin/' + file,
        }),
    ]);
    // console.log(natural);

    const placeTypes: { [key: string]: Array<Feature<Point>> } = {};
    places.features.forEach((p) => {
        const type = p.properties!.type;
        placeTypes[type] = (placeTypes[type] || []).concat([
            p as Feature<Point>,
        ]);
    });
    // window.places = places;
    delete placeTypes['yes'];
    delete placeTypes['city'];
    delete placeTypes['island'];
    delete placeTypes['locality'];

    delete placeTypes['hamlet'];
    delete placeTypes['town'];
    delete placeTypes['village'];
    console.log(boundary);

    // let [x0, y0, x1, y1] = boundary.bbox!;
    // const bounds = { x0, y0, x1, y1 };

    // const w = 519;
    // const dx = bounds.x1 - bounds.x0;
    // const dy = bounds.y1 - bounds.y0;
    // const h = (dy / dx) * w;

    // const px = (x: number) => ((x - bounds.x0) / dx) * w;
    // const py = (y: number) => (1 - (y - bounds.y0) / dy) * h;
    // // const showPos = ([x, y]: Position) =>
    // //     `${((x - bounds.x0) / dx) * w},${(1 - (y - bounds.y0) / dy) * h}`;

    // const addPoly = (path: Position[]) => {
    //     const inner = PathKit.NewPath();
    //     path.forEach((coord, i) => {
    //         if (i === 0) {
    //             inner.moveTo(px(coord[0]), py(coord[1]));
    //         } else {
    //             inner.lineTo(px(coord[0]), py(coord[1]));
    //         }
    //     });
    //     inner.close();
    //     allBoundary.op(inner, PathKit.PathOp.UNION);
    //     inner.delete();
    // };

    // const allBoundary = PathKit.NewPath();
    // neighborhoods.features.forEach((feature) => {
    //     if (feature.geometry.type === 'Polygon') {
    //         feature.geometry.coordinates.forEach(addPoly);
    //     } else {
    //         feature.geometry.coordinates.forEach((paths) =>
    //             paths.forEach(addPoly),
    //         );
    //     }
    // });
    // // allBoundary.simplify();
    // // allBoundary.setFillType(PathKit.FillType.EVENODD);
    // const boundaryPath = allBoundary.toSVGString();
    // const expanded = allBoundary
    //     .copy()
    //     .stroke({ width: 20, join: PathKit.StrokeJoin.ROUND });
    // allBoundary.op(expanded, PathKit.PathOp.UNION);
    // expanded.delete();
    // const expandedPath = allBoundary.toSVGString();
    // allBoundary.delete();

    root.render(
        <App
            types={roads}
            boundary={boundary}
            places={placeTypes}
            font={font}
            headerFont={headerFont}
            PathKit={PathKit}
            neighborhoods={neighborhoods}
            waterways={waterways}
            natural={natural}
            // boundaryPath={boundaryPath}
            // expandedPath={expandedPath}
            // PathKit={PathKit}
        />,
    );
};

run().catch(console.error);
