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
    Selected,
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
        bgColor = 'white',
    }: {
        transform?: string;
        font: opentype.Font;
        text: string;
        x: number;
        y: number;
        fontSize: number;
        bgColor?: string;
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
                    fill={bgColor}
                    stroke={bgColor}
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
    backPos,
    selected,
    setSelected,
    inBounds,
    centers,
    font,
}: {
    font: opentype.Font;
    centers: Centers;
    inBounds: (pos: Position) => boolean;
    scalePos: (pos: Position) => Position;
    backPos: (pos: { clientX: number; clientY: number }) => Pos;
    selected: Selected | null;
    setSelected: React.Dispatch<React.SetStateAction<Selected | null>>;
    types: {
        [key: string]: Array<Feature<LineString>>;
    };
}) => {
    const [offsets, setOffsets] = useLocalStorage(
        'names-new',
        empty as { [key: string]: null | Pos },
    );
    const [moving, setMoving] = useDrag((moving) => {
        if (!moving.moved) {
            return;
        }
        setOffsets((off) => {
            const r = { ...off };
            r[moving.key] = moving.pos;
            return r;
        });
    }, backPos);

    return (
        <>
            {labeled.map((k) =>
                types[k].map((shape) => {
                    const name = shape.properties!.name;
                    if (!name) return;
                    const key = `${k}:${name}`;
                    if (shape !== centers[key].closest[1]) return;
                    if (centers[key].totalLength < 2000) {
                        return;
                    }
                    let [_, __, center, p1, p2] = centers[key].closest;
                    const stl =
                        moving?.key === key && moving.moved
                            ? moving.pos
                            : offsets[key] ?? toStl.forward(center);
                    if (!inBounds([stl.x, stl.y])) return;
                    if (offsets[key] === null) return;
                    const [x, y] = scalePos([stl.x, stl.y]);

                    p1 = scalePos(toStl.forward(p1));
                    p2 = scalePos(toStl.forward(p2));
                    let theta = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                    if (theta > Math.PI / 2) {
                        theta -= Math.PI;
                    }
                    if (theta < -Math.PI / 2) {
                        theta += Math.PI;
                    }
                    return (
                        <g
                            key={key}
                            onContextMenu={(evt) => {
                                evt.preventDefault();
                                setOffsets((off) => ({ ...off, [key]: null }));
                            }}
                            onMouseDown={(evt) => {
                                if (evt.button !== 0) {
                                    console.log('button', evt.button);
                                    return;
                                }
                                setSelected({ type: 'road', kind: k, name });
                                const pos = backPos(evt);
                                console.log('back', backPos);
                                setMoving({
                                    origin: pos,
                                    pos,
                                    key,
                                    moved: false,
                                });
                            }}
                            style={{
                                cursor: 'pointer',
                                userSelect: 'none',
                            }}
                        >
                            <RenderText
                                font={font}
                                text={name}
                                x={x}
                                y={y}
                                bgColor={
                                    selected?.type === 'road' &&
                                    selected.kind === k &&
                                    selected.name === name
                                        ? 'green'
                                        : 'white'
                                }
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
