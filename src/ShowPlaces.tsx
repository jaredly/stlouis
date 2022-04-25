import * as React from 'react';
import { Feature, Position, Point } from 'geojson';
import { useLocalStorage, empty, Pos, toStl, Selected } from './run';
import { useDrag } from './useDrag';
import { RenderText } from './ShowNames';

const skip = ['Southhampton', 'Doctor Martin Luther King Drive'];

export const ShowPlaces = ({
    places,
    scalePos,
    font,
    selp,
    inBounds,
    backPos,
    selected,
    setSelected,
}: {
    inBounds: (pos: Position) => boolean;
    font: opentype.Font;
    selp: string | null;
    scalePos: (pos: Position) => Position;
    places: { [key: string]: Array<Feature<Point>> };
    backPos: (pos: { clientX: number; clientY: number }) => Pos;
    selected: Selected | null;
    setSelected: React.Dispatch<React.SetStateAction<Selected | null>>;
}) => {
    const [offsets, setOffsets] = useLocalStorage(
        'places-new',
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

    const seen: { [key: string]: true } = {};
    return (
        <>
            {Object.keys(places).map(
                (p, pi) =>
                    (!selp || selp === p) &&
                    places[p].map((place, i) => {
                        const stl = toStl.forward(place.geometry.coordinates);
                        if (!inBounds(stl)) {
                            return;
                        }
                        const name = place.properties!.name;
                        const key = name;
                        if (skip.includes(name)) {
                            return;
                        }
                        if (seen[name]) {
                            return;
                        }
                        seen[name] = true;
                        const position =
                            moving?.key === key && moving?.moved
                                ? moving.pos
                                : offsets[key] ?? { x: stl[0], y: stl[1] };
                        const [x, y] = scalePos([position.x, position.y]);
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
                                    setMoving({
                                        origin: pos,
                                        pos,
                                        key,
                                        moved: false,
                                    });
                                    setSelected({ type: 'place', name });
                                }}
                                key={pi + ':' + i}
                                style={{
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                // transform={tx}
                            >
                                <RenderText
                                    text={name}
                                    x={x}
                                    y={y}
                                    transform=""
                                    fontSize={6}
                                    bgColor={
                                        selected?.type === 'place' &&
                                        selected.name === name
                                            ? 'green'
                                            : 'white'
                                    }
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
