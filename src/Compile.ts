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
import { Matrix, rotationMatrix, translationMatrix } from './transforms';

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

const toNum = (n: string) => {
    const v = +n;
    if (isNaN(v)) {
        console.log('BADn', v, n);
    }
    return v;
};

const parseTransform = (transform: string): Array<Matrix> => {
    const result: Array<Matrix> = [];
    const parts = transform.split(/[(,)\s]/g).filter((t) => t.trim());
    // console.log(parts);
    while (parts.length) {
        const next = parts.shift();
        switch (next) {
            case 'rotate': {
                const deg = parts.shift();
                result.push(rotationMatrix((toNum(deg!) * Math.PI) / 180));
                break;
            }
            case 'translate': {
                const x = parts.shift()!;
                const y = parts.shift()!;
                result.push(translationMatrix({ x: toNum(x), y: toNum(y) }));
                break;
            }
            default:
                console.log('nope tx', next);
                break;
        }
    }
    return result;
};

// type PathConfig =
//     | { type: 'd'; d: string}
//     | {
//           type: 'points';
//           points: Array<[number, number]>;
//           closed: boolean;
//       };

export const compileSvg = (svg: SVGSVGElement, PathKit: PathKit) => {
    const start = Date.now();
    // NO clipping, I think
    // the result is a list of Path's? that you have to delete
    let paths: Array<{
        color: string;
        stroke?: number;
        path: string;
        transforms: Array<Matrix>;
    }> = [];

    // const addPath = (path: PathConfig, color: string) => {
    //     if (paths.length && paths[paths.length - 1].color === color) {
    //         paths[paths.length - 1].path.push(path);
    //         // paths[paths.length - 1].path.op(path, PathKit.PathOp.UNION);
    //     } else {
    //         paths.push({ path: [path], color });
    //     }
    // };

    const addNode = (
        path: string,
        node: SVGElement,
        transforms: Array<Matrix>,
    ) => {
        const fill = node.getAttribute('fill');
        const stroke = node.getAttribute('stroke');
        if (fill && fill != 'none') {
            paths.push({ color: fill, path, transforms });
            // addPath(path, fill);
        }
        if (stroke && stroke != 'none') {
            const w = node.getAttribute('stroke-width');
            // path.stroke({ width: w ? +w : 1, join: PathKit.StrokeJoin.ROUND });
            // addPath({ ...path, stroke: w ? +w : 1 }, stroke);
            paths.push({ path, stroke: w ? +w : 1, color: stroke, transforms });
        }
    };

    const processNode = (node: SVGElement, transforms: Array<Matrix>) => {
        if (node.getAttribute('transform')) {
            transforms = transforms.concat(
                parseTransform(node.getAttribute('transform')!),
            );
            // TODO:
            // parse the trhansform attribute into an array of matrices.
        }
        if (node.nodeName === 'g') {
            node.childNodes.forEach((child) => {
                processNode(child as SVGElement, transforms);
            });
        } else if (node.nodeName === 'path') {
            // const path = PathKit.FromSVGString(node.getAttribute('d')!);
            addNode(node.getAttribute('d')!, node, transforms);
            // path.delete();
        } else if (
            node.nodeName === 'polyline' ||
            node.nodeName === 'polygon'
        ) {
            // const path = PathKit.NewPath();
            const numbers = node
                .getAttribute('points')!
                .split(/[, ]/g)
                .map((x) => +x);
            // path.moveTo(numbers[0], numbers[1]);
            let d = `M${numbers[0]},${numbers[1]}`;
            const points: Array<[number, number]> = [];
            for (let i = 2; i < numbers.length; i += 2) {
                d += ` L${numbers[i]},${numbers[i + 1]}`;
                // points.push([numbers[i], numbers[i + 1]]);
                // path.lineTo(numbers[i], numbers[i + 1]);
            }
            if (node.nodeName === 'polygon') {
                d += 'Z';
            }
            addNode(d, node, transforms);
            // path.delete();
        } else {
            console.log('skipping', node.nodeName);
        }
    };

    svg.childNodes.forEach((child) => processNode(child as SVGElement, []));
    console.log('took', Date.now() - start);

    console.log(paths);

    return paths;
    // return paths.map((item) => {
    //     // const svg = item.path.toSVGString();
    //     // item.path.delete();
    //     return { path: item.path, color: item.color };
    // });
};
