import * as React from 'react';
import { Feature, Position, Point } from 'geojson';
import { useLocalStorage, empty, Pos, toStl } from './run';
import { useDrag } from './useDrag';
import { RenderText } from './ShowNames';

const skip = ['Southhampton', 'Doctor Martin Luther King Drive'];

export const ShowPlaces = ({
    places,
    scalePos,
    font,
    selp,
    inBounds,
}: {
    inBounds: (pos: Position) => boolean;
    font: opentype.Font;
    selp: string | null;
    scalePos: (pos: Position) => Position;
    places: { [key: string]: Array<Feature<Point>> };
}) => {
    const [offsets, setOffsets] = useLocalStorage(
        'places',
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
    const seen: { [key: string]: true } = {};
    return (
        <>
            {Object.keys(places).map(
                (p, pi) =>
                    (!selp || selp === p) &&
                    places[p].map((place, i) => {
                        const id = tix++;
                        const stl = toStl.forward(place.geometry.coordinates);
                        if (!inBounds(stl)) {
                            return;
                        }
                        const name = place.properties!.name;
                        if (skip.includes(name)) {
                            return;
                        }
                        if (seen[name]) {
                            return;
                        }
                        seen[name] = true;
                        const [x, y] = scalePos(stl);
                        const tx =
                            moving?.idx === id
                                ? `translate(${(
                                      moving.pos.x - moving.origin.x
                                  ).toFixed(3)} ${(
                                      moving.pos.y - moving.origin.y
                                  ).toFixed(3)})`
                                : offsets[id]
                                ? `translate(${offsets[id]!.x.toFixed(
                                      3,
                                  )} ${offsets[id]!.y.toFixed(3)})`
                                : undefined;
                        return (
                            <g
                                onMouseDown={(evt) => {
                                    if (evt.button !== 0) {
                                        console.log('button', evt.button);
                                        return;
                                    }
                                    const pos = {
                                        x: evt.clientX,
                                        y: evt.clientY,
                                    };
                                    setMoving({ origin: pos, pos, idx: id });
                                }}
                                key={pi + ':' + i}
                                style={{
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                transform={tx}
                            >
                                <RenderText
                                    text={name}
                                    x={x}
                                    y={y}
                                    transform=""
                                    fontSize={6}
                                    font={font}
                                />
                                {/* <text
                                    x={x}
                                    y={y}
                                    style={{
                                        fontSize: 6,
                                        textAnchor: 'middle',
                                        fontFamily: 'OpenSans',
                                    }}
                                    stroke="white"
                                    fill="white"
                                    fontWeight={'bold'}
                                    strokeWidth={3}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                >
                                    {place.properties!.name}
                                </text>
                                <text
                                    x={x}
                                    y={y}
                                    fontWeight={'bold'}
                                    style={{
                                        fontSize: 6,
                                        textAnchor: 'middle',
                                        fontFamily: 'OpenSans',
                                    }}
                                    fill="black"
                                >
                                    {place.properties!.name}
                                </text> */}
                            </g>
                        );
                    }),
            )}
        </>
    );
};
