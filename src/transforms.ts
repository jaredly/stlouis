import { Pos } from './run';

export type Matrix = [[number, number, number], [number, number, number]];

export const applyMatrix = ({ x, y }: Pos, [[a, b, c], [d, e, f]]: Matrix) => ({
    x: x * a + y * b + c,
    y: x * d + y * e + f,
});

export const applyMatrices = (pos: Pos, matrices: Array<Matrix>) => {
    return matrices.reduce(applyMatrix, pos);
};

export type Transform =
    | { type: 'rotate'; center: Pos; theta: number }
    | { type: 'reflect'; p1: Pos; p2: Pos };

export const scale = (coord: Pos, scale: number) => ({
    x: coord.x * scale,
    y: coord.y * scale,
});
export const translationMatrix = (coord: Pos): Matrix => [
    [1, 0, coord.x],
    [0, 1, coord.y],
];
export const rotationMatrix = (theta: number): Matrix => [
    [Math.cos(theta), -Math.sin(theta), 0],
    [Math.sin(theta), Math.cos(theta), 0],
];
export const scaleMatrix = (sx: number, sy: number): Matrix => [
    [sx, 0, 0],
    [0, sy, 0],
];

export const transformToMatrices = (t: Transform): Array<Matrix> => {
    switch (t.type) {
        case 'rotate':
            return [
                // translate to origin
                translationMatrix(scale(t.center, -1)),
                rotationMatrix(t.theta),
                // translate back
                translationMatrix(t.center),
            ];
        case 'reflect':
            const theta = angleTo(t.p1, t.p2);
            return [
                // translate to origin
                translationMatrix(scale(t.p1, -1)),
                // rotate to origin
                rotationMatrix(-theta),
                // reflect over x axis
                scaleMatrix(1, -1),
                // rotate back
                rotationMatrix(theta),
                // translate back
                translationMatrix(t.p1),
            ];
    }
};

export const transformsToMatrices = (t: Array<Transform>) =>
    t.reduce(
        (result, t) => result.concat(transformToMatrices(t)),
        [] as Array<Matrix>,
    );

/**
 * Calculate the point found `mag` units in `theta` direction from `p1`.
 */
export const push = (p1: Pos, theta: number, mag: number) => ({
    x: p1.x + Math.cos(theta) * mag,
    y: p1.y + Math.sin(theta) * mag,
});
/**
 * Calculate the angle from `p1`, pointing at `p2`.
 */
export const angleTo = (p1: Pos, p2: Pos) =>
    Math.atan2(p2.y - p1.y, p2.x - p1.x);
/**
 * Calculate the distance between two points.
 */
export const dist = (p1: Pos, p2: Pos) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};
