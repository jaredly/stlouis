import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
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
import { gridDemo } from './GridDemo';

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

const run = async (root: Root) => {
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
        }),
    ]);

    const placeTypes: { [key: string]: Array<Feature<Point>> } = {};
    places.features.forEach((p) => {
        const type = p.properties!.type;
        placeTypes[type] = (placeTypes[type] || []).concat([
            p as Feature<Point>,
        ]);
    });
    delete placeTypes['yes'];
    delete placeTypes['city'];
    delete placeTypes['island'];
    delete placeTypes['locality'];

    delete placeTypes['hamlet'];
    delete placeTypes['town'];
    delete placeTypes['village'];

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
        />,
    );
};

switch (window.location.search) {
    case '?grid':
        gridDemo(root);
        break;
    default:
        run(root).catch(console.error);
        break;
}
