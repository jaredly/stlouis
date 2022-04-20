import * as React from 'react';
import { Feature, Position, Point } from 'geojson';
import { useLocalStorage, empty, Pos, toStl } from './run';
import { useDrag } from './useDrag';

export const ShowPlaces = ({
    places,
    scalePos,
    selp,
}: {
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
    return (
        <>
            {Object.keys(places).map(
                (p, pi) =>
                    (!selp || selp === p) &&
                    places[p].map((place, i) => {
                        const id = tix++;
                        const [x, y] = scalePos(
                            toStl.forward(place.geometry.coordinates),
                        );
                        const tx =
                            moving?.idx === id
                                ? `translate(${
                                      (moving.pos.x - moving.origin.x) / 5
                                  }mm, ${
                                      (moving.pos.y - moving.origin.y) / 5
                                  }mm)`
                                : offsets[id]
                                ? `translate(${offsets[id]!.x / 5}mm, ${
                                      offsets[id]!.y / 5
                                  }mm)`
                                : undefined;
                        return (
                            <g
                                onMouseDown={(evt) => {
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
                                    transform: tx,
                                }}
                            >
                                <text
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
                                </text>
                            </g>
                        );
                    }),
            )}
        </>
    );
};
