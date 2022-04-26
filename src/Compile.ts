import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as shapefile from 'shapefile';
import {
    Feature,
    LineString,
    Polygon,
    MultiPolygon,
    Position,
    FeatureCollection,
    Point,
    Geometry,
    GeoJsonProperties,
} from 'geojson';
import proj4 from 'proj4';
import { ShowNames } from './ShowNames';
import { ShowPlaces } from './ShowPlaces';
import opentype from 'opentype.js';
import PathKitInit, { Path, PathKit } from 'pathkit-wasm';

// export const compileMap = ({
//     types,
//     boundary,
//     places,
//     neighborhoods,
//     font,
//     headerFont,
//     natural,
// }: {
// 	types: { [key: string]: Array<Feature<LineString>> };
//     neighborhoods: FeatureCollection<Polygon | MultiPolygon>;
//     waterways: FeatureCollection<LineString>;
//     boundary: FeatureCollection;
//     natural: FeatureCollection<Polygon>;
//     places: { [key: string]: Array<Feature<Point>> };
//     font: opentype.Font;
//     headerFont: opentype.Font;
// }) => {
// }

export const compileSvg = (svg: SVGSVGElement, PathKit: PathKit) => {
    const start = Date.now();
    // NO clipping, I think
    // the result is a list of Path's? that you have to delete
    let paths: Array<{ color: string; path: Path }> = [];

    const addPath = (path: Path, color: string) => {
        if (paths.length && paths[paths.length - 1].color === color) {
            paths[paths.length - 1].path.op(path, PathKit.PathOp.UNION);
        } else {
            paths.push({ path: path.copy(), color });
        }
    };

    const addNode = (path: Path, node: SVGElement) => {
        const fill = node.getAttribute('fill');
        const stroke = node.getAttribute('stroke');
        if (fill && fill != 'none') {
            addPath(path, fill);
        }
        if (stroke && stroke != 'none') {
            const w = node.getAttribute('stroke-width');
            path.stroke({ width: w ? +w : 1, join: PathKit.StrokeJoin.ROUND });
            addPath(path, stroke);
        }
    };

    const processNode = (node: SVGElement, transform: number[][][]) => {
        if (node.getAttribute('transform')) {
            // transform = parseTransform(node.getAttribute('transform')).concat(
            //     transform,
            // );
            // TODO:
            // parse the trhansform attribute into an array of matrices.
        }
        if (node.nodeName === 'g') {
            node.childNodes.forEach((child) => {
                processNode(child as SVGElement, transform);
            });
        } else if (node.nodeName === 'path') {
            const path = PathKit.FromSVGString(node.getAttribute('d')!);
            addNode(path, node);
            path.delete();
        } else if (
            node.nodeName === 'polyline' ||
            node.nodeName === 'polygon'
        ) {
            const path = PathKit.NewPath();
            const numbers = node
                .getAttribute('points')!
                .split(/[, ]/g)
                .map((x) => +x);
            path.moveTo(numbers[0], numbers[1]);
            for (let i = 2; i < numbers.length; i += 2) {
                path.lineTo(numbers[i], numbers[i + 1]);
            }
            if (node.nodeName === 'polygon') {
                path.close();
            }
            addNode(path, node);
            path.delete();
        } else {
            console.log('skipping', node.nodeName);
        }
    };

    svg.childNodes.forEach((child) => processNode(child as SVGElement, []));
    console.log('took', Date.now() - start);

    return paths.map((item) => {
        const svg = item.path.toSVGString();
        item.path.delete();
        return { path: svg, color: item.color };
    });
};
