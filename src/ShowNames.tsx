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

export const RenderText = React.memo(
    ({
        font,
        text,
        x,
        y,
        fontSize,
        transform,
    }: {
        transform?: string;
        font: opentype.Font;
        text: string;
        x: number;
        y: number;
        fontSize: number;
    }) => {
        const { path, w } = React.useMemo(() => {
            const w = font.getAdvanceWidth(text, fontSize);
            return {
                w,
                path: font.getPath(text, -w / 2, 0, fontSize).toPathData(3),
            };
        }, [text, x, y, fontSize]);
        // transform-origin={`${x} ${y}`}>
        return (
            <g
                transform={`translate(${x} ${y})`}
                // transform={transform}
                // transform-origin={`${x} ${y}`}
            >
                <path
                    transform={transform}
                    // transform-origin={`${x} ${y}`}
                    d={path}
                    fill="white"
                    stroke="white"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <path
                    transform={transform}
                    // transform-origin={`${x} ${y}`}
                    d={path}
                    fill="black"
                    stroke="none"
                />
            </g>
        );
    },
);

export const ShowNames = ({
    types,
    scalePos,
    inBounds,
    centers,
    font,
}: {
    font: opentype.Font;
    centers: Centers;
    inBounds: (pos: Position) => boolean;
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
                    const stl = toStl.forward([center.x, center.y]);
                    if (!inBounds(stl)) {
                        return;
                    }
                    if (offsets[id] === null) {
                        return;
                    }
                    const [x, y] = scalePos(stl);

                    p1 = scalePos(toStl.forward(p1));
                    p2 = scalePos(toStl.forward(p2));
                    let theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                    if (theta > Math.PI / 2) {
                        theta -= Math.PI;
                    }
                    if (theta < -Math.PI / 2) {
                        theta += Math.PI;
                    }
                    const off = 1;
                    const tx =
                        moving?.idx === id
                            ? `translate(${
                                  (moving.pos.x - moving.origin.x) / off
                              } ${(moving.pos.y - moving.origin.y) / off})`
                            : offsets[id]
                            ? `translate(${offsets[id]!.x / off} ${
                                  offsets[id]!.y / off
                              })`
                            : undefined;
                    if (!shape.properties!.name) {
                        return;
                    }
                    if (!theta || isNaN(theta)) {
                        console.log('bad theta', theta);
                    }
                    return (
                        <g
                            key={i}
                            onContextMenu={(evt) => {
                                evt.preventDefault();
                                setOffsets((off) => ({ ...off, [id]: null }));
                            }}
                            onMouseDown={(evt) => {
                                if (evt.button !== 0) {
                                    console.log('button', evt.button);
                                    return;
                                }
                                const pos = { x: evt.clientX, y: evt.clientY };
                                setMoving({ origin: pos, pos, idx: id });
                            }}
                            style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                            }}
                            transform={tx}
                        >
                            <RenderText
                                font={font}
                                text={shape.properties!.name}
                                x={x}
                                y={y}
                                fontSize={fontSizes[k]}
                                transform={`rotate(${(theta / Math.PI) * 180})`}
                            />
                        </g>
                    );
                }),
            )}
        </>
    );
};
