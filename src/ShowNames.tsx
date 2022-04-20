import * as React from 'react';
import { Feature, LineString, Position } from 'geojson';
import {
    Centers,
    useLocalStorage,
    empty,
    Pos,
    labeled,
    toStl,
    fontSizes,
} from './run';
import { useDrag } from './useDrag';

export const ShowNames = ({
    types,
    scalePos,
    centers,
}: {
    centers: Centers;
    scalePos: (pos: Position) => Position;
    types: {
        [key: string]: Array<Feature<LineString>>;
    };
}) => {
    const [offsets, setOffsets] = useLocalStorage(
        'names',
        empty as { [key: string]: null | Pos },
    );
    const [moving, setMoving] = useDrag((moving) => {
        setOffsets((off) => {
            const r = { ...off };
            r[moving.idx] = {
                x: moving.pos.x - moving.origin.x,
                y: moving.pos.y - moving.origin.y,
            };
            return r;
        });
    });

    let tix = 0;
    return (
        <>
            {labeled.map((k, ti) =>
                types[k].map((shape, i) => {
                    const key = `${k}:${shape.properties!.name}`;
                    if (shape !== centers[key].closest[1]) {
                        return;
                    }
                    let [_, __, center, p1, p2] = centers[key].closest;
                    const id = tix++;
                    const idx = Math.floor(
                        shape.geometry.coordinates.length / 2,
                    );
                    const [x, y] = scalePos(
                        toStl.forward([center.x, center.y]),
                    );

                    p1 = scalePos(toStl.forward(p1));
                    p2 = scalePos(toStl.forward(p2));
                    let theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                    if (theta > Math.PI / 2) {
                        theta -= Math.PI;
                    }
                    if (theta < -Math.PI / 2) {
                        theta += Math.PI;
                    }
                    const tx =
                        moving?.idx === id
                            ? `translate(${
                                  (moving.pos.x - moving.origin.x) / 5
                              }mm, ${(moving.pos.y - moving.origin.y) / 5}mm)`
                            : offsets[id]
                            ? `translate(${offsets[id]!.x / 5}mm, ${
                                  offsets[id]!.y / 5
                              }mm)`
                            : undefined;
                    return (
                        <g
                            key={i}
                            onMouseDown={(evt) => {
                                const pos = { x: evt.clientX, y: evt.clientY };
                                setMoving({ origin: pos, pos, idx: id });
                            }}
                            style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                                transform: tx,
                            }}
                        >
                            <text
                                x={x}
                                y={y}
                                style={{
                                    fontSize: fontSizes[k],
                                    textAnchor: 'middle',
                                    fontFamily: 'OpenSans',
                                    transformOrigin: `${x}px ${y}px`,
                                    transform: `rotate(${
                                        (theta / Math.PI) * 180
                                    }deg)`,
                                }}
                                stroke="white"
                                fill="black"
                                strokeWidth={2}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            >
                                {shape.properties!.name}
                            </text>
                            <text
                                x={x}
                                y={y}
                                style={{
                                    fontSize: fontSizes[k],
                                    textAnchor: 'middle',
                                    fontFamily: 'OpenSans',
                                    transformOrigin: `${x}px ${y}px`,
                                    transform: `rotate(${
                                        (theta / Math.PI) * 180
                                    }deg)`,
                                }}
                                fill="black"
                            >
                                {shape.properties!.name}
                            </text>
                        </g>
                    );
                }),
            )}
        </>
    );
};
