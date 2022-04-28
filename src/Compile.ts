import { PathKit } from 'pathkit-wasm';
import {
    applyMatrices,
    Matrix,
    rotationMatrix,
    translationMatrix,
} from './transforms';
import { Pos } from './App';

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

export type PathConfig = {
    color: string;
    stroke?: number;
    path: string;
    transforms: Array<Matrix>;
    bbox?: BBox;
};
type BBox = { x0: number; y0: number; x1: number; y1: number };

export const bboxOneDimentionalOverlap = (
    x0: number,
    x1: number,
    a0: number,
    a1: number,
) => {
    return (
        (x0 <= a0 && a0 <= x1) ||
        (x0 <= a1 && a1 <= x1) ||
        (a0 <= x0 && x0 <= a1) ||
        (a0 <= x1 && x1 <= a1)
    );
};

export const bboxIntersect = (one: BBox, two: BBox) => {
    return (
        bboxOneDimentionalOverlap(one.x0, one.x1, two.x0, two.x1) &&
        bboxOneDimentionalOverlap(one.y0, one.y1, two.y0, two.y1)
    );
};

export const compileSvg = (svg: SVGSVGElement, PathKit: PathKit) => {
    const start = Date.now();

    // NO clipping, I think
    // the result is a list of Path's? that you have to delete
    const paths: Array<PathConfig> = [];
    const pieces: Array<PathConfig> = [];

    const addNode = (
        path: string,
        node: SVGElement,
        transforms: Array<Matrix>,
        bbox?: BBox,
    ) => {
        const fill = node.getAttribute('fill');
        const stroke = node.getAttribute('stroke');
        if (fill && fill != 'none') {
            paths.push({ color: fill, path, transforms, bbox });
        }
        if (stroke && stroke != 'none') {
            const w = node.getAttribute('stroke-width');
            paths.push({
                path,
                stroke: w ? +w : 1,
                color: stroke,
                transforms,
                bbox,
            });
        }
    };

    const processNode = (node: SVGElement, transforms: Array<Matrix>) => {
        if (node.getAttribute('transform')) {
            transforms = transforms.concat(
                parseTransform(node.getAttribute('transform')!),
            );
        }
        if (node.nodeName === 'g') {
            node.childNodes.forEach((child) => {
                processNode(child as SVGElement, transforms);
            });
        } else if (node.nodeName === 'path') {
            // TODO: Parse these for bounding box points
            const d = node.getAttribute('d')!;
            const initial = d.match(/M(-?\d+(\.\d+)?\s*){2}/);
            let bbox;
            if (initial) {
                const first = initial[0].match(/M-?\d+(\.\d+)?/)!;
                const rest = initial[0].slice(first[0].length);
                const x = +first[0].slice(1);
                const y = +rest;
                const tx = applyMatrices(
                    { x, y },
                    transforms.slice().reverse(),
                );
                bbox = { x0: tx.x, y0: tx.y, x1: tx.x, y1: tx.y };
            }
            // console.log(initial);
            addNode(d, node, transforms, bbox);
        } else if (
            node.nodeName === 'polyline' ||
            node.nodeName === 'polygon'
        ) {
            const numbers = node
                .getAttribute('points')!
                .split(/[, ]/g)
                .map((x) => +x);
            let d = `M${numbers[0]},${numbers[1]}`;
            const points: Array<Pos> = [{ x: numbers[0], y: numbers[1] }];
            for (let i = 2; i < numbers.length; i += 2) {
                d += ` L${numbers[i]},${numbers[i + 1]}`;
                points.push({ x: numbers[i], y: numbers[i + 1] });
            }
            const bbox = {
                x0: Infinity,
                y0: Infinity,
                x1: -Infinity,
                y1: -Infinity,
            };
            points
                .map((pos) => applyMatrices(pos, transforms))
                .forEach(({ x, y }) => {
                    bbox.x0 = Math.min(bbox.x0, x);
                    bbox.y0 = Math.min(bbox.y0, y);
                    bbox.x1 = Math.max(bbox.x1, x);
                    bbox.y1 = Math.max(bbox.y1, y);
                });
            if (node.nodeName === 'polygon') {
                d += 'Z';
            }
            if (node.hasAttribute('data-piece')) {
                const path = PathKit.FromSVGString(d);
                transforms.forEach(([[a, b, c], [d, e, f]]) => {
                    path.transform(a, b, c, d, e, f, 0, 0, 1);
                });
                const ns = path.copy().stroke({ width: 5 });
                path.op(ns, PathKit.PathOp.UNION);
                ns.delete();

                pieces.push({
                    color: 'black',
                    path: path.toSVGString(),
                    transforms: [],
                    bbox,
                });
            }
            addNode(d, node, transforms, bbox);
        } else {
            // console.log('skipping', node.nodeName);
        }
    };

    svg.childNodes.forEach((child) => processNode(child as SVGElement, []));
    console.log('took', Date.now() - start);

    console.log(pieces);

    return { paths, pieces };
};
